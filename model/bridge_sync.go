package model

import (
	"errors"
	"fmt"
	"strings"

	"github.com/QuantumNous/new-api/common"

	"github.com/bytedance/gopkg/util/gopool"
	"github.com/shopspring/decimal"
	"gorm.io/gorm"
)

// 北斗官网积分打通（方案 A：工坊钱包是唯一账本）。
//
// 官网后端调内部接口 POST /api/bridge/sync 同步三个事件：recharge（充值到账）、
// consume（生成预扣）、refund（生成失败退款）。本文件是该接口的账本层：
// 幂等键去重 + 钱包增减 + 审计日志，全部在同一个事务里完成。
//
// 画布软件不在本打通的代码改动范围内：软件用户直接用自己的工坊账号余额，
// 软件授权（24 小时试用 + 永久激活码）是另一套东西，与工坊钱包不混用。

// BridgeQuotaPerPoint 是网站积分到工坊 quota 的换算：1 网站积分 = 2500 quota。
//
// 推导（见 BEIDOU-POINTS-BRIDGE.md §5，数字以 2026-11-14 的网站代码与
// 大炮家「充值」价为准）：
//   - 工坊内部 1 美元 = 500000 quota（common.QuotaPerUnit），汇率按 ¥7.3 = $1，
//     所以 1 quota ≈ ¥0.0000146，1 元人民币 ≈ 68493 quota。
//   - 网站付费积分最便宜的一档是创始会员后续充值 ¥60 / 1200 积分 = ¥0.05/积分，
//     即 1 元买 20 积分；直接往工坊充 1 元得 68493 quota，所以 1 积分最多只能
//     换 68493 / 20 ≈ 3425 quota，否则网站充值会比直接充值更划算（套利）。
//   - 取 2500（留约 27% 的安全边际）：¥60 充值得 1200 积分 = 3000000 quota
//     = $6.00 = ¥43.80 的工坊标价额度，毛利下限约 27%。
//   - 单张图核对（网站默认 10 积分/张，banana2-official-1k「充值」价 ¥0.5/次
//     = 34247 quota）：网站扣 10 积分，工坊扣 25000 quota；月费档每张收入
//     ¥0.66，标价成本 ¥0.5，毛利下限约 24%；创始充值档每张收入 ¥0.50，
//     与标价成本打平，利润全靠 APIMODELS 上游价低于大炮标价的那部分差价。
//     视频（20 积分/秒）按「充值」价可能亏钱，见 BEIDOU-POINTS-BRIDGE.md §5.4，
//     v1 只同步图片/模板类消费，视频等定价确认后再接。
//   - 免费积分（注册赠送 100 积分、店主手动 grant）不同步到工坊，
//     只同步花钱买来的积分，见 BEIDOU-POINTS-BRIDGE.md §6。
const BridgeQuotaPerPoint = 2500

// MaxBridgePointsPerEvent 是单次同步事件允许的最大积分数。
// 真实事件最大是创始会员 ¥10000 / 24000 积分；10 万留足余量，
// 同时保证换算后 quota（10 万 × 2500 = 2.5 亿）远小于 MaxWalletQuota。
const MaxBridgePointsPerEvent = 100000

// BridgeEventRecharge / BridgeEventConsume / BridgeEventRefund 是
// /api/bridge/sync 接受的三种事件。
const (
	BridgeEventRecharge = "recharge"
	BridgeEventConsume  = "consume"
	BridgeEventRefund   = "refund"
)

var (
	// ErrBridgeDuplicatePayload 是同一幂等键已被使用、但事件内容不一致时返回的错误。
	// 调用方应按 409 处理：这是网站侧重复发送了不同的事件，需要人工核对，
	// 绝不能静默按成功返回。
	ErrBridgeDuplicatePayload = errors.New("idempotency key already used with different event payload")
	// ErrBridgeInvalidEvent 是事件名、积分数或幂等键不合法时返回的错误。
	ErrBridgeInvalidEvent = errors.New("invalid bridge sync event")
)

// BridgeSyncEvent 是官网同步事件的幂等账本：一行 = 一次已入账的同步。
// idempotency_key 唯一索引是防重复入账的最后防线；ApplyBridgeSyncEvent
// 先查后插，插冲突时再查一次比对，所以并发重发在 SQLite / MySQL /
// PostgreSQL 上都只会入账一次，不依赖任何方言特有的 SQL 或错误码。
type BridgeSyncEvent struct {
	Id             int64  `json:"id"`
	IdempotencyKey string `json:"idempotency_key" gorm:"type:varchar(128);uniqueIndex"`
	RelayUserId    int    `json:"relay_user_id" gorm:"index"`
	WebsiteUserId  string `json:"website_user_id" gorm:"type:varchar(128);index"`
	Event          string `json:"event" gorm:"type:varchar(16);index"`
	Points         int    `json:"points"`
	QuotaDelta     int    `json:"quota_delta"`
	BalanceAfter   int    `json:"balance_after"`
	Ref            string `json:"ref" gorm:"type:varchar(255)"`
	Note           string `json:"note" gorm:"type:varchar(255)"`
	CreatedAt      int64  `json:"created_at" gorm:"bigint"`
}

// BridgeSyncParams 是 ApplyBridgeSyncEvent 的入参；
// controller 层已做过一遍校验，这里再校验一次（防御纵深）。
type BridgeSyncParams struct {
	Event          string
	RelayUserId    int
	WebsiteUserId  string
	Points         int
	IdempotencyKey string
	Ref            string
	Note           string
}

// BridgeQuotaForPoints 把网站积分数换算成工坊 quota（永远为正）。
// 用 decimal 做整数乘法，不走 float；超过钱包上限时返回错误，
// 绝不静默截断（billing.md：钱包/充值换算用 WalletQuotaFromDecimalStrict）。
func BridgeQuotaForPoints(points int) (int, error) {
	if points <= 0 || points > MaxBridgePointsPerEvent {
		return 0, fmt.Errorf("%w: points must be between 1 and %d", ErrBridgeInvalidEvent, MaxBridgePointsPerEvent)
	}
	quota, err := common.WalletQuotaFromDecimalStrict(
		decimal.NewFromInt(int64(points)).Mul(decimal.NewFromInt(BridgeQuotaPerPoint)),
	)
	if err != nil {
		return 0, err
	}
	if quota <= 0 {
		return 0, fmt.Errorf("%w: converted quota must be positive", ErrBridgeInvalidEvent)
	}
	return quota, nil
}

func bridgeSyncEventValid(params BridgeSyncParams) error {
	switch params.Event {
	case BridgeEventRecharge, BridgeEventConsume, BridgeEventRefund:
	default:
		return fmt.Errorf("%w: unknown event %q", ErrBridgeInvalidEvent, params.Event)
	}
	if params.RelayUserId <= 0 {
		return fmt.Errorf("%w: relay user id is required", ErrBridgeInvalidEvent)
	}
	if strings.TrimSpace(params.WebsiteUserId) == "" || len(params.WebsiteUserId) > 128 {
		return fmt.Errorf("%w: website user id is required (max 128 chars)", ErrBridgeInvalidEvent)
	}
	if len(params.IdempotencyKey) < 8 || len(params.IdempotencyKey) > 128 {
		return fmt.Errorf("%w: idempotency key must be 8-128 chars", ErrBridgeInvalidEvent)
	}
	for _, r := range params.IdempotencyKey {
		if !(r >= 'A' && r <= 'Z' || r >= 'a' && r <= 'z' || r >= '0' && r <= '9' || r == '-' || r == '_') {
			return fmt.Errorf("%w: idempotency key contains invalid characters", ErrBridgeInvalidEvent)
		}
	}
	if strings.TrimSpace(params.Ref) == "" || len(params.Ref) > 255 {
		return fmt.Errorf("%w: ref is required (max 255 chars)", ErrBridgeInvalidEvent)
	}
	if len(params.Note) > 255 {
		return fmt.Errorf("%w: note is too long (max 255 chars)", ErrBridgeInvalidEvent)
	}
	if _, err := BridgeQuotaForPoints(params.Points); err != nil {
		return err
	}
	return nil
}

func bridgeSyncEventsEqual(a BridgeSyncEvent, params BridgeSyncParams) bool {
	return a.RelayUserId == params.RelayUserId &&
		a.WebsiteUserId == params.WebsiteUserId &&
		a.Event == params.Event &&
		a.Points == params.Points &&
		a.Ref == params.Ref
}

// ApplyBridgeSyncEvent 把一次官网同步事件记入工坊钱包。
//
// 返回值：(已入账的事件行，是否幂等重放，错误)。
//   - 首次：执行钱包增减 + 写入事件行，alreadyApplied=false。
//   - 同一幂等键、内容完全一致的重发：不重复入账，返回原行，alreadyApplied=true。
//   - 同一幂等键、内容不一致：返回 ErrBridgeDuplicatePayload，不入账。
//
// recharge / refund 增加钱包余额（走 creditTopUpQuota，与兑换码同一条原子
// 上限保护：余额 + 本次 <= MaxWalletQuota）；consume 扣减钱包余额并同步
// 增加 used_quota。consume 允许余额扣成负数，与 model.DecreaseUserQuota
// 的语义一致（网站侧已经预扣过积分，拒绝会导致两边账对不上；负数会在
// 日志里告警，由人工核对）。
func ApplyBridgeSyncEvent(params BridgeSyncParams) (*BridgeSyncEvent, bool, error) {
	if err := bridgeSyncEventValid(params); err != nil {
		return nil, false, err
	}
	quotaDelta, err := BridgeQuotaForPoints(params.Points)
	if err != nil {
		return nil, false, err
	}

	var applied *BridgeSyncEvent
	var alreadyApplied bool
	err = DB.Transaction(func(tx *gorm.DB) error {
		var existing BridgeSyncEvent
		lookup := tx.Where("idempotency_key = ?", params.IdempotencyKey).First(&existing)
		if lookup.Error == nil {
			if !bridgeSyncEventsEqual(existing, params) {
				return ErrBridgeDuplicatePayload
			}
			applied = &existing
			alreadyApplied = true
			return nil
		}
		if !errors.Is(lookup.Error, gorm.ErrRecordNotFound) {
			return lookup.Error
		}

		var user User
		if err := lockForUpdate(tx).First(&user, params.RelayUserId).Error; err != nil {
			return err
		}

		signedDelta := quotaDelta
		if params.Event == BridgeEventConsume {
			signedDelta = -quotaDelta
		}
		switch params.Event {
		case BridgeEventRecharge, BridgeEventRefund:
			if err := creditTopUpQuota(tx, params.RelayUserId, quotaDelta, nil); err != nil {
				return err
			}
		case BridgeEventConsume:
			if err := tx.Model(&User{}).Where("id = ?", params.RelayUserId).Updates(map[string]any{
				"quota":      gorm.Expr("quota - ?", quotaDelta),
				"used_quota": gorm.Expr("used_quota + ?", quotaDelta),
			}).Error; err != nil {
				return err
			}
		}

		var after User
		if err := tx.Select("quota", "used_quota").First(&after, params.RelayUserId).Error; err != nil {
			return err
		}
		event := &BridgeSyncEvent{
			IdempotencyKey: params.IdempotencyKey,
			RelayUserId:    params.RelayUserId,
			WebsiteUserId:  params.WebsiteUserId,
			Event:          params.Event,
			Points:         params.Points,
			QuotaDelta:     signedDelta,
			BalanceAfter:   after.Quota,
			Ref:            params.Ref,
			Note:           params.Note,
			CreatedAt:      common.GetTimestamp(),
		}
		if err := tx.Create(event).Error; err != nil {
			// 并发重发：另一事务先插了同一幂等键。本次插入失败时不直接
			// 报错，再查一次——查到了就按幂等重放/冲突处理，查不到才
			// 返回原错误。不解析任何数据库方言的错误码。
			var raced BridgeSyncEvent
			if recheck := tx.Where("idempotency_key = ?", params.IdempotencyKey).First(&raced); recheck.Error == nil {
				if !bridgeSyncEventsEqual(raced, params) {
					return ErrBridgeDuplicatePayload
				}
				applied = &raced
				alreadyApplied = true
				// 本事务的钱包改动必须回滚：幂等重放不能重复扣/加。
				return errRollbackOnly
			}
			return err
		}
		applied = event
		return nil
	})
	if err != nil {
		if errors.Is(err, errRollbackOnly) {
			// 幂等重放分支：事务已回滚（钱包未动），原行就是正确结果。
			return applied, true, nil
		}
		return nil, false, err
	}

	// 事务已提交，再同步 Redis 余额缓存（与 Redeem / DecreaseUserQuota 同款做法）。
	// 失败只记日志：缓存未命中时下次读取会从数据库余额水合，不影响账本正确性。
	switch applied.Event {
	case BridgeEventRecharge, BridgeEventRefund:
		syncCreditUserQuotaCache(applied.RelayUserId, quotaDelta, "bridge "+applied.Event)
	case BridgeEventConsume:
		gopool.Go(func() {
			if err := cacheDecrUserQuota(applied.RelayUserId, int64(quotaDelta)); err != nil {
				common.SysLog(common.LogText("failed to sync bridge consume to user quota cache: %s", err.Error()))
			}
		})
	}

	// 审计：每笔同步都写一条 LogTypeTopup 日志（该类型不受 LogConsumeEnabled
	// 开关影响，一定会落库）+ 一行系统日志；余额扣成负数时额外告警。
	// 日志里只有幂等键和余额，不含密钥。
	content := fmt.Sprintf("Points bridge sync: %s %d points (%+d quota), balance after %d",
		applied.Event, applied.Points, applied.QuotaDelta, applied.BalanceAfter)
	RecordLogWithAdminInfo(applied.RelayUserId, LogTypeTopup, content, nil,
		&AuditOperation{Action: "bridge.sync", Params: AuditFields{
			"event":           applied.Event,
			"points":          applied.Points,
			"quota_delta":     applied.QuotaDelta,
			"balance_after":   applied.BalanceAfter,
			"idempotency_key": applied.IdempotencyKey,
			"website_user_id": applied.WebsiteUserId,
			"ref":             applied.Ref,
			"already_applied": alreadyApplied,
		}})
	common.SysLog(common.LogText("bridge sync event=%s user_id=%d website_user_id=%s points=%d quota_delta=%d balance_after=%d idempotency_key=%s already_applied=%v",
		applied.Event, applied.RelayUserId, applied.WebsiteUserId, applied.Points, applied.QuotaDelta, applied.BalanceAfter, applied.IdempotencyKey, alreadyApplied))
	if applied.Event == BridgeEventConsume && applied.BalanceAfter < 0 {
		common.SysError(common.LogText("bridge sync consumed user %d below zero balance: balance_after=%d idempotency_key=%s (website already deducted points; reconcile manually)",
			applied.RelayUserId, applied.BalanceAfter, applied.IdempotencyKey))
	}
	return applied, alreadyApplied, nil
}

// errRollbackOnly 是 ApplyBridgeSyncEvent 内部使用的哨兵：
// 并发幂等重放分支里，钱包改动必须随事务回滚，但调用方仍要拿到原事件行，
// 所以用它区分“回滚但成功”和真正的错误。
var errRollbackOnly = errors.New("bridge sync idempotent replay, roll back this transaction")
