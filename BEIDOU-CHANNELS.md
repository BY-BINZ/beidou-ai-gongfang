# 北斗AI工坊 — 渠道与定价配置

> 仓库里不放任何真实 key。所有 key 都在部署后由管理员在后台填，本文只写怎么配。
> 定价以人民币（¥）写，new-api 内部按美元计费，换算见第 3 节。

## 1. 主渠道：聚合平台 APIMODELS（一个 key 通全部模型）

- 平台：APIMODELS（apimodels.app），167+ 模型
- 接口：`https://api.apimodels.app/v1`，OpenAI 兼容 + Anthropic 兼容
- 覆盖：GPT、Claude、Gemini、DeepSeek、Qwen、Seedream / Seedance（即梦）、Flux、Wan、Kling、MiniMax、Veo 等
- 充值：支付宝，最低 $10（约 ¥70）起充；国内直连，不用代理
- 计费：调用失败不扣费；平台有自动故障转移
- 后台配置：控制台 → 渠道 → 新增渠道 → 类型选 OpenAI 兼容 → 填 Base URL `https://api.apimodels.app/v1` + 在 APIMODELS 注册后得到的 key → 勾选要开放的模型 → 优先级设为最高（最先走它）
- 上游 key 的获取和充值由小炳哥在 APIMODELS 官网自己操作，不要把 key 发给任何人、不要贴进仓库或聊天记录

## 2. 备用渠道：小炳哥自己的 key（主渠道出问题才走）

- 已有的 key：Gemini、OpenAI、豆包、Qwen、DeepSeek
- 后台配置：按厂商各建一个渠道（类型选对应厂商），填各自的官方 Base URL + key，优先级低于 APIMODELS
- 注意：服务器在国内，直连 Google / OpenAI 需要代理；走 APIMODELS 不需要代理（它那边处理上游）。如果以后要直连上游，先解决服务器代理再配，不要硬填。

## 3. 定价：照大炮家（api.dapaoai.com/pricing）设

### 3.1 参考价目表（标准模式，2026-11-14 从大炮家模型广场页抄录）

模型总数 68：文本 27、图片 27、视频 12、音频 2。厂商：OpenAI 22、Google 17、Anthropic 6、ByteDance 7、Alibaba 7、DeepSeek 2、MiniMax 3、xAI 2、Moonshot 1。

| 模型 | 价格（¥） |
| --- | --- |
| banana2-official-1k / 2k / 4k | 0.08 / 0.12 / 0.18 每次 |
| bananaPRO | 0.08 每次 |
| bananaPRO-official 1k / 2k / 4k | 0.15 / 0.18 / 0.27 每次 |
| gemini-nano-banana-2.1 | 0.18 每次 |
| claude-opus-5（输入/输出） | 1.8 / 9 每百万 tokens |
| claude-opus-5-5（输入/输出/缓存） | 3.75 / 18.75 / 0.2 每百万 tokens |
| claude-opus-4-8（输入/输出） | 1.8 / 9 每百万 tokens |
| claude-sonnet-5（输入/输出） | 0.75 / 3.6 每百万 tokens |
| claude-fable-5（输入/输出） | 9 / 45 每百万 tokens |
| claude-fable-5-1（输入/输出/缓存） | 8 / 40 / 1 每百万 tokens |
| gemini-3.1-pro-preview（输入/输出） | 1.3 / 7.75 每百万 tokens |
| deepseek-v4-pro（输入/输出） | 2.7 / 8.1 每百万 tokens |
| deepseek-flash（输入/输出/缓存） | 0.9 / 3 / 0.03 每百万 tokens |
| qwen3-max（输入/输出/缓存） | 1.5 / 5.6 / 0.15 每百万 tokens |
| qwen3-next-2.5（输入/输出/缓存） | 1.5 / 7.5 / 0.15 每百万 tokens |
| qwen3-next-80b（输入/输出/缓存） | 0.15 / 0.99 / 0.015 每百万 tokens |
| grok-4 / grok-4.1（输入/输出） | 6.25 / 25；3.75 / 18.75 每百万 tokens |
| kimi-k3（输入/输出） | 1.8 / 7.5 每百万 tokens |
| minimax-m2.5（输入/输出） | 0.25 / 1 每百万 tokens |
| doubao-seedance-2.0 / 2.5 | 按需动态计价 |
| wan3.0 / wan3.0-fast | 0.38 / 0.45 每秒 |
| wan3.0-video | 0.7 每秒 |
| wan3.0-video-official 480P / 720P / 1080P | 0.45 / 0.75 / 1.6 每秒 |
| wan3.0-prime-official 480P / 720P / 1080P | 0.7 / 1.2 / 2.2 每秒 |
| doubao-asr-2.0 | 0.3 每音频小时 |
| suno_music | 0.9 每次 |
| whisper-1（输入/输出） | 54 / 54 每百万 tokens |

### 3.2 换算成 new-api 后台倍率（部署后在后台填）

- new-api 的 token 计费基准：倍率 1 = $0.002 / 每千 tokens（即 $2 / 每百万 tokens）
- 汇率按 ¥7.3 = $1 计
- 文本模型倍率 = ¥每百万 tokens ÷ 14（例：claude-opus-5 输入 ¥1.8 → 倍率约 0.13；输出 ¥9 → 倍率约 0.64）
- 图片/视频按次、按秒的固定价：美元价 = ¥价 ÷ 7.3，在后台按模型的固定价格项填
- 后台位置：控制台 → 渠道 → 渠道倍率 / 模型倍率；也可以直接用内置计费表达式（见仓库 `.agents/rules/billing.md`，改之前先读它）

### 3.3 ⚠️ 待确认：大炮家页面有两种价格，别直接抄

大炮家模型广场页同时显示「标准」和「充值」两种价格，同一模型能差 4–6 倍（例：banana2-official-1k 标准 ¥0.08、充值 ¥0.5；claude-fable-5 输入标准 ¥9、充值 ¥36），页面上没写哪种是真实扣费、¥ 和额度的换算关系。

**所以第一版没有把任何价格写进代码**（`setting/billing_setting/builtin_billing.go` 一个字没动）。上线前小炳哥要先确认：

1. 大炮家「标准」价是不是真实扣费价（最可能：标准 = 对外售价；充值 = 充值后钱包余额的另一种显示）
2. 确认后按 3.2 的公式在后台填倍率，先拿一个小模型实测一笔，看扣费对不对得上
3. 错了就改倍率，不要改代码

## 4. 充值（第一版）：兑换码 + 管理员手动加款

- 不接任何在线支付（Epay 微信/支付宝后面再接，只写文档，不配密钥）
- 流程：管理员在后台生成兑换码 → 把码发给客户（微信 bing123023）→ 客户在控制台「钱包 → 兑换」里填码到账
- 管理员也可以直接在后台给指定用户加款/扣款
- 新用户奖励：第一版不设（大炮家是新用户送 $1.00，我们上线后再定要不要送）

## 5. 后台还要顺手配好的几项

- 系统名称：北斗AI工坊（默认已是这个，检查一下）；Logo：默认已是北字标
- 关于页（联系我们）：在后台「设置 → 关于」里填联系方式，写上微信 bing123023（加微信请备注“API 中转”）
- 文档链接：默认指向上游文档（docs.newapi.pro）；等北斗自己的文档有了再改
- 模型广场首页的常用模型价格：以第 3 节为准，确认后再改文案里的数字
- ComfyUI 节点：顶栏没放这一项（北斗还没有对应的节点仓库），要不要做由小炳哥定
