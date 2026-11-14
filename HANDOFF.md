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
3. 定价：先看 `BEIDOU-CHANNELS.md` 第 3.3 节，确认大炮家「标准」价是不是真实扣费价，确认后再按第 3.2 节公式填倍率；填完拿一个小模型实测一笔，看扣费对不对得上
4. 充值：生成一批兑换码备用（第一版只用兑换码 + 管理员手动加款）
5. 测试：注册一个普通账号 → 兑换码到账 → 生成一个 key → 调一次文本模型 + 一次图片模型，确认出结果、扣费正常

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

- 大炮家「标准」vs「充值」两种价格，哪个是真实扣费价（见 BEIDOU-CHANNELS.md 3.3）
- APIMODELS 的模型 ID 是否和文案里写的一致（部署后在后台模型列表里核对）
- ComfyUI 节点顶栏要不要做（现在没放）
- 积分打通选方案 A 还是方案 B、quota/积分换算（见 BEIDOU-POINTS-BRIDGE.md）
- 新用户要不要送体验额度（大炮家送 $1.00，我们第一版不送）

## 6. 验证结果（本次 PR）

- 前端 `bun run build` 通过；`bun check -b` 类型检查通过；lint 通过
- 后端 `go build ./...` 通过（或见 PR 正文说明验证环境）
- 全仓库 grep：无真实密钥、无「妙笔/大炮/DreamBrush/paolaoshi」品牌词、无编造模型名；页脚 AGPL 出处保留
- 注意：以上验证在 Muse 的 Linux 环境跑的，Windows/Mac 不涉及；上线后以服务器实测为准
