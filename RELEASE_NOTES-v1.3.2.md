# dsh-qq-bot v1.3.2

修「搜东西的时候，AI 把工具调用语法原样发到群里」这个丢人问题。

```
<｜DSML｜ calls>
<｜DSML｜ invoke name="WebFetch">
<parameter name="url">https://github.com/...</parameter>
</｜DSML｜ invoke>
```

## 为什么会这样

两件事叠在一起：

1. 机器人配置里开了 `tools.webSearch`，插件就**无条件**往提示词里写「可以调用 web_search」；
2. 但聊天 agent 里实际没有这个工具（工具白名单没放行成功 / profile 没装 web 服务）→ 模型只能凭提示词「自己编」调用语法，然后被当成普通文本发出去。

## 修了什么

**① 提示词只在工具真的可用时 advertise**

`applyChatToolPolicy()` 的返回值现在会记到 Brain 里（`brain.toolAvailability(botDef)`）：
只有 agent 里真的拿到 `web_search` 才注入「可以调用 web_search」；
拿不到就换成：

> 【联网】本轮没有可用的联网工具：不要写 <invoke>、<antml:…>、tool_calls 这类调用语法，直接说明你查不到实时信息。

**② 发送前清理工具语法（兜底）**

`BotRuntime.stripToolCalls()` 会删掉 `<tool_calls>` / `<function_calls>` / `<invoke …>` / `<parameter …>` / `<antml:*>` 整块和落单标签（可嵌套）。
清理后如果正文什么都不剩，就**直接不发**，记一条 skip「回复只剩工具调用语法」，不再把 `<｜DSML｜ calls>` 这种发到群里。

**③ 状态里看得见「到底有没有放行」**

`/qqbot-status` 每个机器人新增 `toolsAvailable: { webSearch, webFetch } | null`；状态卡在「搜索开着但没放行」时直接红字提示。

## 关于你贴的那两条媒体报错

查了 NapCat 日志，时间线是这样的：

| 时间 | 事件 |
| --- | --- |
| 15:31:44 | `/语音` → TTS 未启用 |
| 15:33:14 / 15:33:45 | `/语音` → TTS 缺少 apiKey |
| **16:03:23** | `/画` → 生图未启用 |
| **16:05:39** | 你在界面里把 image 启用 + 填 key 并保存 |
| 16:08:02 / 16:10:12 | 群里已经能发 [图片]（生图成功） |

也就是说那两条报错都发生在保存配置**之前**；1.3.1 的「媒体配置现读」已经生效——保存后生图就好使了。
TTS 还没成功过，是因为 SiliconFlow 的 `/audio/speech` 在你当前网络一直不返回（我直连 curl 也一样），跟插件无关；1.3.1 的超时提示会明确告诉你这件事。

## 升级

```bash
dsh plugin --profile desktop add https://github.com/wufa-cat/dsh-qq-bot/releases/download/v1.3.2/dsh-qq-bot-1.3.2.tgz
```

装完**完全退出并重启 Harness**。

重启后可以自查：`curl` 一下 `/qqbot-status`，看 `toolsAvailable.webSearch` 是不是 `true`。是 `false` 就说明 Harness 那边没把 web_search 给聊天 agent，需要检查 profile 里的 web 插件。

## 出处

本插件是 **ezoiLZH/QQ-bot**（https://github.com/ezoiLZH/QQ-bot）的 DeepSeek Harness 移植版，经原作者许可发布。
原仓库没有 LICENSE；本插件新增代码以 MIT 发布，原项目代码/素材版权仍归原作者，再分发请保留出处。
