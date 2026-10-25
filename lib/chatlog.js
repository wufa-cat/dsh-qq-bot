/**
 * 聊天日志存储：与原 Python bot 的 data/<chat_id>.json / data/memory-<chat_id>.json 格式兼容。
 * 单进程内存内串行写入，直接同步落盘（量级：每群 300 条上限）。
 */
import { mkdirSync, readFileSync, writeFileSync, existsSync, rmSync } from 'node:fs'
import { join } from 'node:path'

function safeName (chatId) {
  return String(chatId).replaceAll(':', '-').replaceAll('/', '-')
}

export class ChatStore {
  /**
   * @param {string} dataDir  data 目录（默认仓库 data/）
   * @param {number} maxEntries 磁盘日志上限
   */
  constructor (dataDir, maxEntries = 300) {
    this.dataDir = dataDir
    this.maxEntries = maxEntries
    this._cache = new Map() // chatId → { log: array, dirty: boolean }
    this._saving = Promise.resolve()
    mkdirSync(dataDir, { recursive: true })
  }

  _path (chatId) { return join(this.dataDir, `${safeName(chatId)}.json`) }

  load (chatId) {
    if (this._cache.has(chatId)) return this._cache.get(chatId).log
    let log = []
    try {
      if (existsSync(this._path(chatId))) {
        const parsed = JSON.parse(readFileSync(this._path(chatId), 'utf8'))
        if (Array.isArray(parsed)) log = parsed
      }
    } catch { /* 损坏的文件当空处理 */ }
    this._cache.set(chatId, { log, dirty: false })
    return log
  }

  /** 追加一条记录（可多次 append 后统一 flush）。 */
  append (chatId, entry) {
    const state = this._cache.get(chatId) ?? { log: [], dirty: false }
    this._cache.set(chatId, state)
    state.log.push(entry)
    while (state.log.length > this.maxEntries) state.log.shift()
    state.dirty = true
  }

  /** 用给定数组整体替换日志（/clear N 用）。 */
  replace (chatId, log) {
    this._cache.set(chatId, { log: [...log], dirty: true })
  }

  /** 清空某聊天的日志。 */
  clear (chatId) {
    this._cache.set(chatId, { log: [], dirty: false })
    try { rmSync(this._path(chatId), { force: true }) } catch { /* ignore */ }
  }

  /** 将脏日志写盘（串行化，避免并发写坏 JSON）。 */
  async flush () {
    for (const [chatId, state] of this._cache) {
      if (!state.dirty) continue
      state.dirty = false
      const path = this._path(chatId)
      this._saving = this._saving.then(async () => {
        try {
          const tmp = `${path}.tmp-${Date.now()}`
          writeFileSync(tmp, JSON.stringify(state.log), 'utf8')
          const { renameSync } = await import('node:fs')
          renameSync(tmp, path)
        } catch { state.dirty = true }
      })
    }
    await this._saving
  }

  /** 长期记忆（原 bot 的 memory-<chat>.json，数组 [{time,summary}]）。 */
  loadMemory (chatId) {
    try {
      const path = join(this.dataDir, `memory-${safeName(chatId)}.json`)
      if (existsSync(path)) {
        const entries = JSON.parse(readFileSync(path, 'utf8'))
        if (!Array.isArray(entries) || !entries.length) return ''
        const lines = ['【长期记忆 — 之前聊过的重要内容】']
        for (const e of entries) {
          const summary = String(e?.summary ?? '').replaceAll('🤖', '')
          lines.push(`- [${e?.time ?? '?'}] ${summary}`)
        }
        return lines.join('\n')
      }
    } catch { /* ignore */ }
    return ''
  }

  /** 构建 QQ号 → 昵称 映射（后出现的优先，与原 get_chat_context 相反原版逻辑一致用 setdefault）。 */
  qqToName (chatId, extra = new Map()) {
    const map = new Map(extra)
    const log = this.load(chatId)
    for (const entry of log) {
      const uid = entry?.user_id
      if (uid && entry?.nickname) map.set(String(uid), entry.nickname)
    }
    return map
  }

  /** 名字 → QQ（反向映射，取最近优先）。 */
  nameToQq (chatId, extra = new Map()) {
    const map = new Map(extra)
    const log = this.load(chatId)
    for (let i = log.length - 1; i >= 0; i--) {
      const uid = log[i]?.user_id
      if (uid && log[i]?.nickname) map.set(log[i].nickname, String(uid))
    }
    return map
  }
}
