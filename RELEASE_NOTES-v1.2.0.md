# dsh-qq-bot v1.2.0

**新增：工具白名单 / 联网搜索、对话巡检、关键词规则、定时消息、记忆管理、语音转文字 / 语音合成 / 生图。**

升级：`dsh plugin --profile <profile> update dsh-qq-bot`（或先 remove 再 add 同一个 tarball / 仓库地址）。

## 1. 工具白名单 + 联网搜索（P0）

聊天档的模型现在**默认一个工具都不给**——群里任何人说话都可能触发模型，不该让它跑命令、读写文件或开子代理。

- 配置位置：插件页 → 每个机器人卡片里的「工具权限」
  - `webSearch`：允许 `web_search`（默认关）
  - `webFetch`：允许 `web_fetch`（默认关；打开搜索后才有意义）
- 实现：`ctx.tools.restrict({ allow })` 只把白名单里的工具挂在聊天会话的 agent 作用域上，不认识的工具名会被过滤，避免 `restrict` 抛错。
- 运行时也用指令切换：`/搜索 on|off`（管理员），会在下一轮重建会话时生效；`/搜索` 不带参数看当前状态。
- 界面「运行状态」卡片里也有开/关/跟随配置按钮，不需要改配置文件。

### 搜索的凭据从哪来

搜索后端是 Harness 内置的 **DeepSeek 官方搜索**（`deepseek-official`），凭据不是这个插件管的：

- 用 DeepSeek 账号登录 Harness → 自动可用；
- 或者配环境变量 `DEEPSEEK_API_KEY`；
- 或者「设置 → 插件 → 官方 → 网页搜索」里填 Key（支持 Messages 搜索 / 新版 Search & Fetch API）。

⚠️ 如果你的聊天模型不是 DeepSeek 官方模型（例如走 SiliconFlow 的 `deepseek-ai/DeepSeek-V3`），搜索仍会 401 —— 因为搜索走的是 DeepSeek 官方接口，需要单独的 DeepSeek 凭据。插件界面会直接提示这一点。

💰 成本提醒：Messages 模式搜索 = **一次完整的模型调用**（超时 60s、最多 5 次搜索），不是免费附加功能。

## 2. 对话巡检面板

插件页「对话巡检」+「运行状态」：

- 绿色/红色状态灯：是否连上 OneBot、重连次数、最近错误、已运行时长；
- 计数：收到消息 / 发出回复 / 跳过 / 错误；
- 最近 60 条事件：谁在哪个聊天说了什么、bot 回没回、**为什么跳过**（冷却、没被 @、AI 关闭、聚合中…）；
- 聊天记录尾巴：直接下拉选一个 `data/<chat>.json`，看最近 20 条。

数据只存在内存环形缓冲（400 条），重启即清空；聊天记录本体仍在 `data/`。

## 3. 收图入库

群里发「`/收图 分类名`」（可带图片一起发，或**回复**一张图片再发指令），管理员即可把图收进 `stickers/<机器人>/<分类>/`。

- 单张 ≤ 5 MB，支持 png/jpg/gif/webp/bmp；
- 一次最多收 4 张；
- 收完可直接 `/表情 分类名` 试发。

## 4. 关键词规则回复

插件页「关键词规则」：命中关键词直接回，**不进模型**（快、省钱、不会被上下文影响）。

- 匹配方式：包含 / 完全相同 / 正则；
- 回复里可用 `{user}`（昵称）、`{qq}`、`{bot}`（机器人名字）占位符；
- 可选只对某几个机器人生效；
- 规则优先于模型，但不拦指令（指令先处理）。

## 5. 定时消息

插件页「定时消息」：每天或指定星期，在 `HH:MM` 往一个群/私聊发固定内容。

- 目标写法：`group:群号` 或 `private:QQ号`；
- 内容里 `{date}` `{time}` `{weekday}` 会被替换；
- 每 20 秒检查一次，同一天同一分钟只发一次；
- 机器人必须在线，否则跳过并记日志。

## 6. 记忆管理界面

插件页「长期记忆」：直接编辑 `data/memory-<chat>.json`。

- 一行一条摘要，保存时自动补日期；
- 新会话建立（种子）时会注入这些摘要；
- 也可以删除整份记忆。

## 7. 语音转文字（ASR）/ 语音合成（TTS）/ 生图

插件页「多模态」：三套端点各自填 **baseURL + API Key + 模型**（OpenAI 兼容接口）。

| 能力 | 接口 | 触发方式 |
| --- | --- | --- |
| ASR | `POST /audio/transcriptions` | 群里发语音，自动转文字后再进模型 |
| TTS | `POST /audio/speech` | `/语音 文本`，或模型回复里写 `[语音:文本]` |
| 生图 | `POST /images/generations` | `/画 描述`，或模型回复里写 `[画图:描述]` |

- Key 可以直接填，也可以只填**环境变量名**（`apiKeyEnv`），避免把密钥写进配置文件；
- 默认 baseURL 是 SiliconFlow（`https://api.siliconflow.cn/v1`），默认模型：`FunAudioLLM/SenseVoiceSmall`（ASR）、`FunAudioLLM/CosyVoice2-0.5B`（TTS）、`Kwai-Kolors/Kolors`（生图）——都只是默认值，换成你自己的即可；
- 没启用/没配 key 时，`[语音]` 保留占位、`/画` 和 `/语音` 会直接报错，不会静默失败；
- 音频/图片以 base64 内联发给 NapCat，容器里也能发出去。

## 8. 新增 / 变更的接口

| 路由 | 说明 |
| --- | --- |
| `GET /qqbot-status` | 状态灯数据（连接、计数、工具策略、搜索可用性） |
| `GET /qqbot-inspect?limit=&bot=&chat=` | 巡检事件 + 汇总 |
| `POST /qqbot-runtime/search` | 运行时切换搜索（`enabled` 或 `followConfig`） |
| `POST /qqbot-runtime/ai` | 运行时切换 AI（可按 chat） |
| `GET /qqbot-files/memory/list` | 记忆文件列表 |
| `GET /qqbot-files/memory/read?name=` | 读取记忆（纯文本） |
| `POST /qqbot-files/memory/save` | 保存记忆 |
| `POST /qqbot-files/memory/delete` | 删除记忆 |
| `GET /qqbot-files/chats` | 聊天记录概况 |
| `GET /qqbot-files/chat/tail?chat=&limit=` | 聊天记录尾巴 |

## 9. 新增配置项

```yml
bots:
  - name: 千早爱音
    tools:
      webSearch: true    # 允许 web_search
      webFetch: false    # 允许 web_fetch（需先开搜索）
rules:
  - enabled: true
    pattern: 在吗
    mode: contains       # contains | exact | regex
    reply: 在的 {user}
    bots: [千早爱音]
schedules:
  - enabled: true
    label: 早安
    at: "08:00"
    days: [1, 2, 3, 4, 5]   # 1=周一…7=周日；留空=每天
    bot: 千早爱音
    chat: group:123456
    text: 早上好呀～ {weekday}
media:
  asr: { enabled: true, baseURL: https://api.siliconflow.cn/v1, apiKey: "", apiKeyEnv: SILICONFLOW_API_KEY, model: FunAudioLLM/SenseVoiceSmall, language: zh }
  tts: { enabled: true, baseURL: https://api.siliconflow.cn/v1, apiKey: "", model: FunAudioLLM/CosyVoice2-0.5B, voice: alex, format: mp3 }
  image: { enabled: true, baseURL: https://api.siliconflow.cn/v1, apiKey: "", model: Kwai-Kolors/Kolors, size: 1024x1024 }
```

## 10. 致谢与出处

本插件是 **ezoiLZH/QQ-bot**（https://github.com/ezoiLZH/QQ-bot）的 DeepSeek Harness 移植版，经原作者许可发布。

- 原项目：https://github.com/ezoiLZH/QQ-bot
- 作者：ezoiLZH
- 本移植版：https://github.com/wufa-cat/dsh-qq-bot

原仓库没有 LICENSE 文件；本插件新增代码以 MIT 发布，原项目的代码/素材版权仍归原作者，再分发时请保留上述出处。
