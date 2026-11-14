# 北斗AI工坊 — 积分打通（已实现：工坊侧；网站侧待接）

> 状态：**工坊侧已实现**（2026-11-14，见 §8 验证记录）。网站侧未改代码，
> 接入范围见 §7，等网站 PR。
> 桌面画布软件不在本次改动范围内：软件用户直接用自己的工坊账号余额；
> 软件授权（24 小时试用 + 永久激活码）是另一套东西，与工坊钱包不混用。

## 1. 目标

- 一个账号打通三处：北斗AI工坊（中转站）、北斗官网 beidouku.com、北斗画布软件
- 客户在工坊注册一次，三处都能用，不用重复注册、不用两边分别充值
- 账要算得清：谁用了多少、从哪个池子扣、扣错了能查、能退

## 2. 账本归属（方案 A，已定）

- **工坊钱包是唯一账本**：所有消费都以工坊钱包的 quota 结算
- 网站积分、画布软件授权是「表现层」：它们显示余额、做展示和限制，但扣费以工坊钱包为准
- 网站现有的积分体系保持不动；打通后网站积分的充值与消费要同步到工坊钱包，不能出现两边各扣一次
- 对不上账时以工坊钱包为准，人工核对（对账方法见 §7.5）

## 3. 账号打通方案（已定：方案 A）

- 工坊为账号中心。网站、画布软件登录时用工坊账号，网站只存映射关系
- v1 的映射很具体：网站用户 ID 是字符串，工坊用户 ID 是整数，网站侧存一个
  `relay_user_id` 字段（见 §7.4）。映射没建好之前，同步请求可以传邮箱，
  工坊按邮箱找人（邮箱对应多人时拒绝同步，返回 409）

## 4. 同步接口（已实现）

### 4.1 端点与鉴权

```
POST /api/bridge/sync
```

- 不走用户会话、Cookie 或 API token，只认两样东西：
  1. 请求头 `X-Beidou-Bridge-Secret: <BEIDOU_BRIDGE_SECRET>`，
     服务端用 SHA-256 后定长比较（`controller/bridge_sync.go`）。
     `BEIDOU_BRIDGE_SECRET` 未设置时接口直接返回 503（打通未配置）。
  2. 来源 IP 必须在 `BEIDOU_BRIDGE_ALLOWED_IPS` 白名单里（英文逗号分隔），
     为空 = 拒绝所有调用。注意 Gin 的 `ClientIP()` 会信任 `X-Forwarded-For`，
     部署时 relay 必须在可信反向代理（宝塔）后面，密钥是最后一道防线。
- 环境变量见 `.env.example`（只写占位，不放真实值）：
  生成密钥用 `openssl rand -hex 32`，填进工坊 `.env` 和官网服务器环境变量，
  两边必须一致。
- 另有 `CriticalRateLimit` 限流。密钥和 IP 都不对时不透露是哪一项不对之外的信息：
  密钥错返回 401，IP 不在白名单返回 403（服务端会记一条系统日志）。

### 4.2 请求

```json
{
  "event": "recharge",
  "relay_user_id": 123,
  "email": "user@example.com",
  "website_user_id": "website-users-id-string",
  "points": 1500,
  "idempotency_key": "website-recharge:01K...",
  "ref": "wechat_recharges.id 或任务 ID",
  "note": "可选备注，最多 255 字符"
}
```

- `event` 三选一：`recharge`（充值到账）、`consume`（生成预扣）、`refund`（生成失败退款）。
- `relay_user_id`（整数，优先）或 `email`（未建映射时的后备）至少传一个；
  两个都传时用 `relay_user_id`。
- `website_user_id` 必填（官网用户 ID 字符串，最多 128 字符），记进事件行做对账。
- `points` 必填整数，1–100000。超过 100000 的事件（如批量）要拆成多笔。
- `idempotency_key` 必填，8–128 字符，只允许字母、数字、`-`、`_`。
  建议格式见 §7.2。
- `ref` 必填（官网业务单据，最多 255 字符）；`note` 可选（最多 255 字符）。

### 4.3 响应

成功（HTTP 200）：

```json
{
  "success": true,
  "message": "",
  "data": {
    "relay_user_id": 123,
    "website_user_id": "website-users-id-string",
    "event": "recharge",
    "points": 1500,
    "quota_delta": 3750000,
    "balance_after": 3750000,
    "idempotency_key": "website-recharge:01K...",
    "already_applied": false,
    "ref": "wechat_recharges.id 或任务 ID"
  }
}
```

- `quota_delta`：本次钱包变化，`consume` 为负数；`balance_after` 是本次入账后余额。
- `already_applied: true` = 幂等重放，本次没有重复入账（返回的是原来那笔）。

错误（机器接口，用真实 HTTP 状态，不走网页端 `200 + success:false` 那套）：

| 状态 | 含义 | 网站侧处理 |
| --- | --- | --- |
| 400 | 入参校验失败（事件名、积分数、幂等键、ref 不合法） | 记日志告警，不重试（重试也没用） |
| 401 | 密钥缺失或错误 | 告警，不重试；检查两边密钥是否一致 |
| 403 | 来源 IP 不在白名单 | 告警，不重试；检查官网出口 IP |
| 404 | 用户不存在（ID 或邮箱都找不到） | 告警，不重试；检查账号映射 |
| 409 | 同一幂等键内容不一致，或邮箱对应多个用户 | **绝不能自动重试**，人工核对 |
| 422 | 钱包余额会超上限（`MaxWalletQuota`） | 告警，不重试 |
| 503 | 打通未配置（工坊没设 `BEIDOU_BRIDGE_SECRET`） | 告警，不重试 |
| 500 | 其他服务端错误 | 可重试（幂等键保证安全） |

### 4.4 幂等（同一笔绝不重复入账）

- 工坊侧有 `bridge_sync_events` 表（`model/bridge_sync.go` 的
  `BridgeSyncEvent`，`AutoMigrate` 建表），`idempotency_key` 唯一索引是
  防重复入账的最后防线。
- 同一幂等键、内容完全一致的重发：返回原行，`already_applied: true`，
  不重复入账。同一幂等键、内容不一致：返回 409，不入账。
- 实现只用 GORM 方法（先查后插，插入冲突时再查一次比对），
  不依赖任何方言特有的 SQL 或错误码，SQLite / MySQL / PostgreSQL 通用。
  并发重发下钱包增减和事件行在同一个事务里，要么一起提交要么一起回滚。

### 4.5 入账规则（工坊侧）

- `recharge` / `refund`：增加钱包余额，走 `creditTopUpQuota`，
  与兑换码同一条原子上限保护（余额 + 本次 <= `MaxWalletQuota`，
  超了返回 422）。
- `consume`：扣减钱包余额，同时 `used_quota` 增加同样数值。
  余额可以扣成负数，与 `model.DecreaseUserQuota` 的语义一致——网站侧
  已经预扣过积分，拒绝会导致两边账对不上；负数会在系统日志里告警，
  由人工核对。
- 换算用 `common.WalletQuotaFromDecimalStrict`（decimal 整数乘法，不走
  float），超限返回错误，绝不静默截断。见 `.agents/rules/billing.md`。
- 每笔同步都写一条 `LogTypeTopup` 日志（该类型不受 `LogConsumeEnabled`
  开关影响，一定会落库），内容含事件、积分、quota 变化、入账后余额、
  幂等键、官网用户 ID；另有一行系统日志。日志里不含密钥。

## 5. quota / 积分换算（已定）

### 5.1 基准数字

- 工坊内部：**$1 = 500000 quota**（`common.QuotaPerUnit`，即 $0.002 / 每千 tokens）。
- 汇率按 **¥7.3 = $1** 计：1 quota ≈ ¥0.0000146；¥1 ≈ 68493 quota。
- 网站付费积分的 ¥/积分（以 2026-11-14 网站代码
  `beidou-ai-studio-redesign/app/lib/workflow.mjs` 的
  `PANGU_TOPUP_PRICES` / `PANGU_MEMBERSHIP_TIERS` 为准）：

| 来源 | 价格 | ¥/积分 |
| --- | --- | --- |
| 后续充值（无会员/月费会员） | ¥99 / 1500 积分 | ¥0.0660 |
| 后续充值（年费会员） | ¥70 / 1200 积分 | ¥0.0583 |
| 后续充值（创始会员） | ¥60 / 1200 积分 | ¥0.0500 |
| 月费会员开通赠送 | ¥99 / 1500 积分 | ¥0.0660 |
| 年费会员开通赠送 | ¥2980 / 6000 积分 | ¥0.497 |
| 创始会员开通赠送 | ¥10000 / 24000 积分 | ¥0.417 |

- 网站单张图价格（同上，`settings.price` 默认种子值 **10 积分/张**，
  爆款衍生图等按 `PANGU_COST_SETTINGS` 是 **12 积分/张**）。
  旧版设计文档写的“网站约 ¥5–6/张图”与代码对不上：按月费档算，
  10 积分/张 ≈ ¥0.66/张，12 积分/张 ≈ ¥0.79/张。
  **本文的毛利核算一律用代码里的积分数**；如果小炳哥说的 ¥5–6/张
  是指别的收费口径，请指出来再改。

### 5.2 换算：1 网站积分 = 2500 quota

```
1 积分 = 2500 quota = $0.005 = ¥0.0365（按工坊标价算）
```

定这个数的约束只有一条：**最便宜的那档付费积分也不能亏**。
最便宜的是创始会员后续充值 ¥0.05/积分，即 1 元买 20 积分；
直接往工坊充 1 元得 68493 quota，所以 1 积分最多换 68493 / 20 ≈ 3425 quota，
否则网站充值会比直接充值更划算（套利）。取 2500，留约 27% 的安全边际。

> 注意：年费档 ¥2980/6000（¥0.497/积分）是 7.5 倍于月费档的价格——
> 年费会员买的是“一年会员身份”，积分只是赠送部分，不是按积分计价。
> 换算按最便宜的付费档（创始充值 ¥0.05/积分）定，所以任何一档都不会亏。

### 5.3 充值档位核算（工坊标价口径的毛利下限）

“毛利下限”的意思是：即使上游成本等于大炮家「充值」标价（即零差价），
这笔充值至少还能剩这么多；实际上 APIMODELS 的上游价低于标价，
真实毛利只会更高。

| 充值 | 积分 | 换算 quota | 折合美元 | 折合人民币（标价口径） | 毛利下限 |
| --- | --- | --- | --- | --- | --- |
| ¥99 | 1500 | 3,750,000 | $7.50 | ¥54.75 | 44.7% |
| ¥70（年费后续充值） | 1200 | 3,000,000 | $6.00 | ¥43.80 | 37.4% |
| ¥60（创始后续充值） | 1200 | 3,000,000 | $6.00 | ¥43.80 | 27.0% |
| ¥2980（年费会员） | 6000 | 15,000,000 | $30.00 | ¥219.00 | 92.7% |
| ¥10000（创始会员） | 24000 | 60,000,000 | $120.00 | ¥876.00 | 91.2% |

### 5.4 单张图核算（banana2-official-1k，「充值」价 ¥0.5/次）

¥0.5/次 = $0.0685 = **34247 quota/次**（标价口径的单次成本）。

| 网站扣费 | 工坊扣 quota | 月费档收入/张 | 年费后续充值收入/张 | 创始后续充值收入/张 | 毛利下限（月费/年费后续/创始后续） |
| --- | --- | --- | --- | --- | --- |
| 10 积分/张（默认） | 25,000 | ¥0.66 | ¥0.58 | ¥0.50 | 24% / 14% / **0%** |
| 12 积分/张（爆款衍生） | 30,000 | ¥0.79 | ¥0.70 | ¥0.60 | 37% / 29% / 17% |

- 每 ¥99 充值可出图：1500 / 10 = **150 张**（标价成本 150 × ¥0.5 = ¥75，
  毛利下限 24%）；按 12 积分/张是 125 张（成本 ¥62.50，毛利下限 37%）。
- 最薄的一档是**创始后续充值 + 默认 10 积分/张**：收入 ¥0.50/张，
  与标价成本 ¥0.5 打平，利润全靠 APIMODELS 上游价低于标价的那部分差价。
  如果上游差价收窄，这一档会先亏。缓解办法（二选一，等小炳哥定）：
  (a) 网站默认单张价从 10 积分提到 **12 积分**（与爆款衍生图一致，
  也与年费“6000 积分约 500 张图”的文案一致：6000/12 = 500）；
  (b) 接受，靠 APIMODELS 差价覆盖。
- 套利检查：创始充值档 1 元买 20 积分 = 50000 quota，
  直接往工坊充 1 元得 68493 quota——网站充值买到的 quota 比直接充值
  少 27%，不存在“网站充值、工坊直调”的套利。

### 5.5 视频：v1 不同步（待定价确认）

- 网站视频按 20 积分/秒（Seedance Fast 5 秒 = 100 积分）收费：
  每秒收入月费档 ¥1.32、创始档 ¥1.00。
- 大炮家视频「充值」价还没确认（定价工作流在并行更新
  `BEIDOU-CHANNELS.md`，本文不动它）。如果「充值」是「标准」的 4–6 倍
  （wan3.0-fast「标准」¥0.45/秒 → 「充值」约 ¥1.8–2.7/秒），
  视频按现有积分价会亏钱。
- 所以 **v1 只同步图片/模板类消费**；视频消费的同步等定价确认后，
  由网站提价或工坊定好视频模型价再接。网站视频目前跑的还是 mock
  服务商（`mock-standard` / `mock-fast` / `mock-fail`），没有真实
  成本发生，不影响 v1 上线。

## 6. 只同步花钱买来的积分

| 网站积分来源 | 同步到工坊？ | 原因 |
| --- | --- | --- |
| 微信充值到账（`decideRecharge`，含会员开通赠送） | **同步** | 花钱买的 |
| 卡密兑换（`redeem`） | **同步** | 卡密是卖出去的 |
| 注册赠送 100 积分（`register`） | 不同步 | 免费的；同步的话每注册一个账号就白送 250000 quota（$0.50，标价 ¥3.65），是小炳哥的获客成本，由网站自己承担 |
| 店主手动 grant（`grantPoints`） | 不同步 | 人工 goodwill，网站本地积分；如果是代收的付费订单，管理员直接在工坊后台加款 |
| 管理员手动开通会员（`grantMembership`） | 不同步 | 无收款；同上，付费的走微信充值流程 |

- 网站余额（含免费积分）和工坊钱包一定会对不上，差额就是免费积分部分，
  这是设计如此，不是对账失败。对账只对“付费积分”口径（见 §7.5）。
- 消费时网站按资源包优先级扣费，注册赠送包（priority 0）先扣；
  同步的 `consume` / `refund` 只算其中**付费包出的那部分**，
  免费包出的部分不发同步事件（见 §7.3）。

## 7. 网站侧接入范围（待网站 PR，不改网站代码的范围说明）

以下文件、函数名以 `~/workspace/beidou-ai-studio-redesign/`
（2026-11-14 最新工作 copy，`app/lib/core.mjs`、`app/lib/api.mjs`、
`app/lib/workflow.mjs`）为准；网站 PR 以线上仓库
`BY-BINZ/beidou-ai-studio` 为准，函数名如有出入以线上为准。

### 7.1 新增：工坊同步客户端（建议 `app/lib/bridge.mjs`）

- 读环境变量 `BEIDOU_BRIDGE_BASE_URL`（`https://api.beidouku.com`）和
  `BEIDOU_BRIDGE_SECRET`（与工坊 `.env` 里的值一致）。
- `POST {BASE_URL}/api/bridge/sync`，请求头
  `X-Beidou-Bridge-Secret: <secret>`，`Content-Type: application/json`，
  超时建议 10 秒。
- 5xx / 网络错误 / 超时：指数退避重试（幂等键保证重试安全）。
  409 / 400 / 401 / 403 / 404 / 422：不重试，记日志 + 告警（见 §4.3 表）。
- 工坊不可达时事件不能丢：落本地待办（outbox）随后补发；
  充值类事件尤其不能丢（钱收了、积分没到工坊账上就是坏账）。

### 7.2 同步点（6 个，按调用顺序）

| # | 网站位置 | 事件 | 幂等键 | 积分 |
| --- | --- | --- | --- | --- |
| 1 | `core.mjs` `decideRecharge`，充值记录置为 `confirmed` 的事务提交后 | `recharge` | `website-recharge:<wechat_recharges.id>` | `r.points`（会员开通和后续充值都一样） |
| 2 | `core.mjs` `redeem`，卡密兑换事务提交后 | `recharge` | `website-redeem:<redeem_history.id>` | `row.points` |
| 3 | `core.mjs` `submit`，每张图的 `deductFromPacks` 之后 | `consume` | `website-job:<job.id>` | 该笔预扣中**付费包出的部分**（见 §7.3） |
| 4 | `core.mjs` `chargeGeneration`（`/api/charge`），`deductFromPacks` 之后 | `consume` | `website-charge:<jobId>` | 同上，付费包出的部分 |
| 5 | `core.mjs` `processOne` 失败分支（任务置 `failed`、退回预扣时） | `refund` | `website-refund:<job.id>` | 退回金额中付费包的部分 |
| 6 | `core.mjs` `refundGeneration`（`/api/refund`），退款事务提交后 | `refund` | `website-refund:<jobId>`，无 `jobId` 时 `website-refund:noid:<uid>` | 同上 |

- 消费只在**预扣时**同步一次（#3、#4）；任务成功（`processOne` 成功分支、
  `completeGeneration`）不再发事件。失败才发 `refund`（#5、#6），
  与网站现有账本（预扣 → 成功不退 / 失败全额退）完全一致。
- #6 已有防重（同一 `job_id` 有正数账本记录即视为已退），保留它，
  再加桥接幂等键，双重保险。
- `grantPoints`、`grantMembership`、`register` 不发事件（见 §6）。

### 7.3 付费部分怎么算

- `deductFromPacks` 写 `job_pack_allocations`（每笔预扣从哪个包出了多少）；
  `restoreAllocations` 按包退回。同步积分 = 该笔涉及的分配记录里
  **付费包**的出数之和。
- 包的付费属性（按当前 `source` 字符串判断，网站 PR 里建议改成
  `resource_packs` 上显式的付费标记，字符串匹配太脆）：
  - 付费：`微信充值`、`卡密兑换 (...)`、会员开通赠送（`applyMembership`
    写的 `<档位名>赠送积分`，如 `普通会员赠送积分`）。
  - 免费：`注册赠送`；`grantPoints` 建的包（`source` 是管理员备注，
    默认 `店主手动充值`）。
- 如果一笔预扣全部由免费包覆盖，**不发**同步事件（工坊侧不扣钱，
  成本由小炳哥承担，上限就是免费积分的总额）。

### 7.4 账号映射

- 网站 `users` 表新增 `relay_user_id`（整数）列（或单独的映射表），
  存放工坊侧用户 ID。
- 同步请求优先传 `relay_user_id`；没有映射的账号先传 `email`，
  工坊按邮箱解析，成功后网站把返回的 `relay_user_id` 存下来，
  下次不再传邮箱。
- 上线前先给小炳哥自己的账号建好映射（按邮箱找一次即可）；
  之后新用户注册时在工坊侧也建账号（方案 A 的账号中心落地方式
  由网站 PR 定，v1 只要求映射字段 + 回填）。

### 7.5 对账

- 每日对账（建议定时任务）：对每个有映射的用户，
  工坊 `bridge_sync_events` 按用户汇总的 `quota_delta` 之和，
  应等于网站侧该用户**付费积分净变化 × 2500**
  （付费充值 − 付费消费 + 付费退款；免费积分不计）。
- 差额只可能来自：同步事件丢失（查 outbox/日志补发）、
  409 冲突未处理、或网站侧付费口径算错。三种都要人工核对，
  以工坊钱包为准。

## 8. 工坊侧改动清单（本次）

| 文件 | 改动 |
| --- | --- |
| `model/bridge_sync.go`（新） | `BridgeSyncEvent` 模型 + `ApplyBridgeSyncEvent`（幂等 + 钱包增减 + 审计）；换算常量 `BridgeQuotaPerPoint = 2500`、`MaxBridgePointsPerEvent = 100000` |
| `controller/bridge_sync.go`（新） | `BridgeSync` handler：密钥 + IP 白名单鉴权、入参校验、按 ID 或邮箱解析用户、错误码映射 |
| `model/bridge_sync_test.go`（新） | 换算表测试 + 入账/幂等/冲突/消费/退款/超限/负数/未知用户测试（testify require/assert） |
| `model/main.go` | `AutoMigrate` 增加 `&BridgeSyncEvent{}` |
| `router/api-router.go` | 增加 `POST /api/bridge` 分组 → `/sync`（`CriticalRateLimit`，不走用户会话） |
| `.env.example` | 增加 `BEIDOU_BRIDGE_SECRET` / `BEIDOU_BRIDGE_ALLOWED_IPS`（占位，无真实值） |
| 本文档 | 状态改为已实现，补齐契约、换算、对账与网站接入范围 |

- 没动：`HANDOFF.md`、`BEIDOU-CHANNELS.md`、`BEIDOU-PRICING-CONFIG.md`、
  任何前端定价文件、网站仓库文件。没放任何真实密钥。
- 没碰上游归属：QuantumNous / new-api 的页脚、NOTICE、LICENSE、模块路径
  原样保留。

### 验证记录（2026-11-14，本机）

- Go 1.26.0 现场安装于 `~/workspace/go-install/go`（tarball SHA256
  与 `dl.google.com` 发布的校验值一致：`aac1b08a…88235`）。
  首次 `go build ./...` 因 Go 默认临时目录在 512M 的 `/tmp`（tmpfs）
  被写满而失败，改 `TMPDIR=~/workspace/go-install/tmp` 后通过。
- `go build ./...`：通过（exit 0）。
- `go vet ./model/ ./controller/`：通过（exit 0）。
- `go test ./model/ -run 'TestBridgeQuotaForPoints|TestApplyBridgeSyncEvent' -v -count=1`：
  通过（换算表 7 组 + 入账/幂等/冲突/消费/退款/超限/负数/未知用户 7 组，
  SQLite 内存库）。
- `go test ./model/ -count=1`：通过（`ok github.com/QuantumNous/new-api/model 9.731s`）。
- `go test ./controller/ -count=1`：通过（`ok …/controller 914.403s`，
  `-timeout 30m`）。注意：默认 10 分钟超时下这个 suite 在本机小 VM 上
  会跑满 600 秒被杀掉（第一次跑就是这样），不是用例失败——suite 本身
  在这台 1.5 核 VM 上就要约 15 分钟。
- Docker 未安装（`docker`、`podman`、`nerdctl`、`dockerd` 均无，
  `/var/run/docker.sock` 不存在），**docker-compose 烟测不可行**，
  未做。部署后由 Grok Bot 在服务器上做 §8.1 的烟测。

### 8.1 部署后烟测（给 Grok Bot，部署时按顺序做）

1. 合并含本改动的分支后部署，确认启动日志无迁移报错，
   数据库里有 `bridge_sync_events` 表。
2. 在宝塔 `.env` 里设 `BEIDOU_BRIDGE_SECRET`（`openssl rand -hex 32`）
   和 `BEIDOU_BRIDGE_ALLOWED_IPS`（官网服务器出口 IP），重启工坊。
3. 用小炳哥自己的账号先测一笔（不要用客户账号）：
   - `recharge` 1 积分 → 钱包 +2500 quota，`balance_after` 正确；
     同一幂等键重发 → `already_applied: true`，余额不变。
   - 密钥错 → 401；白名单外 IP → 403；密钥未设 → 503。
4. 网站 PR 上线后，对一笔真实微信充值全流程走一遍，
   再按 §7.5 跑一次对账。

## 9. 三库验证缺口（必须明说）

- 本次只在 **SQLite**（内存库，`model` 测试）上验证过。
- 新增的表 + 唯一索引 + `lockForUpdate`（MySQL/PostgreSQL 发
  `SELECT ... FOR UPDATE`，SQLite 跳过）**没有在真实 MySQL /
  PostgreSQL 上跑过**。代码层面没有方言特有的 SQL（只用 GORM 方法，
  幂等冲突不解析数据库错误码），但按仓库规则（`AGENTS.md`），
  这不等于跨库兼容已验证。
- **不要声称三库兼容**。部署前必须在 MySQL ≥ 5.7.8 和
  PostgreSQL ≥ 9.6 各跑一次：建表（含唯一索引）+ 一笔 recharge +
  一笔 consume + 一次幂等重发 + 一次并发重发，确认都不重复入账。
  部署环境是 Postgres（`docker-compose.yml` 默认），所以 Postgres
  那一遍最重要。

## 10. 不做的事（v1）

- 不实现任何同步接口以外的东西、不改网站代码、不改画布软件
- 不接 Epay / 微信 / 支付宝在线支付
- 不动现有网站积分的档位和退款规则
- 不做网站到工坊的反向同步（工坊侧直接消费不回写网站积分；
  网站余额只增不减的唯一例外是用户直接在工坊 API 上消费——
  这种情况余额以工坊为准，网站显示会偏高，对账时按 §7.5 的
  付费口径核对，差额即用户在工坊直调花的钱）

## 11. 还要定的事

1. **视频定价**（§5.5）：等定价工作流确认大炮家视频「充值」价，
   再定网站视频积分价 / 工坊视频模型价 / 是否接视频同步。
2. **创始后续充值 + 10 积分/张的零毛利**（§5.4）：网站默认单张价
   10 → 12 积分，还是接受靠 APIMODELS 差价覆盖。
3. **“¥5–6/张图”**（§5.1）：与网站代码（10–12 积分/张 ≈ ¥0.66–0.79）
   对不上，请小炳哥确认是指别的收费口径还是口误。
4. **网站 PR 的账号映射落地**（§7.4）：新用户注册时工坊账号怎么建、
   `relay_user_id` 字段还是映射表。
5. **三库验证**（§9）：部署前 MySQL + PostgreSQL 各跑一遍。
