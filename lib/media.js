/**
 * 多模态媒体：语音转文字（ASR）、文字转语音（TTS）、生图。
 * 全部走 OpenAI 兼容接口，使用者自己填 baseURL / apiKey / model；
 * apiKey 也支持从环境变量读（apiKeyEnv），避免把密钥写进配置文件。
 */

const TIMEOUT_MS = 120_000

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
export function createMediaService ({ media = {}, logger } = {}) {
  const asr = media.asr ?? {}
  const tts = media.tts ?? {}
  const image = media.image ?? {}

  function status () {
    return {
      asr: { enabled: asr.enabled !== false && Boolean(asr.model), configured: Boolean(pickKey(asr)), model: asr.model ?? '', baseURL: baseOf(asr, '') },
      tts: { enabled: tts.enabled !== false && Boolean(tts.model), configured: Boolean(pickKey(tts)), model: tts.model ?? '', voice: tts.voice ?? '', baseURL: baseOf(tts, '') },
      image: { enabled: image.enabled !== false && Boolean(image.model), configured: Boolean(pickKey(image)), model: image.model ?? '', baseURL: baseOf(image, '') },
    }
  }

  /**
   * 语音 → 文字。
   * @param {Buffer} buffer - 音频字节
   * @param {string} [mediaType] - audio/silk、audio/mp3 …
   * @returns {Promise<{ok: boolean, text?: string, error?: string}>}
   */
  async function transcribe (buffer, mediaType = 'audio/mpeg') {
    if (!asr.enabled || !asr.model) return { ok: false, error: 'ASR 未启用' }
    const key = pickKey(asr)
    if (!key) return { ok: false, error: 'ASR 缺少 apiKey（在插件设置里填，或设置 apiKeyEnv 指向的环境变量）' }
    const base = baseOf(asr, 'https://api.siliconflow.cn/v1')
    try {
      const form = new FormData()
      form.append('model', asr.model)
      form.append('file', new Blob([buffer], { type: mediaType }), 'voice.mp3')
      if (asr.language) form.append('language', asr.language)
      const response = await fetch(`${base}/audio/transcriptions`, {
        method: 'POST',
        headers: { authorization: `Bearer ${key}` },
        body: form,
        signal: AbortSignal.timeout(TIMEOUT_MS),
      })
      await ensureOk(response, '语音转文字')
      const data = await response.json()
      const text = String(data?.text ?? '').trim()
      if (!text) return { ok: false, error: 'ASR 返回空文本' }
      return { ok: true, text }
    } catch (error) {
      logger?.warn?.(`qq-bot: ASR 失败: ${String(error)}`)
      return { ok: false, error: error instanceof Error ? error.message : String(error) }
    }
  }

  /**
   * 文字 → 语音。返回音频字节（mp3）。
   * @param {string} text
   * @returns {Promise<{ok: boolean, buffer?: Buffer, mediaType?: string, error?: string}>}
   */
  async function speak (text) {
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
        signal: AbortSignal.timeout(TIMEOUT_MS),
      })
      await ensureOk(response, '文字转语音')
      const buffer = Buffer.from(await response.arrayBuffer())
      if (!buffer.length) return { ok: false, error: 'TTS 返回空音频' }
      return { ok: true, buffer, mediaType: tts.format === 'wav' ? 'audio/wav' : 'audio/mpeg' }
    } catch (error) {
      logger?.warn?.(`qq-bot: TTS 失败: ${String(error)}`)
      return { ok: false, error: error instanceof Error ? error.message : String(error) }
    }
  }

  /**
   * 生图。返回图片字节。
   * @param {string} prompt
   * @returns {Promise<{ok: boolean, buffer?: Buffer, mediaType?: string, error?: string}>}
   */
  async function draw (prompt) {
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

  return { status, transcribe, speak, draw }
}
