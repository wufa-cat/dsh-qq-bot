/**
 * dsh-qq-bot — QQ 机器人 DeepSeek Harness 插件。
 *
 * 把原来的 QQ-bot（Claude Code CLI 轮询）改造成 DSH 宿主内运行的插件：
 * 在 Web/Desktop profile 上挂一个 host 行，通过 dsh 的 agents 服务为每个
 * (bot, 聊天) 维持持久 agent 会话；OneBot 消息触发的回合用聊天日志窗口作为
 * 种子文本 + 本轮新消息驱动模型，人设通过 agent 作用域的 system-prompt 段注入。
 *
 * 配置（cordis.patch.yml 的 config 段）见 README；默认路径指向本仓库目录
 * （persona/、stickers/、data/ 与原 Python bot 完全共用）。
 */
import { readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import z from '@deepseek-ai/schemastery'
import { OneBotClient } from './onebot.js'
import { ChatStore } from './chatlog.js'
import { Brain } from './brain.js'
import { ChatHub } from './hub.js'
import { BotRuntime } from './bot.js'
import { clearStickerCache } from './cq.js'
import { createServiceController, registerRoutes } from './service.js'
import { createFileController, registerFileRoutes } from './files.js'
import { defaultRepoDir, vmInfo } from './platform.js'
import { ensureWorkspace } from './scaffold.js'
import { Telemetry } from './telemetry.js'
import { createMediaService } from './media.js'
import { createObserver, registerObserverRoutes } from './observe.js'
import { startScheduler } from './schedule.js'

/** Cordis 插件名。 */
export const name = 'qq-bot'

/**
 * 判断一个值是否是 schemastery `volatile()` 产生的配置引用。
 * @param {unknown} value - 待检查的值
 * @returns {boolean} 是引用对象则为 true
 */
function isVolatileRef (value) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false
  const keys = Object.keys(value)
  return keys.length === 1 && keys[0] === 'get' && typeof value.get === 'function'
}

/**
 * 递归展开 volatile 配置引用，得到普通值。
 * @param {unknown} value - 配置值或引用
 * @returns {unknown} 展开后的普通值
 */
function unref (value) {
  if (value === null || typeof value !== 'object') return value
  if (isVolatileRef(value)) return unref(value.get())
  if (Array.isArray(value)) return value.map(unref)
  return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, unref(child)]))
}

/** 挂载前必须就绪的核心服务。 */
export const inject = ['agents', 'agentDefaultModel', 'sessions']

const BotConfig = z.object({
  qq: z.string().required(),
  name: z.string().required(),
  persona: z.string(),
  admins: z.array(z.string()).default([]),
  ws: z.object({
    url: z.string().required(),
    accessToken: z.string().default(''),
  }),
  provider: z.string(),
  model: z.string(),
  timeout: z.number().default(180),
  /** 聊天档工具白名单：默认什么都不给（群里说话的人不该能跑命令/写文件）。 */
  tools: z.object({
    webSearch: z.boolean().default(false),
    webFetch: z.boolean().default(false),
  }).default({}),
})

export const Config = z.object({
  /**
   * 工作目录（含 persona/、stickers/、data/）。
   * 留空时用 ~/dsh-qq-bot，并自动创建目录与模板——新用户不用 clone 任何仓库。
   */
  repoDir: z.string().default('').volatile(),
  dataDir: z.string(),
  autoStart: z.boolean().default(true).volatile(),
  chat: z.object({
    maxContextChars: z.number().default(300),
    maxReplyLength: z.number().default(800),
    maxSegments: z.number().default(5).volatile(),
    replyCooldown: z.number().default(5).volatile(),
    skipCooldownReply: z.number().default(10),
    skipCooldown1: z.number().default(10),
    skipCooldown2: z.number().default(15),
    skipCooldown3: z.number().default(30),
    skipCooldown5: z.number().default(60),
    leaveCooldown: z.number().default(300).volatile(),
    sessionSoftLimit: z.number().default(150),
    sessionHardLimit: z.number().default(200),
    sessionCompactTo: z.number().default(45),
    logMaxEntries: z.number().default(300),
    segmentDelayBase: z.number().default(2),
    segmentDelayPerChar: z.number().default(0.1),
    segmentDelayCharThreshold: z.number().default(10),
    maxImagesPerTurn: z.number().default(4),
    imageMaxBytes: z.number().default(5 * 1024 * 1024),
    groupMemberTtl: z.number().default(600),
    blacklistGroups: z.array(z.union([z.string(), z.number()])).default([]),
  }),
  aggregation: z.object({
    windowTimeout: z.number().default(8).volatile(),
    maxMessages: z.number().default(8).volatile(),
  }),
  rateLimit: z.object({
    tier1Count: z.number().default(3),
    tier1Window: z.number().default(60),
    tier1Factor: z.number().default(1.5),
    tier2Count: z.number().default(10),
    tier2Window: z.number().default(300),
    tier2Factor: z.number().default(2),
    capCount: z.number().default(15),
    capWindow: z.number().default(600),
  }),
  bots: z.array(BotConfig).default([]).volatile(),
  /** OneBot 服务（Docker/NapCat）控制：界面上的启动/停止按钮走这里。 */
  /** 关键词规则：命中直接回复，不进模型。 */
  rules: z.array(z.object({
    enabled: z.boolean().default(true),
    pattern: z.string().required(),
    mode: z.string().default('contains'), // contains | exact | regex
    reply: z.string().required(),
    bots: z.array(z.string()).default([]),
  })).default([]).volatile(),
  /** 定时消息：每天 HH:MM 发到指定群/私聊。 */
  schedules: z.array(z.object({
    id: z.string().default(''),
    enabled: z.boolean().default(true),
    label: z.string().default(''),
    at: z.string().default('08:00'),
    days: z.array(z.number()).default([]), // 1=周一 … 7=周日；空=每天
    bot: z.string().default(''),
    chat: z.string().default(''), // group:123 / private:456
    text: z.string().default(''),
  })).default([]).volatile(),
  /** 多模态：ASR/TTS/生图，使用者自己填 baseURL + API Key。 */
  media: z.object({
    asr: z.object({
      enabled: z.boolean().default(false),
      baseURL: z.string().default('https://api.siliconflow.cn/v1'),
      apiKey: z.string().default(''),
      apiKeyEnv: z.string().default(''),
      model: z.string().default('FunAudioLLM/SenseVoiceSmall'),
      language: z.string().default('zh'),
    }).default({}),
    tts: z.object({
      enabled: z.boolean().default(false),
      baseURL: z.string().default('https://api.siliconflow.cn/v1'),
      apiKey: z.string().default(''),
      apiKeyEnv: z.string().default(''),
      model: z.string().default('FunAudioLLM/CosyVoice2-0.5B'),
      voice: z.string().default('FunAudioLLM/CosyVoice2-0.5B:alex'),
      format: z.string().default('mp3'),
      speed: z.number().default(1),
    }).default({}),
    image: z.object({
      enabled: z.boolean().default(false),
      baseURL: z.string().default('https://api.siliconflow.cn/v1'),
      apiKey: z.string().default(''),
      apiKeyEnv: z.string().default(''),
      model: z.string().default('Kwai-Kolors/Kolors'),
      size: z.string().default('1024x1024'),
      steps: z.number().default(20),
    }).default({}),
  }).default({}).volatile(),
  service: z.object({
    /** napcat-docker 目录；缺省 <repoDir>/onebot/napcat-docker。 */
    onebotDir: z.string().default('').volatile(),
    /** WebUI 端口（只用于拼链接）。 */
    webuiPort: z.number().default(6099).volatile(),
    /** OneBot 正向 WS 端口（只用于拼链接）。 */
    wsPort: z.number().default(3001).volatile(),
  }).default({}),
})

function readPersona (repoDir, personaName) {
  if (!personaName) return ''
  try {
    return readFileSync(join(repoDir, 'persona', `${personaName}.md`), 'utf8')
  } catch {
    return ''
  }
}

/**
 * 挂载QQ机器人桥。
 * @param {import('@deepseek-ai/cordis').Context} ctx - 携带核心服务的插件上下文
 * @param {object} config - 校验后的配置
 */
export function apply (ctx, config) {
  // `volatile()` 字段在 schema 解析后是引用对象（{ get() }，由设置页实时编辑），
  // 其余字段是普通值；统一展开成普通值，插件内部按常规读取。
  config = unref(config)

  // 空 repoDir → ~/dsh-qq-bot（跨平台），首次运行会自动补齐目录与模板。
  const repoDir = config.repoDir ? resolve(config.repoDir) : defaultRepoDir()
  const dataDir = config.dataDir ? resolve(config.dataDir) : join(repoDir, 'data')
  const stickersDir = join(repoDir, 'stickers')

  const fullConfig = {
    ...config,
    stickersDir,
    chat: {
      ...config.chat,
      blacklistGroups: (config.chat.blacklistGroups ?? []).map(String),
    },
  }

  const store = new ChatStore(dataDir, config.chat.logMaxEntries)
  const brain = new Brain(ctx, fullConfig, ctx.logger)
  const telemetry = new Telemetry()
  const media = createMediaService({ media: fullConfig.media ?? {}, logger: ctx.logger })
  const hub = new ChatHub({ store, brain, config: fullConfig, logger: ctx.logger, media, telemetry })
  const runtimes = []
  hub.runtimes = runtimes
  hub.onReload = async () => {
    clearStickerCache()
    for (const runtime of runtimes) {
      runtime.personaText = readPersona(repoDir, runtime.botDef.persona)
    }
    // 人设变了：释放现有 agent，下轮用新种子重建
    await Promise.allSettled(runtimes.map(r => brain.disposeAllFor(r.botDef.qq)))
  }
  ctx.logger.info(`qq-bot: 仓库目录 ${repoDir}，数据目录 ${dataDir}`)

  // OneBot 服务（Docker/NapCat）的启停路由：即使还没配 bot 也要能按钮起服务，
  // 所以注册在「没有 bot 就早退」之前。
  const serviceConfig = config.service ?? {}
  const onebotDir = resolve(serviceConfig.onebotDir || join(repoDir, 'onebot', 'napcat-docker'))
  const vm = vmInfo()
  ensureWorkspace({
    repoDir,
    onebotDir,
    webuiPort: serviceConfig.webuiPort ?? 6099,
    wsPort: serviceConfig.wsPort ?? 3001,
    logger: ctx.logger,
  })
  const controller = createServiceController({
    repoDir,
    dir: onebotDir,
    logger: ctx.logger,
    webuiPort: serviceConfig.webuiPort ?? 6099,
    wsPort: serviceConfig.wsPort ?? 3001,
  })
  ctx.inject(['webServer'], webCtx => registerRoutes(webCtx, controller))

  // 人格 / 表情包 / 目录 / 清理 的接口
  const fileController = createFileController({
    repoDir,
    dataDir,
    stickersDir,
    onebotDir,
    vmDir: vm.dir,
    logger: ctx.logger,
    botNames: config.bots.map(bot => bot.name).filter(Boolean),
  })
  ctx.inject(['webServer'], webCtx => registerFileRoutes(webCtx, fileController))
  hub.saveSticker = (bot, category, base64, name) => fileController.uploadSticker(bot, category, name, base64)

  // 运行观测：状态灯 / 对话巡检 / 运行期开关
  const observer = createObserver({
    telemetry,
    getRuntimes: () => runtimes,
    brain,
    config: fullConfig,
    logger: ctx.logger,
    webAvailable: () => {
      try { return Boolean(ctx.get('web')) } catch { return false }
    },
  })
  ctx.inject(['webServer'], webCtx => registerObserverRoutes(webCtx, observer))

  for (const botDef of config.bots) {
    const personaText = readPersona(repoDir, botDef.persona)
    if (!personaText) ctx.logger.warn(`qq-bot: [${botDef.name}] 未找到人设 persona/${botDef.persona}.md（继续以无人设运行）`)
    const client = new OneBotClient({
      url: botDef.ws.url,
      accessToken: botDef.ws.accessToken,
      logger: ctx.logger,
      onEvent: event => hub.onMessage(event, runtimeRef.runtime),
    })
    const runtimeRef = {}
    const runtime = new BotRuntime({
      botDef,
      personaText,
      config: fullConfig,
      brain,
      hub,
      logger: ctx.logger,
      client,
    })
    runtime.telemetry = telemetry
    runtime.media = media
    runtimeRef.runtime = runtime
    runtimes.push(runtime)
  }

  if (!runtimes.length) {
    ctx.logger.warn('qq-bot: 配置里没有 bot（bots: []）。请在插件配置中添加 bot 条目后重载。')
    return
  }

  ctx.effect(() => {
    if (config.autoStart) for (const runtime of runtimes) runtime.client.start()
    return async () => {
      for (const runtime of runtimes) {
        runtime.dispose()
        runtime.client.stop()
      }
      await brain.disposeAll()
      await store.flush().catch(() => {})
    }
  }, 'qq-bot.runtime()')

  ctx.effect(() => startScheduler({ config: fullConfig, hub, logger: ctx.logger }), 'qq-bot.schedule()')

  ctx.effect(() => {
    const timer = setInterval(() => { store.flush().catch(() => {}) }, 5000)
    return () => clearInterval(timer)
  }, 'qq-bot.flush()')
}
