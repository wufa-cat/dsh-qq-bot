/**
 * 运行观测：状态灯 + 对话巡检 + 运行期开关。
 * 全部走 `/qqbot-status`、`/qqbot-inspect`、`/qqbot-runtime/*`（挂在 Harness web 服务器上）。
 */
const STATUS_PREFIX = '/qqbot-status'
const INSPECT_PREFIX = '/qqbot-inspect'
const RUNTIME_PREFIX = '/qqbot-runtime'

function json (res, body, status = 200) {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' })
  res.end(JSON.stringify(body))
}

function readBody (req) {
  return new Promise((resolvePromise, reject) => {
    let data = ''
    req.on('data', chunk => {
      data += chunk
      if (data.length > 1024 * 1024) reject(new Error('请求体过大'))
    })
    req.on('end', () => resolvePromise(data))
    req.on('error', reject)
  })
}

/**
 * 运行观测控制器。
 * @param {object} options
 * @param {import('./telemetry.js').Telemetry} options.telemetry
 * @param {() => Array<object>} options.getRuntimes - 返回 BotRuntime 列表
 * @param {object} options.brain
 * @param {object} options.config
 * @param {object} options.logger
 * @param {() => boolean} [options.webAvailable] - `ctx.web` 服务是否可用
 */
export function createObserver ({ telemetry, getRuntimes, brain, config, logger, webAvailable }) {
  function bots () {
    return getRuntimes().map(runtime => {
      const status = runtime.client?.status?.() ?? { connected: false }
      const stats = telemetry?.bots?.get?.(runtime.botDef.name) ?? {}
      return {
        name: runtime.botDef.name,
        qq: runtime.botDef.qq,
        connected: Boolean(status.connected),
        url: status.url ?? runtime.botDef.ws?.url ?? '',
        attempts: status.attempts ?? 0,
        failures: status.failures ?? 0,
        lastError: status.lastError ?? '',
        connectedForMs: status.connectedForMs ?? 0,
        aiEnabled: Boolean(runtime.aiEnabled),
        chatAiDisabled: runtime.chatAiDisabled?.size ?? 0,
        searchOverride: runtime.searchOverride,
        tools: runtime.effectiveToolPolicy?.() ?? { webSearch: false, webFetch: false },
        counters: {
          messages: stats.messages ?? 0,
          replies: stats.replies ?? 0,
          skips: stats.skips ?? 0,
          errors: stats.errors ?? 0,
        },
      }
    })
  }

  function status () {
    const hasWeb = typeof webAvailable === 'function' ? Boolean(webAvailable()) : false
    return {
      ok: true,
      now: Date.now(),
      uptimeMs: telemetry ? Date.now() - telemetry.startedAt : 0,
      bots: bots(),
      counters: telemetry?.snapshot?.() ?? { bots: [], chats: [], total: 0 },
      web: {
        available: hasWeb,
        hint: hasWeb
          ? '搜索后端为 DeepSeek 官方（deepseek-official）。模型不是 DeepSeek 账号模型时，需要在「设置 → 插件 → 官方 → 网页搜索」里填 DeepSeek API Key，否则搜索会报凭据缺失。'
          : '当前 profile 没有加载 web 服务（@deepseek-ai/dsh-web），联网搜索不可用。',
      },
      rules: (config.rules ?? []).filter(rule => rule.enabled !== false).length,
      schedules: (config.schedules ?? []).filter(item => item.enabled !== false).length,
    }
  }

  function inspect ({ bot, chat, limit = 60 } = {}) {
    return {
      ok: true,
      cards: telemetry?.snapshot?.() ?? { bots: [], chats: [], total: 0 },
      events: telemetry?.recent?.(Math.min(200, Number(limit) || 60), { bot, chat }) ?? [],
    }
  }

  /** 运行期开关：/qqbot-runtime/search（不改配置文件，重载后回到配置值）。 */
  async function runtimeSearch (botName, enabled) {
    const runtime = getRuntimes().find(r => r.botDef.name === botName)
    if (!runtime) return { ok: false, error: `找不到机器人「${botName}」` }
    runtime.searchOverride = enabled === null || enabled === undefined ? null : Boolean(enabled)
    // 会话按新策略重建：下轮会从聊天日志重新开种子
    await brain?.disposeAllFor?.(runtime.botDef.qq)
    logger?.info?.(`qq-bot: [${botName}] 联网搜索运行时开关 → ${runtime.searchOverride === null ? '跟随配置' : runtime.searchOverride ? '开' : '关'}`)
    return { ok: true, bot: botName, searchOverride: runtime.searchOverride, tools: runtime.effectiveToolPolicy() }
  }

  /** 运行期开关：/qqbot-runtime/ai。 */
  async function runtimeAi (botName, enabled, chat) {
    const runtime = getRuntimes().find(r => r.botDef.name === botName)
    if (!runtime) return { ok: false, error: `找不到机器人「${botName}」` }
    if (chat) runtime.setAi(chat, Boolean(enabled), false)
    else runtime.setAi(null, Boolean(enabled), true)
    return { ok: true, bot: botName, aiEnabled: runtime.aiEnabled, chat, enabled: Boolean(enabled) }
  }

  return { status, inspect, bots, runtimeSearch, runtimeAi }
}

/**
 * 注册观测路由。
 * @param {object} ctx - Host 上下文（已注入 webServer）
 * @param {object} observer - createObserver 的返回值
 */
export function registerObserverRoutes (ctx, observer) {
  return ctx.effect(() => {
    const disposers = []

    disposers.push(ctx.webServer.register({
      kind: 'prefix',
      path: STATUS_PREFIX,
      handler: async (req, res) => {
        try {
          return json(res, observer.status())
        } catch (error) {
          return json(res, { ok: false, error: String(error) }, 500)
        }
      },
    }))

    disposers.push(ctx.webServer.register({
      kind: 'prefix',
      path: INSPECT_PREFIX,
      handler: async (req, res) => {
        const url = new URL(req.url ?? '/', 'http://localhost')
        try {
          return json(res, observer.inspect({
            bot: url.searchParams.get('bot') || undefined,
            chat: url.searchParams.get('chat') || undefined,
            limit: Number(url.searchParams.get('limit')) || 60,
          }))
        } catch (error) {
          return json(res, { ok: false, error: String(error) }, 500)
        }
      },
    }))

    disposers.push(ctx.webServer.register({
      kind: 'prefix',
      path: RUNTIME_PREFIX,
      handler: async (req, res) => {
        const url = new URL(req.url ?? '/', 'http://localhost')
        const path = url.pathname.slice(RUNTIME_PREFIX.length) || '/'
        try {
          if (path === '/search') {
            const body = JSON.parse(await readBody(req) || '{}')
            const enabled = body.followConfig ? null : body.enabled
            return json(res, await observer.runtimeSearch(body.bot, enabled))
          }
          if (path === '/ai') {
            const body = JSON.parse(await readBody(req) || '{}')
            return json(res, await observer.runtimeAi(body.bot, body.enabled, body.chat))
          }
          return json(res, { ok: false, error: '未知接口' }, 404)
        } catch (error) {
          return json(res, { ok: false, error: error instanceof Error ? error.message : String(error) }, 400)
        }
      },
    }))

    return () => { for (const dispose of disposers) try { dispose() } catch { /* ignore */ } }
  }, 'qq-bot: observer routes')
}
