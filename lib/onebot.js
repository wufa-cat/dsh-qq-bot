/**
 * OneBot v11 正向 WebSocket 客户端：连接 LLOneBot / NapCat，重连 + echo API。
 */
import { randomUUID } from 'node:crypto'
import WebSocket from 'ws'

export class OneBotClient {
  /**
   * @param {object} opts
   * @param {string} opts.url                ws://host:port
   * @param {string} [opts.accessToken]      access_token
   * @param {import('@deepseek-ai/cordis').Logger} opts.logger
   * @param {(event: object) => void} opts.onEvent  message 事件回调
   */
  constructor ({ url, accessToken = '', logger, onEvent }) {
    this.url = url
    this.accessToken = accessToken
    this.logger = logger
    this.onEvent = onEvent
    this.ws = null
    this.stopped = false
    this.connected = false
    this._pending = new Map() // echo → {resolve, reject, timer}
    this._retryDelay = 1
    this._connectPromise = null
    this._printedConnecting = false
  }

  /** 启动并进入永久重连循环（返回即已发起首个连接尝试）。 */
  start () {
    this.stopped = false
    this._loop().catch(error => {
      this.logger.error(`qq-bot ws loop crashed: ${String(error)}`)
    })
  }

  async stop () {
    this.stopped = true
    for (const { reject, timer } of this._pending.values()) {
      clearTimeout(timer)
      reject(new Error('onebot client stopped'))
    }
    this._pending.clear()
    try { this.ws?.close() } catch { /* ignore */ }
  }

  /** 等待当前连接成功一次（带超时） */
  async waitConnected (timeoutMs = 15000) {
    const started = Date.now()
    while (!this.connected && !this.stopped) {
      if (Date.now() - started > timeoutMs) throw new Error(`连接 ${this.url} 超时`)
      await new Promise(r => setTimeout(r, 300))
    }
  }

  async _loop () {
    while (!this.stopped) {
      let url = this.url
      if (this.accessToken) url += (url.includes('?') ? '&' : '?') + `access_token=${encodeURIComponent(this.accessToken)}`
      try {
        if (!this._printedConnecting) {
          this.logger.info(`qq-bot: 正在连接 ${this.url} ...`)
          this._printedConnecting = true
        }
        const closed = new Promise((resolve, reject) => {
          const ws = new WebSocket(url, { maxPayload: 20 * 1024 * 1024, handshakeTimeout: 10000 })
          this.ws = ws
          let opened = false
          ws.on('open', () => {
            opened = true
            this.connected = true
            this._retryDelay = 1
            this.logger.info('qq-bot: ✅ 已连接')
          })
          ws.on('message', (raw) => {
            let event
            try {
              event = JSON.parse(typeof raw === 'string' ? raw : raw.toString('utf8'))
            } catch { return }
            if (event?.post_type) {
              if (event.post_type === 'message') this.onEvent?.(event)
            } else if ('echo' in event) {
              this._resolveApi(event)
            }
          })
          ws.on('close', (code, reason) => {
            this.connected = false
            this.ws = null
            if (opened) {
              this.logger.warn(`qq-bot: 连接断开 (${code}${reason ? ` ${String(reason)}` : ''})，将重连`)
              resolve()
            } else {
              reject(new Error(`connect failed (${code})`))
            }
          })
          ws.on('error', (error) => {
            if (!opened) reject(error)
          })
        })
        await closed
      } catch {
        this.connected = false
      }

      if (this.stopped) break
      await new Promise(r => setTimeout(r, this._retryDelay * 1000))
      this._retryDelay = Math.min(this._retryDelay * 2, 30)
    }
  }

  _resolveApi (event) {
    const entry = this._pending.get(event.echo)
    if (!entry) return
    this._pending.delete(event.echo)
    clearTimeout(entry.timer)
    entry.resolve(event)
  }

  /** 调用 OneBot API（action + params），返回完整响应对象。 */
  async call (action, params = {}, timeoutMs = 30000) {
    const ws = this.ws
    if (!ws || ws.readyState !== WebSocket.OPEN) throw new Error(`qq-bot: WebSocket 未连接，无法调用 ${action}`)
    const echo = randomUUID()
    return await new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this._pending.delete(echo)
        reject(new Error(`qq-bot: API ${action} 超时 (${timeoutMs}ms)`))
      }, timeoutMs)
      this._pending.set(echo, { resolve, reject, timer })
      try {
        ws.send(JSON.stringify({ action, params, echo }))
      } catch (error) {
        this._pending.delete(echo)
        clearTimeout(timer)
        reject(error)
      }
    })
  }

  /** 发送文本消息（群或私聊），返回 message_id。 */
  async sendMessage (messageType, targetId, message) {
    const action = messageType === 'group' ? 'send_group_msg' : 'send_private_msg'
    const params = messageType === 'group'
      ? { group_id: Number(targetId), message }
      : { user_id: Number(targetId), message }
    const resp = await this.call(action, params)
    const data = resp?.data
    return data && typeof data === 'object' ? data.message_id : undefined
  }
}
