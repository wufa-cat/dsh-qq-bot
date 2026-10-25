# dsh-qq-bot v1.2.1

**修掉「界面是新的、接口 404」的半新半旧状态；新增调用权限（全员 / 仅管理员 / 黑白名单）与「输入上游端点自动检索模型」。**

> ⚠️ 升级后请**重启 Harness**（不是只刷新页面）。Host 侧的代码是进程启动时加载的，只刷新页面会出现「新界面打旧接口 → 404」。

## 1. 调用权限：全员 / 仅管理员 / 黑白名单

每个机器人新增 `access`：

```yaml
bots:
  - name: 千早爱音
    access:
      mode: admin        # all 全员 | admin 仅管理员 | list 仅白名单
      users: ["10001"]   # mode=list 时的白名单 QQ
      groups: ["123456789"]  # mode=list 时的白名单群（群里任何人都算）
      denyUsers: []      # 黑名单永远优先
      denyGroups: []
```

管的是「有副作用或花钱」的动作：

- `/画`（生图）、`/语音`（TTS）——会消耗你的 key 额度；
- `/收图`（写表情包目录）、`/搜索`（切联网）、`/ai`、`/clear`、`/reload`；
- 模型自己在回复里写 `[画图:…]` / `[语音:…]`：**按触发这一轮的人**判权限，没权限就不生成，标记会被抹掉（不会把 `[画图:…]` 原样发到群里）。

判定顺序：黑名单 → 管理员 → `mode`。所以管理员始终能用，但被拉黑的人管理员也当不了。
`/ai`、`/clear`、`/reload` 是管理操作，始终只给管理员，不受 `mode` 影响。

界面：机器人卡片里的「谁可以调用功能」（范围下拉 + 四个名单框，逗号分隔）。

## 2. 模型自动检索

机器人卡片新增「模型来源（只用于拉取列表）」：

- 填上游 OpenAI 兼容地址（到 `/v1`）+ API Key；
- 点 **拉取模型** → 下拉里选一个 → 自动填进上面的「模型」；
- 「多模态」卡片的 ASR / TTS / 生图也各有一个「拉取模型」按钮，用它们各自的端点/key。

实现在 `lib/media.js` 的 `listModels()`：`GET {baseURL}/models`，兼容 `data[]` 与 `models[]` 两种返回，去重排序；key 支持明文或环境变量名。
它**只用来查模型 id**，不参与对话调用——对话仍然走 DSH 的 provider/model 选择。

对应接口：`POST /qqbot-runtime/models`，body `{ baseURL, apiKey | apiKeyEnv }`。

## 3. 关于「机器人怎么调用生图」

两条路，都受上面的权限约束：

1. **显式指令**：群里发 `/画 一只戴墨镜的猫`、`/语音 今天也要开心呀`。
2. **模型自主**：模型在回复里单独写一行 `[画图:…]` / `[语音:…]`，插件展开成图片/语音发出去；只有 `media.image.enabled` / `media.tts.enabled` 且配了 key 时，这条提示才会注入给模型。

## 4. 升级方式

```bash
dsh plugin --profile desktop add https://github.com/wufa-cat/dsh-qq-bot/releases/download/v1.2.1/dsh-qq-bot-1.2.1.tgz
```

装完**重启 Harness**。

## 5. 出处

本插件是 **ezoiLZH/QQ-bot**（https://github.com/ezoiLZH/QQ-bot）的 DeepSeek Harness 移植版，经原作者许可发布。
原仓库没有 LICENSE 文件；本插件新增代码以 MIT 发布，原项目代码/素材版权仍归原作者，再分发请保留出处。
