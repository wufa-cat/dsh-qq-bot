/**
 * CQ 码工具：解析、文本渲染、表情包、@解析、长文本分段
 * 移植自原项目 cq_utils.py（保留 OneBot v11 语义）
 */
import { randomInt } from 'node:crypto'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, posix } from 'node:path'
import { QQ_FACE_MAP } from './face-map.js'

// ==================== CQ 码字符串 → segments ====================

/** 解析 CQ 码参数串 `k1=v1,k2=v2`；值中 &#44; &#91; &#93; 为转义。 */
export function parseCqParams (s) {
  const result = {}
  for (const m of s.matchAll(/(\w+)=/g)) {
    const key = m[1]
    const valStart = m.index + m[0].length
    const nextKey = /,\s*\w+=/.exec(s.slice(valStart))
    let val = nextKey ? s.slice(valStart, valStart + nextKey.index) : s.slice(valStart)
    val = val.trim().replace(/,+$/, '')
    val = val
      .replaceAll('&#91;', '[')
      .replaceAll('&#93;', ']')
      .replaceAll('&#44;', ',')
      .replaceAll('&amp;', '&')
    try { val = decodeURIComponent(val) } catch { /* 保留原样 */ }
    result[key] = val
  }
  return result
}

/** 括号深度匹配：从 [CQ: 起找到配对的 ]，正确处理 data 里内嵌 JSON 的 [ ]。 */
export function findCqEnd (text, start) {
  let depth = 0
  let inQuote = false
  let quoteChar = ''
  let k = start
  while (k < text.length) {
    const c = text[k]
    if (inQuote) {
      if (c === '\\') { k += 2; continue }
      if (c === quoteChar) inQuote = false
    } else {
      if (c === '"' || c === "'") { inQuote = true; quoteChar = c } else if (c === '[') { depth += 1 } else if (c === ']') {
        depth -= 1
        if (depth === 0) return k
      }
    }
    k += 1
  }
  return -1
}

/** CQ 码字符串 → segments 数组（与 OneBot array 消息格式统一）。 */
export function cqStringToSegments (text) {
  const segments = []
  let i = 0
  const n = text.length
  while (i < n) {
    const cqStart = text.indexOf('[CQ:', i)
    if (cqStart === -1) {
      if (i < n) segments.push({ type: 'text', data: { text: text.slice(i) } })
      break
    }
    if (cqStart > i) segments.push({ type: 'text', data: { text: text.slice(i, cqStart) } })
    const cqEnd = findCqEnd(text, cqStart)
    if (cqEnd === -1) {
      segments.push({ type: 'text', data: { text: text.slice(cqStart) } })
      break
    }
    const content = text.slice(cqStart + 1, cqEnd).replace(/^CQ:/, '')
    const comma = content.indexOf(',')
    segments.push(comma === -1
      ? { type: content, data: {} }
      : { type: content.slice(0, comma), data: parseCqParams(content.slice(comma + 1)) })
    i = cqEnd + 1
  }
  return segments
}

// ==================== 表情包 ====================

const _stickerCache = new Map() // `${dir}|${bot}` → Map<name, Path[]>

function listStickerFiles (stickersDir, botName) {
  const cacheKey = `${stickersDir}|${botName}`
  if (_stickerCache.has(cacheKey)) return _stickerCache.get(cacheKey)
  const root = botName ? join(stickersDir, botName) : stickersDir
  const map = new Map()
  try {
    for (const d of readdirSync(root, { withFileTypes: true })) {
      if (!d.isDirectory()) continue
      try {
        const files = readdirSync(join(root, d.name))
          .filter(f => /\.(png|jpe?g|gif|bmp|webp)$/i.test(f))
          .map(f => join(root, d.name, f))
        if (files.length) map.set(d.name, files)
      } catch { /* 子目录不可读 */ }
    }
  } catch { /* 目录不存在 */ }
  _stickerCache.set(cacheKey, map)
  return map
}

export function clearStickerCache () { _stickerCache.clear() }

/** 当前可用的表情包分类（[{ category, count }]），供提示词注入。 */
export function stickerCatalog (stickersDir, botName = '') {
  const map = listStickerFiles(stickersDir, botName)
  return [...map.entries()]
    .map(([category, files]) => ({ category, count: files.length }))
    .sort((a, b) => a.category.localeCompare(b.category, 'zh-Hans-CN'))
}

/**
 * 将 [动画表情:名字] / [sticker:名字] / [贴纸:名字] 替换为 [CQ:image,...,subType=1]。
 *
 * 默认用 base64 而不是 file://：OneBot 服务端（NapCat）通常跑在 Docker 容器里，
 * 容器看不到宿主机上的 stickers/ 路径，file:// 会让图片静默发送失败。
 */
export function resolveStickers (text, stickersDir, botName = '', options = {}) {
  const map = listStickerFiles(stickersDir, botName)
  if (!map.size) return text
  const maxBytes = options.maxBytes ?? 4 * 1024 * 1024
  const repl = (_, name) => {
    const files = map.get(name.trim())
    if (!files?.length) return ''
    const file = files[randomInt(files.length)]
    const encoded = readAsBase64(file, maxBytes)
    return encoded
      ? `[CQ:image,file=base64://${encoded},subType=1]`
      : `[CQ:image,file=file://${posixJoin(file)},subType=1]`
  }
  return text
    .replace(/\[动画表情:([^\]]+)\]/g, repl)
    .replace(/\[sticker:([^\]]+)\]/g, repl)
    .replace(/\[贴纸:([^\]]+)\]/g, repl)
}

/** 读文件为 base64；过大或读不到时返回 null（调用方回退 file://）。 */
function readAsBase64 (file, maxBytes) {
  try {
    const info = statSync(file)
    if (!info.isFile() || info.size === 0 || info.size > maxBytes) return null
    return readFileSync(file).toString('base64')
  } catch {
    return null
  }
}

function posixJoin (p) { return p.split(/[\\/]/).join('/') }

// ==================== @ 解析 ====================

/** 将 AI 回复中的 @名字 转换为 [CQ:at,qq=数字]（nameToQq: 名字 → QQ）。 */
export function resolveAtMentions (text, nameToQq) {
  return text.replace(/@([^\s,，。.!?！？\n\r@[\]()（）:：]{1,30})/g, (m, name) => {
    const qq = nameToQq.get(name)
    return qq ? `[CQ:at,qq=${qq}]` : m
  })
}

// ==================== 分享 / B站 ====================

function fmtJsonShare (data) {
  const parts = []
  const meta = data?.meta ?? {}
  const detail = meta.detail_1 ?? meta.detail ?? {}
  const desc = detail.desc ?? ''
  const qqdocurl = detail.qqdocurl ?? ''
  const prompt = data?.prompt ?? ''
  if (desc) parts.push(desc)
  else if (prompt) parts.push(prompt)
  if (qqdocurl) parts.push(decodeURIComponent(qqdocurl))
  return parts.length ? `[分享: ${parts.join(' | ')}]` : '[分享]'
}

const BV_RE = /https?:\/\/(?:www\.)?bilibili\.com\/video\/(BV[a-zA-Z0-9]{10})(?:\?[^\s\])]*)?/g
const AV_RE = /https?:\/\/(?:www\.)?bilibili\.com\/video\/av(\d+)(?:\?[^\s\])]*)?/gi
const B23_RE = /https?:\/\/b23\.tv\/([a-zA-Z0-9]+)(?:\?[^\s\])]*)?/g

const _b23Cache = new Map()

async function resolveB23 (code) {
  if (_b23Cache.has(code)) return _b23Cache.get(code)
  let result = null
  try {
    const resp = await fetch(`https://b23.tv/${code}`, {
      method: 'HEAD',
      redirect: 'follow',
      signal: AbortSignal.timeout(5000),
    })
    const finalUrl = String(resp.url ?? '')
    const bv = /bilibili\.com\/video\/(BV[a-zA-Z0-9]{10})/.exec(finalUrl)
    const av = /bilibili\.com\/video\/av(\d+)/i.exec(finalUrl)
    result = bv ? bv[1] : av ? `av${av[1]}` : null
  } catch { /* 解析失败 */ }
  _b23Cache.set(code, result)
  return result
}

/** 把消息里的 B 站链接替换成 BV/AV 标识，短链异步解析。 */
export async function replaceBilibiliUrls (text) {
  text = text.replace(BV_RE, 'B站:$1')
  text = text.replace(AV_RE, (m, id) => `B站:av${id}`)
  const matches = [...text.matchAll(B23_RE)]
  if (matches.length) {
    await Promise.all(matches.map(m => resolveB23(m[1])))
    text = text.replace(B23_RE, (m, code) => _b23Cache.get(code) ?? m)
  }
  return text
}

// ====================segments → 文本（含图片收集） ====================

/**
 * OneBot message array / CQ 字符串 → 文本 + 图片元数据。
 * images 数组元素：{ url, sticker, summary }，占位符写成 [图片#n] / [动画表情#n]。
 */
export async function extractText (rawMessage, opts = {}) {
  const { qqToName = new Map(), apiCall = null, chatLog = null, chatId = null, collectImages = true } = opts
  const raw = rawMessage
  const segments = Array.isArray(raw) ? raw : cqStringToSegments(String(raw ?? ''))
  const parts = []
  const images = []

  for (const seg of segments) {
    if (!seg || typeof seg !== 'object') continue
    const t = seg.type
    const data = seg.data ?? {}
    if (t === 'text') {
      parts.push(data.text ?? '')
    } else if (t === 'face') {
      const faceId = Number.parseInt(data.id ?? '0', 10)
      const faceText = data?.raw?.faceText
      parts.push(faceText || QQ_FACE_MAP[faceId] || `[表情:${faceId}]`)
    } else if (t === 'image') {
      const summary = data.summary ?? ''
      const sub = String(data.sub_type ?? data.subType ?? '0')
      const sticker = sub === '1'
      const label = sticker ? '动画表情' : '图片'
      const url = data.url || data.file || ''
      if (collectImages && url) {
        const idx = images.push({ url, sticker, summary }) - 1
        parts.push(`[${label}#${idx}]`)
      } else {
        parts.push(summary ? `[${label}：${summary}]` : `[${label}]`)
      }
    } else if (t === 'record') {
      parts.push('[语音]')
    } else if (t === 'at') {
      const qq = String(data.qq ?? '')
      const name = data.name ?? data.display ?? ''
      if (name) parts.push(`@${name}`)
      else if (qq && qqToName.has(qq)) parts.push(`@${qqToName.get(qq)}`)
      else if (qq) parts.push(`@${qq}`)
    } else if (t === 'reply') {
      let quoted = data.text ?? data.message ?? ''
      let sender = data.sender_name ?? data.sender_nickname ?? data.nickname ?? data.user_id ?? data.qq ?? ''
      const msgId = data.id ?? ''
      if (!quoted && chatLog && msgId) {
        for (let i = chatLog.length - 1; i >= 0; i--) {
          if (String(chatLog[i]?.message_id ?? '') === String(msgId)) {
            quoted = chatLog[i]?.message ?? ''
            if (!sender) sender = chatLog[i]?.nickname ?? ''
            break
          }
        }
      }
      if (!quoted && apiCall && msgId) {
        try {
          const resp = await apiCall('get_msg', { message_id: Number(msgId) })
          if (resp?.status === 'ok') {
            const inner = await extractText(resp.data?.message ?? resp.data?.raw_message ?? '', { collectImages: false })
            quoted = inner.text
            const s = resp.data?.sender ?? {}
            if (!sender) sender = s.card ?? s.nickname ?? ''
          }
        } catch { /* 查询失败 */ }
      }
      if (quoted) {
        let preview = quoted.replaceAll('\n', ' ')
        if (preview.length > 50) preview = preview.slice(0, 50) + '…'
        parts.push(sender ? `[回复${sender}: ${preview}]` : `[回复: ${preview}]`)
      } else {
        parts.push('[回复]')
      }
    } else if (t === 'json') {
      try { parts.push(fmtJsonShare(JSON.parse(data.data ?? '{}'))) } catch { parts.push('[分享]') }
    } else if (t === 'video') {
      parts.push('[视频]')
    } else if (t === 'file') {
      parts.push(`[文件: ${data.name ?? ''}]`)
    }
  }

  let text = parts.join('')
  text = await replaceBilibiliUrls(text)
  return { text, clean: text.trim(), images }
}

// ==================== 长文本分段 ====================

function splitPlainText (text, maxLen) {
  const result = []
  let buf = ''
  let i = 0
  const n = text.length
  const emit = () => {
    let s = buf.replace(/[。；]+$/, '').trim()
    if (s) result.push(s)
    buf = ''
  }
  while (i < n) {
    const ch = text[i]
    if (ch === '—' && i + 1 < n && text[i + 1] === '—') {
      buf += '——'
      i += 2
      emit()
      continue
    }
    if (ch === '\n') { i += 1; emit(); continue }
    if (ch.toLowerCase() === 'w') {
      let j = i
      while (j < n && text[j].toLowerCase() === 'w') j += 1
      if (j - i >= 3) { buf += text.slice(i, j); i = j; emit(); continue }
    }
    if (ch === '…' && i + 1 < n && text[i + 1] === '…' && buf.length > 20) {
      buf += '……'
      i += 2
      emit()
      continue
    }
    if ('！？'.includes(ch) && buf.length > 20) {
      let j = i
      while (j < n && '！？'.includes(text[j])) j += 1
      buf += text.slice(i, j)
      i = j
      emit()
      continue
    }
    if ('。；'.includes(ch) && buf.length > 20) {
      buf += ch
      i += 1
      emit()
      continue
    }
    buf += ch
    i += 1
  }
  emit()
  return result.length ? result : [text]
}

const STICKER_SEG_RE = /^\[(?:动画表情|sticker|贴纸|CQ):[^\]]+\]$/

/** 长文本按中文标点拆短句；表情包标签独立成段。 */
export function splitLongText (text, maxLen = 150) {
  text = text.replace(/\n{2,}/g, '\n').trim()
  if (!text) return []
  const rawParts = text.split(/(\[(?:动画表情|sticker|贴纸):[^\]]+\])/)
  const result = []
  for (let part of rawParts) {
    part = part.trim()
    if (!part) continue
    if (/^\[(?:动画表情|sticker|贴纸):[^\]]+\]$/.test(part)) { result.push(part); continue }
    if (part.length <= maxLen && part.length <= 20) {
      const s = part.replace(/[。；]+$/, '')
      if (s) result.push(s)
      continue
    }
    result.push(...splitPlainText(part, maxLen))
  }
  return result
}

const STICKER_LIKE_RE = /^\[(?:动画表情|sticker|贴纸|CQ):[^\]]+\]$/

/** 段数超限时随机合并相邻纯文字段；表情包段不计入、不参与合并。 */
export function mergeOverflowSegments (segments, maxSegments) {
  const result = [...segments]
  const merged = new Array(result.length).fill(false)
  for (; ;) {
    const textIdx = []
    result.forEach((s, i) => { if (!STICKER_LIKE_RE.test(s)) textIdx.push(i) })
    if (textIdx.length <= maxSegments) break
    const pairs = []
    for (let j = 0; j < textIdx.length - 1; j++) {
      const a = textIdx[j]
      const b = textIdx[j + 1]
      if (b === a + 1 && !merged[a] && !merged[b]) pairs.push(a)
    }
    if (!pairs.length) break
    const i = pairs[randomInt(pairs.length)]
    result[i] = result[i] + '\n' + result[i + 1]
    result.splice(i + 1, 1)
    merged[i] = true
    merged.splice(i + 1, 1)
  }
  return result
}

/** 命令解析：去掉 @与 CQ:at 后按 /命令 参数 返回 (命令, 参数)。 */
export function parseCommand (text) {
  text = String(text ?? '').trim()
  text = text.replace(/\[CQ:at[^\]]*\]/g, '')
  text = text.replace(/@\S+\s*/, '', 1)
  text = text.trim()
  if (!text.startsWith('/')) return { cmd: null, args: null }
  const sp = text.indexOf(' ')
  const cmd = (sp === -1 ? text : text.slice(0, sp)).toLowerCase()
  const args = sp === -1 ? '' : text.slice(sp + 1).trim()
  return { cmd, args }
}
