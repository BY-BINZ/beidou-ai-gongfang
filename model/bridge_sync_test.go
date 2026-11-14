package model

import (
	"testing"

	"github.com/QuantumNous/new-api/common"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
)

func createBridgeTestUser(t *testing.T, username, affCode string, quota int) *User {
	t.Helper()
	user := &User{Username: username, AffCode: affCode, Quota: quota}
	require.NoError(t, DB.Create(user).Error)
	t.Cleanup(func() {
		DB.Session(&gorm.Session{AllowGlobalUpdate: true}).Unscoped().Where("id = ?", user.Id).Delete(&User{})
		DB.Session(&gorm.Session{AllowGlobalUpdate: true}).Unscoped().Where("relay_user_id = ?", user.Id).Delete(&BridgeSyncEvent{})
	})
	return user
}

func TestBridgeQuotaForPoints(t *testing.T) {
	require.NoError(t, DB.AutoMigrate(&BridgeSyncEvent{}))

	tests := []struct {
		name   string
		points int
		want   int
	}{
		{"one point", 1, 2500},
		{"one image at default website price", 10, 25000},
		{"one campaign image", 12, 30000},
		{"monthly recharge tier", 1500, 3750000},
		{"annual top-up", 1200, 3000000},
		{"annual membership gift", 6000, 15000000},
		{"founder membership gift", 24000, 60000000},
	}
	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			got, err := BridgeQuotaForPoints(tc.points)
			require.NoError(t, err)
			assert.Equal(t, tc.want, got)
		})
	}

	for _, points := range []int{0, -1, MaxBridgePointsPerEvent + 1} {
		_, err := BridgeQuotaForPoints(points)
		require.Error(t, err, "points=%d", points)
	}
}

func TestApplyBridgeSyncEvent(t *testing.T) {
	require.NoError(t, DB.AutoMigrate(&BridgeSyncEvent{}))

	t.Run("recharge credits the wallet and replays are idempotent", func(t *testing.T) {
		user := createBridgeTestUser(t, "bridge-user-1", "B1", 0)
		params := BridgeSyncParams{
			Event:          BridgeEventRecharge,
			RelayUserId:    user.Id,
			WebsiteUserId:  "website-user-1",
			Points:         1500,
			IdempotencyKey: "website-recharge-test-1",
			Ref:            "recharge-record-1",
		}
		applied, alreadyApplied, err := ApplyBridgeSyncEvent(params)
		require.NoError(t, err)
		assert.False(t, alreadyApplied)
		assert.Equal(t, 3750000, applied.QuotaDelta)
		assert.Equal(t, 3750000, applied.BalanceAfter)

		quota, err := GetUserQuota(user.Id, true)
		require.NoError(t, err)
		assert.Equal(t, 3750000, quota)

		replayed, alreadyApplied, err := ApplyBridgeSyncEvent(params)
		require.NoError(t, err)
		assert.True(t, alreadyApplied)
		assert.Equal(t, applied.Id, replayed.Id)
		quota, err = GetUserQuota(user.Id, true)
		require.NoError(t, err)
		assert.Equal(t, 3750000, quota, "replay must not credit twice")
	})

	t.Run("same key with a different payload conflicts", func(t *testing.T) {
		user := createBridgeTestUser(t, "bridge-user-2", "B2", 0)
		params := BridgeSyncParams{
			Event:          BridgeEventRecharge,
			RelayUserId:    user.Id,
			WebsiteUserId:  "website-user-2",
			Points:         1500,
			IdempotencyKey: "website-recharge-test-2",
			Ref:            "recharge-record-2",
		}
		_, _, err := ApplyBridgeSyncEvent(params)
		require.NoError(t, err)

		params.Points = 1200
		_, _, err = ApplyBridgeSyncEvent(params)
		require.ErrorIs(t, err, ErrBridgeDuplicatePayload)
		quota, err := GetUserQuota(user.Id, true)
		require.NoError(t, err)
		assert.Equal(t, 3750000, quota, "conflict must not change the balance")
	})

	t.Run("consume deducts quota and raises used quota; refund restores it", func(t *testing.T) {
		user := createBridgeTestUser(t, "bridge-user-3", "B3", 0)
		_, _, err := ApplyBridgeSyncEvent(BridgeSyncParams{
			Event:          BridgeEventRecharge,
			RelayUserId:    user.Id,
			WebsiteUserId:  "website-user-3",
			Points:         1500,
			IdempotencyKey: "website-recharge-test-3",
			Ref:            "recharge-record-3",
		})
		require.NoError(t, err)

		consumed, alreadyApplied, err := ApplyBridgeSyncEvent(BridgeSyncParams{
			Event:          BridgeEventConsume,
			RelayUserId:    user.Id,
			WebsiteUserId:  "website-user-3",
			Points:         10,
			IdempotencyKey: "website-job-test-3",
			Ref:            "job-3",
		})
		require.NoError(t, err)
		assert.False(t, alreadyApplied)
		assert.Equal(t, -25000, consumed.QuotaDelta)
		assert.Equal(t, 3725000, consumed.BalanceAfter)

		used, err := GetUserUsedQuota(user.Id)
		require.NoError(t, err)
		assert.Equal(t, 25000, used)

		refunded, _, err := ApplyBridgeSyncEvent(BridgeSyncParams{
			Event:          BridgeEventRefund,
			RelayUserId:    user.Id,
			WebsiteUserId:  "website-user-3",
			Points:         10,
			IdempotencyKey: "website-refund-test-3",
			Ref:            "job-3",
		})
		require.NoError(t, err)
		assert.Equal(t, 25000, refunded.QuotaDelta)
		assert.Equal(t, 3750000, refunded.BalanceAfter)
	})

	t.Run("consume may overdraw like DecreaseUserQuota and records it", func(t *testing.T) {
		user := createBridgeTestUser(t, "bridge-user-4", "B4", 0)
		applied, _, err := ApplyBridgeSyncEvent(BridgeSyncParams{
			Event:          BridgeEventConsume,
			RelayUserId:    user.Id,
			WebsiteUserId:  "website-user-4",
			Points:         10,
			IdempotencyKey: "website-job-test-4",
			Ref:            "job-4",
		})
		require.NoError(t, err)
		assert.Equal(t, -25000, applied.BalanceAfter)
	})

	t.Run("invalid events are rejected without touching the wallet", func(t *testing.T) {
		user := createBridgeTestUser(t, "bridge-user-5", "B5", 1000)
		invalid := []BridgeSyncParams{
			{Event: "grant", RelayUserId: user.Id, WebsiteUserId: "w5", Points: 10, IdempotencyKey: "website-x-test-5a", Ref: "r"},
			{Event: BridgeEventRecharge, RelayUserId: user.Id, WebsiteUserId: "w5", Points: 0, IdempotencyKey: "website-x-test-5b", Ref: "r"},
			{Event: BridgeEventRecharge, RelayUserId: user.Id, WebsiteUserId: "w5", Points: MaxBridgePointsPerEvent + 1, IdempotencyKey: "website-x-test-5c", Ref: "r"},
			{Event: BridgeEventRecharge, RelayUserId: user.Id, WebsiteUserId: "w5", Points: 10, IdempotencyKey: "short", Ref: "r"},
			{Event: BridgeEventRecharge, RelayUserId: user.Id, WebsiteUserId: "w5", Points: 10, IdempotencyKey: "website-x-test-5e", Ref: ""},
			{Event: BridgeEventRecharge, RelayUserId: 0, WebsiteUserId: "w5", Points: 10, IdempotencyKey: "website-x-test-5f", Ref: "r"},
		}
		for _, params := range invalid {
			_, _, err := ApplyBridgeSyncEvent(params)
			require.Error(t, err, "params=%+v", params)
		}
		quota, err := GetUserQuota(user.Id, true)
		require.NoError(t, err)
		assert.Equal(t, 1000, quota)
	})

	t.Run("unknown user is not found", func(t *testing.T) {
		_, _, err := ApplyBridgeSyncEvent(BridgeSyncParams{
			Event:          BridgeEventRecharge,
			RelayUserId:    999999,
			WebsiteUserId:  "website-user-6",
			Points:         10,
			IdempotencyKey: "website-recharge-test-6",
			Ref:            "recharge-record-6",
		})
		require.ErrorIs(t, err, gorm.ErrRecordNotFound)
	})

	t.Run("credit beyond the wallet ceiling is rejected", func(t *testing.T) {
		user := createBridgeTestUser(t, "bridge-user-7", "B7", common.MaxWalletQuota)
		_, _, err := ApplyBridgeSyncEvent(BridgeSyncParams{
			Event:          BridgeEventRecharge,
			RelayUserId:    user.Id,
			WebsiteUserId:  "website-user-7",
			Points:         10,
			IdempotencyKey: "website-recharge-test-7",
			Ref:            "recharge-record-7",
		})
		require.Error(t, err)
		quota, err := GetUserQuota(user.Id, true)
		require.NoError(t, err)
		assert.Equal(t, common.MaxWalletQuota, quota)
	})
}
