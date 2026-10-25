/**
 * 聊天枢纽：统一消息入口（去重 → 有序处理 → 指令/日志 → 触发各 bot 监测）。
 * 移植 bot.py 的 _dispatch_message / handle_message / get_chat_context_blocks。
 */
import { extractText, parseCommand, cqStringToSegments, resolveStickers, stickerCatalog } from './cq.js'
import { fetchImagePart } from './imagepart.js'

const MERGE_WINDOW_SECONDS = 30
const CONTINUATION_PREFIX = '  '
const MAX_SEEN_PER_CHAT = 500
const WEEKDAYS_ZH = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']

/** OneBot 事件 → 聊天标识：group-{gid} / private-{self}-{uid}。 */
export function chatKeyOf (event) {
  if (event.message_type === 'group') return `group-${event.group_id}`
  return `private-${event.self_id}-${event.user_id}`
}

export function isGroupKey (chatKey) { return chatKey.startsWith('group-') }

/** group-123 → ('group', 123)；private-A-B → ('private', B)。 */
export function targetOfKey (chatKey) {
  if (isGroupKey(chatKey)) return ['group', chatKey.split('-')[1]]
  const parts = chatKey.split('-')
  return ['private', parts[parts.length - 1]]
}

export function fmtLogTime (epochSeconds = 0) {
  const d = new Date(epochSeconds * 1000)
  const p = (n, w = 2) => String(n).padStart(w, '0')
  return `${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
}

export function parseLogTime (value) {
  const m = /^(\d{1,2})-(\d{1,2}) (\d{1,2}):(\d{2}):(\d{2})$/.exec(String(value ?? ''))
  if (!m) return null
  const now = new Date()
  return new Date(now.getFullYear(), Number(m[1]) - 1, Number(m[2]), Number(m[3]), Number(m[4]), Number(m[5]))
}

export function fmtNowZh () {
  const d = new Date()
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日 ${WEEKDAYS_ZH[d.getDay()]} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
}

/** 从 OneBot 事件提取所有 at 的 QQ 号。 */
export function atQqsOf (event) {
  const raw = event.message
  const segments = Array.isArray(raw) ? raw : cqStringToSegments(String(event.raw_message ?? ''))
  const qqs = []
  for (const seg of segments) {
    if (seg?.type === 'at') {
      const qq = String(seg.data?.qq ?? '')
      if (qq === 'all') continue
      if (qq) qqs.push(qq)
    }
  }
  return qqs
}

export class ChatHub {
  constructor ({ store, brain, config, logger, media = null, telemetry = null, saveSticker = null }) {
    this.store = store
    this.brain = brain
    this.config = config
    this.logger = logger
    this.media = media // createMediaService()
    this.telemetry = telemetry
    this.saveSticker = saveSticker // (botName, category, base64, filename) → {ok}
    this.runtimes = [] // BotRuntime[]
    this._seen = new Map() // chatKey → Set<message_id>
    this._chains = new Map() // chatKey → Promise（串行处理）
    this._cursors = new Map() // chatKey → 会话窗口起始下标
    this._groupMembers = new Map() // gid → { map, time, fetching }
  }

  get allBotQqs () { return new Set(this.runtimes.map(r => r.botDef.qq)) }

  /** 某条已发送/已见消息登记（bot 回复也登记，防止回环）。 */
  markSeen (chatKey, messageId) {
    if (!messageId) return
    let set = this._seen.get(chatKey)
    if (!set) this._seen.set(chatKey, set = new Set())
    set.add(String(messageId))
    if (set.size > MAX_SEEN_PER_CHAT) {
      this._seen.set(chatKey, new Set([...set].slice(-MAX_SEEN_PER_CHAT)))
    }
  }

  isSeen (chatKey, messageId) {
    return Boolean(messageId) && this._seen.get(chatKey)?.has(String(messageId))
  }

  /** 群成员缓存（qq → 群名片/昵称）。 */
  async groupMembers (groupId, runtime) {
    const gid = String(groupId)
    const cached = this._groupMembers.get(gid)
    const ttl = (this.config.chat.groupMemberTtl ?? 600) * 1000
    if (cached && Date.now() - cached.time < ttl && cached.map) return cached.map
    if (cached?.fetching) return cached.map ?? null
    const entry = { map: cached?.map ?? null, time: cached?.time ?? 0, fetching: true }
    this._groupMembers.set(gid, entry)
    try {
      const resp = await runtime.client.call('get_group_member_list', { group_id: Number(groupId) })
      if (resp?.status === 'ok' && Array.isArray(resp.data)) {
        const map = new Map()
        for (const m of resp.data) {
          const qq = String(m?.user_id ?? '')
          const name = m?.card || m?.nickname || ''
          if (qq && name) map.set(qq, name)
        }
        entry.map = map
        entry.time = Date.now()
      }
    } catch { /* 刷新失败沿用旧缓存 */ }
    entry.fetching = false
    return entry.map
  }

  /** 消息统一入口（由各 runtime 的 ws 客户件调用）。 */
  onMessage (event, fromRuntime) {
    const chatKey = chatKeyOf(event)
    const messageId = event.message_id

    if (this.isSeen(chatKey, messageId)) return
    this.markSeen(chatKey, messageId)

    // bot 自己/同伴发的消息：只去重不处理
    const senderQq = String(event.user_id ?? '')
    if (this.allBotQqs.has(senderQq)) return

    if (event.message_type === 'group') {
      const gid = String(event.group_id)
      if ((this.config.chat.blacklistGroups ?? []).map(String).includes(gid)) return
    }

    const prev = this._chains.get(chatKey) ?? Promise.resolve()
    const next = prev
      .catch(() => {})
      .then(() => this._process(event, fromRuntime, chatKey))
      .catch(error => this.logger.error(`qq-bot: 处理消息失败 [${chatKey}]: ${String(error)}`))
    this._chains.set(chatKey, next)
  }

  async _process (event, fromRuntime, chatKey) {
    // @ 的目标 bot（命令路由/提及打断用）
    const atQqs = atQqsOf(event)
    const targets = this.runtimes.filter(r => atQqs.includes(r.botDef.qq))
    const hasAt = atQqs.length > 0

    // 群成员名单（懒加载刷新）
    let groupMembers = null
    if (event.message_type === 'group') groupMembers = await this.groupMembers(event.group_id, fromRuntime)

    // QQ → 昵称映射
    const qqToName = this.store.qqToName(chatKey)
    for (const [qq, name] of (groupMembers ?? new Map())) qqToName.set(qq, name)
    for (const r of this.runtimes) qqToName.set(r.botDef.qq, r.botDef.name)

    const chatLog = this.store.load(chatKey)

    let { text, clean, images, voices } = await extractText(event.message ?? event.raw_message, {
      qqToName,
      apiCall: (action, params) => fromRuntime.client.call(action, params),
      chatLog,
      chatId: chatKey,
      collectImages: true,
    })

    // \ 前缀（群聊未 @bot）：注释，丢弃
    if (clean.startsWith('\\') && event.message_type === 'group' && !hasAt) return

    // / 指令
    const { cmd, args } = parseCommand(clean)
    if (cmd) {
      const commands = this._commands()
      if (commands[cmd]) {
        if (event.message_type !== 'group' || targets.length) {
          await commands[cmd]({
            event, chatKey, clean,
            runtime: fromRuntime,
            targets: targets.length ? targets : [fromRuntime],
            all: this.runtimes,
            hub: this,
            args,
          })
        }
        return
      }
      return // 非法 / 指令 → 注释，直接丢弃
    }

    if (!clean && !images.length) return // 无文本无图片：不写日志

    // 关键词规则：命中就直接回，不进模型（省钱、快）
    const rule = this._matchRule(clean, targets.length ? targets : this.runtimes)
    if (rule) {
      const speaker = String(event.sender?.card || event.sender?.nickname || event.user_id || '')
      const text = rule.reply
        .replaceAll('{user}', speaker)
        .replaceAll('{qq}', String(event.user_id ?? ''))
        .replaceAll('{bot}', targets[0]?.botDef.name ?? fromRuntime.botDef.name)
      const [type, id] = targetOfKey(chatKey)
      try {
        const messageId = await fromRuntime.client.sendMessage(type, id, text)
        if (messageId !== undefined) this.markSeen(chatKey, messageId)
        this.telemetry?.record({ bot: fromRuntime.botDef.name, chat: chatKey, kind: 'command', reason: `规则命中：${rule.pattern}` })
      } catch (error) {
        this.logger.error(`qq-bot: 规则回复失败: ${String(error)}`)
      }
      return
    }

    // 图片即时下载（live），失败的占位符退化为文字
    const maxImages = this.config.chat.maxImagesPerTurn
    const liveImages = []
    let rendered = text
    for (let i = 0; i < images.length; i++) {
      const meta = images[i]
      const part = liveImages.length < maxImages
        ? await fetchImagePart(meta.url, this.config.chat.imageMaxBytes)
        : null
      if (part) {
        const k = liveImages.push(part) - 1
        rendered = rendered
          .replaceAll(`[图片#${i}]`, `[图片#${k}]`)
          .replaceAll(`[动画表情#${i}]`, `[动画表情#${k}]`)
      } else {
        const label = meta.sticker ? '动画表情' : '图片'
        const fallback = meta.summary ? `[${label}：${meta.summary}]` : `[${label}]`
        rendered = rendered
          .replaceAll(`[图片#${i}]`, fallback)
          .replaceAll(`[动画表情#${i}]`, fallback)
      }
    }

    const entry = {
      time: fmtLogTime(event.time ?? Math.floor(Date.now() / 1000)),
      user_id: event.user_id,
      nickname: event.sender?.card || event.sender?.nickname || String(event.user_id ?? '?'),
      message: rendered,
      message_id: event.message_id,
    }
    if (liveImages.length) entry.liveImages = liveImages
    this.store.append(chatKey, entry)
    await this.store.flush()
    fromRuntime._mediaAllowed?.set(chatKey, {
      image: this.canUse(fromRuntime, event, chatKey, 'image'),
      tts: this.canUse(fromRuntime, event, chatKey, 'tts'),
    })
    this.telemetry?.record({
      bot: fromRuntime.botDef.name,
      chat: chatKey,
      kind: 'message',
      preview: `${entry.nickname}: ${String(rendered).slice(0, 120)}`,
    })

    // @bot 打断 LEAVE
    if (targets.length) {
      for (const t of targets) t.onMentioned(chatKey)
    }

    this.triggerAll(chatKey, { senderBotQq: null, count: 1 })
  }

  /** 触发各 bot 的聊天监测。 */
  triggerAll (chatKey, { senderBotQq = null, count = 1 } = {}) {
    const isGroup = isGroupKey(chatKey)
    const gid = isGroup ? chatKey.split('-')[1] : null
    for (const r of this.runtimes) {
      if (senderBotQq && r.botDef.qq === senderBotQq) continue
      if (!r.aiEnabled) continue
      if (isGroup) {
        const members = this._groupMembers.get(gid)?.map
        if (members && !members.has(r.botDef.qq)) continue
      }
      r.notifyNew(chatKey, count)
    }
  }

  /** 日志条目 → 渲染行（同人 30 秒内续行只缩进）。返回 { lines, entryImages }。 */
  renderEntries (entries) {
    const maxChars = this.config.chat.maxContextChars
    const lines = []
    const entryImages = []
    let prevUser = null
    let prevDt = null
    let prevIsUser = false
    for (const entry of entries) {
      if (!entry || entry._cmd) continue
      let msg = String(entry.message ?? '')
      if (msg.length > maxChars) msg = msg.slice(0, maxChars) + '…'
      const isBot = Boolean(entry.bot)
      const uid = String(entry.user_id ?? entry.nickname ?? '')
      const dt = parseLogTime(entry.time)
      const canMerge = !isBot && prevIsUser && uid === prevUser && dt && prevDt
        && (dt - prevDt) >= 0 && (dt - prevDt) <= MERGE_WINDOW_SECONDS * 1000
      lines.push(`${canMerge ? CONTINUATION_PREFIX : `[${entry.time ?? ''}] ${entry.nickname ?? '?'}: `}${msg}`)
      if (entry.liveImages?.length) entryImages.push(...entry.liveImages)
      prevUser = uid
      prevDt = dt
      prevIsUser = !isBot
    }
    return { lines, entryImages }
  }

  /** 清聊天（同时释放相关 agent）。 */
  async clearChat (chatKey) {
    this.store.clear(chatKey)
    this._cursors.delete(chatKey)
    this._chains.set(chatKey, Promise.resolve())
    await Promise.allSettled(this.runtimes.map(r => r.brain.disposeAgent(r.botDef.qq, chatKey)))
    this.runtimes.forEach(r => r.onChatCleared(chatKey))
  }

  /**
   * 会话窗口起点（port session cursor / compact）：
   * 窗口内条数超过 soft limit 时收缩到最近 compactTo 条并前移 cursor。
   * 返回当前窗口起始下标。
   */
  sessionCursor (chatKey) {
    const cfg = this.config.chat
    const log = this.store.load(chatKey)
    let start = this._cursors.get(chatKey) ?? 0
    const sessionLen = log.length - start
    if (sessionLen > cfg.sessionSoftLimit) {
      start = Math.max(0, log.length - cfg.sessionCompactTo)
      this._cursors.set(chatKey, start)
    }
    return start
  }

  /**
   * 谁能调用某个功能。功能各自的权限在 access.features[feature] 里，
   * mode=inherit 时跟随 access 的默认值；黑名单（默认+功能）永远优先。
   * @param {object} runtime
   * @param {object} event OneBot 事件
   * @param {string} chatKey 内部 chatKey
   * @param {'image'|'tts'|'sticker'|'search'|'manage'} feature
   */
  canUse (runtime, event, chatKey, feature = 'manage') {
    const access = runtime?.botDef?.access ?? {}
    const cfg = access.features?.[feature] ?? {}
    const merge = (a, b) => [...(Array.isArray(a) ? a : []), ...(Array.isArray(b) ? b : [])].map(String)
    const users = merge(access.users, cfg.users)
    const groups = merge(access.groups, cfg.groups)
    const denyUsers = merge(access.denyUsers, cfg.denyUsers)
    const denyGroups = merge(access.denyGroups, cfg.denyGroups)
    const qq = String(event?.user_id ?? '')
    const group = isGroupKey(chatKey) ? String(chatKey).slice(6) : ''

    if (qq && denyUsers.includes(qq)) return false
    if (group && denyGroups.includes(group)) return false
    if (qq && (runtime?.botDef?.admins ?? []).map(String).includes(qq)) return true

    const mode = cfg.mode && cfg.mode !== 'inherit' ? String(cfg.mode) : String(access.mode ?? 'admin')
    if (mode === 'all') return true
    if (mode === 'list') return Boolean((qq && users.includes(qq)) || (group && groups.includes(group)))
    return false
  }

  /** 关键词规则匹配。 */
  _matchRule (text, runtimes) {
    const rules = this.config.rules ?? []
    if (!rules.length || !text) return null
    const names = new Set(runtimes.map(r => r.botDef.name))
    for (const rule of rules) {
      if (rule.enabled === false || !rule.pattern) continue
      if (Array.isArray(rule.bots) && rule.bots.length && !rule.bots.some(name => names.has(name))) continue
      const mode = rule.mode ?? 'contains'
      let hit = false
      try {
        if (mode === 'exact') hit = text.trim() === String(rule.pattern).trim()
        else if (mode === 'regex') hit = new RegExp(String(rule.pattern), 'i').test(text)
        else hit = text.includes(String(rule.pattern))
      } catch { hit = false }
      if (hit) return rule
    }
    return null
  }

  /** 给定时任务/别处用的主动发送：bot 名字 + 聊天键。 */
  async sendTo (botName, chatTarget, text) {
    const runtime = this.runtimes.find(r => r.botDef.name === botName || r.botDef.qq === String(botName))
    if (!runtime) return { ok: false, error: `找不到机器人「${botName}」` }
    if (!runtime.isConnected()) return { ok: false, error: `${botName} 未连接` }
    // 目标支持 'group:123' / 'private:456'，也支持内部 chatKey（group-123 / private-A-B）
    const chatKey = String(chatTarget).includes(':')
      ? (String(chatTarget).startsWith('group:')
        ? `group-${String(chatTarget).split(':')[1]}`
        : `private-${runtime.botDef.qq}-${String(chatTarget).split(':')[1]}`)
      : String(chatTarget)
    const [type, id] = targetOfKey(chatKey)
    try {
      const messageId = await runtime.client.sendMessage(type, id, text)
      if (messageId !== undefined) this.markSeen(chatKey, messageId)
      this.store.append(chatKey, {
        time: fmtLogTime(Math.floor(Date.now() / 1000)),
        user_id: runtime.botDef.qq,
        nickname: runtime.botDef.name,
        bot: true,
        message: String(text).trim(),
        ...(messageId !== undefined ? { message_id: messageId } : {}),
      })
      await this.store.flush()
      this.telemetry?.record({ bot: botName, chat: chatKey, kind: 'reply', preview: `[定时] ${String(text).slice(0, 100)}` })
      return { ok: true, messageId }
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : String(error) }
    }
  }

  /** 收集一条事件（含其引用消息）里的图片 URL。 */
  async collectImageUrls (event, runtime) {
    const segments = Array.isArray(event.message) ? event.message : cqStringToSegments(String(event.raw_message ?? ''))
    const urls = []
    let replyId = null
    for (const seg of segments) {
      if (seg?.type === 'image') {
        const url = seg.data?.url || seg.data?.file
        if (url) urls.push(url)
      } else if (seg?.type === 'reply') {
        replyId = seg.data?.id ?? null
      }
    }
    if (!urls.length && replyId) {
      try {
        const resp = await runtime.client.call('get_msg', { message_id: Number(replyId) })
        const message = resp?.data?.message
        const quoted = Array.isArray(message) ? message : cqStringToSegments(String(resp?.data?.raw_message ?? ''))
        for (const seg of quoted) {
          if (seg?.type === 'image') {
            const url = seg.data?.url || seg.data?.file
            if (url) urls.push(url)
          }
        }
      } catch (error) {
        this.logger.warn(`qq-bot: 取引用消息失败: ${String(error)}`)
      }
    }
    return urls
  }

  _commands () { return createCommands(this) }
}

// ==================== 群内指令 ====================

function parseCount (args) {
  const n = Number.parseInt(String(args ?? '').trim(), 10)
  return Number.isFinite(n) && n > 0 ? n : 0
}

function createCommands (hub) {
  const cfg = hub.config.chat

  async function cmdReply (ctx, text) {
    const responder = ctx.targets?.[0]?.isConnected() ? ctx.targets[0] : ctx.runtime
    const [type, id] = targetOfKey(ctx.chatKey)
    await responder.client.sendMessage(type, id, text)
  }

  function isAdmin (ctx, runtime) {
    const admins = runtime.botDef.admins ?? []
    if (!admins.length) return true
    return admins.map(String).includes(String(ctx.event.user_id ?? ''))
  }

  return {
    '/help': async (ctx) => {
      await cmdReply(ctx, [
        '📋 可用指令：',
        '/help            - 显示此帮助',
        '/ping            - 测试延迟',
        '/time            - 服务器时间',
        '/echo 文本        - 原样复述',
        '/roll            - 掷骰子 (1-100)',
        '/calc 表达式      - 四则运算',
        '/表情 [分类]      - 列出表情分类 / 直接发一张',
        '/收图 [分类]      - 把图片收进表情包',
        '/画 描述          - 生成一张图（需配置生图 key）',
        '/语音 文本        - 合成一条语音（需配置 TTS key）',
        '/搜索 on|off|跟随 - 联网搜索开关（跟随=回到配置）',
        '/ai on|off|status [--all] - 开关/查看 AI 回复',
        '/clear [N]        - 清空记忆，或只保留最近 N 条',
        '/reload           - 重读人设与表情包',
        '',
        '🔐 /收图 /搜索 /画 /语音 /ai /clear /reload 能否使用由插件里的「权限」决定',
        '（默认仅管理员；也可以在配置里按功能放开给全员或指定 QQ/群）。',
        '',
        '💬 直接 @我 或私聊说话，我会用 AI 回复！',
      ].join('\n'))
    },
    '/ping': async (ctx) => { await cmdReply(ctx, '🏓 pong!') },
    '/time': async (ctx) => {
      const d = new Date()
      await cmdReply(ctx, `🕐 ${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${d.toTimeString().slice(0, 8)}`)
    },
    '/表情': async (ctx) => {
      const args = String(ctx.args ?? '').trim()
      const bot = ctx.targets?.[0] ?? ctx.runtime
      const botName = bot?.botDef?.name ?? ''
      const catalog = stickerCatalog(hub.config.stickersDir, botName)
      if (!args) {
        const list = catalog.length ? catalog.map(item => `${item.category}(${item.count})`).join('、') : '(还没有表情包)'
        await cmdReply(ctx, `🎨 可用表情：${list}\n用法：/表情 开心`)
        return
      }
      const cq = resolveStickers(`[动画表情:${args}]`, hub.config.stickersDir, botName)
      if (!cq.trim()) {
        const names = catalog.map(item => item.category).join('、') || '(无)'
        await cmdReply(ctx, `❌ 没有「${args}」这个分类。可用：${names}`)
        return
      }
      await cmdReply(ctx, cq)
    },
    '/echo': async (ctx) => { await cmdReply(ctx, ctx.args || '用法: /echo 要说的话') },
    '/收图': async (ctx) => {
      if (!ctx.targets.every(t => hub.canUse(t, ctx.event, ctx.chatKey, 'sticker'))) { await cmdReply(ctx, '❌ 权限不足（收图）'); return }
      if (!hub.saveSticker) { await cmdReply(ctx, '❌ 表情包写入未就绪（插件未挂在 web 服务上？）'); return }
      const bot = ctx.targets?.[0] ?? ctx.runtime
      const category = (String(ctx.args ?? '').trim() || '未分类').slice(0, 64)
      const urls = await hub.collectImageUrls(ctx.event, bot)
      if (!urls.length) {
        await cmdReply(ctx, '❌ 没找到图片：把图片和「/收图 分类」一起发，或者回复一张图再发这条指令')
        return
      }
      const extOf = mediaType => ({ 'image/png': 'png', 'image/jpeg': 'jpg', 'image/gif': 'gif', 'image/webp': 'webp' })[mediaType] ?? 'jpg'
      let saved = 0
      const failures = []
      for (const url of urls.slice(0, 4)) {
        const part = await fetchImagePart(url, hub.config.chat.imageMaxBytes)
        if (!part) { failures.push('图片下载/格式不支持'); continue }
        const name = `收图-${Date.now()}-${saved}.${extOf(part.mediaType)}`
        const result = hub.saveSticker(bot.botDef.name, category, part.data, name)
        if (result?.ok) saved += 1
        else failures.push(result?.error ?? '未知错误')
      }
      if (saved) {
        await cmdReply(ctx, `📥 已收进表情包：${category} ×${saved}（${bot.botDef.name}）\n发「/表情 ${category}」可以直接试发`)
      } else {
        await cmdReply(ctx, `❌ 收图失败：${failures[0] ?? '未知原因'}`)
      }
    },
    '/搜索': async (ctx) => {
      if (!ctx.targets.every(t => hub.canUse(t, ctx.event, ctx.chatKey, 'search'))) { await cmdReply(ctx, '❌ 权限不足（搜索开关）'); return }
      const bot = ctx.targets?.[0] ?? ctx.runtime
      const action = String(ctx.args ?? '').trim().toLowerCase()
      const enable = ['on', '1', 'true', '开', '开启'].includes(action)
      const disable = ['off', '0', 'false', '关', '关闭'].includes(action)
      if (enable || disable) {
        bot.searchOverride = enable
        await hub.brain.disposeAllFor(bot.botDef.qq)
        await cmdReply(ctx, `${enable ? '🔎 联网搜索已开启（下一轮生效）' : '🔒 联网搜索已关闭'} [${bot.botDef.name}]`)
        return
      }
      const tools = bot.effectiveToolPolicy()
      const source = bot.searchOverride === null ? '跟随配置' : '指令临时覆盖'
      await cmdReply(ctx, `🔎 联网搜索 [${bot.botDef.name}]：${tools.webSearch ? '开' : '关'}（${source}）\n配置里打开：bots[].tools.webSearch；API Key 在「设置 → 插件 → 网页搜索」`)
    },
    '/画': async (ctx) => {
      if (!ctx.targets.every(t => hub.canUse(t, ctx.event, ctx.chatKey, 'image'))) { await cmdReply(ctx, '❌ 权限不足（生图要花 key 额度）'); return }
      const prompt = String(ctx.args ?? '').trim()
      if (!prompt) { await cmdReply(ctx, '用法: /画 一只戴墨镜的猫'); return }
      if (!hub.media) { await cmdReply(ctx, '❌ 生图未就绪'); return }
      const result = await hub.media.draw(prompt)
      if (!result.ok) { await cmdReply(ctx, `❌ 生图失败：${result.error}`); return }
      await cmdReply(ctx, `[CQ:image,file=base64://${result.buffer.toString('base64')}]`)
    },
    '/语音': async (ctx) => {
      if (!ctx.targets.every(t => hub.canUse(t, ctx.event, ctx.chatKey, 'tts'))) { await cmdReply(ctx, '❌ 权限不足（语音合成要花 key 额度）'); return }
      const text = String(ctx.args ?? '').trim()
      if (!text) { await cmdReply(ctx, '用法: /语音 今天也要开心呀'); return }
      if (!hub.media) { await cmdReply(ctx, '❌ TTS 未就绪'); return }
      const result = await hub.media.speak(text)
      if (!result.ok) { await cmdReply(ctx, `❌ 语音合成失败：${result.error}`); return }
      await cmdReply(ctx, `[CQ:record,file=base64://${result.buffer.toString('base64')}]`)
    },
    '/roll': async (ctx) => { await cmdReply(ctx, `🎲 你掷出了: ${1 + Math.floor(Math.random() * 100)}`) },
    '/calc': async (ctx) => {
      if (!ctx.args) { await cmdReply(ctx, '用法: /calc 表达式 (如 /calc 1+2*3)'); return }
      try {
        const safe = ctx.args.replace(/[^0-9+\-*/().%\s]/g, '')
        const result = Function(`"use strict"; return (${safe})`)()
        if (typeof result !== 'number' || !Number.isFinite(result)) throw new Error('not finite')
        await cmdReply(ctx, `🧮 ${ctx.args} = ${result}`)
      } catch {
        await cmdReply(ctx, '❌ 表达式有误，试试 /calc 1+2*3')
      }
    },
    '/clear': async (ctx) => {
      if (!ctx.targets.every(t => isAdmin(ctx, t))) { await cmdReply(ctx, '❌ 权限不足'); return }
      const n = parseCount(ctx.args)
      if (n > 0) {
        const log = hub.store.load(ctx.chatKey)
        const removed = Math.min(n, log.length)
        hub.store.replace(ctx.chatKey, log.slice(0, Math.max(0, log.length - removed)))
        await hub.store.flush()
        if (!hub.store.load(ctx.chatKey).length) await hub.clearChat(ctx.chatKey)
        else {
          ctx.all?.forEach(r => r.onChatCleared(ctx.chatKey))
          await Promise.allSettled(ctx.all.map(r => r.brain.disposeAgent(r.botDef.qq, ctx.chatKey)))
        }
        const rest = hub.store.load(ctx.chatKey)
        const last = rest[rest.length - 1]
        const preview = last ? `\n最后一条: [${last.time}] ${last.nickname}: ${String(last.message ?? '').slice(0, 60)}` : ''
        await cmdReply(ctx, `🧹 清除了最近 ${removed} 条（剩余 ${rest.length} 条）${preview}`)
      } else {
        await hub.clearChat(ctx.chatKey)
        await cmdReply(ctx, '🧹 对话记忆已清除！')
      }
    },
    '/reload': async (ctx) => {
      if (!ctx.targets.every(t => isAdmin(ctx, t))) { await cmdReply(ctx, '❌ 权限不足'); return }
      try {
        await hub.onReload?.()
        await cmdReply(ctx, '✅ 人设与表情包已重载（行为参数以插件配置为准）')
      } catch (error) {
        await cmdReply(ctx, `❌ 重载失败: ${String(error)}`)
      }
    },
    '/ai': async (ctx) => {
      const parts = String(ctx.args ?? '').trim().split(/\s+/)
      const action = (parts[0] ?? '').toLowerCase()
      const isAll = parts.includes('--all') || parts.includes('-a')
      if (isAll && !ctx.targets.some(t => isAdmin(ctx, t))) { await cmdReply(ctx, '❌ 权限不足（--all 需要管理员权限）'); return }
      const bots = isAll ? ctx.all : (ctx.targets?.length ? ctx.targets : [ctx.runtime])
      const names = bots.map(b => b.botDef.name).join(', ') || '?'
      if (['on', '1', 'true', '开启', '开'].includes(action)) {
        bots.forEach(b => b.setAi(ctx.chatKey, true, isAll))
        await cmdReply(ctx, `✅ AI 回复已开启 [${names}]${isAll ? '（全局）' : ''}`)
      } else if (['off', '0', 'false', '关闭', '关'].includes(action)) {
        bots.forEach(b => b.setAi(ctx.chatKey, false, isAll))
        await cmdReply(ctx, `🛑 AI 回复已关闭 [${names}]${isAll ? '（全局）' : ''}`)
      } else if (action === 'status') {
        const lines = bots.map(b => `  ${b.botDef.name}: ${b.aiStatusText(ctx.chatKey, isAll)}`)
        await cmdReply(ctx, `📊 AI 状态 [${names}]：\n${lines.join('\n')}`)
      } else {
        await cmdReply(ctx, '用法: /ai on|off|status [--all]')
      }
    },
  }
}
