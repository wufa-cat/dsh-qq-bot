/**
 * 定时消息：每天 HH:MM（可限定星期）往某个群/私聊发一条文本。
 * 只做「每天/每周」这一档，够用且不会让用户写 cron。
 */

const TICK_MS = 20_000

function pad (n) { return String(n).padStart(2, '0') }

/** JS getDay()（周日=0）→ ISO（周一=1 … 周日=7）。 */
function isoDay (date) {
  const day = date.getDay()
  return day === 0 ? 7 : day
}

/**
 * 启动定时消息。
 * @param {object} options
 * @param {object} options.config
 * @param {import('./hub.js').ChatHub} options.hub
 * @param {object} options.logger
 * @returns {() => void} 停止函数
 */
export function startScheduler ({ config, hub, logger }) {
  const items = (config.schedules ?? []).filter(item => item.enabled !== false && item.at && item.chat && item.text && item.bot)
  if (!items.length) return () => {}

  const fired = new Map() // key → 'YYYY-MM-DD'
  let running = false

  async function tick () {
    if (running) return
    running = true
    try {
      const now = new Date()
      const hhmm = `${pad(now.getHours())}:${pad(now.getMinutes())}`
      const today = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
      const weekday = isoDay(now)
      for (const item of items) {
        if (String(item.at).trim() !== hhmm) continue
        const days = Array.isArray(item.days) ? item.days.map(Number).filter(n => n >= 1 && n <= 7) : []
        if (days.length && !days.includes(weekday)) continue
        const key = `${item.bot}|${item.chat}|${item.at}|${item.text}`
        if (fired.get(key) === today) continue
        fired.set(key, today)
        const text = String(item.text)
          .replaceAll('{date}', today)
          .replaceAll('{time}', hhmm)
          .replaceAll('{weekday}', ['周一', '周二', '周三', '周四', '周五', '周六', '周日'][weekday - 1])
        const result = await hub.sendTo(item.bot, item.chat, text)
        if (result.ok) logger.info(`qq-bot: ⏰ 已发送定时消息 [${item.label || item.chat}] ${item.bot}`)
        else logger.warn(`qq-bot: 定时消息发送失败 [${item.label || item.chat}]: ${result.error}`)
      }
    } catch (error) {
      logger.warn(`qq-bot: 定时任务异常: ${String(error)}`)
    } finally {
      running = false
    }
  }

  const timer = setInterval(() => { tick().catch(() => {}) }, TICK_MS)
  return () => clearInterval(timer)
}
