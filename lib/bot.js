/**
 * BotRuntime：单个 QQ bot 的运行时 — OneBot 连接、per-chat 监测循环
 * （聚合 → 冷却 → AI 回复 → 分段发送），移植 bot.py 的 _chat_monitor /
 * ai_chat / reply / _get_cooldown_wait。
 */
import { fmtLogTime, fmtNowZh, isGroupKey, targetOfKey } from './hub.js'
import { stickerCatalog, resolveStickers, resolveAtMentions, splitLongText, mergeOverflowSegments } from './cq.js'
import { effectiveTools } from './tools.js'

const STICKER_ONLY_RE = /^\[(?:动画表情|sticker|贴纸):[^\]]+\]$/

export class BotRuntime {
  /**
   * @param {object} opts
   * @param {object} opts.botDef      { qq, name, persona, admins, provider, model, timeout }
   * @param {() => object} [opts.getBotDef] 现读配置里的这条 bot（界面保存后是新对象）
   * @param {string} opts.personaText 人设全文
   * @param {object} opts.config      插件配置
   * @param {import('./brain.js').Brain} opts.brain
   * @param {import('./hub.js').ChatHub} opts.hub
   * @param {import('@deepseek-ai/cordis').Logger} opts.logger
   * @param {import('./onebot.js').OneBotClient} opts.client
   */
  constructor ({ botDef, getBotDef = null, personaText, config, brain, hub, logger, client }) {
    this.botDef = botDef
    this.getBotDef = getBotDef
    this.personaText = personaText
    this.config = config
    this.brain = brain
    this.hub = hub
    this.logger = logger
    this.client = client
    this.aiEnabled = true
    this.chatAiDisabled = new Set() // chatKey 集合
    this.mentionedIn = new Set() // 被打断 LEAVE 的 chat
    this.leaveUntil = new Map() // chatKey → 恢复时间戳
    this.replyHistory = new Map() // chatKey → [ts]
    this.skipHistory = new Map() // chatKey → [bool]
    this._turnMark = new Map() // chatKey → 已经送达 agent 的日志长度（增量回合用）
    this._pendingCount = new Map() // chatKey → 未处理的新消息计数
    this._monitors = new Map() // chatKey → AbortController
    this.searchOverride = null // `/搜索 on|off` 的临时覆盖
    this.telemetry = null // 由 index.js 注入
  }

  isConnected () { return this.client?.connected ?? false }

  /** 配置里当前这条 bot（界面保存后是新对象；拿不到就退回创建时那份）。 */
  liveDef () {
    try { return this.getBotDef?.() ?? this.botDef } catch { return this.botDef }
  }

  /** 本 bot 当前生效的工具策略（`/搜索` 覆盖优先，工具开关现读配置）。 */
  effectiveToolPolicy () {
    return effectiveTools(this.liveDef()?.tools, this.searchOverride)
  }

  /**
   * 联网提示：只有「配置开着 + agent 里真的有 web_search」时才告诉模型能查。
   * 否则模型会自己编 <invoke> 之类的工具调用语法，那玩意儿会被当文本发到群里。
   */
  searchPromptLine () {
    if (!this.effectiveToolPolicy().webSearch) return ''
    const availability = this.hub?.brain?.toolAvailability?.(this.botDef) ?? null
    if (availability && availability.webSearch === false) {
      return '【联网】本轮没有可用的联网工具：不要写 <invoke>、<antml:…>、tool_calls 这类调用语法，直接说明你查不到实时信息。'
    }
    return '【联网】需要最新信息（新闻、价格、版本、人物近况等）时可以调用 web_search 查资料；回答里带上来源链接。没搜到就直说没搜到，不要编造。'
  }

  /** 把模型误输出的工具调用语法从正文里清掉（不能让它原样发到群里）。 */
  static stripToolCalls (text) {
    const toolTag = (name) => /calls?$/i.test(name) ||
      /^(?:antml:)?(?:invoke|parameter|function)$/i.test(name)
    let out = String(text ?? '')

    // 整块删除（可能嵌套，跑到稳定为止）
    for (let round = 0; round < 6; round += 1) {
      const next = out.replace(/<([a-zA-Z][\w:.-]*)\b[^>]*>[\s\S]*?<\/\1>/g, (whole, name) => (toolTag(name) ? '' : whole))
      if (next === out) break
      out = next
    }

    // 落单的开/闭标签
    out = out.replace(/<\/?([a-zA-Z][\w:.-]*)\b[^>]*>/g, (whole, name) => (toolTag(name) ? '' : whole))
    // 只有标签的行
    out = out.split('\n').filter(line => !/^\s*<[^>]*>\s*$/.test(line) || !toolTag(line.replace(/^\s*<\/?|\s*>\s*$/g, ''))).join('\n')
    return out.replace(/\n{3,}/g, '\n\n').trim()
  }

  setAi (chatKey, on, global) {
    if (global) {
      this.chatAiDisabled.clear()
      this.aiEnabled = on
    } else if (on) {
      this.chatAiDisabled.delete(chatKey)
    } else {
      this.chatAiDisabled.add(chatKey)
    }
  }

  aiStatusText (chatKey, global) {
    if (global) return this.aiEnabled ? '开启' : '关闭'
    return this.chatAiDisabled.has(chatKey) ? '关闭' : '开启'
  }

  onMentioned (chatKey) { this.mentionedIn.add(chatKey) }

  /** 有人发言（hub.triggerAll / 私聊直发）→ 计数 + 唤醒监测。 */
  notifyNew (chatKey, count = 1) {
    this._pendingCount.set(chatKey, (this._pendingCount.get(chatKey) ?? 0) + count)
    if (!this._monitors.has(chatKey)) {
      const controller = new AbortController()
      this._monitors.set(chatKey, controller)
      this.logger.info(`qq-bot: 启动监测 [${this.botDef.name}] [chat=${chatKey}]`)
      this._chatMonitor(chatKey, controller.signal).catch(error => {
        this.logger.error(`qq-bot: 监测循环异常退出 [${this.botDef.name}] [${chatKey}]: ${String(error)}`)
      }).finally(() => {
        this._monitors.delete(chatKey)
        if ((this._pendingCount.get(chatKey) ?? 0) > 0 && !this._disposed) this.notifyNew(chatKey, 0)
      })
    }
  }

  onChatCleared (chatKey) {
    this.replyHistory.delete(chatKey)
    this.skipHistory.delete(chatKey)
    this._turnMark.delete(chatKey)
  }

  async dispose () {
    this._disposed = true
    for (const controller of this._monitors.values()) controller.abort()
    this._monitors.clear()
  }

  // ==================== 监测循环（port _chat_monitor） ====================

  async _chatMonitor (chatKey, signal) {
    const agg = this.config.aggregation
    const idleTimeoutMs = (this.config.chat.replyCooldown + 30) * 1000
    try {
      for (;;) {
        // Phase 0: 等第一条新消息（250ms 分片轮询，既响应新消息也响应空闲退出）
        {
          const t0 = Date.now()
          while ((this._pendingCount.get(chatKey) ?? 0) === 0) {
            if (signal.aborted) return
            if (Date.now() - t0 >= idleTimeoutMs && !this._hasRecentActivity(chatKey)) return
            await this._sleep(250, signal)
          }
        }

        // Phase 0.5: 聚合窗口（port 原版语义：静默 windowTimeout 秒 或 攒满 maxMessages 条）
        {
          let lastCount = -1
          let lastChange = Date.now()
          for (;;) {
            if (signal.aborted) return
            const count = this._pendingCount.get(chatKey) ?? 0
            if (count !== lastCount) { lastCount = count; lastChange = Date.now() }
            if (count >= agg.maxMessages) break
            const quietMs = Date.now() - lastChange
            if (quietMs >= agg.windowTimeout * 1000) break
            await this._sleep(Math.min(250, agg.windowTimeout * 1000 - quietMs), signal)
          }
          this._pendingCount.delete(chatKey)
        }

        // Phase 1: 冷却（等待期间的新消息打断等待 → 保留计数重新评估，与原版 evt.set()+continue 一致）
        const [waitSec] = this._cooldownWait(chatKey)
        if (waitSec > 0) {
          const t0 = Date.now()
          let interrupted = false
          for (;;) {
            const elapsed = Date.now() - t0
            if (elapsed >= waitSec * 1000) break
            if ((this._pendingCount.get(chatKey) ?? 0) > 0) { interrupted = true; break }
            await this._sleep(Math.min(500, waitSec * 1000 - elapsed), signal)
            if (signal.aborted) return
          }
          if (interrupted) continue // 计数保留：Phase 0 立即放行，重新聚合并重评冷却（LEAVE/提及等）
          continue // 冷却自然结束 → 回 Phase 0 重新评估（可能还有排队消息）
        }
        if (signal.aborted) return

        // Phase 2: 调 AI
        if (!this.isConnected()) {
          this.logger.warn(`qq-bot: [${this.botDef.name}] 未连接，跳过回复 [chat=${chatKey}]`)
        } else if (this.aiEnabled && !this.chatAiDisabled.has(chatKey)) {
          await this.aiChat(chatKey)
          if (!this.replyHistory.has(chatKey)) this.replyHistory.set(chatKey, [])
          this.replyHistory.get(chatKey).push(Date.now())
        } else {
          this.logger.info(`qq-bot: [${this.botDef.name}] AI 已关闭，跳过回复 [chat=${chatKey}]`)
        }
      }
    } finally {
      this._pendingCount.delete(chatKey)
    }
  }

  _hasRecentActivity (chatKey) {
    const history = this.replyHistory.get(chatKey) ?? []
    return history.some(t => Date.now() - t < 10 * 60 * 1000)
  }

  async _sleep (ms, signal) {
    let timer
    try {
      await new Promise((resolve, reject) => {
        timer = setTimeout(resolve, ms)
        signal?.addEventListener('abort', () => { clearTimeout(timer); resolve() }, { once: true })
      })
    } finally {
      clearTimeout(timer)
    }
    return signal?.aborted
  }

  // ==================== 冷却（port _get_cooldown_wait） ====================

  _cooldownWait (chatKey) {
    const cfg = this.config
    const rl = cfg.rateLimit
    const now = Date.now()

    // @ 打断 LEAVE
    if (this.mentionedIn.has(chatKey)) {
      this.mentionedIn.delete(chatKey)
      this.leaveUntil.delete(chatKey)
      return [0, '提及', '被@打断']
    }

    const leaveEnd = this.leaveUntil.get(chatKey) ?? 0
    if (now < leaveEnd) {
      const remain = (leaveEnd - now) / 1000
      return [remain, '离开', `暂时离开，${remain.toFixed(0)}s 后恢复观察`]
    }
    if (leaveEnd > 0) this.leaveUntil.delete(chatKey)

    const history = (this.replyHistory.get(chatKey) ?? []).filter(t => now - t < rl.capWindow * 1000)
    this.replyHistory.set(chatKey, history)
    const count1m = history.filter(t => now - t < rl.tier1Window * 1000).length
    const count5m = history.filter(t => now - t < rl.tier2Window * 1000).length
    const count10m = history.length
    if (count10m >= rl.capCount) {
      const wait = rl.capWindow - (now - history[0]) / 1000 + 1
      return [wait, '上限', `触发上限 ${count10m}/${rl.capCount}条`]
    }

    const skips = this.skipHistory.get(chatKey) ?? []
    let consecutive = 0
    for (let i = skips.length - 1; i >= 0; i--) {
      if (skips[i]) consecutive += 1
      else break
    }
    let cooldown
    let skipLabel
    if (consecutive === 0 && skips.length && !skips[skips.length - 1]) {
      cooldown = cfg.chat.skipCooldownReply
      skipLabel = '回复'
    } else if (consecutive >= 5) {
      cooldown = cfg.chat.skipCooldown5
      skipLabel = `${consecutive}连SKIP`
    } else if (consecutive >= 3) {
      cooldown = cfg.chat.skipCooldown3
      skipLabel = `${consecutive}连SKIP`
    } else if (consecutive >= 2) {
      cooldown = cfg.chat.skipCooldown2
      skipLabel = `${consecutive}连SKIP`
    } else if (consecutive >= 1) {
      cooldown = cfg.chat.skipCooldown1
      skipLabel = `${consecutive}连SKIP`
    } else {
      cooldown = cfg.chat.skipCooldown1
      skipLabel = '首次'
    }
    const base = cooldown
    let detail
    if (count5m >= rl.tier2Count) {
      cooldown *= rl.tier2Factor
      detail = `${skipLabel} ${base}s×${rl.tier2Factor} (${count5m}次/${rl.tier2Window}s)`
    } else if (count1m >= rl.tier1Count) {
      cooldown *= rl.tier1Factor
      detail = `${skipLabel} ${base}s×${rl.tier1Factor} (${count1m}次/${rl.tier1Window}s)`
    } else {
      detail = `${skipLabel} ${base}s`
    }
    const sinceLast = history.length ? (now - history[history.length - 1]) / 1000 : cooldown
    if (sinceLast < cooldown) return [cooldown - sinceLast, skipLabel, detail]
    return [0, skipLabel, detail]
  }

  // ==================== AI 回复（port ai_chat；持久 agent 走增量回合） ====================

  async aiChat (chatKey) {
    const startedAt = Date.now()
    const tools = this.effectiveToolPolicy()
    const log = this.hub.store.load(chatKey)
    const sessionStart = this.hub.sessionCursor(chatKey)

    const windowEntries = []
    for (let i = sessionStart; i < log.length; i++) {
      if (!log[i]?._cmd) windowEntries.push(log[i])
    }
    if (!windowEntries.length) return

    // 增量判定：agent 存活且标记有效 → 只发上轮之后的新条目；否则发完整种子
    const mark = this._turnMark.get(chatKey)
    const agentLive = typeof this.brain.hasAgent === 'function'
      ? this.brain.hasAgent(this.botDef.qq, chatKey)
      : true
    let entries = windowEntries
    let isSeed = true
    if (agentLive && mark !== undefined && mark >= sessionStart && mark <= log.length) {
      const fresh = []
      for (let i = mark; i < log.length; i++) {
        if (!log[i]?._cmd) fresh.push(log[i])
      }
      if (fresh.length) {
        entries = fresh
        isSeed = false
      }
    }

    const { lines, entryImages } = this.hub.renderEntries(entries)
    const memoryText = isSeed ? this.hub.store.loadMemory(chatKey) : ''
    const hasImages = entryImages.length > 0

    const timeSuffix = `\n当前时间：${fmtNowZh()}`
    let seedText
    if (isSeed) {
      const seedParts = []
      if (this.personaText) seedParts.push(this.personaText)
      if (memoryText) seedParts.push(memoryText)
      const stickerLine = this.stickerPromptLine()
      const searchLine = this.searchPromptLine()
      const seedBody = [
        seedParts.join('\n\n'),
        stickerLine,
        searchLine,
        hasImages ? '【图片说明】图片按聊天中的位置理解；多帧表情属于同一个动图。不要统计或提及图片数量。' : '',
        `【聊天记录】\n${lines.join('\n')}`,
        timeSuffix,
      ].filter(Boolean).join('\n\n')
      seedText = seedBody
      this.logger.info(`qq-bot: 🤖 [${this.botDef.name}] 种子上下文 ${lines.length}行, ${entryImages.length}图`)
    } else {
      seedText = [
        this.stickerPromptLine(),
        this.searchPromptLine(),
        hasImages ? '【图片说明】图片按聊天中的位置理解；多帧表情属于同一个动图。不要统计或提及图片数量。' : '',
        `【新消息】\n${lines.join('\n')}`,
        timeSuffix,
      ].filter(Boolean).join('\n\n')
      this.logger.info(`qq-bot: 🤖 [${this.botDef.name}] 增量回合 +${lines.length}行, ${entryImages.length}图`)
    }

    const sentLength = log.length
    const result = await this.brain.chat(this.botDef, chatKey, {
      seedText,
      turnText: seedText,
      images: entryImages,
      tools,
    }, this.personaText)

    // 回合成功送达（含 [SKIP]/[LEAVE]）：标记已消费到当前日志长度
    if (result) this._turnMark.set(chatKey, sentLength)

    if (!result) {
      this._recordSkip(chatKey, true)
      this.telemetry?.record({ bot: this.botDef.name, chat: chatKey, kind: 'skip', reason: '模型无输出或超时', ms: Date.now() - startedAt })
      return
    }
    const replyText = result.text.trim()

    if (replyText === '[LEAVE]') {
      this.leaveUntil.set(chatKey, Date.now() + this.config.chat.leaveCooldown * 1000)
      this._recordSkip(chatKey, true)
      this.telemetry?.record({ bot: this.botDef.name, chat: chatKey, kind: 'skip', reason: '[LEAVE] 暂离', ms: Date.now() - startedAt })
      this.logger.info(`qq-bot: 🚪 [${this.botDef.name}] 暂时离开 [${chatKey}]`)
      return
    }
    if (replyText === '[SKIP]' || replyText === '') {
      this._recordSkip(chatKey, true)
      this.telemetry?.record({ bot: this.botDef.name, chat: chatKey, kind: 'skip', reason: '[SKIP] 不回复', ms: Date.now() - startedAt })
      return
    }
    this._recordSkip(chatKey, false)

    // 分段
    let segments = splitLongText(replyText, this.config.chat.maxReplyLength)
    segments = mergeOverflowSegments(segments, this.config.chat.maxSegments)
    segments = segments.filter(s => !['[SKIP]', '[LEAVE]'].includes(s.trim().toUpperCase()) && s.trim())

    this.logger.info(`qq-bot: 📤 [${this.botDef.name}] 分段回复 (${segments.length}段)`)

    for (let i = 0; i < segments.length; i++) {
      if (i > 0) {
        let delay = this.config.chat.segmentDelayBase * 1000
        if (!STICKER_ONLY_RE.test(segments[i]) && segments[i].length > this.config.chat.segmentDelayCharThreshold) {
          delay += this.config.chat.segmentDelayPerChar * (segments[i].length - this.config.chat.segmentDelayCharThreshold) * 1000
        }
        await new Promise(r => setTimeout(r, delay))
      }
      await this.send(chatKey, segments[i])
    }
    this.telemetry?.record({
      bot: this.botDef.name,
      chat: chatKey,
      kind: 'reply',
      preview: replyText,
      ms: Date.now() - startedAt,
    })
  }

  _recordSkip (chatKey, isSkip) {
    if (!this.skipHistory.has(chatKey)) this.skipHistory.set(chatKey, [])
    const skips = this.skipHistory.get(chatKey)
    skips.push(isSkip)
    // 与原版一致：按容量截断保留（冷却计算只看尾部连续段）
    while (skips.length > 32) skips.shift()
  }

  // ==================== 发送（port reply） ====================

  /** 表情包目录提示：让模型知道能用哪些分类，以及怎么引用。 */
  stickerPromptLine () {
    const catalog = stickerCatalog(this.config.stickersDir, this.botDef.name)
    if (!catalog.length) return ''
    const names = catalog.map(item => item.category).join('、')
    return `【表情包】可用分类：${names}。想发其中某个表情时，在回复里单独写一行 [动画表情:分类名]（不要解释，插件会换成该分类里随机一张图）。`
  }

  async send (chatKey, message) {
    const logText = message
    // 先按文本长度截断，再展开表情包：展开后的 [CQ:image,...base64] 有好几十万字符，
    // 如果在展开之后再截断，就会把 base64 从中间切断，QQ 端直接发不出去。
    let text = message
    text = BotRuntime.stripToolCalls(text)
    if (!text) {
      this.logger.warn(`qq-bot: [${chatKey}] 模型输出只有工具调用语法，已丢弃（检查工具白名单/联网配置）`)
      this.telemetry?.record({ bot: this.botDef.name, chat: chatKey, kind: 'skip', reason: '回复只剩工具调用语法', preview: '' })
      return
    }
    const limit = this.config.chat.maxReplyLength
    if (text.length > limit) text = text.slice(0, limit - 12) + '…[已截断]'
    let outbound = resolveStickers(text, this.config.stickersDir, this.botDef.name)
    if (!outbound.trim()) return
    if (isGroupKey(chatKey) && /@[^\s]/.test(outbound)) {
      const nameToQq = this.hub.store.nameToQq(chatKey)
      for (const r of this.hub.runtimes) nameToQq.set(r.botDef.name, r.botDef.qq)
      outbound = resolveAtMentions(outbound, nameToQq)
    }

    const [type, id] = targetOfKey(chatKey)
    let messageId
    try {
      messageId = await this.client.sendMessage(type, id, outbound)
    } catch (error) {
      this.logger.error(`qq-bot: 发送失败 [${chatKey}]: ${String(error)}`)
      this.telemetry?.record({ bot: this.botDef.name, chat: chatKey, kind: 'error', reason: `发送失败: ${String(error)}` })
      return
    }

    // 写日志 + 去重 + 触发同伴
    if (messageId !== undefined) this.hub.markSeen(chatKey, messageId)
    this.hub.store.append(chatKey, {
      time: fmtLogTime(Math.floor(Date.now() / 1000)),
      user_id: this.botDef.qq,
      nickname: this.botDef.name,
      bot: true,
      message: logText.trim(),
      ...(messageId !== undefined ? { message_id: messageId } : {}),
    })
    await this.hub.store.flush()
    this.hub.triggerAll(chatKey, { senderBotQq: this.botDef.qq, count: 1 })
  }
}
