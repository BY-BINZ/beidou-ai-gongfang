/*
Copyright (C) 2023-2026 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.

For commercial licensing, please contact support@quantumnous.com
*/

/**
 * API access guide content for the /docs page.
 *
 * Synced with the upstream provider APIMODELS
 * (https://apimodels.app/zh/docs, collected 2026-11-17) and adapted for
 * this station: base URL is api.beidouku.com and keys come from the
 * station console, not from apimodels.app.
 *
 * The guide is written in Chinese: the upstream documentation is Chinese
 * and the station serves Chinese merchants. It is documentation content
 * (like the admin-configured About page), so it is not passed through
 * the i18n translation files; only the page chrome uses t().
 */
export type DocBlock =
  | { kind: 'p'; text: string }
  | { kind: 'code'; lang: string; code: string }
  | { kind: 'table'; headers: string[]; rows: string[][] }
  | { kind: 'list'; items: string[] }
  | { kind: 'note'; text: string }

export type DocSection = {
  id: string
  title: string
  blocks: DocBlock[]
}

export const DOC_SECTIONS: DocSection[] = [
  {
    id: 'quickstart',
    title: '快速开始',
    blocks: [
      {
        kind: 'p',
        text: '星门 API 是 OpenAI 兼容接口：一个 Key 调用文字、图片、视频、音频模型。先在控制台「令牌」页创建一个 API Key，再按下面的方式调用。',
      },
      {
        kind: 'table',
        headers: ['用途', '填这个'],
        rows: [
          ['直接调用（推荐）', 'https://api.beidouku.com/v1'],
          [
            'OpenAI 兼容 SDK（openai-python / openai-node / Codex / Cline 等）',
            'https://api.beidouku.com/v1',
          ],
          [
            'Anthropic SDK / Claude Code（它自己会补 /v1）',
            'https://api.beidouku.com',
          ],
        ],
      },
      {
        kind: 'note',
        text: 'base_url 只填到根地址，不要把完整端点（例如 …/v1/messages 或 …/v1/images/generations）填进去，否则 SDK 会在后面再接一段路径，请求会打到不存在的地址上。',
      },
      {
        kind: 'p',
        text: '所有请求在 Authorization 头里带 Bearer Key：Authorization: Bearer <你的 Key>。',
      },
    ],
  },
  {
    id: 'endpoints',
    title: '端点一览',
    blocks: [
      {
        kind: 'table',
        headers: ['能力', '方法与路径', '说明'],
        rows: [
          ['文字对话 / LLM', 'POST /chat/completions', 'OpenAI 兼容'],
          [
            '图片生成 / 改图',
            'POST /images/generations',
            '默认异步（返回 data.taskId → 轮询 GET /images/generations?task_id=）；传 WxH 尺寸且不传 callback_url 时同步返回 OpenAI 格式',
          ],
          [
            '视频生成',
            'POST /video/generations → GET /video/generations?task_id=',
            '异步，轮询等结果',
          ],
          ['向量嵌入', 'POST /embeddings', 'OpenAI 兼容'],
          ['文字转语音', 'POST /tts/stream', '流式返回音频'],
          [
            '其他音频（音乐、对白、配音、MiniMax TTS）',
            'POST /audio/generations → GET /audio/generations?task_id=',
            'Suno、ElevenLabs 对白、MiniMax 语音等',
          ],
          [
            '语音转文字',
            'POST /audio/generations → GET /audio/generations?task_id=',
            '传 audio_url；结果是文本',
          ],
          ['账户余额', 'GET /balance', '查剩余额度（免费、只读）'],
          [
            '模型列表',
            'GET /models',
            'OpenAI 兼容，不需要 Key——可调用的模型 ID 以这里为准',
          ],
        ],
      },
    ],
  },
  {
    id: 'chat',
    title: '文字对话',
    blocks: [
      {
        kind: 'p',
        text: 'POST /chat/completions，OpenAI 兼容，支持流式（stream: true）。',
      },
      {
        kind: 'code',
        lang: 'bash',
        code: `curl -X POST https://api.beidouku.com/v1/chat/completions \\
  -H "Authorization: Bearer $STARGATE_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "gemini-3.8-flash",
    "messages": [{"role": "user", "content": "用一句话介绍星门 API"}]
  }'`,
      },
      {
        kind: 'code',
        lang: 'python',
        code: `from openai import OpenAI

client = OpenAI(
    base_url="https://api.beidouku.com/v1",
    api_key="你的 Key",
)
resp = client.chat.completions.create(
    model="gemini-3.8-flash",
    messages=[{"role": "user", "content": "用一句话介绍星门 API"}],
)
print(resp.choices[0].message.content)`,
      },
    ],
  },
  {
    id: 'image',
    title: '图片生成',
    blocks: [
      {
        kind: 'p',
        text: 'POST /images/generations。同步模式：传 size 为 宽x高（如 "1024x1024"）且不传 callback_url，直接返回 OpenAI 格式。异步模式（默认）：返回 data.taskId，再轮询 GET /images/generations?task_id=<id>，等 data.state 为 completed 后读 data.resultUrls。改图：传 image_url / image_urls（参考图）即进入改图。',
      },
      {
        kind: 'code',
        lang: 'bash',
        code: `# 同步出图
curl -X POST https://api.beidouku.com/v1/images/generations \\
  -H "Authorization: Bearer $STARGATE_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{ "model": "nano-banana-2-1", "prompt": "一只穿围裙的红色熊猫咖啡师，影棚光", "size": "1024x1024", "response_format": "url" }'`,
      },
      {
        kind: 'code',
        lang: 'bash',
        code: `# 异步出图 + 轮询
curl -X POST https://api.beidouku.com/v1/images/generations \\
  -H "Authorization: Bearer $STARGATE_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{ "model": "nano-banana-2-1", "prompt": "一只穿围裙的红色熊猫咖啡师，影棚光" }'
# 返回 data.taskId 后：
curl "https://api.beidouku.com/v1/images/generations?task_id=<taskId>" \\
  -H "Authorization: Bearer $STARGATE_API_KEY"`,
      },
      {
        kind: 'p',
        text: '常用图片模型：nano-banana-2-1（香蕉 2.1）、gemini-3-pro-image（香蕉 Pro）、gpt-image-2.5-flare / gpt-image-2.5-sunburst、gpt-image-2.6-flare / gpt-image-2.6-sunburst、doubao-seedream-5-5、qwen3-image / qwen3-image-pro。',
      },
    ],
  },
  {
    id: 'video',
    title: '视频生成',
    blocks: [
      {
        kind: 'p',
        text: 'POST /video/generations，异步：提交后返回 data.taskId，轮询 GET /video/generations?task_id=<id>，等 data.state 为 completed 后读 data.resultUrls。视频比较慢（中位约 2.5 分钟，90% 在 8 分钟内）。',
      },
      {
        kind: 'code',
        lang: 'bash',
        code: `curl -X POST https://api.beidouku.com/v1/video/generations \\
  -H "Authorization: Bearer $STARGATE_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{ "model": "seedance-2.5", "prompt": "一只猫在雨后的街道上散步，电影感", "duration": 5 }'

curl "https://api.beidouku.com/v1/video/generations?task_id=<taskId>" \\
  -H "Authorization: Bearer $STARGATE_API_KEY"`,
      },
      {
        kind: 'p',
        text: '常用视频模型：seedance-2.5（高画质旗舰）、kling-4.0（日常商业主力）、wan-3.0-video（批量低成本）、minimax-h3（人像与产品补充）。',
      },
    ],
  },
  {
    id: 'response',
    title: '响应格式',
    blocks: [
      {
        kind: 'p',
        text: '任务类端点返回 { "code": 200, "msg": "success", "data": { ... } }。异步任务返回 data.taskId；轮询直到 data.state 为 completed（读 data.resultUrls）或 failed。OpenAI 兼容路径（/chat/completions、/embeddings、/models、同步模式的 /images/generations）返回 OpenAI 自身的格式。',
      },
      {
        kind: 'note',
        text: '生成的文件只保留 30 天，之后删除——需要长期保存的请及时下载。生成失败不扣费。',
      },
    ],
  },
  {
    id: 'errors',
    title: '生成失败码（异步任务）',
    blocks: [
      {
        kind: 'p',
        text: '异步任务失败时，查询返回 state="failed"，以及标准化的 failCode、人类可读的 failMsg 和布尔字段 retryable——客户端据此决定是「重试 / 切换模型」还是「修改提示词 / 输入 / 充值」。',
      },
      {
        kind: 'table',
        headers: ['failCode', '含义', '能否重试'],
        rows: [
          ['CONTENT_MODERATION', '内容 / 版权 / 安全审核拒绝', '否'],
          [
            'INVALID_INPUT',
            '参数错误、不支持的取值、格式 / 尺寸 / 时长不合法',
            '否',
          ],
          ['INSUFFICIENT_BALANCE', '积分不足', '否'],
          ['UPSTREAM_BUSY', '上游繁忙 / 限流 / 临时网络或 5xx', '是'],
          ['UPSTREAM_FAILED', '上游生成失败（通用，通常可重试）', '是'],
          ['TIMEOUT', '任务超时', '是'],
          ['INTERNAL_ERROR', '平台内部错误', '是'],
          ['OTHER', '未识别的错误（兜底类别，按可能可重试处理）', '是'],
        ],
      },
    ],
  },
  {
    id: 'models',
    title: '模型列表',
    blocks: [
      {
        kind: 'p',
        text: '完整可调用的模型 ID 以 GET /v1/models 为准（不需要 Key），或看本站「模型广场」。图片、文本、视频的商用模型介绍见模型广场各卡片。',
      },
    ],
  },
]
