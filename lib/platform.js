/**
 * 平台差异集中在这里：默认目录、打开文件夹、Docker/虚拟机探测。
 *
 * 插件要在 macOS 与 Windows 上开箱即用，所有「平台相关」的判断都收敛到本文件，
 * 业务代码只调用这里的函数，避免把 `open`/`colima` 之类的假设散落各处。
 */
import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { homedir } from 'node:os'
import { delimiter, join } from 'node:path'

/** 当前平台（测试时可注入）。 */
export function currentPlatform (override) {
  return override ?? process.platform
}

/** 是否 Windows。 */
export function isWindows (override) {
  return currentPlatform(override) === 'win32'
}

/**
 * 默认工作目录（persona/、stickers/、data/ 的父目录）。
 * 不依赖任何仓库 checkout：新用户 `repoDir` 留空就用这里。
 * @param platform 平台名（可注入）
 */
export function defaultRepoDir (platform) {
  return join(homedir(), 'dsh-qq-bot')
}

/** 运行子进程时补齐的 PATH 目录（Windows 用系统自己的 PATH）。 */
export function searchPath (platform, envPath = process.env.PATH ?? '') {
  if (isWindows(platform)) return envPath
  const extra = ['/opt/homebrew/bin', '/usr/local/bin', '/usr/bin', '/bin', '/usr/sbin', '/sbin']
  return [...extra, envPath].filter(Boolean).join(delimiter)
}

/**
 * 在 Finder / 资源管理器里打开一个目录。
 * @param dir 绝对路径
 * @param platform 平台名（可注入）
 */
export function openDirectory (dir, platform) {
  const command = isWindows(platform)
    ? ['explorer.exe', [dir]]
    : currentPlatform(platform) === 'darwin'
      ? ['open', [dir]]
      : ['xdg-open', [dir]]
  try {
    const child = spawn(command[0], command[1], { detached: true, stdio: 'ignore' })
    child.on('error', () => {})
    child.unref()
    return { ok: true, command: command[0] }
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) }
  }
}

/**
 * 虚拟机（Docker 引擎）信息。
 *
 * - macOS + colima：`~/.colima` 可以整体删除再重建；
 * - Windows / Docker Desktop：引擎由 Docker Desktop 管理，插件只清理镜像，不删虚拟机。
 * @param platform 平台名（可注入）
 */
export function vmInfo (platform) {
  const os = currentPlatform(platform)
  if (os === 'darwin') {
    return {
      kind: 'colima',
      label: 'colima 虚拟机',
      dir: join(homedir(), '.colima'),
      deletable: true,
    }
  }
  if (os === 'win32') {
    return {
      kind: 'docker-desktop',
      label: 'Docker Desktop（WSL2）',
      dir: '',
      deletable: false,
    }
  }
  return { kind: 'docker', label: 'Docker 引擎', dir: '', deletable: false }
}

/** 跑一条命令并收集输出（失败不抛异常）。 */
export function run (command, args, options = {}) {
  return new Promise(resolve => {
    let child
    try {
      child = spawn(command, args, {
        cwd: options.cwd,
        env: {
          ...process.env,
          PATH: searchPath(options.platform, process.env.PATH),
          COREPACK_ENABLE_STRICT: '0',
        },
        timeout: options.timeout ?? 120_000,
        windowsHide: true,
      })
    } catch (error) {
      resolve({ code: -1, stdout: '', stderr: error instanceof Error ? error.message : String(error) })
      return
    }
    let stdout = ''
    let stderr = ''
    child.stdout?.on('data', chunk => { stdout += chunk })
    child.stderr?.on('data', chunk => { stderr += chunk })
    child.on('error', error => resolve({ code: -1, stdout, stderr: `${stderr}${error.message}` }))
    child.on('close', code => resolve({ code: code ?? -1, stdout, stderr }))
  })
}

/**
 * 探测 compose 命令。
 *
 * 优先 Docker 自带的 `docker compose`（Docker Desktop / 新版 Docker 都有），
 * 再回退独立的 `docker-compose` 二进制。结果由调用方缓存。
 * @returns {Promise<{command: string, args: string[], label: string} | null>}
 */
export async function probeCompose (options = {}) {
  const candidates = [
    { command: 'docker', args: ['compose'], label: 'docker compose' },
    { command: 'docker-compose', args: [], label: 'docker-compose' },
  ]
  for (const candidate of candidates) {
    const probe = await run(candidate.command, [...candidate.args, 'version'], {
      timeout: 20_000,
      platform: options.platform,
    })
    if (probe.code === 0) return candidate
  }
  return null
}

/** Docker 守护进程是否可用（`docker info`）。 */
export async function dockerDaemonRunning (options = {}) {
  const probe = await run('docker', ['info', '--format', '{{.ServerVersion}}'], {
    timeout: 20_000,
    platform: options.platform,
  })
  return { available: probe.code === 0, version: probe.stdout.trim(), error: probe.stderr.trim() }
}

/** colima 是否存在/在运行（非 macOS 恒为不可用）。 */
export async function colimaState (options = {}) {
  if (currentPlatform(options.platform) !== 'darwin') return { available: false, running: false }
  const probe = await run('colima', ['status'], { timeout: 30_000, platform: options.platform })
  if (probe.code !== 0 && /command not found|ENOENT|not found/i.test(probe.stderr)) {
    return { available: false, running: false }
  }
  return { available: true, running: probe.code === 0 }
}

/** 目录是否存在（小工具，避免各处 import existsSync）。 */
export function dirExists (dir) {
  try {
    return Boolean(dir) && existsSync(dir)
  } catch {
    return false
  }
}
