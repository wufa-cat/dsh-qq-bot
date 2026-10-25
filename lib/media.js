/**
 * 多模态媒体：文字转语音（TTS）、生图，以及上游模型列表查询。
 * 全部走 OpenAI 兼容接口，使用者自己填 baseURL / apiKey / model；
 * apiKey 也支持从环境变量读（apiKeyEnv），避免把密钥写进配置文件。
 */

const TIMEOUT_MS = 120_000
const TTS_TIMEOUT_MS = 45_000

function pickKey (config) {
  const literal = String(config?.apiKey ?? '').trim()
  if (literal) return literal
  const envName = String(config?.apiKeyEnv ?? '').trim()
  if (envName && process.env[envName]) return String(process.env[envName]).trim()
  return ''
}

function baseOf (config, fallback) {
  const raw = String(config?.baseURL ?? '').trim() || fallback
  return raw.replace(/\/+$/, '')
}

/** 把响应体读成 Buffer（错误时抛带正文的异常）。 */
async function ensureOk (response, what) {
  if (response.ok) return response
  let detail = ''
  try { detail = (await response.text()).slice(0, 300) } catch { /* ignore */ }
  throw new Error(`${what} 失败 HTTP ${response.status}${detail ? `：${detail}` : ''}`)
}

/**
 * 创建媒体服务。
 * @param {object} options
 * @param {object} options.media - 配置里的 media 块
 * @param {object} [options.logger]
 */
export function createMediaService ({ media = {}, getMedia, logger } = {}) {
  // 配置可能在运行中被界面改（保存后不一定重载插件），所以每次调用都现读。
  const current = () => {
    const raw = typeof getMedia === 'function' ? getMedia() : media
    return raw && typeof raw === 'object' ? raw : {}
  }

  function status () {
    const media = current()
    const tts = media.tts ?? {}
    const image = media.image ?? {}
    return {
      tts: { enabled: tts.enabled !== false && Boolean(tts.model), configured: Boolean(pickKey(tts)), model: tts.model ?? '', voice: tts.voice ?? '', baseURL: baseOf(tts, '') },
      image: { enabled: image.enabled !== false && Boolean(image.model), configured: Boolean(pickKey(image)), model: image.model ?? '', baseURL: baseOf(image, '') },
    }
  }

  /**
   * 文字 → 语音。返回音频字节（mp3）。
   * @param {string} text
   * @returns {Promise<{ok: boolean, buffer?: Buffer, mediaType?: string, error?: string}>}
   */
  async function speak (text) {
    const tts = current().tts ?? {}
    if (!tts.enabled || !tts.model) return { ok: false, error: 'TTS 未启用' }
    const key = pickKey(tts)
    if (!key) return { ok: false, error: 'TTS 缺少 apiKey' }
    const base = baseOf(tts, 'https://api.siliconflow.cn/v1')
    try {
      const response = await fetch(`${base}/audio/speech`, {
        method: 'POST',
        headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json' },
        body: JSON.stringify({
          model: tts.model,
          input: String(text ?? '').slice(0, 1024),
          voice: tts.voice || undefined,
          response_format: tts.format || 'mp3',
          speed: Number(tts.speed) || undefined,
        }),
        signal: AbortSignal.timeout(TTS_TIMEOUT_MS),
      })
      await ensureOk(response, '文字转语音')
      const buffer = Buffer.from(await response.arrayBuffer())
      if (!buffer.length) return { ok: false, error: 'TTS 返回空音频' }
      return { ok: true, buffer, mediaType: tts.format === 'wav' ? 'audio/wav' : 'audio/mpeg' }
    } catch (error) {
      const timedOut = error instanceof Error && (error.name === 'TimeoutError' || error.name === 'AbortError')
      const message = timedOut
        ? `TTS 上游 ${Math.round(TTS_TIMEOUT_MS / 1000)}s 没返回（模型「${tts.model}」/音色「${tts.voice || '默认'}」或额度有限制）。换个模型或音色，或者换一家供应商试试。`
        : error instanceof Error ? error.message : String(error)
      logger?.warn?.(`qq-bot: TTS 失败: ${message}`)
      return { ok: false, error: message }
    }
  }

  /**
   * 生图。返回图片字节。
   * @param {string} prompt
   * @returns {Promise<{ok: boolean, buffer?: Buffer, mediaType?: string, error?: string}>}
   */
  async function draw (prompt) {
    const image = current().image ?? {}
    if (!image.enabled || !image.model) return { ok: false, error: '生图未启用' }
    const key = pickKey(image)
    if (!key) return { ok: false, error: '生图缺少 apiKey' }
    const base = baseOf(image, 'https://api.siliconflow.cn/v1')
    try {
      const response = await fetch(`${base}/images/generations`, {
        method: 'POST',
        headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json' },
        body: JSON.stringify({
          model: image.model,
          prompt: String(prompt ?? '').slice(0, 1000),
          image_size: image.size || '1024x1024',
          batch_size: 1,
          num_inference_steps: Number(image.steps) || undefined,
          seed: Number(image.seed) || undefined,
          response_format: 'b64_json',
        }),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      })
      await ensureOk(response, '生图')
      const data = await response.json()
      const item = data?.images?.[0] ?? data?.data?.[0]
      const b64 = item?.b64_json ?? item?.base64
      if (b64) return { ok: true, buffer: Buffer.from(String(b64).replace(/^data:[^;]+;base64,/, ''), 'base64'), mediaType: 'image/png' }
      const url = item?.url
      if (url) {
        const fetched = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) })
        await ensureOk(fetched, '下载生成图')
        return { ok: true, buffer: Buffer.from(await fetched.arrayBuffer()), mediaType: 'image/png' }
      }
      return { ok: false, error: '生图返回里没有图片' }
    } catch (error) {
      logger?.warn?.(`qq-bot: 生图失败: ${String(error)}`)
      return { ok: false, error: error instanceof Error ? error.message : String(error) }
    }
  }

  /**
   * 拉取上游模型列表（OpenAI 兼容 GET /models）。用于界面里「输入端点 → 选模型」。
   * 与具体能力无关，所以单独放在这里给 UI 用。
   * @param {{baseURL?: string, apiKey?: string, apiKeyEnv?: string}} endpoint
   * @returns {Promise<{ok: boolean, models?: string[], error?: string}>}
   */
  async function listModels (endpoint = {}) {
    const key = pickKey(endpoint)
    const base = baseOf(endpoint, '')
    if (!base) return { ok: false, error: '缺少接口地址（baseURL）' }
    if (!key) return { ok: false, error: '缺少 API Key（或 apiKeyEnv 指向的环境变量为空）' }
    try {
      const response = await fetch(`${base}/models`, {
        headers: { authorization: `Bearer ${key}` },
        signal: AbortSignal.timeout(30_000),
      })
      await ensureOk(response, '拉取模型列表')
      const data = await response.json()
      const list = Array.isArray(data?.data) ? data.data : Array.isArray(data?.models) ? data.models : []
      const models = list.map(item => String(item?.id ?? item?.name ?? item)).filter(Boolean)
      if (!models.length) return { ok: false, error: '接口返回的模型列表为空' }
      return { ok: true, models: [...new Set(models)].sort() }
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : String(error) }
    }
  }

  return { status, speak, draw, listModels }
}
