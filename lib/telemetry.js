/**
 * 运行遥测：内存里的环形事件表 + 每个 bot 的计数。
 * 服务于「对话巡检」面板与「状态灯」——排障时不用翻日志文件。
 */

const MAX_EVENTS = 400

/** 一条事件的字段：{ ts, bot, chat, kind, reason?, preview?, ms?, extra? } */
export class Telemetry {
  constructor ({ capacity = MAX_EVENTS } = {}) {
    this.capacity = capacity
    this.events = []
    this.chats = new Map() // `${bot}::${chat}` → { lastMessageAt, lastReplyAt, lastSkip, lastError, counts }
    this.bots = new Map() // bot name → counts
    this.startedAt = Date.now()
  }

  _botStats (bot) {
    let stats = this.bots.get(bot)
    if (!stats) this.bots.set(bot, stats = { messages: 0, replies: 0, skips: 0, errors: 0, commands: 0, lastError: '' })
    return stats
  }

  _chatStats (bot, chat) {
    const key = `${bot}::${chat}`
    let stats = this.chats.get(key)
    if (!stats) {
      this.chats.set(key, stats = {
        bot, chat, messages: 0, replies: 0, skips: 0, errors: 0,
        lastMessageAt: 0, lastReplyAt: 0, lastSkipReason: '', lastError: '',
      })
    }
    return stats
  }

  /**
   * 记一条事件。
   * @param {object} event
   * @param {string} event.bot - bot 名字
   * @param {string} [event.chat] - 聊天键（group-123 / private-x-y）
   * @param {'message'|'reply'|'skip'|'error'|'command'|'media'} event.kind
   * @param {string} [event.reason] - 跳过/失败原因
   * @param {string} [event.preview] - 消息或回复的前 120 字
   * @param {number} [event.ms] - 本轮耗时
   */
  record (event) {
    const ts = event.ts ?? Date.now()
    const entry = {
      ts,
      bot: String(event.bot ?? '?'),
      chat: event.chat ?? '',
      kind: event.kind ?? 'message',
      reason: event.reason ? String(event.reason).slice(0, 200) : '',
      preview: event.preview ? String(event.preview).slice(0, 160) : '',
      ms: Number.isFinite(event.ms) ? event.ms : undefined,
      extra: event.extra,
    }
    this.events.push(entry)
    if (this.events.length > this.capacity) this.events.splice(0, this.events.length - this.capacity)

    const botStats = this._botStats(entry.bot)
    const chatStats = entry.chat ? this._chatStats(entry.bot, entry.chat) : null
    if (entry.kind === 'message') {
      botStats.messages += 1
      if (chatStats) { chatStats.messages += 1; chatStats.lastMessageAt = ts }
    } else if (entry.kind === 'reply') {
      botStats.replies += 1
      if (chatStats) { chatStats.replies += 1; chatStats.lastReplyAt = ts }
    } else if (entry.kind === 'skip') {
      botStats.skips += 1
      if (chatStats) { chatStats.skips += 1; chatStats.lastSkipReason = entry.reason }
    } else if (entry.kind === 'command') {
      botStats.commands += 1
    } else if (entry.kind === 'error') {
      botStats.errors += 1
      botStats.lastError = entry.reason
      if (chatStats) { chatStats.errors += 1; chatStats.lastError = entry.reason }
    }
    return entry
  }

  /** 最近事件（新的在前）。 */
  recent (limit = 100, { bot, chat, kind } = {}) {
    const filtered = this.events.filter(e => (!bot || e.bot === bot) && (!chat || e.chat === chat) && (!kind || e.kind === kind))
    return filtered.slice(-limit).reverse()
  }

  /** 面板用的汇总。 */
  snapshot () {
    return {
      startedAt: this.startedAt,
      uptimeMs: Date.now() - this.startedAt,
      bots: [...this.bots.entries()].map(([name, stats]) => ({ name, ...stats })),
      chats: [...this.chats.values()].sort((a, b) => b.lastMessageAt - a.lastMessageAt).slice(0, 50),
      total: this.events.length,
    }
  }
}
