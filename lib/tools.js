/**
 * 工具白名单：QQ 群里的消息可能来自任何人，模型不该拿到写文件/跑命令的能力。
 * 这里把「聊天档」工具策略落到 agent 作用域上——只放行配置里打开的联网工具，
 * 其余全局工具一律 deny（`ctx.tools.restrict` 是 per-agent 的，会话销毁自动解除）。
 */

/** deny 模式下要封掉的危险工具（读写文件 / 跑命令 / 改配置 / 拉子代理）。 */
const DANGEROUS_TOOLS = [
  'bash', 'pwsh', 'bash_persistent', 'pwsh_persistent', 'terminal',
  'read', 'write', 'edit', 'glob', 'grep', 'str_replace_editor', 'fs', 'fs_search',
  'working_directory', 'workspace_dependencies', 'subagent', 'subagent_fork',
  'subagent_control', 'workflow', 'agent_team', 'worktree', 'cordis', 'skill',
  'present', 'job_list', 'job_output', 'job_kill', 'schedule_create', 'schedule_update',
  'schedule_list', 'schedule_delete', 'create_goal', 'get_goal', 'update_goal',
  'ralph', 'session_query', 'load_workspace_dependencies', 'todo_write', 'ask_user_question',
]

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
 * 优先用权威的 `tools.view(scope).restrictableNames`，其次 `schemas(scope)`，最后逐个 `get` 探测。
 * @param {object} tools - `agentCtx.get('tools')` 返回值
 * @param {object} agentCtx - agent 作用域上下文
 * @returns {Set<string>} 已知工具名（可能为空：说明这个 scope 里读不到工具表）
 */
function knownToolNames (tools, agentCtx) {
  const names = new Set()
  try {
    const view = typeof tools.view === 'function' ? tools.view(agentCtx) : null
    for (const name of view?.restrictableNames ?? []) names.add(String(name))
  } catch { /* 版本差异：继续往下试 */ }
  if (!names.size && typeof tools.schemas === 'function') {
    try {
      for (const schema of tools.schemas(agentCtx) ?? []) if (schema?.name) names.add(String(schema.name))
    } catch { /* 版本差异：继续往下试 */ }
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
 *
 * 关键点（DSH Web 面）：工具在 **agent 作用域**里，`ctx.get('tools')` 拿到的是全局服务，
 * 调 `restrict()` 会抛 “requires a scoped context (agent.ctx)”。必须用 `agentCtx.tools`。
 * `restrict()` 只能遮全局工具，预设里注册的（scoped）工具遮不掉，所以另外挂一个 guard：
 * 危险工具一旦被执行就拒绝。
 * @param {object} agentCtx - setup(agentCtx) 拿到的 agent 作用域上下文
 * @param {object} options
 * @param {boolean} [options.webSearch] - 允许 web_search
 * @param {boolean} [options.webFetch] - 允许 web_fetch
 * @param {object} [options.logger]
 * @returns {{allowed: string[], known: string[], ok: boolean, mode?: string}}
 */
export function applyChatToolPolicy (agentCtx, { webSearch = false, webFetch = false, logger } = {}) {
  const tools = agentCtx?.tools ?? (typeof agentCtx?.get === 'function' ? agentCtx.get('tools') : null)
  if (!tools?.restrict) return { allowed: [], known: [], ok: false, mode: 'no-service' }

  const known = knownToolNames(tools, agentCtx)
  const wanted = []
  if (webSearch && known.has('web_search')) wanted.push('web_search')
  if (webFetch && known.has('web_fetch')) wanted.push('web_fetch')

  let mode = 'allow'
  try {
    if (known.size) {
      tools.restrict({ allow: wanted })
      logger?.info?.(`qq-bot: 工具白名单 [${wanted.join(', ') || '无'}]（可屏蔽工具 ${known.size} 个）`)
    } else {
      // 读不到工具表：不冒险 allow: []，改用 guard 兜底（见下）
      mode = 'guard'
      logger?.warn?.('qq-bot: 读不到工具表（agent 作用域里还没有全局工具），改为 guard 兜底')
    }
  } catch (error) {
    mode = 'guard'
    logger?.warn?.(`qq-bot: 工具白名单没装上（${String(error)}），改用 guard 兜底`)
  }

  // 兜底：危险工具一律拒绝执行（对预设里注册的 scoped 工具同样有效）
  try {
    tools.guard?.((exec) => {
      const name = String(exec?.name ?? exec?.tool?.name ?? exec?.definition?.name ?? '')
      if (!DANGEROUS_TOOLS.includes(name)) return undefined
      return `qq-bot: 聊天会话里不启用工具 "${name}"（群里任何人都可能触发模型）`
    })
  } catch (error) {
    logger?.warn?.(`qq-bot: guard 注册失败: ${String(error)}`)
  }

  return { allowed: wanted, known: [...known], ok: true, mode }
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
