/**
 * 工作区初始化：让新用户不用 clone 任何仓库也能跑起来。
 *
 * `repoDir` 里放 persona/、stickers/、data/；`onebotDir` 里放 docker-compose.yml
 * 和 NapCat 的 data/。全部「缺什么补什么」，已存在的文件绝不覆盖。
 */
import { existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { randomBytes } from 'node:crypto'
import { currentPlatform, isWindows, vmInfo } from './platform.js'

const PERSONA_TEMPLATE = `# 示例人设

> 把这份文件当成模板：复制一份、改名，然后填内容。
> 机器人配置里的「人设」写文件名（不带 .md）。

## 身份
- 你是谁：
- 说话风格：
- 你在群里扮演的角色：

## 行为
- 什么时候回复、什么时候沉默（输出 [SKIP]）：
- 什么时候暂时离开（输出 [LEAVE]）：
- 回复长度偏好：

## 表情包
想发表情时，在回复里单独写一行 \`[动画表情:分类名]\`（分类见插件界面「表情包」卡片）。

## 禁忌
- 
`

/** 生成 docker-compose.yml：Docker Desktop 与 colima 都能用。 */
export function composeTemplate ({ webuiToken, webuiPort = 6099, wsPort = 3001, platform } = {}) {
  const token = webuiToken || randomBytes(12).toString('hex')
  const uidGid = isWindows(platform)
    ? ''
    : `      NAPCAT_UID: "${process.getuid?.() ?? 1000}"
      NAPCAT_GID: "${process.getgid?.() ?? 1000}"
`
  return `# NapCat + OneBot v11（正向 WebSocket），由 dsh-qq-bot 生成。
# 端口只绑 127.0.0.1，不对外暴露；改端口后记得同步插件配置里的 service.webuiPort / service.wsPort。
services:
  napcat:
    image: mlikiowa/napcat-docker:latest
    container_name: napcat
    restart: unless-stopped
    environment:
      MODE: ws
      WEBUI_TOKEN: "${token}"
${uidGid}    ports:
      - "127.0.0.1:${webuiPort}:6099"   # WebUI / 扫码登录
      - "127.0.0.1:${wsPort}:3001"     # OneBot v11 正向 WebSocket
    volumes:
      - ./data/qq:/app/.config/QQ
      - ./data/config:/app/napcat/config
      - ./data/plugins:/app/napcat/plugins
`
}

const ONEBOT_README = `# OneBot 服务目录

这个目录由 dsh-qq-bot 插件自动生成，用来跑 NapCat（Docker）。

- \`docker-compose.yml\`：容器定义（端口、WebUI 令牌、挂载）
- \`data/qq\`：QQ 登录态（扫码后生成，删掉就要重新扫码）
- \`data/config\`：NapCat 配置，包括 \`webui.json\`（WebUI 令牌）
- \`data/plugins\`：NapCat 插件目录

日常操作不用命令行：插件界面里的「启动服务 / 停止 / 重启」按钮就够了。
`

/**
 * 初始化（或修复）工作区。
 * @param options 选项
 * @param options.repoDir 工作目录
 * @param options.onebotDir napcat-docker 目录
 * @param options.webuiPort WebUI 端口
 * @param options.wsPort OneBot WS 端口
 * @param options.logger 日志器
 * @param options.platform 平台名（可注入，测试用）
 * @returns {{ok: boolean, created: string[], kept: string[], dirs: object}}
 */
export function ensureWorkspace ({ repoDir, onebotDir, webuiPort = 6099, wsPort = 3001, logger, platform }) {
  const created = []
  const kept = []
  const platformName = currentPlatform(platform)

  const ensureDir = path => {
    if (existsSync(path)) return
    mkdirSync(path, { recursive: true })
    created.push(path)
  }

  // 1) 三个根目录
  for (const dir of [repoDir, join(repoDir, 'persona'), join(repoDir, 'stickers'), join(repoDir, 'data')]) {
    ensureDir(dir)
  }

  // 2) 人格模板（只有一份都没有时才放）
  const personaDir = join(repoDir, 'persona')
  const hasPersona = existsSync(personaDir) && readdirSync(personaDir).some(file => file.toLowerCase().endsWith('.md'))
  if (!hasPersona) {
    const file = join(personaDir, '人设参考模板.md')
    if (!existsSync(file)) {
      writeFileSync(file, PERSONA_TEMPLATE, 'utf8')
      created.push(file)
    }
  } else {
    kept.push(`persona/ (${readdirSync(personaDir).filter(file => file.toLowerCase().endsWith('.md')).length} 份人设)`)
  }

  // 3) OneBot 目录 + compose 文件
  ensureDir(onebotDir)
  for (const dir of ['data', 'data/qq', 'data/config', 'data/plugins'].map(name => join(onebotDir, name))) {
    ensureDir(dir)
  }
  const composeFile = join(onebotDir, 'docker-compose.yml')
  if (existsSync(composeFile)) {
    kept.push('onebot/docker-compose.yml')
  } else {
    writeFileSync(composeFile, composeTemplate({ webuiPort, wsPort, platform: platformName }), 'utf8')
    created.push(composeFile)
  }
  const onebotReadme = join(onebotDir, 'README.md')
  if (!existsSync(onebotReadme)) {
    writeFileSync(onebotReadme, ONEBOT_README, 'utf8')
    created.push(onebotReadme)
  }

  if (created.length) logger?.info?.(`qq-bot: 初始化工作区，创建 ${created.length} 项`)
  const vm = vmInfo(platformName)
  return {
    ok: true,
    created,
    kept,
    dirs: {
      repoDir,
      personaDir,
      stickersDir: join(repoDir, 'stickers'),
      dataDir: join(repoDir, 'data'),
      onebotDir,
      vmDir: vm.dir,
      vmLabel: vm.label,
      vmDeletable: vm.deletable,
    },
  }
}
