/**
 * 插件自带的 `web_search` 工具（注册在**宿主全局层**）。
 *
 * 为什么不直接用 @deepseek-ai/dsh-tool-web：DSH Web 面把工具注册进「agent 预设」，
 * 而插件用 agents.create() 建的聊天 agent 不经过会话预设流程 —— 实测 agent 作用域里
 * 只有 working_directory，根本没有 web_search，所以以前「配了搜索也没用」。
 *
 * 把工具注册到全局层后，聊天 agent 会自动继承；关掉搜索时用 per-agent
 * restrict({ allow: [] }) 把它遮掉。检索仍走后端 `ctx.web`（provider 由 profile 决定）。
 */

const MAX_RESULTS = 6
const TIMEOUT_MS = 60_000

/** 把搜索结果渲染成模型可读的文本。 */
export function formatValue (value) {
  const lines = []
  if (value?.content) lines.push(String(value.content))
  const sources = Array.isArray(value?.sources) ? value.sources : []
  for (const [index, source] of sources.entries()) {
    const title = source?.title ? String(source.title) : ''
    const url = String(source?.url ?? '')
    const snippet = source?.snippet ? String(source.snippet) : ''
    lines.push(`${index + 1}. ${title ? `${title} — ` : ''}${url}${snippet ? `\n   ${snippet}` : ''}`)
  }
  if (value?.truncated) lines.push('（结果已截断，只保留前几条）')
  return lines.join('\n') || '没有搜到结果。'
}

/**
 * 在宿主全局层注册 web_search（幂等：同名已存在就跳过）。
 * @param {object} ctx - 已注入 tools/web 的宿主上下文
 * @param {object} [options]
 * @param {object} [options.logger]
 * @returns {{ok: boolean, reason?: string}}
 */
export function registerGlobalWebSearch (ctx, { logger } = {}) {
  const tools = ctx?.get?.('tools')
  const web = ctx?.get?.('web')
  if (!tools?.register) return { ok: false, reason: 'tools 服务不可用' }
  if (!web?.search) return { ok: false, reason: 'web 服务不可用（profile 没装 @deepseek-ai/dsh-web）' }
  try {
    if (tools.get('web_search', undefined) !== undefined) return { ok: true, reason: '已存在' }
  } catch { /* 查不到就继续注册 */ }

  try {
    tools.register({
      name: 'web_search',
      description: 'Search the web for current information. Returns an optional summary answer and a list of source URLs. Use it for news, prices, versions and people’s recent status; always cite the URLs you used.',
      parameters: {
        queries: {
          type: 'array',
          required: true,
          items: { type: 'string' },
          description: '1–4 search queries; their results are merged.',
        },
      },
      output: {
        schema: {
          type: 'object',
          additionalProperties: false,
          properties: {
            content: { type: 'string' },
            sources: {
              type: 'array',
              items: {
                type: 'object',
                additionalProperties: false,
                properties: {
                  url: { type: 'string' },
                  title: { type: 'string' },
                  snippet: { type: 'string' },
                },
                required: ['url'],
              },
            },
            truncated: { type: 'boolean' },
          },
          required: ['sources', 'truncated'],
        },
        render: (_args, value) => [{ type: 'text', text: formatValue(value) }],
      },
      timeoutMs: TIMEOUT_MS,
      isConcurrencySafe: () => true,
      async execute (args, exec) {
        const queries = (Array.isArray(args?.queries) ? args.queries : [String(args?.query ?? '')])
          .map(query => String(query ?? '').trim())
          .filter(Boolean)
          .slice(0, 4)
        if (!queries.length) throw new Error('web_search 需要至少一个查询词')
        const result = await web.search({ queries, maxResults: MAX_RESULTS }, exec?.signal)
        const sources = Array.isArray(result?.sources) ? result.sources : []
        return {
          ...(result?.content ? { content: String(result.content) } : {}),
          sources: sources.slice(0, MAX_RESULTS).map(source => ({
            url: String(source?.url ?? ''),
            ...(source?.title ? { title: String(source.title) } : {}),
            ...(source?.snippet ? { snippet: String(source.snippet) } : {}),
          })),
          truncated: Boolean(result?.truncated) || sources.length > MAX_RESULTS,
        }
      },
    })
    logger?.info?.('qq-bot: 已在宿主全局层注册 web_search（聊天 agent 会继承）')
    return { ok: true, reason: '已注册' }
  } catch (error) {
    logger?.warn?.(`qq-bot: 注册 web_search 失败: ${String(error)}`)
    return { ok: false, reason: String(error) }
  }
}
