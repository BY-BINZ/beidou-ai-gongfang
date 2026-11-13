# HANDOFF — 北斗AI工坊部署（给 Grok Bot）

> 本文件是部署交接单：仓库改了什么、怎么部署、部署后配什么。部署由 Grok Bot 在小炳哥服务器上做，Muse 不上线。

## 1. 这是什么

- 仓库：BY-BINZ/beidou-ai-gongfang（本分支改版，目标 main）
- 基线：QuantumNous/new-api tag `v1.0.0-rc.51`（2026-11-13 发布），镜像 pin 死这个版本，不跟 latest
- 用途：北斗自己的 AI 模型中转站，域名 api.beidouku.com，给北斗官网、无限画布、画布软件供算力
- 上游出处：页脚 AGPL 出处（ProjectAttribution + 指向 QuantumNous/new-api 的链接）一个字没动；LICENSE、NOTICE、Go module 路径、Docker 镜像名 `calciumion/new-api` 都没动；只改了展示品牌（站名、标题、logo、主题色、导航、首页文案）

## 2. 本次改了什么

- 品牌：站名默认「北斗AI工坊」（后台设置 + 代码默认值），浏览器标题改，logo/favicon 换成墨色圆角方块 + 暖金「北」字 SVG（`web/public/logo.svg`、`favicon.svg`）
- 主题：暖纸风（纸色 #F4F1EB、墨色 #171410、暖金 #C9A227），浅色默认，深色为暖炭色；改 `web/src/styles/theme.css` 的 `:root` 与 `.dark`
- 顶栏：新增外链「无限画布」→ https://www.beidouku.com/canvas、「全系资源站导航」→ https://www.beidouku.com（新标签页）；「联系我们」→ /about（内容在后台配，微信 bing123023）；ComfyUI 节点没放（北斗暂无对应仓库，等小炳哥定）
- 首页：Hero、三大能力（统一 API 入口 / 模型路由 / 用量可见）、资源站区块、常用模型（文本/图片/视频，真实模型名 + 参考价）、三步开始、创作激励；文案北斗自己写，没抄大炮家原句
- 部署：`docker-compose.yml`（镜像 pin v1.0.0-rc.51，密码/SESSION_SECRET 全部走 `.env` 必填项，没填启动即报错）；`.env.example` 顶部加了必填项说明
- 文档：`BEIDOU-CHANNELS.md`（渠道 + 定价 + 充值）、`BEIDOU-POINTS-BRIDGE.md`（积分打通设计，第一版不实现）、本文件
- 没改：任何计费代码（`builtin_billing.go` 未动）、任何密钥（仓库无真实 key）、数据库结构

## 2b. 本次追加（PR #2，分支 `feature/beidou-pricing-bridge`，基于 PR #1 分支）

- 定价（售价 = 大炮家「充值」列，小炳哥 2026-11-14 定）：`BEIDOU-CHANNELS.md` §3.1 重写，§3.3 标记已决定；新建 `BEIDOU-PRICING-CONFIG.md`（完整后台配置单：每个模型 → 倍率或固定美元价 + 单位 + 填入位置；充值档位 ¥99→1500 积分、¥2980→6000 积分作兑换码面额）；首页常用模型价全部刷成充值价（`popular-models.tsx`：文本 6 个、图片 5 个按 BEIDOU-PRICING-CONFIG.md 实测值改；视频 4 个价充值与标准相同，未变；下架的 qwen3-max → gpt-6.1-sol、grok-4.1 → grok-4.6）。
  - 充值列已于 2026-11-14 07:00 实读全表（Recharge 模式、/1M 单位，68 个模型；模型清单有变，见 BEIDOU-PRICING-CONFIG.md §0）。⚠️ 但页面未说明哪一档是实际扣费标准——实测一笔时核对实际扣费是否与 Recharge 列一致；kimi-k3 倍数异常（16.7 倍）启用前再核对；seedream-v5-pro（2 个）与 doubao-seedance-2.0/2.5 无数字价，先不上架，等计费表达式确认。
- 积分打通（方案 A，工坊钱包为唯一账本，已实现工坊侧）：新增 `POST /api/bridge/sync`（`controller/bridge_sync.go` + `model/bridge_sync.go`，密钥头 `X-Beidou-Bridge-Secret` + IP 白名单 `BEIDOU_BRIDGE_ALLOWED_IPS`，幂等键 + `bridge_sync_events` 表，`model/main.go` 的 `AutoMigrate` 建表；换算 **1 网站积分 = 2500 quota**，见 `BEIDOU-POINTS-BRIDGE.md` §5）。网站侧未改代码，接入范围（6 个同步点、付费口径、对账方法）见该文档 §7，等网站 PR。桌面画布软件不在本次改动内。
  - ⚠️ 三库验证缺口：只在 SQLite 上验证过；MySQL / PostgreSQL 没跑过（部署环境是 Postgres，部署前必须在 Postgres 上跑建表 + 一笔 recharge + 一笔 consume + 幂等重发 + 并发重发）。视频消费 v1 不同步（充值视频价未确认，见下）。
- 没改：任何密钥（仓库无真实 key，`.env.example` 只加了 `BEIDOU_BRIDGE_SECRET` / `BEIDOU_BRIDGE_ALLOWED_IPS` 占位）；页脚 AGPL 出处、QuantumNous/new-api 引用原样保留。

## 3. 部署步骤

### 3.1 服务器准备

- 已装 Docker + Docker Compose（宝塔面板里确认）
- 域名 api.beidouku.com 解析到服务器，宝塔申请证书（Let's Encrypt 即可）
- 宝塔反代：api.beidouku.com → http://127.0.0.1:3000
  - 必须开 WebSocket / 流式转发：`proxy_http_version 1.1` + `Upgrade $http_upgrade` + `Connection "upgrade"`
  - 上传限额：`client_max_body_size 100m`
  - 超时留足：流式生成可能持续几分钟，反代超时建议 300 秒以上

### 3.2 启动

```bash
cd /www/wwwroot/beidou-ai-gongfang   # 以实际部署目录为准
cp .env.example .env
# 填好 .env 里的 3 个值：POSTGRES_PASSWORD、REDIS_PASSWORD、SESSION_SECRET
# （随机长字符串，例如 openssl rand -hex 32；SESSION_SECRET 部署后不要随便改）
docker compose up -d
docker compose ps        # 三个容器都应为 Up
docker compose logs -f new-api   # 看启动日志，无报错后继续
```

### 3.3 首次打开

- 打开 https://api.beidouku.com，按设置向导建立管理员账号（第一个账号即管理员）
- 检查：站名显示「北斗AI工坊」、logo 是北字标、主题是暖纸色、顶栏有无限画布/全系资源站导航/联系我们

### 3.4 部署后后台配置（按顺序）

1. 设置 → 关于：填联系方式，写上微信 bing123023（加微信请备注“API 中转”）
2. 渠道：按 `BEIDOU-CHANNELS.md` 第 1–2 节配
   - 主渠道 APIMODELS：Base URL `https://api.apimodels.app/v1`，key 由小炳哥在 APIMODELS 官网注册充值后提供（不要写进仓库）
   - 备用渠道：Gemini / OpenAI / 豆包 / Qwen / DeepSeek 各建一个，优先级低于主渠道
3. 定价：按 `BEIDOU-PRICING-CONFIG.md` 填（售价 = 大炮家「充值」列，已定；全表已于 2026-11-14 07:00 实读）。填完拿一个小模型实测一笔，核对实际扣费是否与 Recharge 列一致（页面未说明哪档是实际扣费标准）
4. 充值：生成一批兑换码备用（第一版只用兑换码 + 管理员手动加款）；兑换码面额按 ¥99→1500 积分、¥2980→6000 积分
5. 积分打通（新增）：`.env` 里设 `BEIDOU_BRIDGE_SECRET`（`openssl rand -hex 32`）和 `BEIDOU_BRIDGE_ALLOWED_IPS`（官网服务器出口 IP，英文逗号分隔），重启工坊；按 `BEIDOU-POINTS-BRIDGE.md` §8.1 烟测（先确认 `bridge_sync_events` 表已建，再用小炳哥自己的账号测一笔 recharge 1 积分 + 幂等重发 + 401/403/503）；网站 PR 上线后再走一笔真实微信充值全流程 + 对账
6. 测试：注册一个普通账号 → 兑换码到账 → 生成一个 key → 调一次文本模型 + 一次图片模型，确认出结果、扣费正常

## 4. 备份与回滚

- 备份内容：PostgreSQL 数据卷 `pg_data` + `./data` 目录（上传文件、日志）
- 备份命令（部署目录下）：
  ```bash
  docker compose exec postgres pg_dump -U root beidou-gongfang > backup-$(date +%Y%m%d).sql
  tar czf data-backup-$(date +%Y%m%d).tar.gz data/
  ```
- 建议：上线前备一次，之后每周备一次；升级镜像前必备
- 回滚：`docker compose down` 后恢复备份的卷/数据，或把镜像 tag 改回上一个能用的版本重新 `up -d`
- 升级：不要直接改 `latest`；新版本先在测试环境验证，再改 compose 里的 tag

## 5. 待小炳哥定的事（部署不挡，但上线前要确认）

- 大炮家「充值」列已实读全表（2026-11-14 07:00）；待办：实测一笔核对实际扣费是否与 Recharge 列一致；kimi-k3 启用前再核对一次价格；seedream-v5-pro（2 个）与 doubao-seedance-2.0/2.5 的计费表达式确认后再上架
- APIMODELS 的模型 ID 是否和文案里写的一致（部署后在后台模型列表里核对）
- ComfyUI 节点顶栏要不要做（现在没放）
- 积分打通：视频定价（视频消费 v1 不同步，等充值视频价确认后再定）；创始后续充值 + 10 积分/张的零毛利——网站默认单张价 10 → 12 积分，还是接受靠 APIMODELS 差价覆盖；“¥5–6/张图”与网站代码（10–12 积分/张 ≈ ¥0.66–0.79）对不上，请确认口径；网站 PR 的账号映射落地（`relay_user_id` 字段还是映射表）；部署前 MySQL + PostgreSQL 各跑一遍三库验证（见 `BEIDOU-POINTS-BRIDGE.md` §9）
- 新用户要不要送体验额度（大炮家送 $1.00，我们第一版不送）
- 合并顺序：先合 PR #1（改版），再合 PR #2（定价 + 积分打通，分支 `feature/beidou-pricing-bridge`，基于 PR #1 分支）

## 6. 验证结果（本次 PR）

- 前端 `bun run build` 通过；`bun check -b` 类型检查通过；lint 通过
- 后端 `go build ./...` 通过（或见 PR 正文说明验证环境）
- 全仓库 grep：无真实密钥、无「妙笔/大炮/DreamBrush/paolaoshi」品牌词、无编造模型名；页脚 AGPL 出处保留
- 注意：以上验证在 Muse 的 Linux 环境跑的，Windows/Mac 不涉及；上线后以服务器实测为准

## 6b. 验证结果（PR #2：定价 + 积分打通）

- 前端：`bun check -b` 通过（1,498 文件，0 错误）；oxlint 改动文件 0 警告 0 错误；`src/features/home/components/sections/__tests__/beidou-sections.test.tsx` 2/2 通过；`bun run build` 退出码 0
- 后端：`go build ./...` 通过（exit 0，本机 Go 1.26.0）；`go vet ./model/ ./controller/` 通过；`go test ./model/ -run 'TestBridgeQuotaForPoints|TestApplyBridgeSyncEvent'` 通过（换算表 7 组 + 入账/幂等/冲突/消费/退款/超限/负数/未知用户 7 组，SQLite 内存库）；`go test ./model/ -count=1` 通过（9.731s）；`go test ./controller/ -count=1` 通过（914.403s，`-timeout 30m`，本机小 VM 上默认 10 分钟超时不够）
- 未验证：Docker 不可用（本机无 docker/podman），docker-compose 烟测没做；MySQL / PostgreSQL 没跑过（见 §2b 三库验证缺口）；`POST /api/bridge/sync` 没有真实 HTTP 烟测（部署后按 `BEIDOU-POINTS-BRIDGE.md` §8.1 做）
- 注意：Go 1.26.0 是现场装在 `~/workspace/go-install/go` 的（不在仓库里）；首次 `go build` 因 `/tmp` 只有 512M 被写满而失败，改 `TMPDIR=~/workspace/go-install/tmp` 后通过
