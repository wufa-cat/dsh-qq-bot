# dsh-qq-bot v1.4.0

两件事：**删掉生图 / 语音合成**，**把「搜索配了没用」真正修掉**。

## 一、生图 / TTS 整块删除

按你的要求，不再保留：

- 配置里的 `media`（tts / image）
- 群指令 `/画`、`/语音`
- 模型标记 `[画图:…]`、`[语音:…]`
- 界面「多模态」卡片、模型自动识别下拉
- 权限项 `access.features.image` / `.tts`
- 接口 `/qqbot-runtime/media`、`/qqbot-runtime/models`
- `lib/media.js` 整个文件

旧配置里残留的 `media:` 块会被 schema 忽略，不影响启动；想干净就手动删掉那几行。

## 二、搜索为什么配了没用（真根因）

不是 key 的问题，也不是权限的问题：**`web_search` 工具根本没挂到聊天 agent 上**。

DSH Web 面（桌面版）把工具从 host 行搬进了「agent 预设」（`@deepseek-ai/dsh-web-app` 里
`- id: tool-web / disabled: true`）。GUI 里的会话走会话创建流程，会挂 `standard` 预设，所以你在
Harness 里能搜；而本插件是用 `agents.create()` 自己建聊天 agent 的，**不经过预设流程** ——
实测那个 agent 的作用域里只有 `working_directory` 一个工具，`tools.get('web_search') === undefined`。

于是提示词说着「可以调用 web_search」，模型手上却没有 → 它按训练里的习惯自己编
`<invoke name="WebFetch">` 之类的调用语法，然后被当正文发到群里。

（顺带说清楚：`ctx.tools.restrict()` 也必须用 `agentCtx.tools` 调，用 `ctx.get('tools')` 会抛
“requires a scoped context (agent.ctx)”。1.3.x 里那条 restrict 一直是失败的，只是被 catch 住了。）

### 修法：插件自己注册 `web_search`

1.4.0 在**宿主全局层**注册了一个 `web_search` 工具（`lib/webtool.js`）：

- 检索走后端 `ctx.web`（`searchProvider` 还是 profile 里配的 `deepseek-search-api` / `deepseek-official`，凭据不变）；
- 全局层的工具会被聊天 agent 自动继承；
- 关掉 `tools.webSearch` 时，per-agent `restrict({ allow: [] })` 会把它遮掉；
- 顺手加了 `tools.guard()`：`bash`/`write`/`edit`/`subagent` 这类危险工具在聊天会话里**执行即拒绝**（预设里的 scoped 工具 restrict 遮不掉，guard 可以）。

状态接口里能看到注册结果：

```json
"web": { "available": true, "tool": { "ok": true, "reason": "已注册" } }
```

## 三、界面里改工具开关，现在不用重启了

之前 `bots[]` 虽然是 volatile，但插件在启动时就把 `botDef` 对象抓在手里了；界面保存后配置里换成了新对象，运行中的 runtime 还读旧的那份 —— 所以「我明明把搜索打开了，bot 那边还是关的」。

1.4.0 起：

- `BotRuntime.effectiveToolPolicy()` / `hub.canUse()` / `isAdmin()` 都通过 `getBotDef()` **现读**配置里的这条 bot；
- 工具策略变化会被检测到（`toolsKey`），**下一次对话自动重建会话**，白名单立刻按新值下发。

也就是说：界面里拨 `webSearch` → 群里接着说一句话，就按新配置跑，不用重启 Harness。

（`media` 之外的其他字段，改动仍建议重启后再观察。）

## 四、现在怎么判断搜索到底行不行

群里发：

```
/搜索
```

会回三行，其中第二行是**真的**：

```
🔎 联网搜索 [千早爱音]：开（跟随配置）
聊天 agent 实际工具：✅ 有（web_search 已挂上）
配置里打开：bots[].tools.webSearch；API Key 在「设置 → 插件 → 网页搜索」
```

界面「运行状态」卡片、`/qqbot-status` 里也有同样的 `toolsAvailable`。

- `✅ 有` → 搜索能用；再不行就是凭据问题（DeepSeek Key），状态卡会提示；
- `❌ 没有` → Harness 没把 `web_search` 给聊天 agent，检查 profile 里 `@deepseek-ai/dsh-tool-web` / `web` 是否加载。

## 升级

```bash
dsh plugin --profile desktop add https://github.com/wufa-cat/dsh-qq-bot/releases/download/v1.4.0/dsh-qq-bot-1.4.0.tgz
```

装完**完全退出并重启 Harness**。

> 提示：界面里改 `bots[]`（工具开关、权限）这类非 volatile 字段后，**重启 Harness 才生效**；`/搜索 on|off` 这种群指令是立即生效的。

## 出处

本插件是 **ezoiLZH/QQ-bot**（https://github.com/ezoiLZH/QQ-bot）的 DeepSeek Harness 移植版。
原仓库没有 LICENSE；本插件新增代码以 MIT 发布，原项目代码/素材版权仍归原作者，再分发请保留出处。
