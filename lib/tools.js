/**
 * 工具白名单：QQ 群里的消息可能来自任何人，模型不该拿到写文件/跑命令的能力。
 * 这里把「聊天档」工具策略落到 agent 作用域上——只放行配置里打开的联网工具，
 * 其余全局工具一律 deny（`ctx.tools.restrict` 是 per-agent 的，会话销毁自动解除）。
 */

/** 兜底探测用的常见工具名（`schemas()` 不可用时逐个 `get` 判断）。 */
const KNOWN_CANDIDATES = [
  'web_search', 'web_fetch',
  'bash', 'pwsh', 'bash_persistent', 'pwsh_persistent', 'terminal',
  'read', 'write', 'edit', 'glob', 'grep', 'str_replace_editor',
  'fs', 'fs_search', 'working_directory', 'workspace_dependencies',
  'subagent', 'subagent_fork', 'subagent_control', 'workflow', 'agent_team', 'worktree',
  'present', 'ask_user_question', 'todo_write', 'create_goal', 'get_goal', 'update_goal',
  'schedule_create', 'schedule_update', 'schedule_list', 'schedule_delete',
  'job_list', 'job_output', 'job_kill', 'skill', 'cordis', 'session_query',
  'ralph', 'read_image', 'load_workspace_dependencies',
]

/**
 * 当前 agent 作用域里可被 restrict 的全局工具名。
 * @param {object} tools - `agentCtx.get('tools')` 返回值
 * @param {object} agentCtx - agent 作用域上下文
 * @returns {Set<string>} 已知工具名
 */
function knownToolNames (tools, agentCtx) {
  const names = new Set()
  if (typeof tools.schemas === 'function') {
    try {
      const schemas = tools.schemas(agentCtx)
      for (const schema of schemas ?? []) if (schema?.name) names.add(String(schema.name))
    } catch { /* 版本差异：退回逐个探测 */ }
  }
  if (!names.size && typeof tools.get === 'function') {
    for (const name of KNOWN_CANDIDATES) {
      try {
        if (tools.get(name, agentCtx) !== undefined) names.add(name)
      } catch { /* 忽略 */ }
    }
  }
  return names
}

/**
 * 把聊天档工具策略应用到某个 agent。
 * @param {object} agentCtx - `setup(agentCtx)` 拿到的 agent 作用域上下文
 * @param {object} options
 * @param {boolean} [options.webSearch] - 允许 web_search
 * @param {boolean} [options.webFetch] - 允许 web_fetch
 * @param {object} [options.logger]
 * @returns {{allowed: string[], known: string[], ok: boolean}}
 */
export function applyChatToolPolicy (agentCtx, { webSearch = false, webFetch = false, logger } = {}) {
  const tools = typeof agentCtx.get === 'function' ? agentCtx.get('tools') : agentCtx.tools
  if (!tools?.restrict) return { allowed: [], known: [], ok: false }

  const known = knownToolNames(tools, agentCtx)
  const wanted = []
  if (webSearch && known.has('web_search')) wanted.push('web_search')
  if (webFetch && known.has('web_fetch')) wanted.push('web_fetch')

  try {
    // allow 语义：只保留列表里的全局工具，其余全部隐藏
    tools.restrict({ allow: wanted })
    logger?.info?.(`qq-bot: 工具白名单 [${wanted.join(', ') || '无'}]（全局工具 ${known.size} 个已屏蔽）`)
    return { allowed: wanted, known: [...known], ok: true }
  } catch (error) {
    logger?.warn?.(`qq-bot: 工具白名单应用失败（继续用默认工具集）: ${String(error)}`)
    return { allowed: [], known: [...known], ok: false }
  }
}

/**
 * 配置 → 生效的工具策略（运行时 `/搜索` 覆盖优先）。
 * @param {object} toolsConfig - `bots[].tools`
 * @param {boolean|null} [override] - `/搜索 on|off` 的临时覆盖
 * @returns {{webSearch: boolean, webFetch: boolean}}
 */
export function effectiveTools (toolsConfig, override = null) {
  const webSearch = override === null ? Boolean(toolsConfig?.webSearch) : Boolean(override)
  return { webSearch, webFetch: Boolean(toolsConfig?.webFetch) && webSearch }
}
