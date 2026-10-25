/**
 * OneBot 服务（Docker/NapCat）启停控制，跨 macOS / Windows。
 *
 * 插件界面里的「启动 / 停止 / 重启」按钮打到本文件注册的 HTTP 路由，
 * 路由再调用 compose 管理 napcat 容器；返回值用于界面显示状态和 WebUI 扫码链接。
 *
 * 平台差异全部走 platform.js：
 * - macOS 且装了 colima：先确保虚拟机在运行；
 * - Windows / Docker Desktop：检查 `docker info`，没起就提示用户打开 Docker Desktop；
 * - compose 命令优先 `docker compose`（新版 Docker 自带），回退 `docker-compose`。
 */
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  colimaState,
  currentPlatform,
  dockerDaemonRunning,
  isWindows,
  probeCompose,
  run,
  vmInfo,
  dirExists,
} from './platform.js'
import { ensureWorkspace } from './scaffold.js'

const CONTAINER = 'napcat'
const ROUTE_PREFIX = '/qqbot-service'
const DEFAULT_BINDARGS = ['--arch', 'aarch64', '--vm-type', 'vz', '--cpu', '2', '--memory', '4']

/** 读 WebUI 令牌（NapCat 首次启动后写在 data/config/webui.json）。 */
function webuiToken (dir) {
  try {
    const file = join(dir, 'data', 'config', 'webui.json')
    if (!existsSync(file)) return ''
    const parsed = JSON.parse(readFileSync(file, 'utf8'))
    return typeof parsed.token === 'string' ? parsed.token : ''
  } catch {
    return ''
  }
}

/** 容器是否在运行。 */
async function containerRunning (platform) {
  const result = await run('docker', ['inspect', '-f', '{{.State.Running}}', CONTAINER], { timeout: 20_000, platform })
  return result.code === 0 && result.stdout.trim() === 'true'
}

/**
 * 服务控制器。
 * @param options 控制器选项。
 * @param options.repoDir 工作目录（含 persona/、stickers/、data/）。
 * @param options.dir napcat-docker 目录（含 docker-compose.yml）。
 * @param options.logger Cordis 日志器。
 * @param options.webuiPort NapCat WebUI 端口。
 * @param options.wsPort OneBot 正向 WS 端口。
 * @param options.platform 平台名（可注入，测试用）。
 */
export function createServiceController ({ repoDir, dir, logger, webuiPort = 6099, wsPort = 3001, platform }) {
  const state = { busy: false, lastAction: '', lastError: '' }
  const os = currentPlatform(platform)

  let composeProbe
  function compose () {
    if (composeProbe === undefined) composeProbe = probeCompose({ platform: os })
    return composeProbe
  }

  /** 初始化/修复工作区（缺目录、缺 compose 时补上）。 */
  function init () {
    const summary = ensureWorkspace({
      repoDir,
      onebotDir: dir,
      webuiPort,
      wsPort,
      logger,
      platform: os,
    })
    return { ...summary, dir }
  }

  async function status () {
    const composeCommand = await compose()
    const docker = await dockerDaemonRunning({ platform: os })
    const running = docker.available ? await containerRunning(os) : false
    const colima = await colimaState({ platform: os })
    const vm = vmInfo(os)
    const token = webuiToken(dir)
    return {
      platform: os,
      dir,
      dirExists: dirExists(dir),
      composeFileExists: existsSync(join(dir, 'docker-compose.yml')),
      composeAvailable: composeCommand !== null,
      composeLabel: composeCommand?.label ?? '',
      dockerAvailable: docker.available,
      dockerVersion: docker.version,
      colimaAvailable: colima.available,
      colimaRunning: colima.running,
      vm,
      running,
      busy: state.busy,
      webuiUrl: token
        ? `http://127.0.0.1:${webuiPort}/webui?token=${token}`
        : `http://127.0.0.1:${webuiPort}/webui`,
      wsUrl: `ws://127.0.0.1:${wsPort}`,
      lastAction: state.lastAction,
      lastError: state.lastError,
    }
  }

  /** 环境自检：给界面一张「还差什么」的清单。 */
  async function doctor () {
    const composeCommand = await compose()
    const docker = await dockerDaemonRunning({ platform: os })
    const colima = await colimaState({ platform: os })
    const checks = [
      { id: 'platform', label: `平台：${os}`, ok: true, detail: '' },
      { id: 'docker', label: 'Docker 守护进程', ok: docker.available, detail: docker.available ? `v${docker.version}` : (docker.error || '未连接') },
      { id: 'compose', label: 'compose 命令', ok: composeCommand !== null, detail: composeCommand?.label ?? '未找到 docker compose / docker-compose' },
      { id: 'compose-file', label: 'docker-compose.yml', ok: existsSync(join(dir, 'docker-compose.yml')), detail: dir },
      { id: 'data', label: 'NapCat 数据目录', ok: existsSync(join(dir, 'data')), detail: join(dir, 'data') },
      { id: 'persona', label: '人格目录', ok: existsSync(join(repoDir, 'persona')), detail: join(repoDir, 'persona') },
      { id: 'stickers', label: '表情包目录', ok: existsSync(join(repoDir, 'stickers')), detail: join(repoDir, 'stickers') },
    ]
    if (os === 'darwin') {
      checks.push({ id: 'colima', label: 'colima 虚拟机', ok: !colima.available || colima.running, detail: colima.available ? (colima.running ? '运行中' : '未运行（点启动会自动拉起）') : '未安装（用 Docker Desktop 也可以）' })
    }
    return {
      ok: checks.filter(item => item.id !== 'colima').every(item => item.ok),
      platform: os,
      checks,
      hint: isWindows(os)
        ? 'Windows：先启动 Docker Desktop（托盘图标变绿），再点「启动服务」。'
        : 'macOS：装了 colima 会自动拉起；用 Docker Desktop 的话先打开它。',
    }
  }

  /** 确保 Docker 引擎可用；macOS 上顺便拉起 colima。 */
  async function ensureRuntime () {
    const docker = await dockerDaemonRunning({ platform: os })
    if (docker.available) return null
    if (os === 'darwin') {
      const colima = await colimaState({ platform: os })
      if (colima.available && !colima.running) {
        logger.info('qq-bot: colima 未运行，正在启动虚拟机…')
        const result = await run('colima', ['start', ...DEFAULT_BINDARGS], { timeout: 300_000, platform: os })
        if (result.code !== 0) return { error: `colima start 失败：${result.stderr || result.stdout}` }
        return null
      }
    }
    return {
      error: isWindows(os)
        ? 'Docker 没在运行：请先打开 Docker Desktop（托盘图标等待变绿），再点「启动服务」。'
        : 'Docker 没在运行：请启动 Docker Desktop，或安装 colima（brew install colima docker docker-compose）。',
    }
  }

  async function start () {
    if (!existsSync(dir)) init()
    if (!existsSync(dir)) return { ok: false, error: `找不到 OneBot 目录 ${dir}` }
    const composeCommand = await compose()
    if (!composeCommand) {
      return {
        ok: false,
        error: isWindows(os)
          ? '没有可用的 compose：请安装/启动 Docker Desktop（自带 docker compose）。'
          : '没有可用的 compose：请安装 Docker Desktop，或 brew install docker docker-compose。',
      }
    }
    const runtimeProblem = await ensureRuntime()
    if (runtimeProblem) return { ok: false, error: runtimeProblem.error }
    const result = await run(composeCommand.command, [...composeCommand.args, 'up', '-d'], {
      cwd: dir,
      timeout: 300_000,
      platform: os,
    })
    if (result.code !== 0) {
      return { ok: false, error: `启动失败：${(result.stderr || result.stdout).trim().slice(-800)}` }
    }
    // 给容器一点时间把 WebUI / 二维码准备好
    await new Promise(resolve => setTimeout(resolve, 4000))
    return { ok: true }
  }

  async function stop () {
    if (!existsSync(dir)) return { ok: false, error: `找不到 OneBot 目录 ${dir}` }
    const composeCommand = await compose()
    if (!composeCommand) return { ok: false, error: '没有可用的 compose 命令' }
    const result = await run(composeCommand.command, [...composeCommand.args, 'stop'], {
      cwd: dir,
      timeout: 180_000,
      platform: os,
    })
    if (result.code !== 0) return { ok: false, error: `停止失败：${(result.stderr || result.stdout).trim().slice(-800)}` }
    return { ok: true }
  }

  async function act (action) {
    if (state.busy) return { ok: false, error: '上一个操作还在进行中' }
    state.busy = true
    state.lastAction = action
    state.lastError = ''
    try {
      let result
      if (action === 'start') result = await start()
      else if (action === 'stop') result = await stop()
      else if (action === 'restart') {
        const stopped = await stop()
        result = stopped.ok ? await start() : stopped
      } else {
        result = { ok: false, error: `未知操作 ${action}` }
      }
      if (!result.ok) {
        state.lastError = result.error ?? ''
        logger.warn(`qq-bot: OneBot 服务${action} 失败：${state.lastError}`)
      } else {
        logger.info(`qq-bot: OneBot 服务已${action === 'stop' ? '停止' : '启动'}`)
      }
      return result
    } finally {
      state.busy = false
    }
  }

  return { status, act, init, doctor }
}

/** 回一个 JSON 响应（Node http 的原生 req/res 契约）。 */
function json (res, body, status = 200) {
  const payload = JSON.stringify(body)
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' })
  res.end(payload)
}

/** 读请求体（上限 64 KB）。 */
function readBody (req) {
  return new Promise(resolve => {
    let data = ''
    req.on('data', chunk => {
      data += chunk
      if (data.length > 65536) req.destroy()
    })
    req.on('end', () => resolve(data))
    req.on('error', () => resolve(''))
  })
}

/**
 * 在 Harness 的 web 服务器上注册控制路由。
 * @param ctx Host 插件上下文（需已注入 webServer）。
 * @param controller 控制器。
 */
export function registerRoutes (ctx, controller) {
  return ctx.effect(() => {
    const handler = async (req, res) => {
      const path = new URL(req.url ?? '/', 'http://localhost').pathname.slice(ROUTE_PREFIX.length) || '/'
      try {
        if (path === '/status') return json(res, await controller.status())
        if (path === '/doctor') return json(res, await controller.doctor())
        if (path === '/init') {
          if (req.method !== 'POST') return json(res, { ok: false, error: '仅支持 POST' }, 405)
          return json(res, { ...controller.init(), status: await controller.status() })
        }
        if (path === '/action') {
          if (req.method !== 'POST') return json(res, { ok: false, error: '仅支持 POST' }, 405)
          const raw = await readBody(req)
          let action = ''
          try {
            const parsed = JSON.parse(raw || '{}')
            action = typeof parsed?.action === 'string' ? parsed.action : ''
          } catch {
            return json(res, { ok: false, error: '请求体不是合法 JSON' }, 400)
          }
          const result = await controller.act(action)
          return json(res, { ...result, status: await controller.status() })
        }
        return json(res, { ok: false, error: '未知接口' }, 404)
      } catch (error) {
        return json(res, { ok: false, error: error instanceof Error ? error.message : String(error) }, 500)
      }
    }
    const dispose = ctx.webServer.register({ kind: 'prefix', path: ROUTE_PREFIX, handler })
    return () => dispose()
  }, 'qq-bot: service routes')
}
