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

### 3.1 售价表：充值价为准（2026-11-14 小炳哥决定）

**售价 = 大炮家「Recharge」模式下的价格。** Standard 模式只作参考对照。

> ✅ **已实读全表**：2026-11-14 07:00（北京时间）实读 https://api.dapaoai.com/pricing 成功，页首共 68 个模型。结构纠正：页面不是每模型两列价格，而是一个「Price display mode」切换（Standard / Recharge）加「Token unit」切换（/1M 或 /1K）；以下全部为 Recharge 模式、单位 /1M 时的价格。**页面未说明哪一档是实际扣费标准**——小炳哥已决定售价按 Recharge 列走；实测一笔时仍要核对实际扣费是否与 Recharge 列一致。
>
> 完整逐行表（含换算成后台倍率/美元价）见 **BEIDOU-PRICING-CONFIG.md**。下面只列关键行，其余以那份文件为准。
>
> 模型清单已更新：新增 gpt-6 系列、gemini-3.5/3.6/3.7/3.8-flash、gemini-4-argon、grok-4.5/4.6、gpt-image-2.5/2.6 系列、qwen-image-3.0 系列、seedream-v5-pro；旧版的 qwen3-max、qwen3-next 系列、grok-4/4.1 已不在定价页上。部署后在后台按 BEIDOU-PRICING-CONFIG.md 核对。
>
> 倍数并不统一（多数约 4 倍，banana2-official-1k 6.25 倍，kimi-k3 16.7 倍），不要按倍数推算。无数字价的行先不上架：seedream-v5-pro（2 个，Dynamic Pricing）、doubao-seedance-2.0/2.5（特殊计费表达式，见 BEIDOU-PRICING-CONFIG.md §2 末）。

| 模型 | 单位 | 售价：充值（¥） | 状态 |
| --- | --- | --- | --- |
| banana2-official-1k | 每次 | **0.5** | ✅ 已确认 |
| claude-fable-5（输入/输出） | 每百万 tokens | 输入 **36** / 输出 **180** | ✅ 已确认 |
| claude-opus-5（输入/输出） | 每百万 tokens | 7.2 / 36 | ✅ 已确认 |
| kimi-k3（输入/输出/缓存） | 每百万 tokens | 30 / 150 / 3 | ⚠️ 倍数异常，启用前再核对 |
| gpt-6.1-sol（输入/输出） | 每百万 tokens | 0.9 / 4.5 | ✅ 已确认 |
| wan3.0-video-official 1080P | 每秒 | 1.6 | ✅ 已确认 |

已确认的充值价换算（按 3.2 公式）：banana2-official-1k 固定价 ¥0.5 → $0.0685/次；claude-fable-5 输入 ¥36/每百万 tokens → 倍率 2.5714，输出 ¥180 → 倍率 12.8571。其余行的倍率/固定价见 BEIDOU-PRICING-CONFIG.md。

### 3.2 换算成 new-api 后台倍率（部署后在后台填）

- new-api 的 token 计费基准：倍率 1 = $0.002 / 每千 tokens（即 $2 / 每百万 tokens）
- 汇率按 ¥7.3 = $1 计
- 文本模型倍率 = ¥每百万 tokens ÷ 14（例：claude-opus-5 输入 ¥1.8 → 倍率约 0.13；输出 ¥9 → 倍率约 0.64）
- 图片/视频按次、按秒的固定价：美元价 = ¥价 ÷ 7.3，在后台按模型的固定价格项填
- 后台位置：控制台 → 渠道 → 渠道倍率 / 模型倍率；也可以直接用内置计费表达式（见仓库 `.agents/rules/billing.md`，改之前先读它）

### 3.3 ✅ 已决定：售价 = 大炮家「充值」列（小炳哥 2026-11-14 决定）

- **决定**：上线售价照大炮家模型广场页的「充值」列设，不用「标准」列。充值列约为标准列的 4–6 倍（例：banana2-official-1k 充值 ¥0.5、标准 ¥0.08；claude-fable-5 输入充值 ¥36、标准 ¥9）。
- **价格没有写进代码**：`setting/billing_setting/builtin_billing.go` 一个字没动（第一版的原则不变）。所有售价都在部署后由管理员在后台按 3.2 公式填倍率 / 固定价，具体填法见 BEIDOU-PRICING-CONFIG.md。
- **⚠️ 待办（上线前必须做）**：充值价已于 2026-11-14 07:00 实读全表（见 3.1 与 BEIDOU-PRICING-CONFIG.md），但页面未说明哪一档是实际扣费标准——实测一笔时核对实际扣费是否与 Recharge 列一致；seedream-v5-pro（2 个）与 doubao-seedance-2.0/2.5 的计费表达式确认后再上架；kimi-k3 启用前再核对一次价格。
- **实测**：倍率填好后，先拿一个小模型实测一笔，看扣费对不对得上；错了就改倍率，不要改代码。

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
