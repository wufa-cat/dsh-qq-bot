/** 图片下载与类型探测（被 brain.js 与 hub.js 共用）。 */
const SUPPORTED_MEDIA = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif'])

/** 从字节探测图片媒体类型（不支持则 null）。 */
export function sniffImageType (bytes) {
  if (bytes.length < 12) return null
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return 'image/png'
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg'
  if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46) return 'image/gif'
  if (bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46
    && bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50) return 'image/webp'
  return null
}

/** 下载一张 QQ 图片，返回 {type:'image', mediaType, data(base64)}；失败/超限/不支持返回 null。 */
export async function fetchImagePart (url, maxBytes) {
  try {
    const resp = await fetch(url, { signal: AbortSignal.timeout(15000) })
    if (!resp.ok) return null
    const buffer = Buffer.from(await resp.arrayBuffer())
    if (buffer.length === 0 || buffer.length > maxBytes) return null
    const mediaType = sniffImageType(buffer)
    if (!mediaType || !SUPPORTED_MEDIA.has(mediaType)) return null
    return { type: 'image', mediaType, data: buffer.toString('base64') }
  } catch {
    return null
  }
}
