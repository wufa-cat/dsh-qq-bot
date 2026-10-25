# dsh-qq-bot v1.2.2

**修一个会让插件整个消失的坑：用「目录软链」安装时缺少 `ws` 依赖，Host 侧 import 直接失败 → 插件行不加载 → 设置里「QQ 机器人」整项不见、接口全 404。**

## 原因

插件依赖 `ws`（OneBot WebSocket 客户端）。两种安装方式：

- **tarball 安装**：pnpm 会把 `ws` 一起装上 → 正常；
- **目录软链安装**（`dsh plugin add /path/to/dsh-plugin`，开发时常用）：pnpm 只建软链，**不会安装被链目录的依赖** → `import WebSocket from 'ws'` 报 `ERR_MODULE_NOT_FOUND`。

Host 侧 import 失败后，整行插件不生效：插件页没有 QQ 机器人，设置侧栏的分区也没了，所有 `/qqbot-*` 接口 404。
（页面刷新只更新前端，所以会出现「界面还在但接口 404」这种半新半旧的状态。）

## 修法

`lib/onebot.js` 不再在顶层硬 import `ws`：

1. 优先 `await import('ws')`（tarball 安装时走这条）；
2. 没有 `ws` 就退回 **Node 22+ 自带的 WebSocket**，并把 `on('open'|'message'|'close'|'error')` 适配成 `ws` 风格；
3. message 数据统一转字符串（ArrayBuffer / Buffer / string 都吃）。

因此**目录软链安装现在也能直接跑**，不需要额外装依赖。

## 已验证

- 无 `ws` 的 profile + 目录软链 → 插件正常加载，连接真实 NapCat：`connected: true, attempts: 1, failures: 0`
- 同一路径下 `get_login_info` / `get_version_info` 往返正常（证明 echo 关联与发送都走通）
- tarball 安装路径不变

## 升级

```bash
dsh plugin --profile desktop add https://github.com/wufa-cat/dsh-qq-bot/releases/download/v1.2.2/dsh-qq-bot-1.2.2.tgz
```

装完**完全退出并重启 Harness**。

如果你本来就用软链（`link:`）安装，也可以只重启：仓库里已经是修好的代码。

## 排查口诀

- 插件页/设置里整项不见 → Host 侧没加载，看启动日志里的 `failed to import`；
- 界面在、接口 404 → Host 是旧进程，重启 Harness 而不是刷新页面。

## 出处

本插件是 **ezoiLZH/QQ-bot**（https://github.com/ezoiLZH/QQ-bot）的 DeepSeek Harness 移植版，经原作者许可发布。
原仓库没有 LICENSE；本插件新增代码以 MIT 发布，原项目代码/素材版权仍归原作者，再分发请保留出处。
