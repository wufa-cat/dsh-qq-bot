# dsh-qq-bot

[![Release](https://img.shields.io/github/v/release/wufa-cat/dsh-qq-bot?color=2f80ed&label=release)](https://github.com/wufa-cat/dsh-qq-bot/releases)
[![Downloads](https://img.shields.io/github/downloads/wufa-cat/dsh-qq-bot/total?color=12b76a&label=downloads)](https://github.com/wufa-cat/dsh-qq-bot/releases)
[![Platform](https://img.shields.io/badge/platform-macOS%20%7C%20Windows-111111)](https://github.com/wufa-cat/dsh-qq-bot)
[![License](https://img.shields.io/badge/license-MIT%20(for%20plugin%20code)-8b5cf6)](NOTICE)

> **非官方移植**：本项目是 [QQ-bot](https://github.com/ezoiLZH/QQ-bot) 的 [DeepSeek Harness](https://dsh.deepseek.com) 插件版。
> 原项目作者 **[ezoiLZH](https://github.com/ezoiLZH)** —— 人设协议、表情包机制、消息聚合、SKIP/LEAVE 冷却、群内指令等设计全部来自原项目，特此致谢。
> 本项目**经原作者许可发布**；按原作者要求，任何转载或二次分发请保留本段署名与上方原项目链接。
> 如果原作者希望调整署名或撤下本项目，开个 issue 即可，我会立刻处理。
>
> 仓库：https://github.com/wufa-cat/dsh-qq-bot · 下载：https://github.com/wufa-cat/dsh-qq-bot/releases

把 QQ 变成 DeepSeek Harness 的聊天入口：OneBot v11（NapCat）收消息，Harness 的模型回消息。
**macOS 与 Windows 都能开箱即用**——装好插件，在界面里点几下就能跑起来，不需要命令行、不需要 clone 任何仓库。

- 每个 (机器人, 群/私聊) 一个持久 agent 会话，人设走系统提示词
- 消息聚合、冷却限频、`[SKIP]` / `[LEAVE]` 行为
- 人格（`persona/*.md`）在插件界面里直接编辑
- 表情包按「机器人/分类」管理，界面里上传、删除、直接测试发送
- NapCat（Docker）服务的启动/停止/重启、扫码登录、环境自检、目录打开全在界面里
- 图片多模态、B 站/分享链接解析、群内指令（`/ping`、`/表情`、`/reload` …）

---

## 一、准备：装 Docker

机器人通过 [NapCat](https://github.com/NapNeko/NapCatQQ) 连接 QQ，NapCat 跑在 Docker 里。

### Windows

1. 安装 [Docker Desktop for Windows](https://www.docker.com/products/docker-desktop/)（自带 `docker compose`）。
2. 启动 Docker Desktop，等托盘图标变成绿色（引擎就绪）。
3. 不需要在 WSL 里手动装任何东西。

### macOS

任选一种：

- **Docker Desktop**：装好并启动即可；
- **colima**（更轻）：

  ```bash
  brew install colima docker docker-compose
  colima start --arch aarch64 --vm-type vz --cpu 2 --memory 4
  ```

  插件会在点「启动服务」时自动 `colima start`（已装但没运行时）。

> Linux 也能跑（用系统 Docker），只是没做专门适配。

## 二、安装插件

需要已安装 DeepSeek Harness（桌面版或 Web 版）。

```bash
# 从 tarball / 目录安装（推荐分享这种方式）
dsh plugin --profile desktop add ./dsh-qq-bot-1.1.0.tgz
# 或者直接用目录
dsh plugin --profile desktop add /path/to/dsh-plugin
# 发布到 npm 之后也可以
dsh plugin --profile desktop add dsh-qq-bot
```

> `--profile desktop` 是桌面版专用 profile；Web 版改成 `--profile web`。

安装完**完全退出并重启 Harness**（Cmd+Q / 托盘退出），让 Host 侧代码生效。

## 三、界面里配置（三步）

打开 **设置 → QQ 机器人**（也可以在插件页找到 QQ 机器人那一行）。

### 1. 初始化目录

点服务卡片里的 **「初始化目录」**。它会创建（已存在的绝不覆盖）：

```
~/dsh-qq-bot/                 ← 默认工作目录（Windows: %USERPROFILE%\dsh-qq-bot）
├── persona/人设参考模板.md
├── stickers/
├── data/
└── onebot/napcat-docker/
    ├── docker-compose.yml    ← 已配好端口与 WebUI 令牌
    ├── README.md
    └── data/{qq,config,plugins}
```

想换位置：把「工作目录」填成别的绝对路径，再点一次「初始化目录」。

### 2. 启动服务并扫码登录

- 点 **「环境自检」** 先确认 Docker / compose / 目录都是 ✔；
- 点 **「启动服务」**，插件会 `docker compose up -d`，并自动打开 NapCat WebUI；
- WebUI 里用**机器人 QQ** 扫码登录（首次约 2 分钟出码，过期就点「重启」重新生成）。

### 3. 添加机器人

在「机器人」卡片点 **添加机器人**，填：

| 字段 | 说明 | 例子 |
| --- | --- | --- |
| QQ 号 | 机器人自己的 QQ | `3177752843` |
| 名字 | 日志与表情包目录用 | `千早爱音` |
| 人设 | `persona/` 里的文件名（不带 `.md`） | `Anonther` |
| 管理员 | 能用 `/reload`、`/clear` 的 QQ 号，逗号分隔 | `3635811460` |
| WS 地址 | 默认指向本机 NapCat | `ws://127.0.0.1:3001` |
| WS Token | NapCat 没设就留空 | |

保存后插件会重载并连接。日志里看到 `qq-bot: 🤖 [名字] ...` 就说明通了。

## 四、人格

「人格」卡片：列出 `persona/*.md`，点名字在页面里编辑，**保存**后群里发 `/reload`（管理员）让机器人换用新人设。
也可以新建（带模板）、删除、重命名。人设内容会作为系统提示词注入每个会话。

## 五、表情包

目录结构（机器人名字必须与配置里的「名字」一致）：

```
stickers/
└── 千早爱音/
    ├── 开心/开心.jpg
    ├── 喜欢/喜欢.png
    └── 震惊/震惊-这啥啊.jpg
```

- 分类名 = 目录名；目录里的图片文件名随意，支持 png/jpg/jpeg/gif/bmp/webp；
- 模型在回复里写 `[动画表情:分类名]`，插件随机挑一张发出去（整条回复只有这个标记时就是单发一张表情）；
- 插件把「可用分类」自动写进提示词，**不需要**在人设里手写清单；
- 界面里可 **上传图片到分类**、**新建分类**、展开删除；
- 发送用 `base64://` 而不是本地路径——NapCat 在容器里看不到宿主机路径，用路径会静默失败；
- 回复长度限制（`chat.maxReplyLength`，默认 800）作用在展开表情**之前**，不会把 base64 截断；
- 手动测试：群里 `@机器人 /表情` 列分类，`@机器人 /表情 开心` 直接发一张。

> 旧布局兼容：`stickers/<分类>/图片` 也能识别（当 `stickers/<机器人名字>/` 不存在时）。根目录直接放图片**不会**被发送——那些只会显示在卡片的「根目录图片」里。

## 六、群内指令

| 指令 | 说明 |
| --- | --- |
| `/help` | 指令列表 |
| `/ping` | 延迟测试 |
| `/time` | 服务器时间 |
| `/表情 [分类]` | 列出表情分类 / 直接发一张 |
| `/echo 文本` | 复读 |
| `/roll` | 掷骰子 |
| `/calc 1+2*3` | 计算 |
| `/clear [N]` | 清除对话记忆 |
| `/ai on\|off\|status` | 开关 AI 回复 |
| `/reload` | 重读人设与表情包（管理员） |

## 七、目录与清理

「目录与清理」卡片：

- 一键打开 仓库目录 / 人格 / 表情包 / 聊天数据 / OneBot 目录；
- **清理未使用镜像**：`docker system prune -af`（在用的容器不受影响）；
- **删除虚拟机**：仅 macOS + colima 可用，回收约 3.5 GB，下次启动会重建并重新拉镜像；
  Windows 上引擎在 WSL2 里，插件**不会**动它（要彻底重置用 Docker Desktop → Troubleshoot → Reset）。

## 八、配置项（`cordis.patch.yml`）

界面保存的就是这些；一般不用手写。所有字段都有默认值，最小配置只需要 `bots`：

```yaml
- id: qq-bot
  name: dsh-qq-bot
  config:
    repoDir: ""            # 留空 = ~/dsh-qq-bot（首次启动自动创建）
    autoStart: true
    bots:
      - qq: "3177752843"
        name: 千早爱音
        persona: Anonther
        admins: ["3635811460"]
        ws: { url: "ws://127.0.0.1:3001", accessToken: "" }
        # provider: guijiliudong   # 可选：缺省用 DSH 默认模型
        # model: deepseek-ai/DeepSeek-V4.1-Flash
        timeout: 180
    service:
      onebotDir: ""        # 留空 = <repoDir>/onebot/napcat-docker
      webuiPort: 6099
      wsPort: 3001
    chat:
      maxReplyLength: 800  # 作用在展开表情之前
      replyCooldown: 5
      leaveCooldown: 300
      logMaxEntries: 300
      blacklistGroups: []
    aggregation:
      windowTimeout: 8
      maxMessages: 8
    rateLimit:
      tier1Count: 3        # 1 分钟 ≥4 条 → 冷却 ×1.5
      tier2Count: 10       # 5 分钟 ≥11 条 → 冷却 ×2
      capCount: 15         # 10 分钟 ≥16 条 → 停止回复
```

`provider/model` 缺省时使用 DSH 全局默认模型；指定时使用该 provider（须已在 DSH 设置里配好）。

## 九、界面背后的接口

界面按钮打到 Harness 自带 web 服务器的两个前缀（不额外开端口）：

- `/qqbot-service/*`：`status`、`doctor`（环境自检）、`init`（初始化目录）、`action`（start/stop/restart）
- `/qqbot-files/*`：`list`、`persona/{load,save,create,delete,rename}`、`sticker/{upload,category,delete}`、`open`、`clean`

## 十、运行日志

```
qq-bot: 仓库目录 /Users/you/dsh-qq-bot，数据目录 /Users/you/dsh-qq-bot/data
qq-bot: 初始化工作区，创建 12 项
qq-bot: 正在连接 ws://127.0.0.1:3001 ...
qq-bot: ✅ 已连接
qq-bot: 启动监测 [千早爱音] [chat=group-42]
qq-bot: 🤖 [千早爱音] 上下文 5行, 2图
qq-bot: 📤 [千早爱音] 分段回复 (2段)
```

## 十一、开发

```bash
node --check lib/*.js          # 语法检查
npm run check                  # 同上（含 client.js）
npm pack                       # 打 tarball 给别人装
```

| 文件 | 作用 |
| --- | --- |
| `lib/index.js` | 插件入口、Config schema、装配 worker |
| `lib/onebot.js` | OneBot v11 WS 客户端 |
| `lib/hub.js` | 消息分发、指令、聚合 |
| `lib/bot.js` | 单个机器人运行时（触发判断、限频、发送） |
| `lib/brain.js` | 与 Harness agent 的桥接、会话压缩 |
| `lib/chatlog.js` | `data/*.json` 聊天日志（与原版兼容） |
| `lib/cq.js` | CQ 码解析、表情包、@、分段 |
| `lib/files.js` | 人格/表情包/目录管理路由 |
| `lib/service.js` | Docker/NapCat 启停与自检 |
| `lib/scaffold.js` | 工作区初始化（目录 + compose 模板） |
| `lib/platform.js` | 平台差异（打开目录、compose 探测、虚拟机信息） |
| `lib/client.js` | 界面（设置分区 + 插件页配置入口） |

## 十二、已知行为差异（相对原 Python 版）

1. **命令必须空格分隔**：`@bot /ping` 生效，`@bot/ping` 不生效。
2. `data/*.json` 里图片以 `liveImages`（base64）内联保存，不再落 `data/images/`。
3. compact 后的记忆总结不再自动生成；已有 `memory-<chat>.json` 会继续注入种子文本。
4. 一个 (bot, 聊天) 的会话在插件进程存活期间复用；DSH 重启后首轮用聊天日志窗口整体重建。

## 致谢

| 项目 | 说明 |
| --- | --- |
| [ezoiLZH/QQ-bot](https://github.com/ezoiLZH/QQ-bot) | 原项目（Python + Claude Code CLI）。本插件的人设系统、表情包协议、消息聚合、冷却与指令都移植自它 |
| [NapCatQQ](https://github.com/NapNeko/NapCatQQ) | 本插件默认使用的 OneBot v11 实现（Docker 镜像 `mlikiowa/napcat-docker`） |
| [LLOneBot](https://github.com/LLOneBot/LLOneBot) | 另一种 OneBot v11 实现，同样可用 |
| [DeepSeek Harness](https://dsh.deepseek.com) | 宿主：agent 会话、模型路由、系统提示词、插件槽位 |

**出处引用**：本项目基于 [QQ-bot](https://github.com/ezoiLZH/QQ-bot)（作者 [ezoiLZH](https://github.com/ezoiLZH)）改写，经原作者许可发布；转载、二次分发请保留本段署名与链接。

原项目**没有附带开源许可证**，所以本移植版不对原项目的代码与设计主张任何权利；新增的插件封装、界面与跨平台适配代码以 MIT 发布（见 `LICENSE` 与 `NOTICE`）。

MIT License.
