/**
 * 大脑：通过 DSH 宿主内的 Agent 服务驱动模型会话。
 *
 * 每个 (bot, 聊天) 持有一个 agent：
 * - 人设通过 agent 作用域的 system-prompt 段（deployment:persona-prefix）注入；
 * - 会话新建（或插件重载后）用聊天日志窗口重建上下文（种子消息）；
 * - 之后每个聚合批次作为一条 user 消息追加，图片走 attachments 准入为原生多模态块；
 * - 轮次结束读取持久事件流提取最终回复（与 dsh-headless 相同的汇总方式）。
 */
import { randomUUID } from 'node:crypto'
import { brandString } from '@deepseek-ai/dsh-brand'
import { installModelSelection } from '@deepseek-ai/dsh-agent'
import { createUserMessage } from '@deepseek-ai/dsh-llm'
import { SessionSeq } from '@deepseek-ai/dsh-session'
import { PERSONA_PREFIX_SECTION } from '@deepseek-ai/dsh-system-prompt'
import { fetchImagePart } from './imagepart.js'

export class Brain {
  /**
   * @param {import('@deepseek-ai/cordis').Context} ctx 插件上下文（inject: agents/agentDefaultModel/sessions）
   * @param {object} config 解析后的插件配置
   * @param {import('@deepseek-ai/cordis').Logger} logger
   */
  constructor (ctx, config, logger) {
    this.ctx = ctx
    this.config = config
    this.logger = logger
    this._agents = new Map() // `${botQq}::${chatKey}` → { handle, agent, personaText }
    this._readyPromise = null
    this._cwd = null
  }

  /** 等待宿主 loader 稳定并解析 cwd（每个进程一次）。 */
  async _ready () {
    if (!this._readyPromise) {
      this._readyPromise = (async () => {
        await this.ctx.get('loader')?.await()
        const fs = this.ctx.get('fs')
        this._cwd = fs ? fs.processPath(await fs.resolve('.')) : process.cwd()
      })()
    }
    await this._readyPromise
  }

  /** 该 bot 使用的模型选择：bot 覆盖 → 全局默认。 */
  _selection (botDef) {
    const fallback = this.ctx.get('agentDefaultModel')?.currentSelection()
    if (botDef.provider && botDef.model) {
      return { provider: botDef.provider, model: botDef.model }
    }
    return fallback
  }

  /** 新建一个 agent：装人设系统提示词段 + 模型选择，关闭可选运行时上下文。 */
  async _createAgent (botDef, personaText) {
    await this._ready()
    const agents = this.ctx.get('agents')
    if (!agents) throw new Error('qq-bot: agents 服务不可用（profile 未组合 agent-loop？）')
    const selection = this._selection(botDef)
    if (!selection?.provider || !selection?.model) {
      throw new Error('qq-bot: 没有可用的模型选择（请先在 Harness 里配置默认模型，或在插件配置中指定 provider/model）')
    }
    const agentOptions = { provider: selection.provider, model: selection.model }
    const setup = (agentCtx) => {
      try {
        installModelSelection(agentCtx, { current: selection, assembled: undefined })
        const systemPrompt = agentCtx.get('systemPrompt')
        if (systemPrompt) {
          const disposeSection = systemPrompt.section({
            name: PERSONA_PREFIX_SECTION,
            order: systemPrompt.getSectionOrder('DEPLOYMENT_PERSONA_PREFIX'),
            text: personaText,
          })
          agentCtx.effect(() => disposeSection, 'qq-bot.persona()')
          try { systemPrompt.suppressRuntimeContext?.() } catch { /* 可选能力 */ }
        }
      } catch (error) {
        // 人设或模型选择失败不应拖垮整个会话；记录后继续
        this.logger.warn(`qq-bot: agent setup 部分失败: ${String(error)}`)
      }
    }
    const sessionId = brandString(`qqbot-${botDef.qq}-${randomUUID()}`)
    const handle = await agents.create({
      sessionId,
      meta: { cwd: this._cwd },
      agentOptions,
      setup,
    })
    this.logger.info(
      `qq-bot: 新建会话 [${botDef.name}] ${sessionId} (${selection.provider}/${selection.model})`)
    return handle
  }

  /**
   * 一次回复回合。
   * @param {object} botDef bot 定义
   * @param {string} chatKey 聊天标识
   * @param {object} turn
   * @param {string|null} turn.seedText 会话（重新）建立时的种子文本；null 表示会话已存在
   * @param {string} turn.turnText 本轮新消息渲染文本
   * @param {Array<{url:string,sticker:boolean,summary:string}>} turn.images 本轮图片
   * @param {string} personaText 人设文本
   * @param {number} timeoutMs 回合超时
   * @returns {Promise<{text: string, sessionId: string}|null>} 模型最终文本；null = 失败/跳过
   */
  async chat (botDef, chatKey, turn, personaText) {
    const key = `${botDef.qq}::${chatKey}`
    let entry = this._agents.get(key)
    const text = turn.seedText ?? turn.turnText
    if (!text.trim() && !turn.images.length) return null

    try {
      entry ??= await this._createAgent(botDef, personaText)
      this._agents.set(key, entry)

      // ── 内容块：文本 + 图片（bot.js 已把图片下载为 liveImages 原生块；直接使用） ──
      const parts = []
      if (text.trim()) parts.push({ type: 'text', text })
      const attachments = this.ctx.get('attachments')
      const images = (turn.images ?? []).slice(0, this.config.chat.maxImagesPerTurn)
      const imageParts = []
      for (const image of images) {
        if (image?.type === 'image' && image.data) {
          imageParts.push(image) // liveImages 原生块：{type,mediaType,data}
        } else if (image?.url) {
          const part = await fetchImagePart(image.url, this.config.chat.imageMaxBytes)
          if (part) imageParts.push(part)
        }
      }
      if (attachments && imageParts.length) {
        try {
          const admitted = await attachments.admitPromptContent([...parts, ...imageParts])
          parts.splice(0, parts.length, ...admitted)
        } catch (error) {
          this.logger.warn(`qq-bot: 图片准入失败，已退化为纯文本: ${String(error)}`)
        }
      }

      const message = createUserMessage({ content: parts, source: { kind: 'user' } })
      const agent = entry.agent
      await agent.whenIdle()
      const firstSeq = agent.session.seq
      agent.followup(message)

      const done = this._waitForTurn(agent, firstSeq)
      done.catch(() => { /* 超时路径中 dispose 引起的拒绝由外层处理 */ })
      const timeoutMs = (botDef.timeout ?? 180) * 1000
      let timedOut = false
      let timer = null
      const timeoutPromise = new Promise(resolve => {
        timer = setTimeout(() => { timedOut = true; resolve(null) }, timeoutMs)
      })
      const outcome = await Promise.race([done, timeoutPromise])
      clearTimeout(timer)

      if (timedOut) {
        this.logger.warn(`qq-bot: [${botDef.name}] 回合超时 (${timeoutMs / 1000}s)，重建会话`)
        await this.disposeAgent(botDef.qq, chatKey)
        return null
      }
      if (!outcome) return null
      if (outcome.reason?.kind === 'error') {
        this.logger.warn(`qq-bot: [${botDef.name}] 回合出错: ${outcome.reason.error?.code}: ${outcome.reason.error?.message}`)
        return null
      }
      return { text: outcome.text, sessionId: String(agent.id) }
    } catch (error) {
      this.logger.error(`qq-bot: [${botDef.name}] 会话失败: ${String(error)}`)
      await this.disposeAgent(botDef.qq, chatKey)
      return null
    }
  }

  /** 等待 agent 空闲且会话序号稳定。 */
  async _waitForTurn (agent, firstSeq) {
    for (; ;) {
      await agent.whenIdle()
      const idleSeq = agent.session.seq
      if (agent.status === 'idle' && agent.session.seq === idleSeq) break
    }
    await this.ctx.get('sessions')?.flush(agent.session)
    return this.summarize(agent.session, firstSeq)
  }

  /** 汇总一次拥有区间 [firstSeq, seq) 的最后一条非空 assistant 文本（port dsh-headless summarize）。 */
  summarize (session, firstSeq = 0) {
    let started = false
    let text = ''
    let reason
    const length = session.seq
    for (let seq = firstSeq; seq < length; seq++) {
      const event = session.eventAt(SessionSeq(seq))
      if (event === undefined) break
      if (event.type === 'turn/start') { started = true; continue }
      if (!started) continue
      if (event.type === 'assistant/message') {
        const joined = (event.data?.message?.content ?? [])
          .filter(block => block?.type === 'text')
          .map(block => block.text)
          .join('')
        if (joined !== '') text = joined
      }
      if (event.type === 'turn/end') reason = event.data?.reason
    }
    return { text, reason }
  }

  /** 某 (bot, chat) 的 agent 是否存活（决定下一轮发种子还是发增量）。 */
  hasAgent (botQq, chatKey) {
    return this._agents.has(`${botQq}::${chatKey}`)
  }

  /** 释放一个 (bot, chat) 的 agent（flush 后 dispose）。 */
  async disposeAgent (botQq, chatKey) {
    const key = `${botQq}::${chatKey}`
    const entry = this._agents.get(key)
    if (!entry) return
    this._agents.delete(key)
    try {
      await this.ctx.get('sessions')?.flush(entry.agent.session)
    } catch { /* ignore */ }
    try {
      await entry.handle.dispose?.()
    } catch (error) {
      this.logger.warn(`qq-bot: 会话 ${entry.agent.id} 释放失败: ${String(error)}`)
    }
  }

  /** 当前活跃会话数。 */
  get sessionCount () { return this._agents.size }

  /** 释放某个 bot 的全部会话。 */
  async disposeAllFor (botQq) {
    const keys = [...this._agents.keys()].filter(key => key.startsWith(`${botQq}::`))
    await Promise.allSettled(keys.map(key => this.disposeAgent(...key.split('::'))))
  }

  /** 插件卸载时释放全部会话。 */
  async disposeAll () {
    await Promise.allSettled([...this._agents.keys()].map(key => this.disposeAgent(...key.split('::'))))
  }
}
