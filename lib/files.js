/**
 * 人格 / 表情包 / 目录 / 清理 的 Host 侧接口。
 *
 * 全部走 `/qqbot-files/*` 路由（挂在 Harness 自带 web 服务器上），
 * 由插件界面直接调用；不额外开端口。
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, renameSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { basename, join } from 'node:path'
import { currentPlatform, openDirectory, probeCompose, run, vmInfo } from './platform.js'

const ROUTE_PREFIX = '/qqbot-files'
const NAME_RE = /^[\p{L}\p{N}_ .·()-]{1,64}$/u
const IMAGE_RE = /\.(png|jpe?g|gif|webp|bmp)$/i

function json (res, body, status = 200) {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' })
  res.end(JSON.stringify(body))
}

function readBody (req) {
  return new Promise((resolvePromise, reject) => {
    let data = ''
    req.on('data', chunk => {
      data += chunk
      if (data.length > 8 * 1024 * 1024) reject(new Error('请求体过大（上限 8 MB，图片建议 ≤5 MB）'))
    })
    req.on('end', () => resolvePromise(data))
    req.on('error', reject)
  })
}

/** 校验一个文件名（不含扩展名）是否可以安全地拼进 persona/ 目录。 */
function safeName (name) {
  const trimmed = String(name ?? '').trim()
  if (!NAME_RE.test(trimmed)) return null
  if (trimmed !== basename(trimmed) || trimmed.includes('..')) return null
  return trimmed
}

/**
 * 文件管理控制器。
 * @param options 选项。
 * @param options.repoDir QQ-bot 仓库根。
 * @param options.dataDir 数据目录。
 * @param options.stickersDir 表情包目录。
 * @param options.onebotDir napcat-docker 目录。
 * @param options.vmDir colima 虚拟机目录。
 * @param options.logger 日志器。
 */
export function createFileController ({ repoDir, dataDir, stickersDir, onebotDir, vmDir, logger, botNames = [], platform }) {
  const personaDir = join(repoDir, 'persona')
  const os = currentPlatform(platform)
  const vm = vmInfo(os)

  function personaList () {
    if (!existsSync(personaDir)) return []
    return readdirSync(personaDir)
      .filter(file => file.toLowerCase().endsWith('.md'))
      .map(file => {
        const info = statSync(join(personaDir, file))
        return {
          name: file.slice(0, -3),
          file,
          size: info.size,
          mtime: info.mtimeMs,
        }
      })
      .sort((a, b) => a.name.localeCompare(b.name, 'zh-Hans-CN'))
  }

  /** 扫描表情包：stickers/<bot>/<分类>/*.png（botName 为空时兼容 stickers/<分类>/）。 */
  function stickerTree (botNames) {
    const bots = []
    const legacy = []
    const scanCategories = root => {
      if (!existsSync(root)) return []
      const categories = []
      for (const dirent of readdirSync(root, { withFileTypes: true })) {
        if (!dirent.isDirectory()) continue
        const dir = join(root, dirent.name)
        let files = []
        try {
          files = readdirSync(dir)
            .filter(file => IMAGE_RE.test(file))
            .map(file => {
              const info = statSync(join(dir, file))
              return { name: file, size: info.size, mtime: info.mtimeMs }
            })
            .sort((a, b) => b.mtime - a.mtime)
        } catch { /* 子目录不可读 */ }
        if (files.length) {
          categories.push({
            name: dirent.name,
            count: files.length,
            bytes: files.reduce((sum, item) => sum + item.size, 0),
            files: files.slice(0, 30),
          })
        }
      }
      return categories.sort((a, b) => a.name.localeCompare(b.name, 'zh-Hans-CN'))
    }

    for (const botName of botNames) {
      const categories = scanCategories(join(stickersDir, botName))
      if (categories.length) bots.push({ bot: botName, categories })
    }
    // 兼容旧布局：stickers/ 根目录直接放分类目录
    if (!bots.length) {
      const categories = scanCategories(stickersDir)
      if (categories.length) bots.push({ bot: '', categories })
    }
    if (existsSync(stickersDir)) {
      try {
        for (const file of readdirSync(stickersDir)) {
          if (!IMAGE_RE.test(file)) continue
          const info = statSync(join(stickersDir, file))
          legacy.push({ name: file, size: info.size, mtime: info.mtimeMs })
        }
      } catch { /* ignore */ }
    }
    return { bots, legacy }
  }

  function overview () {
    const personas = personaList()
    const tree = stickerTree(botNames)
    const all = tree.bots.flatMap(item => item.categories)
    return {
      platform: os,
      repoDir,
      personaDir,
      stickersDir,
      dataDir,
      onebotDir,
      vmDir: vm.dir || vmDir,
      vmLabel: vm.label,
      vmDeletable: vm.deletable,
      personas,
      stickers: {
        bots: tree.bots,
        legacy: tree.legacy.slice(0, 60),
        count: all.reduce((sum, item) => sum + item.count, 0) + tree.legacy.length,
        totalBytes: all.reduce((sum, item) => sum + item.bytes, 0) + tree.legacy.reduce((sum, item) => sum + item.size, 0),
        categories: all.length,
      },
    }
  }

  function openTarget (target) {
    const map = {
      repo: repoDir,
      persona: personaDir,
      stickers: stickersDir,
      data: dataDir,
      onebot: onebotDir,
      vm: vmDir,
    }
    const dir = map[String(target ?? '')]
    if (typeof dir !== 'string') return { ok: false, error: `未知目录 ${target}` }
    if (!dir) {
      return { ok: false, error: os === 'win32' ? 'Windows 上虚拟机由 Docker Desktop 管理，没有单独的虚拟机目录' : '当前平台没有可打开的虚拟机目录' }
    }
    if (!existsSync(dir)) return { ok: false, error: `目录不存在：${dir}` }
    const opened = openDirectory(dir, os)
    return opened.ok ? { ok: true, dir } : { ok: false, error: opened.error ?? '无法打开目录' }
  }

  async function clean (mode) {
    if (mode === 'soft') {
      const result = await run('docker', ['system', 'prune', '-af'], { timeout: 300_000, platform: os })
      if (result.code !== 0) return { ok: false, error: (result.stderr || result.stdout).trim().slice(-600) }
      return { ok: true, output: (result.stdout || '').trim().split('\n').slice(-3).join('\n') }
    }
    if (mode === 'hard') {
      if (!vm.deletable) {
        return {
          ok: false,
          error: os === 'win32'
            ? 'Windows 上 Docker 引擎跑在 WSL2 里，插件不会删除它。需要彻底重置请用 Docker Desktop → Troubleshoot → Reset to factory defaults。'
            : '当前平台的虚拟机不由本插件管理，请用你的 Docker 发行版自带的清理方式。',
        }
      }
      const compose = await probeCompose({ platform: os })
      if (compose) await run(compose.command, [...compose.args, 'stop'], { cwd: onebotDir, timeout: 120_000, platform: os })
      const removed = await run('colima', ['delete', '-f'], { timeout: 300_000, platform: os })
      if (removed.code !== 0) return { ok: false, error: (removed.stderr || removed.stdout).trim().slice(-600) }
      return { ok: true, output: 'colima 虚拟机已删除；下次「启动服务」会重新创建并重新拉取镜像。' }
    }
    return { ok: false, error: `未知清理模式 ${mode}` }
  }

  function loadPersona (name) {
    const key = safeName(name)
    if (!key) return { ok: false, error: '人设名不合法' }
    const file = join(personaDir, `${key}.md`)
    if (!existsSync(file)) return { ok: false, error: `找不到 ${key}.md` }
    return { ok: true, name: key, text: readFileSync(file, 'utf8') }
  }

  function savePersona (name, text) {
    const key = safeName(name)
    if (!key) return { ok: false, error: '人设名不合法（字母/数字/中文，最长 64）' }
    if (typeof text !== 'string') return { ok: false, error: '缺少正文' }
    mkdirSync(personaDir, { recursive: true })
    const file = join(personaDir, `${key}.md`)
    const created = !existsSync(file)
    writeFileSync(file, text, 'utf8')
    logger.info(`qq-bot: 已保存人设 persona/${key}.md（${created ? '新建' : '覆盖'}）`)
    return { ok: true, name: key, created }
  }

  function createPersona (name, from) {
    const key = safeName(name)
    if (!key) return { ok: false, error: '人设名不合法' }
    mkdirSync(personaDir, { recursive: true })
    const file = join(personaDir, `${key}.md`)
    if (existsSync(file)) return { ok: false, error: `${key}.md 已存在` }
    const template = [
      `# ${key}`,
      '',
      '## 身份',
      '- 你是谁：',
      '- 说话风格：',
      '',
      '## 行为',
      '- 什么时候回复、什么时候 [SKIP]：',
      '- 什么时候 [LEAVE] 暂离：',
      '',
      '## 禁忌',
      '- ',
      '',
    ].join('\n')
    writeFileSync(file, template, 'utf8')
    return { ok: true, name: key, text: template, from: from ?? null }
  }

  function deletePersona (name) {
    const key = safeName(name)
    if (!key) return { ok: false, error: '人设名不合法' }
    const file = join(personaDir, `${key}.md`)
    if (!existsSync(file)) return { ok: false, error: `找不到 ${key}.md` }
    rmSync(file)
    logger.info(`qq-bot: 已删除人设 persona/${key}.md`)
    return { ok: true, name: key }
  }

  function renamePersona (from, to) {
    const a = safeName(from)
    const b = safeName(to)
    if (!a || !b) return { ok: false, error: '人设名不合法' }
    const source = join(personaDir, `${a}.md`)
    const target = join(personaDir, `${b}.md`)
    if (!existsSync(source)) return { ok: false, error: `找不到 ${a}.md` }
    if (existsSync(target)) return { ok: false, error: `${b}.md 已存在` }
    renameSync(source, target)
    return { ok: true, from: a, to: b }
  }

  function stickerDir (bot, category) {
    const botName = safeName(bot) ?? ''
    const categoryName = safeName(category)
    if (!categoryName) return null
    return botName ? join(stickersDir, botName, categoryName) : join(stickersDir, categoryName)
  }

  function deleteSticker (bot, category, name) {
    const file = String(name ?? '')
    if (file !== basename(file) || !IMAGE_RE.test(file)) return { ok: false, error: '图片名不合法' }
    const dir = stickerDir(bot, category)
    if (!dir) return { ok: false, error: '分类名不合法' }
    const path = join(dir, file)
    if (!existsSync(path)) return { ok: false, error: `${file} 不存在` }
    rmSync(path)
    return { ok: true, name: file }
  }

  function createCategory (bot, category) {
    const dir = stickerDir(bot, category)
    if (!dir) return { ok: false, error: '分类名不合法（字母/数字/中文，最长 64）' }
    mkdirSync(dir, { recursive: true })
    logger.info(`qq-bot: 已创建表情分类 ${dir}`)
    return { ok: true, dir }
  }

  function uploadSticker (bot, category, name, base64) {
    const dir = stickerDir(bot, category)
    if (!dir) return { ok: false, error: '分类名不合法' }
    const file = String(name ?? '').trim()
    if (file !== basename(file) || !IMAGE_RE.test(file)) return { ok: false, error: '只支持 png/jpg/jpeg/gif/bmp/webp' }
    if (typeof base64 !== 'string' || !base64) return { ok: false, error: '缺少图片内容' }
    const buffer = Buffer.from(base64.replace(/^data:[^;]+;base64,/, ''), 'base64')
    if (!buffer.length) return { ok: false, error: '图片内容为空' }
    if (buffer.length > 5 * 1024 * 1024) return { ok: false, error: '图片超过 5 MB' }
    mkdirSync(dir, { recursive: true })
    writeFileSync(join(dir, file), buffer)
    logger.info(`qq-bot: 已上传表情 ${join(dir, file)}`)
    return { ok: true, name: file, bytes: buffer.length }
  }


  // ==================== 长期记忆 / 聊天记录 ====================

  const MEMORY_NAME_RE = /^[\w-]{1,80}$/

  function memoryPath (name) {
    const key = String(name ?? '').trim()
    if (!MEMORY_NAME_RE.test(key)) return null
    return join(dataDir, `memory-${key}.json`)
  }

  function memoryList () {
    if (!existsSync(dataDir)) return []
    const files = readdirSync(dataDir).filter(f => /^memory-.+\.json$/.test(f))
    return files.map(file => {
      const name = file.replace(/^memory-/, '').replace(/\.json$/, '')
      const path = join(dataDir, file)
      let entries = 0
      let preview = ''
      try {
        const parsed = JSON.parse(readFileSync(path, 'utf8'))
        if (Array.isArray(parsed)) {
          entries = parsed.length
          preview = String(parsed[parsed.length - 1]?.summary ?? '').slice(0, 80)
        }
      } catch { /* 坏文件也要列出来，方便用户删 */ }
      const stat = statSync(path)
      return { name, entries, bytes: stat.size, mtime: stat.mtimeMs, preview }
    }).sort((a, b) => b.mtime - a.mtime)
  }

  function memoryRead (name) {
    const path = memoryPath(name)
    if (!path) return { ok: false, error: '记忆名不合法' }
    if (!existsSync(path)) return { ok: false, error: '记忆文件不存在' }
    try {
      const parsed = JSON.parse(readFileSync(path, 'utf8'))
      const lines = Array.isArray(parsed) ? parsed.map(e => String(e?.summary ?? '')) : []
      return { ok: true, name: String(name), text: lines.join('\n') }
    } catch (error) {
      return { ok: false, error: `解析失败: ${String(error)}` }
    }
  }

  function memorySave (name, text) {
    const path = memoryPath(name)
    if (!path) return { ok: false, error: '记忆名不合法' }
    const lines = String(text ?? '').split('\n').map(line => line.trim()).filter(Boolean)
    const entries = lines.map(line => ({ time: new Date().toISOString().slice(0, 10), summary: line.slice(0, 500) }))
    mkdirSync(dataDir, { recursive: true })
    writeFileSync(path, JSON.stringify(entries, null, 2))
    logger.info(`qq-bot: 已保存记忆 memory-${name}.json（${entries.length} 条）`)
    return { ok: true, name: String(name), entries: entries.length }
  }

  function memoryDelete (name) {
    const path = memoryPath(name)
    if (!path) return { ok: false, error: '记忆名不合法' }
    if (!existsSync(path)) return { ok: false, error: '记忆文件不存在' }
    rmSync(path)
    return { ok: true, name: String(name) }
  }

  /** 聊天记录文件概况（巡检面板的磁盘历史）。 */
  function chatList () {
    if (!existsSync(dataDir)) return []
    return readdirSync(dataDir)
      .filter(f => f.endsWith('.json') && !f.startsWith('memory-'))
      .map(file => {
        const path = join(dataDir, file)
        const stat = statSync(path)
        let entries = 0
        let last = null
        try {
          const parsed = JSON.parse(readFileSync(path, 'utf8'))
          if (Array.isArray(parsed)) {
            entries = parsed.length
            last = parsed[parsed.length - 1] ?? null
          }
        } catch { /* 坏文件列出即可 */ }
        return {
          name: file.replace(/\.json$/, ''),
          entries,
          bytes: stat.size,
          mtime: stat.mtimeMs,
          lastTime: last?.time ?? '',
          lastNickname: last?.nickname ?? '',
          lastMessage: String(last?.message ?? '').slice(0, 80),
        }
      })
      .sort((a, b) => b.mtime - a.mtime)
  }

  function chatTail (name, limit = 30) {
    const key = String(name ?? '').trim()
    if (!MEMORY_NAME_RE.test(key)) return { ok: false, error: '聊天名不合法' }
    const path = join(dataDir, `${key}.json`)
    if (!existsSync(path)) return { ok: false, error: '聊天记录不存在' }
    try {
      const parsed = JSON.parse(readFileSync(path, 'utf8'))
      const entries = Array.isArray(parsed) ? parsed.slice(-Math.max(1, Math.min(200, Number(limit) || 30))) : []
      return { ok: true, name: key, entries }
    } catch (error) {
      return { ok: false, error: `解析失败: ${String(error)}` }
    }
  }

  return {
    overview, openTarget, clean,
    loadPersona, savePersona, createPersona, deletePersona, renamePersona,
    deleteSticker, createCategory, uploadSticker,
    memoryList, memoryRead, memorySave, memoryDelete, chatList, chatTail,
  }
}

/**
 * 注册文件管理路由。
 * @param ctx Host 插件上下文（已注入 webServer）。
 * @param controller createFileController 的返回值。
 */
export function registerFileRoutes (ctx, controller) {
  return ctx.effect(() => {
    const handler = async (req, res) => {
      const url = new URL(req.url ?? '/', 'http://localhost')
      const path = url.pathname.slice(ROUTE_PREFIX.length) || '/'
      try {
        if (path === '/list') return json(res, { ok: true, ...controller.overview() })
        if (path === '/persona/load') return json(res, controller.loadPersona(url.searchParams.get('name')))
        if (path === '/persona/save') {
          const body = JSON.parse(await readBody(req) || '{}')
          return json(res, controller.savePersona(body.name, body.text))
        }
        if (path === '/persona/create') {
          const body = JSON.parse(await readBody(req) || '{}')
          return json(res, controller.createPersona(body.name))
        }
        if (path === '/persona/delete') {
          const body = JSON.parse(await readBody(req) || '{}')
          return json(res, controller.deletePersona(body.name))
        }
        if (path === '/persona/rename') {
          const body = JSON.parse(await readBody(req) || '{}')
          return json(res, controller.renamePersona(body.from, body.to))
        }
        if (path === '/sticker/delete') {
          const body = JSON.parse(await readBody(req) || '{}')
          return json(res, controller.deleteSticker(body.bot, body.category, body.name))
        }
        if (path === '/sticker/category') {
          const body = JSON.parse(await readBody(req) || '{}')
          return json(res, controller.createCategory(body.bot, body.category))
        }
        if (path === '/sticker/upload') {
          const body = JSON.parse(await readBody(req) || '{}')
          return json(res, controller.uploadSticker(body.bot, body.category, body.name, body.data))
        }
        if (path === '/memory/list') return json(res, { ok: true, items: controller.memoryList() })
        if (path === '/memory/read') return json(res, controller.memoryRead(url.searchParams.get('name')))
        if (path === '/memory/save') {
          const body = JSON.parse(await readBody(req) || '{}')
          return json(res, controller.memorySave(body.name, body.text))
        }
        if (path === '/memory/delete') {
          const body = JSON.parse(await readBody(req) || '{}')
          return json(res, controller.memoryDelete(body.name))
        }
        if (path === '/chats') return json(res, { ok: true, items: controller.chatList() })
        if (path === '/chat/tail') return json(res, controller.chatTail(url.searchParams.get('chat'), Number(url.searchParams.get('limit'))))
        if (path === '/open') {
          const body = JSON.parse(await readBody(req) || '{}')
          return json(res, controller.openTarget(body.target))
        }
        if (path === '/clean') {
          const body = JSON.parse(await readBody(req) || '{}')
          return json(res, await controller.clean(body.mode))
        }
        return json(res, { ok: false, error: '未知接口' }, 404)
      } catch (error) {
        return json(res, { ok: false, error: error instanceof Error ? error.message : String(error) }, 400)
      }
    }
    return ctx.webServer.register({ kind: 'prefix', path: ROUTE_PREFIX, handler })
  }, 'qq-bot: file routes')
}

/** 虚拟机目录（macOS colima: ~/.colima；其它平台为空字符串）。 */
export function defaultVmDir (platform) {
  return vmInfo(platform).dir
}
