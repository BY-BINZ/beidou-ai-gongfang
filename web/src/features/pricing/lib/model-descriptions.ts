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
 * Model descriptions synced from the upstream provider APIMODELS
 * (https://apimodels.app/zh/models, collected 2026-11-17).
 *
 * The Model Square falls back to this map when a model has no description
 * stored in the database, so cards show a real introduction instead of
 * "No description available.". The database description (when set by an
 * administrator) always wins. Descriptions are Chinese: the upstream
 * documentation is Chinese and the station serves Chinese merchants.
 * Refresh this map when the upstream descriptions change.
 */
export const MODEL_DESCRIPTIONS: Record<string, string> = {
  // ---- Image models ----
  'nano-banana-2-1':
    '文生图与改图同一个模型，最多 10 张参考图、15 种画面比例，1K / 2K / 4K 输出，参考图不加价。',
  'gemini-3-pro-image':
    '基于 Gemini 3 Pro 的高端图片生成，99% 成功率，最佳画质和可靠性，1K / 2K / 4K。',
  'gemini-3-pro-image-gemini':
    'Gemini 3 Pro Image 经济渠道，文生图+编辑，1K/2K/4K，高保真文字渲染。',
  'gemini-2.5-flash-image':
    '本站最便宜的图像模型，每张统一 $0.02，无分辨率档；文生图与参考图编辑都支持。',
  'gemini-3.1-flash-image':
    '文生图与对话式编辑同一个端点、同一个价：512、1K 与 2K 同价，4K 另计；近 30 天成功率 99.8%。',
  'nanobanana-2-beta':
    '基于 Gemini 3.1 Flash 的快速图片生成，支持文生图和图片编辑，1K/2K/4K 画质。',
  'nanobanana-2-lite':
    '最便宜的 Gemini 3.1 Flash Image 档位，统一 $0.025/张，文生图与改图都支持（最多 10 张参考图），输出仅 1K。',
  'gpt-image-2.5-flare':
    '走量用的快档：2.5 的全部能力，延迟约为 GPT Image 2 的一半；可指定画面某一处只改那一处，换衣服不动脸、改文字不动背景；原生透明底 PNG。',
  'gpt-image-2.5-sunburst':
    '放大看的精度档：皮肤织物纹理、密集排版、金属反光面经得起放大，默认 high 画质；多轮改图只改指定处。',
  'gpt-image-2.6-flare':
    'GPT Image 2.6 默认档，新增 GIF 动图和 SVG 输出、用标注图指导改图、推理强度可调，最多 16 张参考图。',
  'gpt-image-2.6-sunburst':
    'GPT Image 2.6 最高精度档：每张多花时间，换更细的细节，多轮改图也只改你说的那一处；与 Flare 能力相同。',
  'gpt-image-2':
    '文生图 + 多图编辑（单次最多 16 张参考图）、画幅可控，原生 1K / 2K / 4K。',
  'gpt-image-2-all':
    'OpenAI SDK 同步版 GPT Image 2：把 base_url 指向本站、model 用 gpt-image-2-all，images.generate() / images.edit() 直接可用。',
  'gpt-image-2-lite': 'GPT Image 2 轻量档，文生图与改图，适合走量。',
  'doubao-seedream-5-5':
    '像素级可控改图，只改你说的地方，多轮修改也不走样；原生输出带透明通道的 RGBA 素材，最多拆成 100 层；写实质感比 Seedream 5.0 Pro 更自然。',
  'doubao-seedream-5-0-pro':
    '旗舰画质档，主打可控生产：交互式编辑（坐标、框选、手绘标记指哪改哪）与 14+ 语言的图内文字渲染。',
  'doubao-seedream-5-0-flash':
    '速度与成本的极速档：文生图与最多 10 张参考图的图生图同一端点，支持保留透明通道的编辑与图层拆分，约 10–15 秒出图。',
  'doubao-seedream-4-5-251128':
    '高质量图片生成，支持文生图和图片编辑，2K/4K 分辨率。',
  'doubao-seedream-5-0-pro-spicy':
    'Seedream 5.0 Pro 的宽松审核版，画质与请求格式同 Pro，1K / 2K 输出。',
  'qwen3-image':
    '强项是密集图内文字：10px 小字清晰可辨、12 国语言、20+ 字体，报纸菜单试卷这类结构化版面能一次生成到位。',
  'qwen3-image-pro':
    '更高保真的一档，微表情、毛孔、发丝逼近真实摄影，适合主图、人像和细节吃紧的密集排版。',
  'qwen-image-edit-spicy':
    '用一句文字指令改图：传要编辑的主图，可再加最多 2 张参考图，输出与主图像素尺寸完全一致。',
  'grok-imagine-image':
    'X 平台推出的多模态 AI 模型，根据文本描述生成高质量图像，支持多种尺寸和风格。',
  'grok-imagine-image-2':
    '目标是做出能直接投入工作的图：严格照指令走、细节不放过，像设计师那样规划排版与版面，一次调用最多融合 3 张参考图，多轮编辑保留同一张脸、同一件商品。',
  'grok-imagine-image-pro':
    'X 平台升级版多模态 AI 模型，更强理解力与生成细节，实现更高精度图像生成。',
  'minimax-h3-image':
    '文生图，或用最多 16 张参考图改图、换风格、多图合成；1K / 2K / 4K，一次 1 到 10 张。',
  'minimax-h3-image-highspeed':
    'H3 图像模型的高速版：请求写法和标准版完全一样，出图更快，一张 1K 海报约 6 秒。',
  'muse-image':
    'Meta 的图片模型：文生图，也能用最多 4 张参考图改图（同价），每张约 250 万像素，成功才计费。',
  'sparkpix-image': '亚秒级文生图，1 秒内出图，画质与文字渲染出色，支持 LoRA。',
  'sparkpix-image-edit':
    '1 秒内完成的多图编辑模型，快速、实惠，支持精准提示词控制、文字渲染和多图编辑。',
  'flux-2-klein-4b':
    '极速照片级图片生成，约 1-2 秒出图；文生图与图生图同一个模型名，最多 3 张参考图。',
  'z-image-spicy':
    '文生图，单边 256–1536px 任意尺寸，约 15 秒出图，seed 可复现。',
  // ---- Video models ----
  'seedance-2.5':
    '长片与编辑档：单次出片 4-30 秒，一个任务最多 50 个参考素材，新增视频编辑与视频续写，原生同步音频。',
  'seedance-2.5-lite':
    'Seedance 2.5 的低价档，专做文生视频和参考图生视频：15 秒或 30 秒、720p，每条一口价，音轨与画面一起生成。',
  'seedance-2.0':
    '全模态视频生成：文生 / 首帧 / 首尾帧 / 最多 9 张参考图 / 参考视频 / 参考音频 / 联网搜索 / 原生音频，任意组合。',
  'seedance-2.0-fast':
    'Seedance 2.0 的提速降价版，保留全模态能力，480p / 720p，4-15 秒。',
  'seedance-2.0-mini':
    'Seedance 2.0 里最省的一档，480p / 720p、4-15 秒，适合分镜、草稿与大批量试跑。',
  'dreamina-seedance-2-0':
    '国际线，原生最高 4K，全模态：文生 / 首帧 / 首尾帧 / 最多 9 张参考图 / 参考视频 / 参考音频 / 原生同步音频。',
  'kling-4.0':
    '快手可灵最新的视频模型，每条视频都同时生成声音；文生视频、参考生视频和关键帧生视频，3-30 秒，720p 或 1080p。',
  'kling-4.0-flash':
    'Kling 4.0 的轻量档，每条视频同样带同步生成的声音，3-20 秒，只有 720p。',
  'kling-v3':
    '可灵 V3 视频生成，3-15 秒可变时长，支持文生视频和图生视频，可选音频。',
  'kling-v2-6': '可灵 V2.6 视频生成，支持音频和语音定制，文生视频和图生视频。',
  'wan-3.0-video':
    '阿里万相 3.0 全能视频模型：文生视频、首帧/首尾帧图生视频、全能参考，原生单镜最长 30 秒，自带同步音轨。',
  'wan-2.7-i2v-spicy':
    '图生视频精品档：首帧加提示词，出 2 到 15 秒的片段，自带模型生成的立体声音轨，也可传自己的音频驱动画面。',
  'wan-2.2-i2v-spicy':
    '图生视频走量档：首帧加提示词，出 5 秒或 8 秒的无声片段，可选尾帧，成片无水印。',
  'minimax-h3':
    '通用多模态视频模型：一次推理同时理解文本、图像、视频和音频，直接给出画面、动作、声音彼此对齐的成片，5-15 秒。',
  'minimax-h3-lite':
    'MiniMax H3 低价档：和标准版同一套权重，上限 768P，价格是标准版的五分之一；适合动画和小幅度动作，草稿档。',
  'minimax-h3-max-turbo':
    'MiniMax H3 的后训练加速版：秒级出片而不是分钟级，提示词遵循更强、画面更好看，480P / 768P，5-15 秒。',
  'grok-imagine-video-1.5':
    'xAI 的 Grok Imagine 视频模型：文生、图生同一个模型名，自带同步音轨，1-15 秒任意时长，成片无水印。',
  'grok-video-3':
    '基于 Grok 的高质量视频生成，6 / 10 / 15 秒可选，支持横屏和竖屏宽高比。',
  'gemini-omni-1.2-flash':
    '谷歌 Omni 视频模型，单条最长 15 秒，参考图里的人脸、商品和品牌色保持得更好，口型更清楚，自带同步音频。',
  'gemini-omni-1.1-flash':
    '一个模型 id、四种模式：文生视频、首尾帧图生视频、参考生成、视频编辑，720p / 1080p / 4K，自带同步音轨。',
  'muse-video':
    'Meta 的视频模型：文生视频、用一张首帧图生视频，或传最多 4 张参考图保持同一个人，4–20 秒，画面和声音一起生成。',
  'veo-3.1-fast-fhd':
    'VEO 3.1 快速 1080p 档，固定 8 秒，支持参考图（1 张 = 首帧，2 张 = 首尾帧）。',
  'veo-3.1-fast-hd': 'VEO 3.1 快速 720p 档，固定 8 秒，支持参考图。',
  // ---- Text models ----
  'gemini-3.8-flash':
    '奔着编码和 agent 去的 Flash：发布时 DeepSWE 登顶、Terminal-Bench 2.1 89.4%；1M 上下文，输入支持文字/图片/音频/视频/PDF；更适合批处理与 agent。',
  'gemini-3.5-flash':
    '已正式发布（GA），性能稳定、可大规模投产；这一代最聪明的 Flash 档，在智能体执行、编码与长链任务上持续领先。',
  'gemini-3.6-flash':
    '输入价与 3.5 Flash 持平、输出更便宜，适合 agent 类和长链路任务（成本压在输出而不是提示词上）。',
  'gemini-3.1-pro-preview':
    'Gemini 3.x 代的 Pro 预览版，具备增强推理和多模态能力。',
  'gemini-3-pro-preview':
    'Gemini 3 Pro 预览版，高级多模态推理模型，具备卓越能力。',
  'gemini-4-argon':
    '谷歌的旗舰推理模型：DeepSWE 77.9%、LVBench 长视频 91.7%；100 万 token 上下文，输入支持文字、图片、视频、音频和 PDF。',
  'gemini-4-carbon':
    'Gemini 4 里推理更深的一档，面向更难的问题：多步调试、开放式研究；多数编码和知识类工作仍推荐 Argon。',
  'gemini-4-hydrogen':
    'Gemini 4 的快速档，智能体工作流的日常主力：写代码、跑测试、验证改动，也是 Gemini 3.8 Flash 的推荐升级款。',
  'claude-opus-5':
    'Anthropic 最新的 Opus 档，相比 Opus 4.8 在深度推理、agent 编码与长跑任务上是一次台阶式提升；默认开自适应思考。',
  'claude-opus-4-7':
    '100 万 token 上下文窗口、128K 最大输出 token、自适应思维，与 Opus 4.6 拥有相同的工具与平台能力。',
  'claude-fable-5':
    'Anthropic 高端的公开可用大语言模型：超长上下文、多模态理解、复杂推理与企业级知识工作能力，带严格安全保护。',
  'claude-fable-5-1':
    '旗舰：Terminal-Bench-Science 从 24.7% 提到 52.6%，官方演示过 38 小时无人值守的 agent 跑批。',
  'claude-fable-5-2':
    'Fable 新一代，Anthropic 目前对外开放的最强模型：FrontierSWE v2 69.9%，输出速度比 Fable 5.1 快最多 30%。',
  'claude-sonnet-5-5':
    '输出比 Sonnet 5 快 30% 以上，单任务成本最多低 30%，Terminal-Bench 4.0 从 10.3% 升到 70.6%。',
  'claude-haiku-5-5':
    'Claude 5.5 家族 Haiku 档，面向大批量任务：GDPval-AA 1620，OSWorld 2.1 72.4%。',
  'deepseek-v4-pro':
    'DeepSeek 的高性能档，推理与 agent 能力对标第一梯队；通过 reasoning_content 返回完整思维链，支持工具调用、JSON 输出与流式。',
  'deepseek-v4-1-flash':
    'DeepSeek 快速高吞吐模型的 V4.1 新一代，面向通用对话、摘要和 agent 工具调用。',
  'gpt-6.1-sol':
    'OpenAI 2026 年 9 月 29 日发布的 Sol 升级版：编程与自动化基准分数高于 GPT-6 Sol，缓存输入更低。',
  'gpt-6.1-terra':
    'GPT-6.1 Terra 档，官方定位是快速、高效，主打视觉推理、电脑操作和自然的写作。',
  'gpt-6-sol':
    'GPT-6 家族的主力档：把 Astra 的大部分能力放进更快、更便宜的模型。',
  'gpt-6-astra':
    'GPT-6 旗舰，模型本身的电脑操作跑分很高；注意：本 API 不提供电脑操控工具，这项用不上。',
  'gpt-6-luna': 'GPT-6 家族的高吞吐档，面向聚焦的高吞吐任务的最高效模型。',
  'grok-4.6':
    'xAI 最新旗舰，主打长跑 Agent 与多步骤任务，在智能指数上与 GPT-5.6 Sol 持平；500K 上下文、支持图片输入。',
  'grok-4.5':
    'xAI 最新旗舰模型，在编程、非幻觉率、Agent 工具调用与指令跟随上引领行业，支持非推理与推理两种模式。',
  'qwen3.8-max':
    'Qwen3.8 家族的旗舰：本代最强的推理与 agent 能力，1M token 上下文，混合思考。',
  'qwen4-max':
    '通义千问最新一代旗舰，定位在复杂推理和写代码；1,000,000 token 上下文，单次最多输出 131,072 token。',
  'glm-5.3':
    '智谱最新的推理模型，面向长链路 agent 任务和复杂软件工程，100 万 token 上下文，函数调用能力强。',
  // ---- Audio models ----
  'nemotron-3.5-transcribe':
    'NVIDIA 语音转文字模型：传一段最长 60 分钟的音频或视频，拿回转写文本；支持 40 种语言并自动识别语种，可选词级时间戳和说话人标签。',
  'eleven-v4':
    'ElevenLabs 最新、音质最高的语音模型：表达更自然，支持音频标签和 85 种语言。',
  'eleven-v4-turbo':
    'Eleven v4 音色的实时版，延迟约 100 毫秒，适合语音助手和实时应用，支持 85 种语言。',
  'minimax-speech-2.8-hd':
    'MiniMax 最新高保真 TTS，情感语调自然，支持声音克隆。',
  'minimax-speech-2.8-turbo':
    'MiniMax 最新快速经济 TTS，性价比高、多语言强，支持声音克隆。',
  'suno-v5':
    'Suno 音乐生成：一句话出整首带人声的歌，旋律、编曲、演唱、歌词一次到位；每次调用返回 2 个版本。',
}

/**
 * Resolve the display description for a plaza model: prefer the description
 * stored in the database, fall back to the upstream-synced map, and return
 * undefined when neither has one (the card then shows the empty state).
 */
export function resolveModelDescription(
  modelName: string,
  dbDescription?: string
): string | undefined {
  if (dbDescription) return dbDescription
  return MODEL_DESCRIPTIONS[modelName]
}
