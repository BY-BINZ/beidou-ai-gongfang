package controller

import (
	"crypto/sha256"
	"crypto/subtle"
	"errors"
	"net/http"
	"os"
	"strings"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/model"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// 北斗官网积分打通内部接口：POST /api/bridge/sync。
//
// 只有官网后端能调：密钥（BEIDOU_BRIDGE_SECRET）+ 官网服务器 IP 白名单
// （BEIDOU_BRIDGE_ALLOWED_IPS）双重鉴权，不走任何用户会话、Cookie 或
// API token。BEIDOU_BRIDGE_SECRET 为空 = 打通未配置，接口直接 503；
// 白名单为空 = 拒绝所有调用。
//
// 注意 Gin 的 c.ClientIP() 会信任 X-Forwarded-For：部署时 relay 必须在
// 可信反向代理（宝塔）后面，且只接受代理传来的真实客户端 IP，否则
// 白名单可能被伪造的请求头绕过。密钥是最后一道防线，绝不能只靠 IP。
const bridgeSecretHeader = "X-Beidou-Bridge-Secret"

type bridgeSyncRequest struct {
	Event          string `json:"event"`
	RelayUserId    int    `json:"relay_user_id"`
	Email          string `json:"email"`
	WebsiteUserId  string `json:"website_user_id"`
	Points         int    `json:"points"`
	IdempotencyKey string `json:"idempotency_key"`
	Ref            string `json:"ref"`
	Note           string `json:"note"`
}

func bridgeSecretMatches(provided, expected string) bool {
	if provided == "" || expected == "" {
		return false
	}
	// 先哈希再定长比较：不泄露密钥长度。
	providedHash := sha256.Sum256([]byte(provided))
	expectedHash := sha256.Sum256([]byte(expected))
	return subtle.ConstantTimeCompare(providedHash[:], expectedHash[:]) == 1
}

func bridgeIPAllowed(ip string) bool {
	if ip == "" {
		return false
	}
	for _, part := range strings.Split(os.Getenv("BEIDOU_BRIDGE_ALLOWED_IPS"), ",") {
		if strings.TrimSpace(part) == ip {
			return true
		}
	}
	return false
}

func bridgeSyncValidate(req bridgeSyncRequest) error {
	switch req.Event {
	case model.BridgeEventRecharge, model.BridgeEventConsume, model.BridgeEventRefund:
	default:
		return errors.New("event must be recharge, consume or refund")
	}
	if req.RelayUserId <= 0 && strings.TrimSpace(req.Email) == "" {
		return errors.New("relay_user_id or email is required")
	}
	if req.RelayUserId < 0 {
		return errors.New("relay_user_id must be positive")
	}
	if strings.TrimSpace(req.WebsiteUserId) == "" || len(req.WebsiteUserId) > 128 {
		return errors.New("website_user_id is required (max 128 chars)")
	}
	if req.Points <= 0 || req.Points > model.MaxBridgePointsPerEvent {
		return errors.New("points must be between 1 and 100000")
	}
	if len(req.IdempotencyKey) < 8 || len(req.IdempotencyKey) > 128 {
		return errors.New("idempotency_key must be 8-128 chars")
	}
	for _, r := range req.IdempotencyKey {
		if !(r >= 'A' && r <= 'Z' || r >= 'a' && r <= 'z' || r >= '0' && r <= '9' || r == '-' || r == '_') {
			return errors.New("idempotency_key may only contain letters, digits, - and _")
		}
	}
	if strings.TrimSpace(req.Ref) == "" || len(req.Ref) > 255 {
		return errors.New("ref is required (max 255 chars)")
	}
	if len(req.Note) > 255 {
		return errors.New("note is too long (max 255 chars)")
	}
	return nil
}

// BridgeSync 处理官网发来的积分同步事件（三选一：recharge / consume / refund）。
//
// 入参：event、relay_user_id（优先）或 email（未建映射时按邮箱找人）、
// website_user_id（官网用户 ID 字符串）、points（网站积分，>0 整数）、
// idempotency_key（官网侧唯一键，如 website-recharge:<id>）、
// ref（官网业务单据，如充值记录/任务 ID）、note（可选备注）。
//
// 出参 data：relay_user_id、website_user_id、event、points、quota_delta
// （consume 为负）、balance_after（本次入账后钱包余额）、
// idempotency_key、already_applied（幂等重放为 true，本次未重复入账）、ref。
//
// 错误码（机器接口，用真实 HTTP 状态，不走网页端 200+success:false 那套）：
// 400 入参校验失败；401 密钥缺失或错误；403 来源 IP 不在白名单；
// 404 用户不存在（ID 或邮箱都找不到）；409 同一幂等键内容不一致，
// 或邮箱对应多个用户；422 钱包余额会超上限；503 打通未配置（未设密钥）。
func BridgeSync(c *gin.Context) {
	secret := os.Getenv("BEIDOU_BRIDGE_SECRET")
	if secret == "" {
		common.ApiErrorStatus(c, http.StatusServiceUnavailable, errors.New("points bridge is not configured"))
		return
	}
	if !bridgeSecretMatches(c.GetHeader(bridgeSecretHeader), secret) {
		common.ApiErrorStatus(c, http.StatusUnauthorized, errors.New("invalid bridge secret"))
		return
	}
	callerIP := c.ClientIP()
	if !bridgeIPAllowed(callerIP) {
		common.SysLog(common.LogText("bridge sync rejected: source IP %s is not in the allowlist", callerIP))
		common.ApiErrorStatus(c, http.StatusForbidden, errors.New("source IP is not allowed"))
		return
	}

	var req bridgeSyncRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		common.ApiErrorStatus(c, http.StatusBadRequest, errors.New("invalid request body"))
		return
	}
	if err := bridgeSyncValidate(req); err != nil {
		common.ApiErrorStatus(c, http.StatusBadRequest, err)
		return
	}

	relayUserId := req.RelayUserId
	if relayUserId <= 0 {
		user, err := model.GetUniqueUserByEmail(req.Email)
		if err != nil {
			switch {
			case errors.Is(err, model.ErrEmailNotFound):
				common.ApiErrorStatus(c, http.StatusNotFound, errors.New("user not found"))
			case errors.Is(err, model.ErrEmailAmbiguous):
				common.ApiErrorStatus(c, http.StatusConflict, errors.New("email matches multiple users"))
			default:
				common.ApiErrorStatus(c, http.StatusInternalServerError, errors.New("failed to resolve user"))
			}
			return
		}
		relayUserId = user.Id
	} else {
		if _, err := model.GetUserById(relayUserId, false); err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				common.ApiErrorStatus(c, http.StatusNotFound, errors.New("user not found"))
			} else {
				common.ApiErrorStatus(c, http.StatusInternalServerError, errors.New("failed to resolve user"))
			}
			return
		}
	}

	applied, alreadyApplied, err := model.ApplyBridgeSyncEvent(model.BridgeSyncParams{
		Event:          req.Event,
		RelayUserId:    relayUserId,
		WebsiteUserId:  req.WebsiteUserId,
		Points:         req.Points,
		IdempotencyKey: req.IdempotencyKey,
		Ref:            req.Ref,
		Note:           req.Note,
	})
	if err != nil {
		switch {
		case errors.Is(err, model.ErrBridgeDuplicatePayload):
			common.ApiErrorStatus(c, http.StatusConflict, err)
		case errors.Is(err, model.ErrBridgeInvalidEvent):
			common.ApiErrorStatus(c, http.StatusBadRequest, err)
		case errors.Is(err, model.ErrWalletQuotaLimitExceeded) || errors.Is(err, model.ErrTopUpQuotaLimitExceeded):
			common.ApiErrorStatus(c, http.StatusUnprocessableEntity, err)
		case errors.Is(err, gorm.ErrRecordNotFound):
			common.ApiErrorStatus(c, http.StatusNotFound, errors.New("user not found"))
		default:
			common.SysError(common.LogText("bridge sync failed: %s", err.Error()))
			common.ApiErrorStatus(c, http.StatusInternalServerError, errors.New("bridge sync failed"))
		}
		return
	}

	common.ApiSuccess(c, gin.H{
		"relay_user_id":   applied.RelayUserId,
		"website_user_id": applied.WebsiteUserId,
		"event":           applied.Event,
		"points":          applied.Points,
		"quota_delta":     applied.QuotaDelta,
		"balance_after":   applied.BalanceAfter,
		"idempotency_key": applied.IdempotencyKey,
		"already_applied": alreadyApplied,
		"ref":             applied.Ref,
	})
}
