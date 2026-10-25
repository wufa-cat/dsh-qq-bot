# 怎么把这个插件发给别人

插件已经打成一个 npm tarball：`dist/dsh-qq-bot-1.2.1.tgz`（91 KB，sha256 见 `SHA256SUMS.txt`）。
对方需要：**已装好 DeepSeek Harness** + **Docker（Windows 用 Docker Desktop）**。
下面是三种分发方式，从最省事到最正式。

---

## 方式一：直接把文件发过去（最快，零配置）

把 `dsh-qq-bot-1.2.1.tgz` 通过微信 / QQ / 邮件 / 网盘发给对方，然后让对方执行：

```bash
# macOS / Windows（PowerShell 或 CMD 都一样）
dsh plugin --profile desktop add /路径/到/dsh-qq-bot-1.2.1.tgz
```

然后**完全退出并重启 Harness**，打开 设置 → QQ 机器人，按 README 的三步走（初始化目录 → 启动服务扫码 → 添加机器人）。

- 手机端接收后建议先传到电脑，`add` 只接受本地路径或 http(s) URL。
- 找不到 `dsh` 命令时，用桌面版自带的 CLI，或直接让对方在插件目录里执行安装。

## 方式二：放到 GitHub（有链接、可升级、可收藏）

每个版本一个 Release 附件，对方下载 tgz 再用方式一安装。

1. 在 GitHub 新建一个空仓库：https://github.com/new → 名字 `dsh-qq-bot` → Public → **不要**勾选 README / .gitignore / license。
2. 本目录已经是 git 仓库，直接推：

   ```bash
   cd dsh-plugin
   git remote add origin git@github.com:wufa-cat/dsh-qq-bot.git
   git branch -M main
   git push -u origin main
   ```

3. 打 tag 并做 Release：

   ```bash
   git tag v1.2.1
   git push origin v1.2.1
   ```

   然后在 GitHub 页面 **Releases → Draft a new release** 选 `v1.2.1`，把 `dist/dsh-qq-bot-1.2.1.tgz` 拖进附件，发布。
   附件链接大致是：
   `https://github.com/wufa-cat/dsh-qq-bot/releases/download/v1.2.1/dsh-qq-bot-1.2.1.tgz`

4. 对方就可以一句话安装（`dsh plugin add` 支持 http(s) URL）：

   ```bash
   dsh plugin --profile desktop add https://github.com/wufa-cat/dsh-qq-bot/releases/download/v1.2.1/dsh-qq-bot-1.2.1.tgz
   ```

也可以直接装仓库本身（对方需要 git）：

```bash
dsh plugin --profile desktop add git+https://github.com/wufa-cat/dsh-qq-bot.git
```

> 注意：仓库根目录就是插件包（有 `package.json`、`lib/`、`cordis.patch.yml`），不要在子目录里。

## 方式三：发到 npm（最正式，一句话安装）

需要 npm 账号。发布后对方只需：

```bash
dsh plugin --profile desktop add dsh-qq-bot
```

发布步骤：

```bash
cd dsh-plugin
npm login                 # 或设置 NPM_TOKEN
npm publish               # 首次发布公开包；包名 dsh-qq-bot
npm view dsh-qq-bot version
```

发布前检查：

- `package.json` 里 `name` 没被占用（占用了就改个带前缀的名字，例如 `@你的名字/dsh-qq-bot`，安装命令随之变化）；
- `files` 只包含 `lib`、`locale`、`cordis.patch.yml`、`README.md`、`LICENSE`（已经配好，`node_modules` 不会被打进去）；
- 版本号每次发布都要递增（当前 `1.2.1`）。

发到 npm 之后，Harness 的**插件市场**也能搜到（市场从 npm 源读取），对方可以在界面里点安装。

---

## 对方安装后要做的三件事（无论哪种方式）

1. 装 Docker：Windows 装 Docker Desktop 并启动；macOS 用 Docker Desktop 或 `brew install colima docker docker-compose`。
2. 设置 → QQ 机器人 → **初始化目录** → **环境自检**（全 ✔）→ **启动服务** → WebUI 扫码登录机器人 QQ。
3. **添加机器人**：QQ 号、名字、人设、管理员，保存后在群里 `@机器人 /ping` 验证。

详细说明见 `README.md`。

## 常见问题

- **对方没有 `dsh` 命令**：先确认 Harness 是否装全（桌面版带 CLI）。若确实没有，界面里的插件市场只接受 npm / git 来源，那就走方式二或方式三发布后再让对方在界面里装。
- **安装时提示 peer 依赖缺失**：本插件的 `@deepseek-ai/*` 全是 peer 依赖，由宿主提供，不要去装。
- **升级**：把新 tgz 再 `add` 一次即可覆盖，`~/.dsh-qq-bot` 里的数据（人设、表情包、登录态）不受影响。
- **卸载**：`dsh plugin --profile desktop remove dsh-qq-bot`（工作目录里的数据不会删）。
- **校验文件**：`shasum -a 256 dsh-qq-bot-1.2.1.tgz` 应与仓库根目录 `SHA256SUMS.txt` 一致。
