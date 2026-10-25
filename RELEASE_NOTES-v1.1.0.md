# dsh-qq-bot v1.1.0

仓库：https://github.com/wufa-anon/dsh-qq-bot

把 QQ 接入 [DeepSeek Harness](https://dsh.deepseek.com) 的插件，**macOS 与 Windows 开箱即用**：装好插件，在界面里点几下就能跑起来，不需要 clone 仓库、不需要写 YAML。

> 本项目是 [QQ-bot](https://github.com/ezoiLZH/QQ-bot) 的**非官方**移植版，感谢原作者 [ezoiLZH](https://github.com/ezoiLZH) 的设计：人设协议、表情包、消息聚合、SKIP/LEAVE 冷却与群内指令都源自原项目。

## 安装

```bash
dsh plugin --profile desktop add ./dsh-qq-bot-1.1.0.tgz
# 或
dsh plugin --profile desktop add https://github.com/wufa-anon/dsh-qq-bot/releases/download/v1.1.0/dsh-qq-bot-1.1.0.tgz
```

装完完全退出并重启 Harness。

## 三步开箱

1. **准备 Docker**：Windows 装 [Docker Desktop](https://www.docker.com/products/docker-desktop/)；macOS 用 Docker Desktop 或 `brew install colima docker docker-compose`。
2. **设置 → QQ 机器人 → 初始化目录**（自动生成 `~/dsh-qq-bot` 与 NapCat 的 compose）→ **环境自检** → **启动服务** → 用机器人 QQ 扫码。
3. **添加机器人**：QQ 号 / 名字 / 人设 / 管理员，保存后群里 `@机器人 /ping`。

## 这一版有什么

- 每个 (机器人, 群/私聊) 一个持久 agent 会话；人设走系统提示词
- 消息聚合、四级 SKIP 冷却 + 频率分层、`[LEAVE]` 暂离
- 人格（`persona/*.md`）在设置页直接编辑，可新建/删除/重命名
- 表情包按 `stickers/<机器人>/<分类>/` 管理：界面上传、删除、展开查看；模型写 `[动画表情:分类]` 即发图（用 base64 发送，规避 NapCat 容器读不到宿主路径）
- OneBot 服务一键启停 + 环境自检 + 扫码链接；目录一键打开；清理未使用镜像（macOS 还可删 colima 虚拟机）
- 跨平台：Windows 走 Docker Desktop / `docker compose`，打开目录用资源管理器，不碰 WSL2 虚拟机
- 群内指令：`/help /ping /time /表情 /echo /roll /calc /clear /ai /reload`

## 已知限制

- 命令必须空格分隔（`@bot /ping`）
- 同一时间只能登录一个 QQ（机器人号登在 NapCat 里）
- 原项目未附带许可证，本移植版仅对新增代码使用 MIT

MIT License（仅新增部分，见 NOTICE）。
