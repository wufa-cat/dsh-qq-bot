# dsh-qq-bot v1.3.1

修「`/语音` 报 TTS 缺少 apiKey」和 `/help` 太旧这两件事。

## 1. 保存了 key 还是提示「缺少 apiKey」

原因：媒体服务在**插件加载时**把 `media.tts` / `media.image` 快照住了。你在界面里把 key 填上并保存，配置写进了 `cordis.patch.yml`，但运行中的实例还是旧的空 key，于是 `/语音` 报「TTS 缺少 apiKey」，生图同理（「生图缺少 apiKey」）。

修法：`createMediaService` 改为**每次调用现读配置**（`getMedia: () => config.media`），`status()` / `speak()` / `draw()` 都现读。
**现在界面里填完 key 保存，下一条 `/语音` 就能用，不用重启/重载。**

已验证：同一个实例，先 `speak()` → `TTS 缺少 apiKey`；把配置里的 key 补上（模拟界面保存）→ 立刻 `ok, 音频字节`；`draw()` 同路径同样通过。

## 2. TTS 卡住时不再干等

`/audio/speech` 的超时从 120 秒改成 **45 秒**，超时会给出人话：

> TTS 上游 45s 没返回（模型「…」/音色「…」或额度有限制）。换个模型或音色，或者换一家供应商试试。

顺带确认：同一把 key 调 SiliconFlow 的 `/images/generations` 是正常的（生图通），只有 CosyVoice2 的语音接口在当前网络下一直不返回——这不是插件的问题，换模型/音色或换供应商即可。

## 3. `/help` 重写

补上了之前漏掉的 `/收图` `/搜索` `/画` `/语音` `/reload`，并写清了权限：

```
/help            - 显示此帮助
/ping            - 测试延迟
/time            - 服务器时间
/echo 文本        - 原样复述
/roll            - 掷骰子 (1-100)
/calc 表达式      - 四则运算
/表情 [分类]      - 列出表情分类 / 直接发一张
/收图 [分类]      - 把图片收进表情包
/画 描述          - 生成一张图（需配置生图 key）
/语音 文本        - 合成一条语音（需配置 TTS key）
/搜索 on|off|跟随 - 联网搜索开关（跟随=回到配置）
/ai on|off|status [--all] - 开关/查看 AI 回复
/clear [N]        - 清空记忆，或只保留最近 N 条
/reload           - 重读人设与表情包

🔐 /收图 /搜索 /画 /语音 /ai /clear /reload 能否使用由插件里的「权限」决定
（默认仅管理员；也可以在配置里按功能放开给全员或指定 QQ/群）。
```

## 4. 新接口

`GET /qqbot-runtime/media` → 当前 ASR 已删，返回 TTS / 生图的 `enabled`、`configured`、`model`、`baseURL`，排障用（界面「就绪」也是同一套判断）。

## 升级

```bash
dsh plugin --profile desktop add https://github.com/wufa-cat/dsh-qq-bot/releases/download/v1.3.1/dsh-qq-bot-1.3.1.tgz
```

装完**完全退出并重启 Harness**；软链安装的话重启即可。

## 出处

本插件是 **ezoiLZH/QQ-bot**（https://github.com/ezoiLZH/QQ-bot）的 DeepSeek Harness 移植版，经原作者许可发布。
原仓库没有 LICENSE；本插件新增代码以 MIT 发布，原项目代码/素材版权仍归原作者，再分发请保留出处。
