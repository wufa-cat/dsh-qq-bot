window.__ModuleLoader__.load({
  id: 'dsh-qq-bot',
  factory: (require) => {
    var module = { exports: {} }
    var exports = module.exports
    Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' })

    const React = require('react')
    const h = React.createElement

    /** 本插件文案命名空间。 */
    const NS = 'qqBot'
    /** 配置页注册键：<npm 包名>#<patch 行 id>。 */
    const ROW_KEY = 'dsh-qq-bot#qq-bot'

    // ==================== 文案 ====================

    const zh = {
      summary: '连接 QQ（OneBot v11），让 Harness 在群聊/私聊里按人设自动对话。点「配置」填写 QQ 号、人设和 OneBot 地址。',
      title: 'QQ 机器人',
      sectionHint: '改完点保存，插件会立即重载并重连 OneBot',
      personaTitle: '人格',
      personaCount: '共 {n} 份',
      personaManageHint: '对应 仓库目录/persona/<名字>.md。改完保存后，在群里发 /reload 让机器人换用新人设（会释放旧会话）。',
      personaEmpty: '还没有人格文件。',
      personaDelete: '删除',
      personaNewPlaceholder: '新人设名，例如 Haruhi',
      personaCreate: '新建人格',
      personaChars: '{n} 字',
      personaSave: '保存人格',
      personaReloadHint: '保存后群里 /reload 生效',
      personaConfirmDelete: '确定删除人格「{name}.md」？此操作不可撤销。',
      stickerUpload: '上传图片',
      stickerExpand: '展开',
      stickerCollapse: '收起',
      stickerBotLabel: '机器人',
      stickerLegacyLabel: '旧布局（stickers/ 根目录）',
      stickerCategoryCount: '{n} 张 · {size}',
      stickerNewCategory: '新分类名，例如 笑',
      stickerCategory: '新建分类',
      stickerSummary: '{cats} 个分类 · {n} 张 · {size}',
      stickersSummary: '{cats} 个分类 · {n} 张 · {size}',
      stickersStructureHint: '生效的目录结构是 stickers/<机器人名字>/<分类>/图片；模型只需写 [动画表情:分类名]，插件会随机挑一张发出去。',
      stickerLegacyFiles: '根目录里的图片（不会自动发送，建议移进分类目录）',
      stickersTitle: '表情包',
      stickersCount: '{n} 个 · {size}',
      stickersHint: '对应 仓库目录/stickers/。机器人回复时按需取用；往这个目录里丢图片即可新增（文件名随意）。',
      stickersEmpty: '还没有表情包图片。',
      stickersConfirmDelete: '确定删除表情包「{name}」？',
      stickersTooMany: '仅显示最近 {n} 个，其余请在目录里看。',
      openDir: '打开目录',
      refresh: '刷新',
      unsaved: '未保存',
      maintTitle: '目录与清理',
      maintHint: '常用目录一键在 Finder 打开；清理会释放 Docker 占用的磁盘。',
      maintOpenRepo: '仓库目录',
      maintOpenData: '聊天数据',
      maintOpenOnebot: 'OneBot 目录',
      maintOpenVm: '虚拟机目录',
      maintVmDir: '虚拟机目录',
      maintCleanSoft: '清理未使用镜像',
      maintCleanHard: '删除虚拟机',
      maintConfirmSoft: '执行 docker system prune -af，清理未使用的镜像/构建缓存（当前在用的容器不受影响）。继续？',
      maintConfirmHard: '这会删除整个 colima 虚拟机（约 3.5 GB，含镜像与 NapCat 登录态）。下次启动服务会重建虚拟机并重新拉取镜像（约 2 GB 下载）。继续？',
      maintWorking: '清理中，请稍候…',
      svcPlatform: '运行平台：{platform}',
      svcNeedInit: '工作目录还没初始化，点「初始化目录」即可自动创建 persona/、stickers/ 与 OneBot 配置。',
      svcInit: '初始化目录',
      svcDoctor: '环境自检',
      svcInitCreated: '已创建 {n} 个文件/目录（已有的不会覆盖）',
      svcInitKept: '目录已就绪，没有需要新建的东西',
      svcNoComposeWin: '没找到 docker compose：请安装 Docker Desktop（自带 compose）后重启 Harness。',
      svcNoDockerWin: 'Docker 没在运行：打开 Docker Desktop，等托盘图标变绿后再点「启动服务」。',
      svcNoDockerMac: 'Docker 没在运行：启动 Docker Desktop，或 brew install colima docker docker-compose。',
      maintVmManaged: '这台机器上 Docker 引擎由 Docker Desktop / WSL2 管理，插件不提供删除虚拟机（彻底重置请用 Docker Desktop → Troubleshoot → Reset）。',
      maintVmLabel: '引擎位置：{label}',
      svcTitle: 'OneBot 服务（Docker / NapCat）',
      svcHint: '点「启动」会拉起 colima 虚拟机与 napcat 容器；启动后用机器人 QQ 扫 WebUI 里的二维码登录，插件即可连上 ws://127.0.0.1:3001。',
      svcLoading: '读取状态…',
      svcRunning: '运行中',
      svcStopped: '已停止',
      svcStart: '启动服务',
      svcStop: '停止服务',
      svcRestart: '重启服务',
      svcWorking: '处理中…',
      svcWebui: '扫码登录页',
      svcOpen: '打开',
      svcWs: 'OneBot 地址',
      svcWsHint: '填到上面每个 bot 的 WS 地址里',
      svcNoCompose: '没有可用的 docker-compose，请先安装 Docker 与 compose。',
      svcColimaDown: 'colima 虚拟机未运行，「启动」会自动拉起（约 10 秒）。',
      svcDirHint: '服务目录',
      svcStartedHint: '已发出启动命令：等容器起来后打开上面的扫码登录页，用机器人 QQ 扫码。',
      intro: '把 OneBot v11（LLOneBot / NapCat / Lagrange）的 QQ 消息接到 Harness。保存后插件会立即重载并尝试连接。',
      repoDir: '仓库目录',
      repoDirHint: '工作目录（含 persona/、stickers/、data/）。留空则用 ~/dsh-qq-bot，首次启动会自动创建。',
      autoStart: '启动时自动连接',
      autoStartHint: '关闭后插件加载时不会主动连接 OneBot。',
      bots: '机器人',
      botsHint: '每个 QQ 号一条。ws 地址填 OneBot 的「WebSocket 服务端」地址，通常是 ws://127.0.0.1:3001。',
      addBot: '＋ 添加机器人',
      remove: '删除',
      qq: 'QQ 号',
      name: '名字',
      nameHint: '日志与表情包子目录用；一般和人设同名。',
      persona: '人设',
      personaHint: '对应 仓库目录/persona/<名字>.md',
      admins: '管理员 QQ',
      adminsHint: '逗号分隔；可用 /clear、/ai、/reload 等管理指令。',
      wsUrl: 'OneBot WebSocket 地址',
      wsToken: '访问令牌（可选）',
      timeout: '单轮超时（秒）',
      provider: '模型 Provider（可选）',
      providerHint: '留空用 Harness 当前默认模型。',
      model: '模型（可选）',
      advanced: '高级参数',
      aggWindow: '聚合静默窗口（秒）',
      aggWindowHint: '群消息静默这么久才交给模型；越长越省调用。',
      aggMax: '聚合最多消息数',
      replyCooldown: '回复冷却（秒）',
      leaveCooldown: '暂离时长（秒）',
      maxSegments: '分段回复上限',
      save: '保存',
      saving: '保存中…',
      saved: '已保存，插件正在重载',
      saveFailed: '本部署没有接受这些值，已保留供你修改',
      readOnly: '本部署的设置为只读',
      loading: '读取配置中…',
      unavailable: '该行当前没有可编辑的配置字段',
      errQq: '请填写数字 QQ 号',
      errUrl: '请填写 ws:// 或 wss:// 开头的地址',
      errName: '请填写名字',
      errNoBot: '至少需要一个机器人',
      usageTitle: '使用说明',
      usage1: '① 用上面的「启动服务」拉起 NapCat（Docker），再点「打开」扫码登录机器人 QQ；也可以自己跑别的 OneBot v11 实现（LLOneBot / Lagrange）并开启「WebSocket 服务端」。',
      usage2: '② 在上面填好机器人 QQ 号、你的 QQ 号和管理员，以及 ws 地址，保存。',
      usage3: '③ 群聊里 @机器人 /ping，收到 🏓 pong! 就通了。',
      usage4: '④ 之后群友正常聊天，机器人按人设自动决定回复、[SKIP] 跳过或 [LEAVE] 暂离。',
      cmdsTitle: '群内指令',
      cmds: [
        ['/help', '指令列表'],
        ['/ping', '连通性检查'],
        ['/time', '当前时间'],
        ['/echo 文本', '原样复述'],
        ['/roll', '掷骰子'],
        ['/calc 表达式', '四则运算'],
        ['/clear [N]', '清空/保留最近 N 条记忆（管理员）'],
        ['/reload', '重读人设与表情包（管理员）'],
        ['/ai on|off|status', '开关本群 AI（管理员，--all 全局）'],
      ],
      dataTitle: '数据位置',
      dataText: '聊天记录写在「仓库目录/data/」下，格式与 Python 版 QQ-bot 完全一致，可共用同一目录；人设改完发 /reload 即生效。',
      preview: '查看将要保存的配置',
      accessTitle: '谁可以调用功能',
      accessHint: '生图、语音、收图、搜索开关、清记忆这类「有副作用或花钱」的操作：可以给全员、只给管理员，或按 QQ/群白名单。黑名单永远优先。',
      accessAll: '全员',
      accessAdmin: '仅管理员',
      accessList: '仅白名单',
      modelAutoHint: '填好地址和 key 会自动识别，也可以手动刷新',
      modelFetch: '拉取模型',
      modelFetchReady: '拉到 {n} 个模型',
      modelFetchFailed: '拉取失败：{err}',
      botTools: '工具权限',
      botToolsHint: '群里说话的人不该能跑命令或写文件：默认一个工具都不给，需要联网时再打开搜索。',
      toolWebSearch: '联网搜索（web_search）',
      toolWebSearchHint: '用 DeepSeek 官方搜索。模型不是 DeepSeek 账号模型时，要先在「设置 → 插件 → 官方 → 网页搜索」填 API Key，否则会报凭据缺失。一次搜索 = 一次完整模型调用。',
      toolWebFetch: '抓取网页正文（web_fetch）',
      toolWebFetchHint: '打开后模型能把搜索结果里的链接读成正文；更费上下文。',
      statusTitle: '运行状态',
      statusHint: '每 5 秒自动刷新。掉线会自动重连；连续失败时先看「最近错误」，或者回上面点重启服务。',
      statusConnected: '已连接',
      statusDisconnected: '未连接',
      statusChecking: '检测中…',
      statusSearch: '搜索',
      statusAi: 'AI',
      permImage: '生图 /画',
      permImageHint: '群里 /画 与模型自主写的 [画图:…]，会花你的 key 额度。',
      permTts: '语音 /语音',
      permTtsHint: '群里 /语音 与模型自主写的 [语音:…]，会花你的 key 额度。',
      permSticker: '收图 /收图',
      permStickerHint: '把群里的图存进表情包目录（会写文件）。',
      permSearch: '搜索开关 /搜索',
      permSearchHint: '允许这个人/群切换联网搜索。',
      permManage: '管理指令 /ai /clear',
      permManageHint: '开关 AI、清长期记忆、重载人格：默认只给管理员。',
      permDefault: '默认范围',
      permDefaultHint: '下面每个功能没单独设置时，用这个范围。',
      permInherit: '跟随默认（{mode}）',
      permMembersPlaceholder: '一行一个，QQ 号或 群:群号，也可用逗号',
      permDenyTitle: '黑名单（永远优先）',
      permDenyPlaceholder: '这些 QQ / 群即使有权限也不许用',
      statusRuntimeHint: '运行时开关请用群指令：/搜索 开|关|跟随、/ai 开|关、/clear。',
      statusOn: '开',
      statusOff: '关',
      statusCounters: '消息 {m} · 回复 {r} · 跳过 {s}',
      statusErrors: '最近错误',
      statusUptime: '已运行 {time}',
      inspectTitle: '对话巡检',
      inspectHint: '最近发生的事：谁发的、bot 回没回、为什么跳过。排障先看这里。',
      inspectEmpty: '还没有事件（收到消息后会显示）。',
      inspectMessage: '消息',
      inspectReply: '回复',
      inspectSkip: '跳过',
      inspectError: '错误',
      inspectCommand: '指令',
      inspectChats: '聊天记录',
      inspectSelectChat: '选一条聊天记录',
      inspectLoadTail: '看最近消息',
      rulesTitle: '关键词规则',
      rulesHint: '命中就直接回复，不进模型：快、省钱。回复里可用 {user} {qq} {bot} 占位符。',
      rulesPattern: '关键词 / 正则',
      rulesReply: '回复内容',
      rulesMode: '匹配',
      rulesModeContains: '包含',
      rulesModeExact: '完全相同',
      rulesModeRegex: '正则',
      rulesAdd: '添加规则',
      rulesEmpty: '还没有规则。',
      schedTitle: '定时消息',
      schedHint: '每天（或指定星期）往一个群/私聊发固定内容。{date} {time} {weekday} 会被替换成当天日期/时间/星期。',
      schedAt: '时间 HH:MM',
      schedDays: '星期（1=周一…7=周日，留空=每天）',
      schedBot: '机器人',
      schedChat: '目标 group:群号 或 private:QQ号',
      schedText: '内容',
      schedLabel: '备注',
      schedAdd: '添加定时',
      schedEmpty: '还没有定时消息。',
      memoryTitle: '长期记忆',
      memoryHint: '每个聊天一份 memory-<chat>.json，一行一条摘要；新会话建立时会注入。',
      memoryEmpty: '还没有记忆文件。',
      memoryEntries: '{n} 条',
      memorySave: '保存记忆',
      memoryDelete: '删除记忆',
      memoryConfirmDelete: '确定删除记忆「{name}」？',
      memoryPlaceholder: '一行一条摘要…',
      memorySaved: '已保存',
      mediaTitle: '多模态（语音 / 生图）',
      mediaHint: '全部走 OpenAI 兼容接口，用你自己的 key。接口地址填到 /v1 为止；key 也可以只填环境变量名，避免写进配置文件。',
      mediaEnable: '启用',
      mediaBaseURL: '接口地址',
      mediaApiKey: 'API Key',
      mediaApiKeyEnv: '或环境变量名',
      mediaModel: '模型',
      mediaVoice: '音色',
      mediaSize: '尺寸',
      mediaTts: '文字转语音（TTS）',
      mediaImage: '生图',
      mediaConfigured: '就绪',
      mediaNotConfigured: '未就绪（缺 key 或模型）',
      stickerCollectHint: '群里发「/收图 分类」或回复一张图发「/收图」就能把图片收进表情包（管理员）。',
    }

    const en = {
      summary: 'Connect QQ through OneBot v11 so Harness can chat on personas in groups and DMs. Open Configure to set the account, persona and OneBot address.',
      title: 'QQ bot',
      sectionHint: 'Saving reloads the plugin and reconnects OneBot',
      personaTitle: 'Personas',
      personaCount: '{n} file(s)',
      personaManageHint: 'Files under repo/persona/<name>.md. After saving, send /reload in a group so the bot picks up the new persona (old sessions are released).',
      personaEmpty: 'No persona files yet.',
      personaDelete: 'Delete',
      personaNewPlaceholder: 'New persona name, e.g. Haruhi',
      personaCreate: 'New persona',
      personaChars: '{n} chars',
      personaSave: 'Save persona',
      personaReloadHint: 'send /reload in a group to apply',
      personaConfirmDelete: 'Delete persona “{name}.md”? This cannot be undone.',
      stickerUpload: 'Upload',
      stickerExpand: 'Show files',
      stickerCollapse: 'Hide',
      stickerBotLabel: 'Bot',
      stickerLegacyLabel: 'Legacy layout (stickers/ root)',
      stickerCategoryCount: '{n} file(s) · {size}',
      stickerNewCategory: 'New category, e.g. laugh',
      stickerCategory: 'New category',
      stickerSummary: '{cats} categories · {n} file(s) · {size}',
      stickersSummary: '{cats} categories · {n} file(s) · {size}',
      stickersStructureHint: 'The layout that works is stickers/<bot name>/<category>/<images>; the model only writes [动画表情:<category>] and the plugin sends a random image from it.',
      stickerLegacyFiles: 'Images in the root folder (never sent automatically; move them into a category)',
      stickersTitle: 'Stickers',
      stickersCount: '{n} file(s) · {size}',
      stickersHint: 'Files under repo/stickers/. The bot picks them up on demand; drop images there to add more.',
      stickersEmpty: 'No sticker images yet.',
      stickersConfirmDelete: 'Delete sticker “{name}”?',
      stickersTooMany: 'Showing the newest {n}; browse the folder for the rest.',
      openDir: 'Open folder',
      refresh: 'Refresh',
      unsaved: 'unsaved',
      maintTitle: 'Folders & cleanup',
      maintHint: 'Open the usual folders in Finder; cleanup frees the disk Docker occupies.',
      maintOpenRepo: 'Repository',
      maintOpenData: 'Chat data',
      maintOpenOnebot: 'OneBot folder',
      maintOpenVm: 'VM folder',
      maintVmDir: 'VM folder',
      maintCleanSoft: 'Prune images',
      maintCleanHard: 'Delete VM',
      maintConfirmSoft: 'Run docker system prune -af to remove unused images and build cache (running containers are untouched). Continue?',
      maintConfirmHard: 'This deletes the whole colima VM (~3.5 GB including images and the NapCat login). The next Start recreates the VM and re-pulls the image (~2 GB download). Continue?',
      maintWorking: 'Cleaning, please wait…',
      svcPlatform: 'Platform: {platform}',
      svcNeedInit: 'The workspace is not initialized yet — click "Initialize folders" to create persona/, stickers/ and the OneBot config.',
      svcInit: 'Initialize folders',
      svcDoctor: 'Diagnose',
      svcInitCreated: 'Created {n} file(s)/folder(s) (existing ones untouched)',
      svcInitKept: 'Workspace is ready; nothing to create',
      svcNoComposeWin: 'No docker compose found: install Docker Desktop (it bundles compose), then restart Harness.',
      svcNoDockerWin: 'Docker is not running: open Docker Desktop and wait for the tray icon to turn green, then click Start.',
      svcNoDockerMac: 'Docker is not running: start Docker Desktop, or brew install colima docker docker-compose.',
      maintVmManaged: 'On this machine the engine is managed by Docker Desktop / WSL2; the plugin will not delete the VM (use Docker Desktop → Troubleshoot → Reset for a full reset).',
      maintVmLabel: 'Engine: {label}',
      svcTitle: 'OneBot service (Docker / NapCat)',
      svcHint: 'Start boots the colima VM and the napcat container. Then scan the QR on the WebUI login page with the bot account so the plugin can reach ws://127.0.0.1:3001.',
      svcLoading: 'Reading status…',
      svcRunning: 'Running',
      svcStopped: 'Stopped',
      svcStart: 'Start service',
      svcStop: 'Stop service',
      svcRestart: 'Restart service',
      svcWorking: 'Working…',
      svcWebui: 'Login page',
      svcOpen: 'Open',
      svcWs: 'OneBot endpoint',
      svcWsHint: 'Paste into each bot’s WS url above',
      svcNoCompose: 'No docker-compose found; install Docker and compose first.',
      svcColimaDown: 'The colima VM is not running; Start brings it up (~10s).',
      svcDirHint: 'Service directory',
      svcStartedHint: 'Start issued: once the container is up, open the login page above and scan with the bot account.',
      intro: 'Bridges OneBot v11 (LLOneBot / NapCat / Lagrange) into Harness. Saving reloads the plugin and reconnects.',
      repoDir: 'Repository directory',
      repoDirHint: 'Workspace holding persona/, stickers/ and data/. Leave empty to use ~/dsh-qq-bot (created on first run).',
      autoStart: 'Connect on start',
      autoStartHint: 'When off, the plugin will not dial OneBot on load.',
      bots: 'Accounts',
      botsHint: 'One entry per QQ number. The ws address is OneBot\'s WebSocket server, usually ws://127.0.0.1:3001.',
      addBot: '+ Add account',
      remove: 'Remove',
      qq: 'QQ number',
      name: 'Name',
      nameHint: 'Used for logs and the sticker subdirectory; usually the persona name.',
      persona: 'Persona',
      personaHint: 'Reads <repo>/persona/<name>.md',
      admins: 'Admin QQ',
      adminsHint: 'Comma separated; may use /clear, /ai and /reload.',
      wsUrl: 'OneBot WebSocket URL',
      wsToken: 'Access token (optional)',
      timeout: 'Turn timeout (s)',
      provider: 'Provider (optional)',
      providerHint: 'Leave blank to use the default Harness model.',
      model: 'Model (optional)',
      advanced: 'Advanced',
      aggWindow: 'Aggregation quiet window (s)',
      aggWindowHint: 'How long the group must stay quiet before the model is called.',
      aggMax: 'Max messages per batch',
      replyCooldown: 'Reply cooldown (s)',
      leaveCooldown: 'Leave duration (s)',
      maxSegments: 'Max reply segments',
      save: 'Save',
      saving: 'Saving…',
      saved: 'Saved; the plugin is reloading',
      saveFailed: 'This deployment rejected the values; they were kept for you to fix',
      readOnly: 'Settings are read-only in this deployment',
      loading: 'Reading configuration…',
      unavailable: 'This row exposes no editable configuration',
      errQq: 'Enter a numeric QQ number',
      errUrl: 'Enter an address starting with ws:// or wss://',
      errName: 'Enter a name',
      errNoBot: 'At least one account is required',
      usageTitle: 'Getting started',
      usage1: '① Use Start service above to boot NapCat (Docker) and Open the login page to scan with the bot account; or run any other OneBot v11 implementation (LLOneBot / Lagrange) with its WebSocket server enabled.',
      usage2: '② Fill in the account QQ, your QQ and admins, plus the ws URL, then save.',
      usage3: '③ Mention the bot with /ping in a group; 🏓 pong! means it works.',
      usage4: '④ Afterwards the bot decides by itself whether to answer, [SKIP] or [LEAVE].',
      cmdsTitle: 'Group commands',
      cmds: [
        ['/help', 'Command list'],
        ['/ping', 'Connectivity check'],
        ['/time', 'Current time'],
        ['/echo text', 'Repeat text'],
        ['/roll', 'Roll a dice'],
        ['/calc expr', 'Arithmetic'],
        ['/clear [N]', 'Clear or trim memory (admin)'],
        ['/reload', 'Reload personas and stickers (admin)'],
        ['/ai on|off|status', 'Toggle AI here (admin; --all global)'],
        ['/收图 [category]', 'Save an image as a sticker (admin)'],
        ['/搜索 on|off', 'Toggle web search (admin)'],
        ['/画 <prompt>', 'Generate an image (configure media.image)'],
        ['/语音 <text>', 'Synthesize speech (configure media.tts)'],
      ],
      dataTitle: 'Where data lives',
      dataText: 'Chat logs live under <repo>/data/, identical in shape to the Python QQ-bot, so both can share one directory; /reload picks up persona edits.',
      preview: 'Preview the configuration to save',
      accessTitle: 'Who can use features',
      accessHint: 'Image/voice generation, sticker capture, search toggle, memory clearing: allow everyone, admins only, or a QQ/group allow-list. Deny lists always win.',
      accessAll: 'Everyone',
      accessAdmin: 'Admins only',
      accessList: 'Allow-list only',
      modelAutoHint: 'Fills in automatically once URL and key are set',
      modelFetch: 'Fetch models',
      modelFetchReady: 'Found {n} models',
      modelFetchFailed: 'Failed: {err}',
      botTools: 'Tools',
      botToolsHint: 'Anyone in the group can trigger the model: give it no tools by default, enable search only when needed.',
      toolWebSearch: 'Web search (web_search)',
      toolWebSearchHint: 'Uses DeepSeek official search. If the chat model is not a DeepSeek account model, set an API key in Settings → Plugins → Official → Web search first. One search is a full model call.',
      toolWebFetch: 'Fetch pages (web_fetch)',
      toolWebFetchHint: 'Lets the model read the pages behind search results; costs more context.',
      statusTitle: 'Runtime status',
      statusHint: 'Refreshes every 5s. Reconnects automatically; check the last error when it keeps failing.',
      statusConnected: 'Connected',
      statusDisconnected: 'Disconnected',
      statusChecking: 'Checking…',
      statusSearch: 'Search',
      statusAi: 'AI',
      permImage: 'Image /draw',
      permImageHint: '/draw and model-written [draw:…] spend your key quota.',
      permTts: 'Voice /speak',
      permTtsHint: '/speak and model-written [voice:…] spend your key quota.',
      permSticker: 'Save stickers /save',
      permStickerHint: 'Copies images into the sticker folder (writes files).',
      permSearch: 'Search toggle /search',
      permSearchHint: 'Who may switch web search on or off.',
      permManage: 'Admin /ai /clear',
      permManageHint: 'Toggle AI, clear memory, reload persona: admins by default.',
      permDefault: 'Default scope',
      permDefaultHint: 'Used by every feature that is not set individually below.',
      permInherit: 'Follow default ({mode})',
      permMembersPlaceholder: 'One per line: QQ id or group:<id> — commas also work',
      permDenyTitle: 'Deny list (always wins)',
      permDenyPlaceholder: 'These QQ ids / groups are never allowed',
      statusRuntimeHint: 'Runtime toggles are chat commands: /search on|off|follow, /ai on|off, /clear.',
      statusOn: 'on',
      statusOff: 'off',
      statusCounters: '{m} msgs · {r} replies · {s} skips',
      statusErrors: 'Last error',
      statusUptime: 'up {time}',
      inspectTitle: 'Conversation inspector',
      inspectHint: 'What just happened: who spoke, whether the bot replied, and why it skipped.',
      inspectEmpty: 'No events yet (they appear as messages arrive).',
      inspectMessage: 'message',
      inspectReply: 'reply',
      inspectSkip: 'skip',
      inspectError: 'error',
      inspectCommand: 'command',
      inspectChats: 'Chat logs',
      inspectSelectChat: 'Pick a chat log',
      inspectLoadTail: 'Show recent messages',
      rulesTitle: 'Keyword rules',
      rulesHint: 'Answer without calling the model: fast and cheap. Placeholders: {user} {qq} {bot}.',
      rulesPattern: 'Keyword / regex',
      rulesReply: 'Reply',
      rulesMode: 'Match',
      rulesModeContains: 'contains',
      rulesModeExact: 'exact',
      rulesModeRegex: 'regex',
      rulesAdd: 'Add rule',
      rulesEmpty: 'No rules yet.',
      schedTitle: 'Scheduled messages',
      schedHint: 'Send fixed text to a group/DM daily (or on chosen weekdays). {date} {time} {weekday} are substituted.',
      schedAt: 'Time HH:MM',
      schedDays: 'Weekdays (1=Mon…7=Sun, empty=daily)',
      schedBot: 'Bot',
      schedChat: 'Target group:<id> or private:<qq>',
      schedText: 'Text',
      schedLabel: 'Label',
      schedAdd: 'Add schedule',
      schedEmpty: 'No scheduled messages yet.',
      memoryTitle: 'Long-term memory',
      memoryHint: 'One memory-<chat>.json per chat, one summary per line, injected when a session is seeded.',
      memoryEmpty: 'No memory files yet.',
      memoryEntries: '{n} entries',
      memorySave: 'Save memory',
      memoryDelete: 'Delete memory',
      memoryConfirmDelete: 'Delete memory "{name}"?',
      memoryPlaceholder: 'One summary per line…',
      memorySaved: 'Saved',
      mediaTitle: 'Media (voice / images)',
      mediaHint: 'OpenAI-compatible endpoints with your own key. baseURL up to /v1; you may set only an env var name instead of a literal key.',
      mediaEnable: 'Enabled',
      mediaBaseURL: 'Base URL',
      mediaApiKey: 'API Key',
      mediaApiKeyEnv: 'or env var name',
      mediaModel: 'Model',
      mediaVoice: 'Voice',
      mediaSize: 'Size',
      mediaTts: 'Text to speech (TTS)',
      mediaImage: 'Image generation',
      mediaConfigured: 'ready',
      mediaNotConfigured: 'not ready (missing key or model)',
      stickerCollectHint: 'In QQ, send "/收图 <category>" or reply to an image with "/收图" to save it as a sticker (admin only).',
    }

    // ==================== 样式（内联，避免依赖 CSS 管线） ====================

    const S = {
      wrap: { display: 'flex', flexDirection: 'column', gap: '14px', maxWidth: '720px' },
      intro: { margin: 0, color: 'var(--dsw-alias-label-secondary, #666)', fontSize: '13px', lineHeight: 1.6 },
      card: { display: 'flex', flexDirection: 'column', gap: '10px', padding: '14px', border: '1px solid var(--dsw-alias-separator, #e5e5e5)', borderRadius: '10px' },
      cardHead: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' },
      cardTitle: { fontSize: '13px', fontWeight: 600, color: 'var(--dsw-alias-label-primary, #111)' },
      row: { display: 'flex', flexDirection: 'column', gap: '4px' },
      rowLabel: { fontSize: '12px', fontWeight: 500, color: 'var(--dsw-alias-label-primary, #111)' },
      hint: { fontSize: '11px', color: 'var(--dsw-alias-label-secondary, #888)', lineHeight: 1.5 },
      input: { width: '100%', boxSizing: 'border-box', padding: '7px 9px', fontSize: '13px', color: 'var(--dsw-alias-label-primary, #111)', background: 'var(--dsw-alias-surface, #fff)', border: '1px solid var(--dsw-alias-separator, #ddd)', borderRadius: '7px' },
      inputError: { borderColor: '#d92d20' },
      checkRow: { display: 'flex', alignItems: 'center', gap: '8px' },
      grid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' },
      actions: { display: 'flex', alignItems: 'center', gap: '10px' },
      button: { padding: '7px 16px', fontSize: '13px', fontWeight: 500, color: '#fff', background: 'var(--dsw-alias-accent, #2b6cb0)', border: 'none', borderRadius: '7px', cursor: 'pointer' },
      buttonGhost: { padding: '6px 12px', fontSize: '12px', color: 'var(--dsw-alias-label-secondary, #555)', background: 'transparent', border: '1px dashed var(--dsw-alias-separator, #ccc)', borderRadius: '7px', cursor: 'pointer' },
      buttonDanger: { padding: '5px 10px', fontSize: '12px', color: '#d92d20', background: 'transparent', border: '1px solid #d92d20', borderRadius: '7px', cursor: 'pointer' },
      status: { fontSize: '12px', color: 'var(--dsw-alias-label-secondary, #666)' },
      error: { fontSize: '12px', color: '#d92d20' },
      pre: { margin: 0, padding: '10px', fontSize: '11px', lineHeight: 1.5, background: 'var(--dsw-alias-surface-secondary, #f7f7f7)', borderRadius: '8px', overflow: 'auto', maxHeight: '220px' },
      table: { width: '100%', borderCollapse: 'collapse', fontSize: '12px' },
      td: { padding: '4px 6px', borderBottom: '1px solid var(--dsw-alias-separator, #eee)', verticalAlign: 'top' },
      tdKey: { padding: '4px 6px', borderBottom: '1px solid var(--dsw-alias-separator, #eee)', fontFamily: 'ui-monospace, monospace', whiteSpace: 'nowrap', color: 'var(--dsw-alias-label-primary, #111)' },
      detailsSummary: { cursor: 'pointer', fontSize: '12px', color: 'var(--dsw-alias-label-secondary, #555)' },
      section: { display: 'flex', flexDirection: 'column', gap: '12px' },
      dot: { display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%' },
      linkRow: { display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' },
      link: { fontSize: '12px', color: 'var(--dsw-alias-accent, #2b6cb0)', wordBreak: 'break-all' },
      code: { fontSize: '12px', fontFamily: 'ui-monospace, monospace', color: 'var(--dsw-alias-label-primary, #111)' },
      list: { display: 'flex', flexDirection: 'column', gap: '4px', margin: 0, padding: 0, listStyle: 'none' },
      listRow: { display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' },
      hintInline: { fontSize: '11px', color: 'var(--dsw-alias-label-secondary, #888)' },
      textarea: { width: '100%', boxSizing: 'border-box', padding: '7px 9px', fontSize: '12px', fontFamily: 'ui-monospace, monospace', lineHeight: 1.5, color: 'var(--dsw-alias-label-primary, #111)', background: 'var(--dsw-alias-surface, #fff)', border: '1px solid var(--dsw-alias-separator, #ddd)', borderRadius: '7px', resize: 'vertical' },
      select: { padding: '6px 8px', fontSize: '12px', color: 'var(--dsw-alias-label-primary, #111)', background: 'var(--dsw-alias-surface, #fff)', border: '1px solid var(--dsw-alias-separator, #ddd)', borderRadius: '7px' },
      details: { display: 'flex', flexDirection: 'column', gap: '6px' },
      summary: { cursor: 'pointer', fontSize: '11px', color: 'var(--dsw-alias-label-secondary, #666)' },
      permRow: { display: 'flex', flexDirection: 'column', gap: '8px', padding: '10px', border: '1px solid var(--dsw-alias-separator, #eee)', borderRadius: '8px' },
      permHead: { display: 'flex', flexDirection: 'column', gap: '2px' },
      permControls: { display: 'grid', gridTemplateColumns: '150px 1fr', gap: '8px', alignItems: 'start' },
    }

    // ==================== 工具 ====================

    function botDefaults () {
      return {
        qq: '',
        name: 'Anonther',
        persona: 'Anonther',
        admins: [],
        ws: { url: 'ws://127.0.0.1:3001', accessToken: '' },
        timeout: 180,
        tools: { webSearch: false, webFetch: false },
        access: normalizeAccess({}),
      }
    }

    /** 一个媒体端点的归一化（tts / image 共用）。 */
    function mediaEndpoint (raw, defaultModel) {
      const m = raw && typeof raw === 'object' ? raw : {}
      return {
        enabled: m.enabled === true,
        baseURL: String(m.baseURL ?? 'https://api.siliconflow.cn/v1'),
        apiKey: String(m.apiKey ?? ''),
        apiKeyEnv: String(m.apiKeyEnv ?? ''),
        model: String(m.model || defaultModel),
        voice: String(m.voice ?? ''),
        size: String(m.size ?? '1024x1024'),
        format: String(m.format ?? 'mp3'),
        speed: Number(m.speed ?? 1) || 1,
        steps: Number(m.steps ?? 20) || 20,
        language: String(m.language ?? 'zh'),
      }
    }

    /** 只挑 schema 里存在的字段写回，避免多余键被 schemastery 拒绝。 */
    function mediaPayload (media) {
      const pick = (item, keys) => {
        const out = {}
        for (const key of keys) out[key] = item?.[key]
        return out
      }
      return {
        tts: pick(media?.tts, ['enabled', 'baseURL', 'apiKey', 'apiKeyEnv', 'model', 'voice', 'format', 'speed']),
        image: pick(media?.image, ['enabled', 'baseURL', 'apiKey', 'apiKeyEnv', 'model', 'size', 'steps']),
      }
    }

    const ACCESS_MODES = ['all', 'admin', 'list']

    /** 权限块归一化：默认范围 + 每个功能的覆盖（mode=inherit 表示跟随默认）。 */
    function normalizeAccess (raw) {
      const a = raw && typeof raw === 'object' ? raw : {}
      const members = (obj) => ({
        users: Array.isArray(obj?.users) ? obj.users.map(String) : [],
        groups: Array.isArray(obj?.groups) ? obj.groups.map(String) : [],
      })
      const features = {}
      for (const [name, block] of Object.entries(a.features ?? {})) {
        const f = block && typeof block === 'object' ? block : {}
        const mode = String(f.mode ?? 'inherit')
        features[name] = {
          mode: ['inherit', ...ACCESS_MODES].includes(mode) ? mode : 'inherit',
          ...members(f),
          denyUsers: Array.isArray(f.denyUsers) ? f.denyUsers.map(String) : [],
          denyGroups: Array.isArray(f.denyGroups) ? f.denyGroups.map(String) : [],
        }
      }
      return {
        mode: ACCESS_MODES.includes(String(a.mode)) ? String(a.mode) : 'admin',
        ...members(a),
        denyUsers: Array.isArray(a.denyUsers) ? a.denyUsers.map(String) : [],
        denyGroups: Array.isArray(a.denyGroups) ? a.denyGroups.map(String) : [],
        features,
      }
    }

    function normalize (value) {
      const v = value && typeof value === 'object' ? value : {}
      const bots = Array.isArray(v.bots)
        ? v.bots.map((bot) => {
          const b = bot && typeof bot === 'object' ? bot : {}
          return {
            qq: String(b.qq ?? ''),
            name: String(b.name ?? ''),
            persona: String(b.persona ?? b.name ?? ''),
            admins: Array.isArray(b.admins) ? b.admins.map(String) : (typeof b.admins === 'string' && b.admins ? b.admins.split(/[,，\s]+/).filter(Boolean) : []),
            ws: {
              url: String(b.ws?.url ?? 'ws://127.0.0.1:3001'),
              accessToken: String(b.ws?.accessToken ?? ''),
            },
            timeout: Number(b.timeout ?? 180) || 180,
            tools: {
              webSearch: Boolean(b.tools?.webSearch),
              webFetch: Boolean(b.tools?.webFetch),
            },
            access: normalizeAccess(b.access),
            ...(b.provider ? { provider: String(b.provider) } : {}),
            ...(b.model ? { model: String(b.model) } : {}),
          }
        })
        : []
      return {
        repoDir: String(v.repoDir ?? '.'),
        autoStart: v.autoStart !== false,
        bots,
        aggregation: {
          windowTimeout: Number(v.aggregation?.windowTimeout ?? 8) || 8,
          maxMessages: Number(v.aggregation?.maxMessages ?? 8) || 8,
        },
        chat: {
          replyCooldown: Number(v.chat?.replyCooldown ?? 5) || 5,
          leaveCooldown: Number(v.chat?.leaveCooldown ?? 300) || 300,
          maxSegments: Number(v.chat?.maxSegments ?? 5) || 5,
        },
        rules: (Array.isArray(v.rules) ? v.rules : []).map((rule) => {
          const r = rule && typeof rule === 'object' ? rule : {}
          return {
            enabled: r.enabled !== false,
            pattern: String(r.pattern ?? ''),
            mode: ['contains', 'exact', 'regex'].includes(String(r.mode)) ? String(r.mode) : 'contains',
            reply: String(r.reply ?? ''),
            bots: Array.isArray(r.bots) ? r.bots.map(String) : [],
          }
        }),
        schedules: (Array.isArray(v.schedules) ? v.schedules : []).map((item) => {
          const s2 = item && typeof item === 'object' ? item : {}
          return {
            id: String(s2.id ?? ''),
            enabled: s2.enabled !== false,
            label: String(s2.label ?? ''),
            at: String(s2.at ?? '08:00'),
            days: Array.isArray(s2.days) ? s2.days.map(Number).filter((n) => n >= 1 && n <= 7) : [],
            bot: String(s2.bot ?? ''),
            chat: String(s2.chat ?? ''),
            text: String(s2.text ?? ''),
          }
        }),
        media: {
          tts: mediaEndpoint(v.media?.tts, 'FunAudioLLM/CosyVoice2-0.5B'),
          image: mediaEndpoint(v.media?.image, 'Kwai-Kolors/Kolors'),
        },
      }
    }

    function validate (draft) {
      const errors = []
      if (!draft.bots.length) errors.push('noBot')
      draft.bots.forEach((bot) => {
        if (!/^\d{5,12}$/.test(bot.qq)) errors.push('qq:' + bot.qq)
        if (!String(bot.name).trim()) errors.push('name:' + bot.qq)
        if (!/^wss?:\/\/.+/.test(String(bot.ws.url))) errors.push('url:' + bot.qq)
      })
      return errors
    }

    function buildOps (draft, base) {
      const ops = [{ op: 'set', path: ['bots'], value: draft.bots }]
      if (draft.repoDir !== String(base.repoDir ?? '.')) ops.push({ op: 'set', path: ['repoDir'], value: draft.repoDir })
      if (draft.autoStart !== (base.autoStart !== false)) ops.push({ op: 'set', path: ['autoStart'], value: draft.autoStart })
      ops.push({ op: 'set', path: ['aggregation', 'windowTimeout'], value: draft.aggregation.windowTimeout })
      ops.push({ op: 'set', path: ['aggregation', 'maxMessages'], value: draft.aggregation.maxMessages })
      ops.push({ op: 'set', path: ['chat', 'replyCooldown'], value: draft.chat.replyCooldown })
      ops.push({ op: 'set', path: ['chat', 'leaveCooldown'], value: draft.chat.leaveCooldown })
      ops.push({ op: 'set', path: ['chat', 'maxSegments'], value: draft.chat.maxSegments })
      ops.push({ op: 'set', path: ['rules'], value: draft.rules })
      ops.push({ op: 'set', path: ['schedules'], value: draft.schedules })
      ops.push({ op: 'set', path: ['media'], value: mediaPayload(draft.media) })
      return ops
    }

    // ==================== 字段小组件 ====================

    function Field (props) {
      const { label, hint, error, children } = props
      return h('div', { style: S.row },
        h('span', { style: S.rowLabel }, label),
        children,
        hint ? h('span', { style: S.hint }, hint) : null,
        error ? h('span', { style: S.error }, error) : null)
    }

    function TextInput (props) {
      const { value, onChange, invalid, placeholder, type } = props
      return h('input', {
        type: type ?? 'text',
        value,
        placeholder,
        onChange: (event) => onChange(event.target.value),
        style: invalid ? { ...S.input, ...S.inputError } : S.input,
      })
    }

    function BotCard (props) {
      const { bot, index, t, onChange, onRemove } = props
      const patch = (fields) => onChange(index, { ...bot, ...fields })
      const patchWs = (fields) => onChange(index, { ...bot, ws: { ...bot.ws, ...fields } })
      return h('div', { style: S.card },
        h('div', { style: S.cardHead },
          h('span', { style: S.cardTitle }, (bot.name || bot.qq || '?') + (index === 0 ? '' : ' #' + (index + 1))),
          h('button', { type: 'button', style: S.buttonDanger, onClick: () => onRemove(index) }, t('remove'))),
        h('div', { style: S.grid2 },
          h(Field, { label: t('qq'), error: !/^\d{5,12}$/.test(bot.qq) ? t('errQq') : null },
            h(TextInput, { value: bot.qq, invalid: !/^\d{5,12}$/.test(bot.qq), placeholder: '1001000100', onChange: (v) => patch({ qq: v.trim() }) })),
          h(Field, { label: t('name'), hint: t('nameHint'), error: !bot.name.trim() ? t('errName') : null },
            h(TextInput, { value: bot.name, invalid: !bot.name.trim(), onChange: (v) => patch({ name: v }) }))),
        h('div', { style: S.grid2 },
          h(Field, { label: t('persona'), hint: t('personaHint') },
            h(TextInput, { value: bot.persona, onChange: (v) => patch({ persona: v }) })),
          h(Field, { label: t('admins'), hint: t('adminsHint') },
            h(TextInput, {
              value: bot.admins.join(', '),
              placeholder: '10001, 10002',
              onChange: (v) => patch({ admins: v.split(/[,，\s]+/).map((s) => s.trim()).filter(Boolean) }),
            }))),
        h(Field, { label: t('wsUrl'), error: !/^wss?:\/\/.+/.test(String(bot.ws.url)) ? t('errUrl') : null },
          h(TextInput, { value: bot.ws.url, invalid: !/^wss?:\/\/.+/.test(String(bot.ws.url)), placeholder: 'ws://127.0.0.1:3001', onChange: (v) => patchWs({ url: v.trim() }) })),
        h('div', { style: S.grid2 },
          h(Field, { label: t('wsToken') },
            h(TextInput, { value: bot.ws.accessToken, onChange: (v) => patchWs({ accessToken: v }) })),
          h(Field, { label: t('timeout') },
            h(TextInput, {
              type: 'number',
              value: String(bot.timeout),
              onChange: (v) => patch({ timeout: Math.max(10, Number(v) || 180) }),
            }))),
        h('div', { style: S.grid2 },
          h(Field, { label: t('provider'), hint: t('providerHint') },
            h(TextInput, { value: bot.provider ?? '', onChange: (v) => patch({ provider: v.trim() || undefined }) })),
          h(Field, { label: t('model') },
            h(TextInput, { value: bot.model ?? '', onChange: (v) => patch({ model: v.trim() || undefined }) }))),
        h('div', { style: S.card },
          h('div', { style: S.cardHead }, h('span', { style: S.cardTitle }, t('botTools'))),
          h('span', { style: S.hint }, t('botToolsHint')),
          h('label', { style: S.checkRow },
            h('input', {
              type: 'checkbox',
              checked: Boolean(bot.tools?.webSearch),
              onChange: (event) => patch({ tools: { ...(bot.tools ?? {}), webSearch: event.target.checked } }),
            }),
            h('span', { style: S.rowLabel }, t('toolWebSearch'))),
          h('span', { style: S.hint }, t('toolWebSearchHint')),
          h('label', { style: S.checkRow },
            h('input', {
              type: 'checkbox',
              checked: Boolean(bot.tools?.webFetch),
              onChange: (event) => patch({ tools: { ...(bot.tools ?? {}), webFetch: event.target.checked } }),
            }),
            h('span', { style: S.rowLabel }, t('toolWebFetch'))),
          h('span', { style: S.hint }, t('toolWebFetchHint'))),
        h(PermissionCard, { t, bot, patch }))
    }

    // ==================== 配置页 ====================

    // ==================== 人格 / 表情包 / 维护 ====================

    /** 调 /qqbot-files/* 接口。 */
    function api (path, body) {
      const init = body === undefined
        ? { credentials: 'same-origin' }
        : {
            method: 'POST',
            credentials: 'same-origin',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify(body),
          }
      return fetch(`/qqbot-files${path}`, init).then(async response => {
        try {
          return await response.json()
        } catch {
          return { ok: false, error: `HTTP ${response.status}` }
        }
      })
    }

    function formatBytes (bytes) {
      if (!bytes || bytes < 1024) return `${bytes ?? 0} B`
      if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
      return `${(bytes / 1024 / 1024).toFixed(1)} MB`
    }

    /** 人格（persona/*.md）列表 + 编辑器。 */
    function PersonaCard ({ t }) {
      const [list, setList] = React.useState([])
      const [editing, setEditing] = React.useState('')
      const [text, setText] = React.useState('')
      const [baseline, setBaseline] = React.useState('')
      const [status, setStatus] = React.useState('')
      const [error, setError] = React.useState('')
      const [newName, setNewName] = React.useState('')

      const refresh = React.useCallback(async () => {
        const result = await api('/list').catch(() => null)
        if (result?.personas) setList(result.personas)
      }, [])

      React.useEffect(() => { refresh() }, [refresh])

      const open = async (name) => {
        const result = await api(`/persona/load?name=${encodeURIComponent(name)}`)
        if (!result.ok) { setError(result.error ?? t('saveFailed')); return }
        setEditing(result.name)
        setText(result.text)
        setBaseline(result.text)
        setStatus('')
        setError('')
      }

      const save = async () => {
        setStatus('saving')
        const result = await api('/persona/save', { name: editing, text })
        if (!result.ok) { setStatus('failed'); setError(result.error ?? ''); return }
        setBaseline(text)
        setStatus('saved')
        setError('')
        refresh()
      }

      const create = async () => {
        const name = newName.trim()
        if (!name) return
        const result = await api('/persona/create', { name })
        if (!result.ok) { setError(result.error ?? ''); return }
        setNewName('')
        setEditing(result.name)
        setText(result.text)
        setBaseline(result.text)
        setStatus('saved')
        setError('')
        refresh()
      }

      const remove = async (name) => {
        if (!window.confirm(t('personaConfirmDelete', { name }))) return
        const result = await api('/persona/delete', { name })
        if (!result.ok) { setError(result.error ?? ''); return }
        if (editing === name) { setEditing(''); setText(''); setBaseline('') }
        refresh()
      }

      const dirty = text !== baseline

      return h('div', { style: S.card },
        h('div', { style: S.cardHead },
          h('span', { style: S.cardTitle }, t('personaTitle')),
          h('span', { style: S.hint }, t('personaCount', { n: String(list.length) }))),
        h('span', { style: S.hint }, t('personaManageHint')),

        list.length === 0
          ? h('span', { style: S.hint }, t('personaEmpty'))
          : h('ul', { style: S.list },
            list.map(item => h('li', { key: item.name, style: S.listRow },
              h('button', {
                type: 'button',
                style: editing === item.name ? { ...S.buttonGhost, borderStyle: 'solid' } : S.buttonGhost,
                onClick: () => open(item.name),
              }, item.name),
              h('span', { style: S.hint }, `${formatBytes(item.size)} · ${new Date(item.mtime).toLocaleString()}`),
              h('button', { type: 'button', style: S.buttonDanger, onClick: () => remove(item.name) }, t('personaDelete'))))),

        h('div', { style: S.actions },
          h(TextInput, { value: newName, placeholder: t('personaNewPlaceholder'), onChange: setNewName }),
          h('button', { type: 'button', style: S.buttonGhost, onClick: create, disabled: !newName.trim() }, t('personaCreate'))),

        editing
          ? h('div', { style: S.row },
            h('div', { style: S.cardHead },
              h('span', { style: S.rowLabel }, `${editing}.md`),
              h('span', { style: S.hint }, t('personaChars', { n: String(text.length) })),
              dirty ? h('span', { style: S.error }, t('unsaved')) : null),
            h('textarea', {
              style: { ...S.input, minHeight: '220px', fontFamily: 'ui-monospace, monospace', lineHeight: 1.6, resize: 'vertical' },
              value: text,
              onChange: event => { setText(event.target.value); setStatus('') },
            }),
            h('div', { style: S.actions },
              h('button', { type: 'button', style: dirty ? S.button : { ...S.button, opacity: 0.5 }, disabled: !dirty || status === 'saving', onClick: save }, status === 'saving' ? t('saving') : t('personaSave')),
              status === 'saved' ? h('span', { style: S.status }, t('saved')) : null,
              h('span', { style: S.hint }, t('personaReloadHint'))))
          : null,

        error ? h('span', { style: S.error }, error) : null)
    }

    /** 单个图片的上传按钮（隐藏 file input）。 */
    const PERMISSION_FEATURES = [
      ['image', 'permImage', 'permImageHint'],
      ['tts', 'permTts', 'permTtsHint'],
      ['sticker', 'permSticker', 'permStickerHint'],
      ['search', 'permSearch', 'permSearchHint'],
      ['manage', 'permManage', 'permManageHint'],
    ]

    /** 解析名单文本：一行/逗号一个，`群:` 前缀表示群号。 */
    function parseMembers (text) {
      const users = []
      const groups = []
      for (const piece of String(text ?? '').split(/[\n,，、;；]+/)) {
        const raw = piece.trim()
        if (!raw) continue
        const matched = raw.match(/^(?:群|group|g)\s*[:：]\s*(.+)$/i)
        if (matched) groups.push(matched[1].trim())
        else users.push(raw)
      }
      return { users, groups }
    }

    function formatMembers (users, groups) {
      return [...(groups ?? []).map((g) => `群:${g}`), ...(users ?? []).map((u) => String(u))].join('\n')
    }

    /**
     * 名单输入：文本原样保留（所以逗号能正常打出来），改一次就解析一次。
     * key 变化时会重建（切机器人时不会串数据）。
     */
    function MemberList ({ value, placeholder, onChange }) {
      const [text, setText] = React.useState(() => formatMembers(value?.users, value?.groups))
      return h('textarea', {
        value: text,
        placeholder,
        rows: 3,
        style: S.textarea,
        onChange: (event) => {
          setText(event.target.value)
          onChange(parseMembers(event.target.value))
        },
      })
    }

    /** 一个功能的权限行：范围 + 名单 + 黑名单。 */
    function PermissionRow ({ t, label, hint, feature, value, fallbackMode, onChange }) {
      const mode = value?.mode ?? 'inherit'
      return h('div', { style: S.permRow },
        h('div', { style: S.permHead },
          h('span', { style: S.rowLabel }, t(label)),
          h('span', { style: S.hint }, t(hint))),
        h('div', { style: S.permControls },
          h('select', {
            value: mode,
            style: S.select,
            onChange: (event) => onChange({ ...value, mode: event.target.value }),
          },
          h('option', { value: 'inherit' }, t('permInherit', { mode: t(fallbackMode) })),
          h('option', { value: 'all' }, t('accessAll')),
          h('option', { value: 'admin' }, t('accessAdmin')),
          h('option', { value: 'list' }, t('accessList'))),
          mode === 'list'
            ? h(MemberList, {
              value,
              placeholder: t('permMembersPlaceholder'),
              onChange: (members) => onChange({ ...value, ...members }),
            })
            : null),
        h('details', { style: S.details },
          h('summary', { style: S.summary }, t('permDenyTitle')),
          h(MemberList, {
            value,
            placeholder: t('permDenyPlaceholder'),
            onChange: (members) => onChange({ ...value, denyUsers: members.users, denyGroups: members.groups }),
          })))
    }

    function PermissionCard ({ t, bot, patch }) {
      const access = bot.access ?? {}
      const features = access.features ?? {}
      const fallback = access.mode ?? 'admin'
      const fallbackLabel = fallback === 'all' ? 'accessAll' : fallback === 'list' ? 'accessList' : 'accessAdmin'
      const setFeature = (name, next) => patch({
        access: { ...access, features: { ...features, [name]: { ...(features[name] ?? {}), ...next } } },
      })
      return h('div', { style: S.card },
        h('div', { style: S.cardHead }, h('span', { style: S.cardTitle }, t('accessTitle'))),
        h('span', { style: S.hint }, t('accessHint')),
        h('div', { style: S.permRow },
          h('div', { style: S.permHead },
            h('span', { style: S.rowLabel }, t('permDefault')),
            h('span', { style: S.hint }, t('permDefaultHint'))),
          h('div', { style: S.permControls },
            h('select', {
              value: fallback,
              style: S.select,
              onChange: (event) => patch({ access: { ...access, mode: event.target.value } }),
            },
            h('option', { value: 'admin' }, t('accessAdmin')),
            h('option', { value: 'all' }, t('accessAll')),
            h('option', { value: 'list' }, t('accessList'))),
            h(MemberList, {
              value: access,
              placeholder: t('permMembersPlaceholder'),
              onChange: (members) => patch({ access: { ...access, ...members } }),
            }))),
        PERMISSION_FEATURES.map(([name, labelKey, hintKey]) => h(PermissionRow, {
          key: name,
          t,
          label: labelKey,
          hint: hintKey,
          value: features[name] ?? { mode: 'inherit' },
          fallbackMode: fallbackLabel,
          onChange: (next) => setFeature(name, next),
        })))
    }

    /** 拉取上游模型列表并选择（只查 id，不参与对话调用）。 */
    /**
     * 上游模型下拉：填好接口地址和 key 后自动拉一次（改 key 会防抖重拉），也可手动刷新。
     * 只用来查模型 id；真正调用仍走 DSH 的 provider/model。
     */
    function ModelPicker ({ t, baseURL, apiKey, apiKeyEnv, value, onPick }) {
      const [models, setModels] = React.useState([])
      const [state, setState] = React.useState('idle')
      const [error, setError] = React.useState('')

      const load = async () => {
        setState('loading')
        setError('')
        try {
          const response = await fetch('/qqbot-runtime/models', {
            method: 'POST',
            credentials: 'same-origin',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ baseURL, apiKey, apiKeyEnv }),
          })
          const body = await response.json()
          if (body?.ok) {
            setModels(body.models ?? [])
            setState('ready')
          } else {
            setError(body?.error ?? 'unknown')
            setState('failed')
          }
        } catch (cause) {
          setError(cause instanceof Error ? cause.message : String(cause))
          setState('failed')
        }
      }

      // 有地址就自动识别（防抖 700ms，边打字边拉会很吵）
      React.useEffect(() => {
        if (!baseURL) { setModels([]); setState('idle'); return undefined }
        if (!apiKey && !apiKeyEnv) { setModels([]); setState('idle'); return undefined }
        const timer = setTimeout(load, 700)
        return () => clearTimeout(timer)
      }, [baseURL, apiKey, apiKeyEnv])

      return h('div', { style: S.row },
        h('div', { style: S.actions },
          h('button', {
            type: 'button',
            style: S.buttonGhost,
            disabled: state === 'loading',
            onClick: load,
          }, state === 'loading' ? t('statusChecking') : t('modelFetch')),
          h('span', { style: S.hint }, t('modelAutoHint')),
          state === 'ready' ? h('span', { style: S.hint }, t('modelFetchReady', { n: String(models.length) })) : null,
          state === 'failed' ? h('span', { style: S.error }, t('modelFetchFailed', { err: String(error).slice(0, 120) })) : null),
        models.length
          ? h('select', {
            value: value || '',
            style: S.input,
            onChange: (event) => onPick(event.target.value),
          }, models.map(id => h('option', { key: id, value: id }, id)))
          : null)
    }

    function UploadButton ({ bot, category, t, onDone }) {
      const inputRef = React.useRef(null)
      const [busy, setBusy] = React.useState(false)
      const [error, setError] = React.useState('')

      const changed = async (event) => {
        const file = event.target.files?.[0]
        event.target.value = ''
        if (!file) return
        setBusy(true)
        setError('')
        try {
          const data = await new Promise(resolve => {
            const reader = new FileReader()
            reader.onload = () => resolve(String(reader.result ?? ''))
            reader.onerror = () => resolve('')
            reader.readAsDataURL(file)
          })
          const result = await api('/sticker/upload', { bot, category, name: file.name, data })
          if (!result.ok) setError(result.error ?? '')
          else onDone?.()
        } finally {
          setBusy(false)
        }
      }

      return h('span', { style: S.actions },
        h('input', {
          ref: inputRef,
          type: 'file',
          accept: 'image/*',
          style: { display: 'none' },
          onChange: changed,
        }),
        h('button', {
          type: 'button',
          style: S.buttonGhost,
          disabled: busy,
          onClick: () => inputRef.current?.click(),
        }, busy ? t('svcWorking') : t('stickerUpload')),
        error ? h('span', { style: S.error }, error) : null)
    }

    /** 表情包（stickers/<机器人>/<分类>/）。 */
    function StickersCard ({ t }) {
      const [info, setInfo] = React.useState(null)
      const [error, setError] = React.useState('')
      const [expanded, setExpanded] = React.useState('')
      const [newCategory, setNewCategory] = React.useState('')

      const refresh = React.useCallback(async () => {
        const result = await api('/list').catch(() => null)
        if (result?.stickers) { setInfo(result.stickers); setError('') }
      }, [])

      React.useEffect(() => { refresh() }, [refresh])

      const open = () => api('/open', { target: 'stickers' }).catch(() => null)

      const addCategory = async (bot) => {
        const category = newCategory.trim()
        if (!category) return
        const result = await api('/sticker/category', { bot, category })
        if (!result.ok) { setError(result.error ?? ''); return }
        setNewCategory('')
        setExpanded(`${bot}|${category}`)
        refresh()
      }

      const remove = async (bot, category, name) => {
        if (!window.confirm(t('stickersConfirmDelete', { name }))) return
        const result = await api('/sticker/delete', { bot, category, name })
        if (!result.ok) { setError(result.error ?? ''); return }
        refresh()
      }

      const head = info
        ? t('stickersSummary', {
            cats: String(info.categories),
            n: String(info.count),
            size: formatBytes(info.totalBytes),
          })
        : t('svcLoading')

      return h('div', { style: S.card },
        h('div', { style: S.cardHead },
          h('span', { style: S.cardTitle }, t('stickersTitle')),
          h('span', { style: S.hint }, head)),
        h('span', { style: S.hint }, t('stickersHint')),
        h('span', { style: S.hint }, t('stickerCollectHint')),
        h('span', { style: S.hint }, t('stickersStructureHint')),
        h('div', { style: S.actions },
          h('button', { type: 'button', style: S.buttonGhost, onClick: open }, t('openDir')),
          h('button', { type: 'button', style: S.buttonGhost, onClick: refresh }, t('refresh'))),

        info?.bots?.length
          ? info.bots.map(group => h('div', { key: group.bot || 'legacy', style: S.row },
            group.bot
              ? h('span', { style: S.rowLabel }, `${t('stickerBotLabel')}: ${group.bot}`)
              : h('span', { style: S.rowLabel }, t('stickerLegacyLabel')),
            h('ul', { style: S.list },
              group.categories.map(category => {
                const key = `${group.bot}|${category.name}`
                const isOpen = expanded === key
                return h('li', { key, style: S.row },
                  h('div', { style: S.listRow },
                    h('code', { style: S.code }, category.name),
                    h('span', { style: S.hint }, t('stickerCategoryCount', { n: String(category.count), size: formatBytes(category.bytes) })),
                    h(UploadButton, { bot: group.bot, category: category.name, t, onDone: refresh }),
                    h('button', {
                      type: 'button',
                      style: S.buttonGhost,
                      onClick: () => setExpanded(isOpen ? '' : key),
                    }, isOpen ? t('stickerCollapse') : t('stickerExpand'))),
                  isOpen
                    ? h('ul', { style: { ...S.list, marginLeft: '12px' } },
                      category.files.map(file => h('li', { key: file.name, style: S.listRow },
                        h('code', { style: S.code }, file.name),
                        h('span', { style: S.hint }, formatBytes(file.size)),
                        h('button', { type: 'button', style: S.buttonDanger, onClick: () => remove(group.bot, category.name, file.name) }, t('personaDelete')))))
                    : null)
              }))),
          h('div', { style: S.actions },
            h(TextInput, { value: newCategory, placeholder: t('stickerNewCategory'), onChange: setNewCategory }),
            h('button', {
              type: 'button',
              style: S.buttonGhost,
              disabled: !newCategory.trim(),
              onClick: () => addCategory(info.bots[0]?.bot ?? ''),
            }, t('stickerCategory')))
          )
          : h('span', { style: S.hint }, t('stickersEmpty')),

        info?.legacy?.length
          ? h('div', { style: S.row },
            h('span', { style: S.rowLabel }, t('stickerLegacyFiles')),
            h('ul', { style: S.list },
              info.legacy.map(file => h('li', { key: file.name, style: S.listRow },
                h('code', { style: S.code }, file.name),
                h('span', { style: S.hint }, formatBytes(file.size))))))
          : null,

        error ? h('span', { style: S.error }, error) : null)
    }

    /** 目录与清理（平台感知：Windows 由 Docker Desktop 管理，不提供删虚拟机）。 */
    function MaintenanceCard ({ t }) {
      const [status, setStatus] = React.useState('')
      const [output, setOutput] = React.useState('')
      const [error, setError] = React.useState('')
      const [dirs, setDirs] = React.useState(null)

      React.useEffect(() => {
        api('/list').then(result => { if (result?.repoDir) setDirs(result) }).catch(() => null)
      }, [])

      const open = (target) => api('/open', { target })
        .then(result => { if (!result.ok) setError(result.error ?? '') })
        .catch(cause => setError(String(cause)))

      const clean = async (mode) => {
        if (!window.confirm(mode === 'hard' ? t('maintConfirmHard') : t('maintConfirmSoft'))) return
        setStatus('working'); setError(''); setOutput('')
        const result = await api('/clean', { mode })
        setStatus('')
        if (!result.ok) { setError(result.error ?? ''); return }
        setOutput(result.output ?? '')
      }

      const vmDeletable = dirs?.vmDeletable !== false
      const vmLabel = dirs?.vmLabel ? t('maintVmLabel', { label: dirs.vmLabel }) : ''

      return h('div', { style: S.card },
        h('div', { style: S.cardHead },
          h('span', { style: S.cardTitle }, t('maintTitle')),
          dirs?.platform ? h('span', { style: S.hint }, dirs.platform === 'win32' ? 'Windows' : dirs.platform === 'darwin' ? 'macOS' : dirs.platform) : null),
        h('span', { style: S.hint }, t('maintHint')),
        h('div', { style: S.actions },
          h('button', { type: 'button', style: S.buttonGhost, onClick: () => open('repo') }, t('maintOpenRepo')),
          h('button', { type: 'button', style: S.buttonGhost, onClick: () => open('persona') }, t('personaTitle')),
          h('button', { type: 'button', style: S.buttonGhost, onClick: () => open('stickers') }, t('stickersTitle')),
          h('button', { type: 'button', style: S.buttonGhost, onClick: () => open('data') }, t('maintOpenData')),
          h('button', { type: 'button', style: S.buttonGhost, onClick: () => open('onebot') }, t('maintOpenOnebot'))),
        vmDeletable
          ? h('div', { style: S.actions },
            h('button', { type: 'button', style: S.buttonGhost, onClick: () => open('vm') }, t('maintOpenVm')),
            vmLabel ? h('span', { style: S.hint }, vmLabel) : null)
          : h('span', { style: S.hint }, t('maintVmManaged')),
        h('div', { style: S.actions },
          h('button', { type: 'button', style: S.buttonGhost, disabled: status === 'working', onClick: () => clean('soft') }, t('maintCleanSoft')),
          vmDeletable
            ? h('button', { type: 'button', style: S.buttonDanger, disabled: status === 'working', onClick: () => clean('hard') }, t('maintCleanHard'))
            : null),
        status === 'working' ? h('span', { style: S.status }, t('maintWorking')) : null,
        output ? h('pre', { style: S.pre }, output) : null,
        error ? h('span', { style: S.error }, error) : null,
        dirs?.vmDir ? h('span', { style: S.hint }, `${t('maintVmDir')}: ${dirs.vmDir}`) : null)
    }

    /** OneBot 服务（Docker/NapCat）启停卡片：按钮 → Host 的路由 → compose。 */
    function ServiceCard ({ t }) {
      const [status, setStatus] = React.useState(null)
      const [busy, setBusy] = React.useState(false)
      const [error, setError] = React.useState('')
      const [justStarted, setJustStarted] = React.useState(false)
      const [doctor, setDoctor] = React.useState(null)
      const [initInfo, setInitInfo] = React.useState(null)

      const loadStatus = React.useCallback(async () => {
        try {
          const response = await fetch('/qqbot-service/status', { credentials: 'same-origin' })
          if (!response.ok) throw new Error(`HTTP ${response.status}`)
          setStatus(await response.json())
          setError('')
        } catch (cause) {
          setError(cause instanceof Error ? cause.message : String(cause))
        }
      }, [])

      React.useEffect(() => {
        loadStatus()
        const timer = setInterval(loadStatus, 8000)
        return () => clearInterval(timer)
      }, [loadStatus])

      const act = async (action) => {
        setBusy(true)
        setError('')
        setJustStarted(false)
        try {
          const response = await fetch('/qqbot-service/action', {
            method: 'POST',
            credentials: 'same-origin',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ action }),
          })
          const result = await response.json()
          if (result.status) setStatus(result.status)
          if (!result.ok) setError(result.error || '操作失败')
          else if (action !== 'stop') {
            setJustStarted(true)
            // 扫码页面：优先新窗口打开（被拦截时下面还有链接可点）
            const url = result.status?.webuiUrl
            if (url) window.open(url, '_blank', 'noopener')
          }
        } catch (cause) {
          setError(cause instanceof Error ? cause.message : String(cause))
        } finally {
          setBusy(false)
        }
      }

      const runDoctor = async () => {
        try {
          const response = await fetch('/qqbot-service/doctor', { credentials: 'same-origin' })
          setDoctor(await response.json())
        } catch (cause) {
          setError(cause instanceof Error ? cause.message : String(cause))
        }
      }

      const initWorkspace = async () => {
        setBusy(true)
        setError('')
        try {
          const response = await fetch('/qqbot-service/init', { method: 'POST', credentials: 'same-origin' })
          const result = await response.json()
          if (result.status) setStatus(result.status)
          setInitInfo(result)
          if (!result.ok) setError(result.error || '初始化失败')
          await loadStatus()
        } catch (cause) {
          setError(cause instanceof Error ? cause.message : String(cause))
        } finally {
          setBusy(false)
        }
      }

      const running = status?.running === true
      const stateText = status === null
        ? t('svcLoading')
        : running ? t('svcRunning') : t('svcStopped')

      return h('div', { style: S.card },
        h('div', { style: S.cardHead },
          h('span', { style: S.cardTitle }, t('svcTitle')),
          h('span', { style: { ...S.hint, color: running ? '#12b76a' : undefined } },
            h('span', { style: { ...S.dot, background: running ? '#12b76a' : '#98a2b3' } }),
            ' ', stateText)),
        h('span', { style: S.hint }, t('svcHint')),

        h('div', { style: S.actions },
          h('button', {
            type: 'button',
            style: busy ? { ...S.button, opacity: 0.6 } : S.button,
            disabled: busy,
            onClick: () => act('start'),
          }, busy ? t('svcWorking') : t('svcStart')),
          h('button', {
            type: 'button',
            style: { ...S.buttonGhost, opacity: busy ? 0.6 : 1 },
            disabled: busy,
            onClick: () => act('stop'),
          }, t('svcStop')),
          h('button', {
            type: 'button',
            style: { ...S.buttonGhost, opacity: busy ? 0.6 : 1 },
            disabled: busy,
            onClick: () => act('restart'),
          }, t('svcRestart'))),

        status?.webuiUrl
          ? h('div', { style: S.linkRow },
            h('span', { style: S.rowLabel }, t('svcWebui')),
            h('a', { href: status.webuiUrl, target: '_blank', rel: 'noreferrer', style: S.link }, status.webuiUrl),
            h('button', {
              type: 'button',
              style: S.buttonGhost,
              onClick: () => window.open(status.webuiUrl, '_blank', 'noopener'),
            }, t('svcOpen')))
          : null,
        status?.wsUrl
          ? h('div', { style: S.linkRow },
            h('span', { style: S.rowLabel }, t('svcWs')),
            h('code', { style: S.code }, status.wsUrl),
            h('span', { style: S.hint }, t('svcWsHint')))
          : null,
        status && !status.composeAvailable
          ? h('span', { style: S.error }, status.platform === 'win32' ? t('svcNoComposeWin') : t('svcNoCompose'))
          : null,
        status && status.composeAvailable === true && status.dockerAvailable === false
          ? h('span', { style: S.error }, status.platform === 'win32' ? t('svcNoDockerWin') : t('svcNoDockerMac'))
          : null,
        status && status.colimaAvailable && !status.colimaRunning ? h('span', { style: S.hint }, t('svcColimaDown')) : null,
        status?.dir ? h('span', { style: S.hint }, `${t('svcDirHint')}: ${status.dir}`) : null,
        status?.platform
          ? h('span', { style: S.hint }, t('svcPlatform', { platform: status.platform === 'win32' ? 'Windows' : status.platform === 'darwin' ? 'macOS' : status.platform }))
          : null,
        status && status.dirExists === false
          ? h('span', { style: S.hint }, t('svcNeedInit'))
          : null,

        h('div', { style: S.actions },
          h('button', { type: 'button', style: S.buttonGhost, onClick: initWorkspace, disabled: busy }, t('svcInit')),
          h('button', { type: 'button', style: S.buttonGhost, onClick: runDoctor }, t('svcDoctor'))),

        doctor
          ? h('ul', { style: S.list },
            doctor.checks.map(item => h('li', { key: item.id, style: S.listRow },
              h('span', { style: { ...S.dot, background: item.ok ? '#12b76a' : '#f04438' } }),
              h('code', { style: S.code }, item.label),
              item.detail ? h('span', { style: S.hint }, item.detail) : null)))
          : null,
        doctor?.hint ? h('span', { style: S.hint }, doctor.hint) : null,
        initInfo
          ? h('span', { style: S.status }, initInfo.created?.length
            ? t('svcInitCreated', { n: String(initInfo.created.length) })
            : t('svcInitKept'))
          : null,

        error ? h('span', { style: S.error }, error) : null,
        justStarted
          ? h('span', { style: S.status }, t('svcStartedHint'))
          : null)
    }

    /**
     * 错误边界：本插件的任何一个入口渲染失败时只在本卡片里显示错误，
     * 绝不把异常抛给 Harness 的设置/插件页面（否则整个面板会被卸载）。
     */
    class SafeBoundary extends React.Component {
      constructor (props) {
        super(props)
        this.state = { error: null }
      }

      static getDerivedStateFromError (error) {
        return { error }
      }

      componentDidCatch (error) {
        console.error('[qq-bot] 界面渲染失败:', error)
      }

      render () {
        if (this.state.error) {
          const message = this.state.error instanceof Error ? this.state.error.message : String(this.state.error)
          return h('div', { style: S.wrap },
            h('p', { style: S.error }, `QQ 机器人插件界面出错：${message}`),
            h('p', { style: S.hint }, '其余功能不受影响；可刷新页面或重启 Harness 重试。'))
        }
        return this.props.children
      }
    }

    /** 把组件包进错误边界。 */
    function guarded (Inner) {
      function Guarded (props) {
        return h(SafeBoundary, null, h(Inner, props))
      }
      Guarded.displayName = `QqBotGuarded(${Inner.displayName ?? Inner.name ?? 'View'})`
      return Guarded
    }

    /** 没有表单时的占位订阅源：保证 hooks 顺序在不同 view 之间恒定。 */
    const EMPTY_FORM = {
      subscribe: () => () => {},
      getSnapshot: () => ({ status: 'unavailable', value: {}, revision: 0, writable: false }),
      mutate: async () => ({ ok: false }),
    }

    function RowConfigPage (props) {
      const { view, form, t } = props
      const activeForm = form ?? EMPTY_FORM

      // hooks 一律在返回之前调用：同一个实例在不同 view 之间渲染也不会坏
      const snapshot = React.useSyncExternalStore(
        (listener) => activeForm.subscribe(listener),
        () => activeForm.getSnapshot(),
      )
      const [draft, setDraft] = React.useState(null)
      const [saveState, setSaveState] = React.useState('idle') // idle | saving | saved | failed
      const [preview, setPreview] = React.useState(false)

      const baseValue = snapshot.value
      React.useEffect(() => {
        if (draft === null && (snapshot.status === 'ready' || snapshot.status === 'unavailable')) {
          setDraft(normalize(baseValue))
        }
      }, [snapshot.status, baseValue, draft])

      if (view === 'summary') return h('span', null, t('summary'))
      if (!form) return h('div', { style: S.wrap }, h('p', { style: S.intro }, t('unavailable')))
      if (!draft) return h('div', { style: S.wrap }, h('p', { style: S.intro }, t('loading')))

      const errors = validate(draft)
      const dirty = JSON.stringify(normalize(baseValue)) !== JSON.stringify(draft)
      const readOnly = snapshot.writable === false

      const update = (fields) => { setDraft({ ...draft, ...fields }); setSaveState('idle') }
      const updateBot = (index, bot) => {
        const bots = draft.bots.slice()
        bots[index] = bot
        update({ bots })
      }
      const removeBot = (index) => update({ bots: draft.bots.filter((_, i) => i !== index) })
      const addBot = () => update({ bots: [...draft.bots, botDefaults()] })

      const save = async () => {
        if (errors.length || readOnly) return
        setSaveState('saving')
        const ok = await form.mutate(buildOps(draft, baseValue), snapshot.revision)
        setSaveState(ok ? 'saved' : 'failed')
      }

      return h('div', { style: S.wrap },
        h('p', { style: S.intro }, t('intro')),

        h('div', { style: S.card },
          h(Field, { label: t('repoDir'), hint: t('repoDirHint') },
            h(TextInput, { value: draft.repoDir, placeholder: '~/dsh-qq-bot', onChange: (v) => update({ repoDir: v.trim() }) })),
          h('label', { style: S.checkRow },
            h('input', {
              type: 'checkbox',
              checked: draft.autoStart,
              onChange: (event) => update({ autoStart: event.target.checked }),
            }),
            h('span', { style: S.rowLabel }, t('autoStart'))),
          h('span', { style: S.hint }, t('autoStartHint'))),

        h(StatusCard, { t }),
        h(ServiceCard, { t }),

        h('div', { style: S.card },
          h('div', { style: S.cardHead }, h('span', { style: S.cardTitle }, t('bots'))),
          h('span', { style: S.hint }, t('botsHint')),
          draft.bots.map((bot, index) => h(BotCard, { key: index, bot, index, t, onChange: updateBot, onRemove: removeBot })),
          h('button', { type: 'button', style: S.buttonGhost, onClick: addBot }, t('addBot'))),

        h(PersonaCard, { t }),
        h(StickersCard, { t }),
        h(RulesCard, { t, rules: draft.rules, onChange: (rules) => update({ rules }) }),
        h(SchedulesCard, { t, schedules: draft.schedules, onChange: (schedules) => update({ schedules }) }),
        h(MemoryCard, { t }),
        h(MediaCard, { t, media: draft.media, onChange: (media) => update({ media }) }),
        h(InspectCard, { t }),

        h('div', { style: S.card },
          h('div', { style: S.cardHead }, h('span', { style: S.cardTitle }, t('advanced'))),
          h('div', { style: S.grid2 },
            h(Field, { label: t('aggWindow'), hint: t('aggWindowHint') },
              h(TextInput, {
                type: 'number',
                value: String(draft.aggregation.windowTimeout),
                onChange: (v) => update({ aggregation: { ...draft.aggregation, windowTimeout: Math.max(1, Number(v) || 8) } }),
              })),
            h(Field, { label: t('aggMax') },
              h(TextInput, {
                type: 'number',
                value: String(draft.aggregation.maxMessages),
                onChange: (v) => update({ aggregation: { ...draft.aggregation, maxMessages: Math.max(1, Number(v) || 8) } }),
              }))),
          h('div', { style: S.grid2 },
            h(Field, { label: t('replyCooldown') },
              h(TextInput, {
                type: 'number',
                value: String(draft.chat.replyCooldown),
                onChange: (v) => update({ chat: { ...draft.chat, replyCooldown: Math.max(0, Number(v) || 0) } }),
              })),
            h(Field, { label: t('leaveCooldown') },
              h(TextInput, {
                type: 'number',
                value: String(draft.chat.leaveCooldown),
                onChange: (v) => update({ chat: { ...draft.chat, leaveCooldown: Math.max(0, Number(v) || 0) } }),
              }))),
          h(Field, { label: t('maxSegments') },
            h(TextInput, {
              type: 'number',
              value: String(draft.chat.maxSegments),
              onChange: (v) => update({ chat: { ...draft.chat, maxSegments: Math.max(1, Number(v) || 1) } }),
            }))),

        h(MaintenanceCard, { t }),

        h('div', { style: S.actions },
          h('button', {
            type: 'button',
            style: readOnly || errors.length ? { ...S.button, opacity: 0.5, cursor: 'not-allowed' } : S.button,
            disabled: readOnly || errors.length > 0 || saveState === 'saving',
            onClick: save,
          }, saveState === 'saving' ? t('saving') : t('save')),
          saveState === 'saved' ? h('span', { style: S.status }, t('saved')) : null,
          saveState === 'failed' ? h('span', { style: S.error }, t('saveFailed')) : null,
          readOnly ? h('span', { style: S.error }, t('readOnly')) : null,
          errors.length && !readOnly ? h('span', { style: S.error }, errors.map((code) => {
            if (code === 'noBot') return t('errNoBot')
            const [kind, qq] = code.split(':')
            const label = kind === 'qq' ? t('errQq') : kind === 'name' ? t('errName') : t('errUrl')
            return label + (qq ? ' (' + qq + ')' : '')
          }).join(' · ')) : null),

        h('details', { style: { display: 'flex', flexDirection: 'column', gap: '6px' } },
          h('summary', { style: S.detailsSummary, onClick: () => setPreview(!preview) }, t('preview')),
          h('pre', { style: S.pre }, JSON.stringify(buildOps(draft, baseValue).reduce((acc, op) => {
            const path = op.path
            let node = acc
            for (let i = 0; i < path.length - 1; i++) {
              const key = path[i]
              const nextKey = path[i + 1]
              if (node[key] === undefined) node[key] = typeof nextKey === 'number' ? [] : {}
              node = node[key]
            }
            node[path[path.length - 1]] = op.value
            return acc
          }, {}), null, 2))),

        h('div', { style: S.card },
          h('div', { style: S.cardHead }, h('span', { style: S.cardTitle }, t('usageTitle'))),
          h('p', { style: S.intro }, t('usage1')),
          h('p', { style: S.intro }, t('usage2')),
          h('p', { style: S.intro }, t('usage3')),
          h('p', { style: S.intro }, t('usage4'))),

        h('div', { style: S.card },
          h('div', { style: S.cardHead }, h('span', { style: S.cardTitle }, t('cmdsTitle'))),
          h('table', { style: S.table },
            h('tbody', null, t('cmds').map(([cmd, desc]) => h('tr', { key: cmd },
              h('td', { style: S.tdKey }, cmd),
              h('td', { style: S.td }, desc)))))),

        h('div', { style: S.card },
          h('div', { style: S.cardHead }, h('span', { style: S.cardTitle }, t('dataTitle'))),
          h('p', { style: S.intro }, t('dataText'))))
    }

    RowConfigPage.displayName = 'QqBotRowConfigPage'

    // 插件页 dsh-qq-bot 包详情页里的一段配置区：不经过 plugin-manager 的
    // 「行配置」开关，只要打开这个包的面页就能直接改。
    function PackageConfigSection (props) {
      const { subject, t } = props
      if (subject?.pkg?.name !== 'dsh-qq-bot') return null
      return h('section', { style: S.section },
        h('div', { style: S.cardHead },
          h('span', { style: S.cardTitle }, t('title')),
          h('span', { style: S.hintInline }, t('sectionHint'))),
        h(RowConfigPage, { ...props, view: 'page', form: props.form ?? props.boundForm?.() }))
    }

    PackageConfigSection.displayName = 'QqBotPackageConfigSection'

    /** 运行状态灯：连接状态 + 计数 + 运行时开关（搜索/AI）。 */
    function StatusCard ({ t }) {
      const [data, setData] = React.useState(null)
      const [error, setError] = React.useState('')

      const load = React.useCallback(async () => {
        try {
          const response = await fetch('/qqbot-status', { credentials: 'same-origin' })
          if (!response.ok) throw new Error(`HTTP ${response.status}`)
          setData(await response.json())
          setError('')
        } catch (cause) {
          setError(cause instanceof Error ? cause.message : String(cause))
        }
      }, [])

      React.useEffect(() => {
        load()
        const timer = setInterval(load, 5000)
        return () => clearInterval(timer)
      }, [load])

      const fmtDuration = (ms) => {
        const total = Math.max(0, Math.floor((ms ?? 0) / 1000))
        const d = Math.floor(total / 86400)
        const h = Math.floor((total % 86400) / 3600)
        const m = Math.floor((total % 3600) / 60)
        if (d) return `${d}d ${h}h`
        if (h) return `${h}h ${m}m`
        return `${m}m`
      }

      const bots = data?.bots ?? []
      return h('div', { style: S.card },
        h('div', { style: S.cardHead },
          h('span', { style: S.cardTitle }, t('statusTitle')),
          h('span', { style: S.hint }, data ? t('statusUptime', { time: fmtDuration(data.uptimeMs) }) : t('statusChecking'))),
        h('span', { style: S.hint }, t('statusHint')),
        bots.length === 0
          ? h('span', { style: S.hint }, '—')
          : bots.map(bot => h('div', { key: bot.qq, style: S.card },
            h('div', { style: S.cardHead },
              h('span', { style: S.rowLabel },
                h('span', { style: { ...S.dot, background: bot.connected ? '#12b76a' : '#f04438' } }),
                ' ', bot.name, ' ', h('code', { style: S.code }, bot.qq)),
              h('span', { style: { ...S.hint, color: bot.connected ? '#12b76a' : '#d92d20' } },
                bot.connected ? t('statusConnected') : t('statusDisconnected'))),
            h('div', { style: S.linkRow },
              h('span', { style: S.hint }, t('statusCounters', {
                m: String(bot.counters?.messages ?? 0),
                r: String(bot.counters?.replies ?? 0),
                s: String(bot.counters?.skips ?? 0),
              })),
              h('span', { style: S.hint }, `${t('statusErrors')}: ${bot.lastError || '—'}`)),
            h('div', { style: S.linkRow },
              h('span', { style: S.hint }, `${t('statusSearch')}: ${bot.tools?.webSearch ? t('statusOn') : t('statusOff')}`),
              h('span', { style: S.hint }, `${t('statusAi')}: ${bot.aiEnabled ? t('statusOn') : t('statusOff')}`)),
            h('span', { style: S.hint }, t('statusRuntimeHint'))),
        ),
        data?.web ? h('span', { style: S.hint }, data.web.hint ?? '') : null,
        error ? h('span', { style: S.error }, error) : null)
    }

    /** 对话巡检：最近事件 + 聊天记录尾巴。 */
    function InspectCard ({ t }) {
      const [data, setData] = React.useState(null)
      const [chats, setChats] = React.useState([])
      const [chat, setChat] = React.useState('')
      const [tail, setTail] = React.useState(null)
      const [error, setError] = React.useState('')

      const load = React.useCallback(async () => {
        try {
          const response = await fetch('/qqbot-inspect?limit=60', { credentials: 'same-origin' })
          if (!response.ok) throw new Error(`HTTP ${response.status}`)
          setData(await response.json())
          setError('')
        } catch (cause) {
          setError(cause instanceof Error ? cause.message : String(cause))
        }
      }, [])

      const loadChats = React.useCallback(async () => {
        try {
          const response = await fetch('/qqbot-files/chats', { credentials: 'same-origin' })
          const body = await response.json()
          setChats(Array.isArray(body.items) ? body.items : [])
        } catch { /* 忽略 */ }
      }, [])

      React.useEffect(() => { load(); loadChats() }, [load, loadChats])

      const loadTail = async () => {
        if (!chat) return
        try {
          const response = await fetch(`/qqbot-files/chat/tail?chat=${encodeURIComponent(chat)}&limit=20`, { credentials: 'same-origin' })
          setTail(await response.json())
        } catch (cause) {
          setTail({ ok: false, error: String(cause) })
        }
      }

      const kindLabel = (kind) => ({
        message: t('inspectMessage'),
        reply: t('inspectReply'),
        skip: t('inspectSkip'),
        error: t('inspectError'),
        command: t('inspectCommand'),
      }[kind] ?? kind)

      const kindColor = (kind) => ({
        message: '#667085', reply: '#12b76a', skip: '#f79009', error: '#f04438', command: '#2b6cb0',
      }[kind] ?? '#667085')

      const events = data?.events ?? []
      return h('div', { style: S.card },
        h('div', { style: S.cardHead },
          h('span', { style: S.cardTitle }, t('inspectTitle')),
          h('button', { type: 'button', style: S.buttonGhost, onClick: () => { load(); loadChats() } }, t('refresh'))),
        h('span', { style: S.hint }, t('inspectHint')),
        h('div', { style: S.actions },
          h('button', { type: 'button', style: S.buttonGhost, onClick: load }, t('refresh'))),
        events.length === 0
          ? h('span', { style: S.hint }, t('inspectEmpty'))
          : h('ul', { style: S.list }, events.slice(0, 40).map((event, index) => h('li', { key: index, style: S.listRow },
            h('span', { style: { ...S.hint, fontFamily: 'ui-monospace, monospace' } }, new Date(event.ts).toLocaleTimeString()),
            h('span', { style: { ...S.hint, color: kindColor(event.kind) } }, kindLabel(event.kind)),
            h('span', { style: S.rowLabel }, event.bot),
            h('span', { style: S.hint }, event.chat),
            h('span', { style: S.hint }, event.kind === 'skip' || event.kind === 'error' ? event.reason : event.preview),
            event.ms ? h('span', { style: S.hint }, `${Math.round(event.ms / 100) / 10}s`) : null))),
        h('div', { style: S.actions },
          h('span', { style: S.hint }, t('inspectChats')),
          h('select', {
            value: chat,
            style: S.input,
            onChange: (event) => { setChat(event.target.value); setTail(null) },
          }, [h('option', { key: '', value: '' }, t('inspectSelectChat'))].concat(
            chats.slice(0, 60).map(item => h('option', { key: item.name, value: item.name },
              `${item.name} · ${item.entries} · ${item.lastNickname ? item.lastNickname + ': ' : ''}${String(item.lastMessage ?? '').slice(0, 40)}`)))),
          h('button', { type: 'button', style: S.buttonGhost, onClick: loadTail }, t('inspectLoadTail'))),
        tail
          ? h('pre', { style: S.pre }, tail.ok
            ? (tail.entries ?? []).map(entry => `[${entry.time}] ${entry.nickname}: ${entry.message}`).join('\n')
            : String(tail.error))
          : null,
        error ? h('span', { style: S.error }, error) : null)
    }

    /** 关键词规则编辑。 */
    function RulesCard (props) {
      const { t, rules, onChange } = props
      const update = (index, patch) => {
        const next = rules.slice()
        next[index] = { ...next[index], ...patch }
        onChange(next)
      }
      const remove = (index) => onChange(rules.filter((_, i) => i !== index))
      const add = () => onChange(rules.concat([{ enabled: true, pattern: '', mode: 'contains', reply: '', bots: [] }]))

      const rows = rules.map((rule, index) => h('div', { key: index, style: S.card },
        h('div', { style: S.cardHead },
          h('label', { style: S.checkRow },
            h('input', {
              type: 'checkbox',
              checked: rule.enabled !== false,
              onChange: (event) => update(index, { enabled: event.target.checked }),
            }),
            h('span', { style: S.rowLabel }, '#' + (index + 1))),
          h('button', { type: 'button', style: S.buttonDanger, onClick: () => remove(index) }, t('remove'))),
        h('div', { style: S.grid2 },
          h(Field, { label: t('rulesPattern') },
            h(TextInput, { value: rule.pattern, onChange: (v) => update(index, { pattern: v }) })),
          h(Field, { label: t('rulesMode') },
            h('select', {
              value: rule.mode,
              style: S.input,
              onChange: (event) => update(index, { mode: event.target.value }),
            },
            h('option', { value: 'contains' }, t('rulesModeContains')),
            h('option', { value: 'exact' }, t('rulesModeExact')),
            h('option', { value: 'regex' }, t('rulesModeRegex'))))),
        h(Field, { label: t('rulesReply') },
          h(TextInput, { value: rule.reply, onChange: (v) => update(index, { reply: v }) }))))

      return h('div', { style: S.card },
        h('div', { style: S.cardHead }, h('span', { style: S.cardTitle }, t('rulesTitle'))),
        h('span', { style: S.hint }, t('rulesHint')),
        rules.length === 0 ? h('span', { style: S.hint }, t('rulesEmpty')) : null,
        ...rows,
        h('button', { type: 'button', style: S.buttonGhost, onClick: add }, t('rulesAdd')))
    }

    /** 定时消息编辑。 */
    function SchedulesCard (props) {
      const { t, schedules, onChange } = props
      const update = (index, patch) => {
        const next = schedules.slice()
        next[index] = { ...next[index], ...patch }
        onChange(next)
      }
      const remove = (index) => onChange(schedules.filter((_, i) => i !== index))
      const add = () => onChange(schedules.concat([{ id: '', enabled: true, label: '', at: '08:00', days: [], bot: '', chat: '', text: '' }]))

      const rows = schedules.map((item, index) => h('div', { key: index, style: S.card },
        h('div', { style: S.cardHead },
          h('label', { style: S.checkRow },
            h('input', {
              type: 'checkbox',
              checked: item.enabled !== false,
              onChange: (event) => update(index, { enabled: event.target.checked }),
            }),
            h('span', { style: S.rowLabel }, item.label || '#' + (index + 1))),
          h('button', { type: 'button', style: S.buttonDanger, onClick: () => remove(index) }, t('remove'))),
        h('div', { style: S.grid2 },
          h(Field, { label: t('schedAt') },
            h(TextInput, { value: item.at, placeholder: '08:00', onChange: (v) => update(index, { at: v.trim() }) })),
          h(Field, { label: t('schedDays') },
            h(TextInput, {
              value: item.days.join(', '),
              placeholder: '1, 3, 5',
              onChange: (v) => update(index, { days: v.split(/[,，\s]+/).map(Number).filter((n) => n >= 1 && n <= 7) }),
            }))),
        h('div', { style: S.grid2 },
          h(Field, { label: t('schedBot') },
            h(TextInput, { value: item.bot, onChange: (v) => update(index, { bot: v.trim() }) })),
          h(Field, { label: t('schedChat') },
            h(TextInput, { value: item.chat, placeholder: 'group:123456', onChange: (v) => update(index, { chat: v.trim() }) }))),
        h('div', { style: S.grid2 },
          h(Field, { label: t('schedLabel') },
            h(TextInput, { value: item.label, onChange: (v) => update(index, { label: v }) })),
          h(Field, { label: t('schedText') },
            h(TextInput, { value: item.text, placeholder: '早上好呀～', onChange: (v) => update(index, { text: v }) })))))

      return h('div', { style: S.card },
        h('div', { style: S.cardHead }, h('span', { style: S.cardTitle }, t('schedTitle'))),
        h('span', { style: S.hint }, t('schedHint')),
        schedules.length === 0 ? h('span', { style: S.hint }, t('schedEmpty')) : null,
        ...rows,
        h('button', { type: 'button', style: S.buttonGhost, onClick: add }, t('schedAdd')))
    }

    /** 长期记忆：一行一条摘要。 */
    function MemoryCard ({ t }) {
      const [items, setItems] = React.useState([])
      const [name, setName] = React.useState('')
      const [text, setText] = React.useState('')
      const [state, setState] = React.useState('idle')
      const [error, setError] = React.useState('')

      const load = React.useCallback(async () => {
        try {
          const response = await fetch('/qqbot-files/memory/list', { credentials: 'same-origin' })
          const body = await response.json()
          setItems(Array.isArray(body.items) ? body.items : [])
        } catch (cause) {
          setError(cause instanceof Error ? cause.message : String(cause))
        }
      }, [])

      React.useEffect(() => { load() }, [load])

      const open = async (target) => {
        setName(target)
        setState('idle')
        try {
          const response = await fetch(`/qqbot-files/memory/read?name=${encodeURIComponent(target)}`, { credentials: 'same-origin' })
          const body = await response.json()
          setText(body.ok ? body.text : '')
          if (!body.ok) setError(body.error ?? '读取失败')
        } catch (cause) {
          setError(cause instanceof Error ? cause.message : String(cause))
        }
      }

      const save = async () => {
        setState('saving')
        try {
          const response = await fetch('/qqbot-files/memory/save', {
            method: 'POST',
            credentials: 'same-origin',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ name, text }),
          })
          const body = await response.json()
          setState(body.ok ? 'saved' : 'failed')
          if (!body.ok) setError(body.error ?? '保存失败')
          await load()
        } catch (cause) {
          setState('failed')
          setError(cause instanceof Error ? cause.message : String(cause))
        }
      }

      const remove = async () => {
        if (!name || !window.confirm(t('memoryConfirmDelete', { name }))) return
        try {
          await fetch('/qqbot-files/memory/delete', {
            method: 'POST',
            credentials: 'same-origin',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ name }),
          })
          setName('')
          setText('')
          await load()
        } catch (cause) {
          setError(cause instanceof Error ? cause.message : String(cause))
        }
      }

      return h('div', { style: S.card },
        h('div', { style: S.cardHead },
          h('span', { style: S.cardTitle }, t('memoryTitle')),
          h('button', { type: 'button', style: S.buttonGhost, onClick: load }, t('refresh'))),
        h('span', { style: S.hint }, t('memoryHint')),
        items.length === 0
          ? h('span', { style: S.hint }, t('memoryEmpty'))
          : h('ul', { style: S.list }, items.map(item => h('li', { key: item.name, style: S.listRow },
            h('button', { type: 'button', style: S.buttonGhost, onClick: () => open(item.name) }, item.name),
            h('span', { style: S.hint }, t('memoryEntries', { n: String(item.entries) })),
            h('span', { style: S.hint }, String(item.preview ?? '').slice(0, 60))))),
        name
          ? h('div', { style: S.row },
            h('span', { style: S.rowLabel }, name),
            h('textarea', {
              style: { ...S.input, minHeight: '120px', fontFamily: 'ui-monospace, monospace' },
              value: text,
              placeholder: t('memoryPlaceholder'),
              onChange: (event) => { setText(event.target.value); setState('idle') },
            }),
            h('div', { style: S.actions },
              h('button', { type: 'button', style: S.button, onClick: save, disabled: state === 'saving' }, state === 'saving' ? t('saving') : t('memorySave')),
              h('button', { type: 'button', style: S.buttonDanger, onClick: remove }, t('memoryDelete')),
              state === 'saved' ? h('span', { style: S.status }, t('memorySaved')) : null,
              state === 'failed' ? h('span', { style: S.error }, error) : null))
          : null,
        error && state !== 'failed' ? h('span', { style: S.error }, error) : null)
    }

    /** 多模态端点配置（ASR / TTS / 生图）。 */
    function MediaCard ({ t, media, onChange }) {
      const patchOne = (key, fields) => onChange({ ...media, [key]: { ...media[key], ...fields } })
      const endpoint = (key, title, extra) => {
        const item = media[key] ?? {}
        return h('div', { style: S.card },
          h('div', { style: S.cardHead },
            h('span', { style: S.rowLabel }, title),
            h('label', { style: S.checkRow },
              h('input', {
                type: 'checkbox',
                checked: item.enabled === true,
                onChange: (event) => patchOne(key, { enabled: event.target.checked }),
              }),
              h('span', { style: S.hint }, t('mediaEnable')),
              h('span', { style: item.enabled && (item.apiKey || item.apiKeyEnv) && item.model ? S.hintInline : S.error },
                item.enabled && (item.apiKey || item.apiKeyEnv) && item.model ? t('mediaConfigured') : t('mediaNotConfigured')))),
          h('div', { style: S.grid2 },
            h(Field, { label: t('mediaBaseURL') },
              h(TextInput, { value: item.baseURL, placeholder: 'https://api.siliconflow.cn/v1', onChange: (v) => patchOne(key, { baseURL: v.trim() }) })),
            h(Field, { label: t('mediaModel') },
              h(TextInput, { value: item.model, onChange: (v) => patchOne(key, { model: v.trim() }) }))),
          h('div', { style: S.grid2 },
            h(Field, { label: t('mediaApiKey') },
              h(TextInput, { value: item.apiKey, placeholder: 'sk-…', onChange: (v) => patchOne(key, { apiKey: v.trim() }) })),
            h(Field, { label: t('mediaApiKeyEnv') },
              h(TextInput, { value: item.apiKeyEnv, placeholder: 'SILICONFLOW_API_KEY', onChange: (v) => patchOne(key, { apiKeyEnv: v.trim() }) }))),
          h(ModelPicker, {
            t,
            baseURL: item.baseURL,
            apiKey: item.apiKey,
            apiKeyEnv: item.apiKeyEnv,
            value: item.model,
            onPick: (model) => patchOne(key, { model }),
          }),
          extra ? extra(item, key) : null)
      }

      return h('div', { style: S.card },
        h('div', { style: S.cardHead }, h('span', { style: S.cardTitle }, t('mediaTitle'))),
        h('span', { style: S.hint }, t('mediaHint')),
        endpoint('tts', t('mediaTts'), (item, key) => h('div', { style: S.grid2 },
          h(Field, { label: t('mediaVoice') },
            h(TextInput, { value: item.voice, onChange: (v) => patchOne(key, { voice: v.trim() }) })),
          h(Field, { label: t('mediaVoice') + ' / format' },
            h(TextInput, { value: item.format, onChange: (v) => patchOne(key, { format: v.trim() }) })))),
        endpoint('image', t('mediaImage'), (item, key) => h('div', { style: S.grid2 },
          h(Field, { label: t('mediaSize') },
            h(TextInput, { value: item.size, placeholder: '1024x1024', onChange: (v) => patchOne(key, { size: v.trim() }) })),
          h(Field, { label: 'steps' },
            h(TextInput, { value: String(item.steps), type: 'number', onChange: (v) => patchOne(key, { steps: Math.max(1, Number(v) || 20) }) })))))
    }

    // ==================== 插件 ====================

    function apply (ctx) {
      const t = ctx.locale.bind(NS)
      console.info('[qq-bot] 客户端半侧已挂载：注册「设置 → QQ 机器人」与插件页配置入口')
      ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'qq-bot: dictionaries')

      // 入口 1：插件页里 qq-bot 行的「配置」（plugin-manager 的 plugins.row.config 槽）。
      const registerSafely = (label, register) => {
        try {
          return register()
        } catch (error) {
          console.error(`[qq-bot] ${label} 注册失败:`, error)
          return () => {}
        }
      }

      ctx.effect(
        () => ctx.slots.inject('plugins.row.config', () => registerSafely(
          'plugins.row.config',
          () => ctx.slots.register({
            name: 'plugins.row.config',
            key: ROW_KEY,
            locale: NS,
          }, guarded((props) => h(RowConfigPage, { ...props, t }))),
        )),
        'qq-bot: row config page',
      )

      // 入口 2：设置侧栏顶层的「QQ 机器人」分区（settings.section 槽），
      // 表单自行绑定 qq-bot 这个设置命名空间，不依赖插件页。
      const boundForm = () => {
        try {
          return ctx.configForms.get('qq-bot')
        } catch (error) {
          console.error('qq-bot: 无法绑定配置表单', error)
          return undefined
        }
      }
      ctx.effect(
        () => ctx.slots.inject('settings.section', () => {
          try {
            const ids = ctx.slots.entries('settings.section').map(entry => entry.options.id)
            console.info('[qq-bot] settings.section 现有条目:', ids.join(', ') || '(空)')
          } catch (error) {
            console.info('[qq-bot] 读取 settings.section 失败:', error)
          }
          return registerSafely(
            'settings.section',
            () => ctx.slots.register({
              name: 'settings.section',
              id: 'qq-bot',
              order: 55,
              label: () => {
                try {
                  return t('title')
                } catch {
                  return 'QQ 机器人'
                }
              },
              locale: NS,
            }, guarded((props) => h(RowConfigPage, { ...props, t, form: props.form ?? boundForm() }))),
          )
        }),
        'qq-bot: settings section',
      )

      // 入口 3：插件页里 dsh-qq-bot 的包详情页（plugins.detail.section 槽）。
      ctx.effect(
        () => ctx.slots.inject('plugins.detail.section', () => registerSafely(
          'plugins.detail.section',
          () => ctx.slots.register({
            name: 'plugins.detail.section',
            id: 'qq-bot',
            order: 60,
            locale: NS,
          }, guarded((props) => h(PackageConfigSection, { ...props, t, boundForm }))),
        )),
        'qq-bot: package detail section',
      )
    }

    exports.apply = apply
    exports.inject = ['slots', 'locale', 'configForms']
    return module.exports
  },
})
