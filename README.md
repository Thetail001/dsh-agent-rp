# DSH Agent RP

DSH Agent RP 是运行在 DSH 上的原生角色扮演 Runtime。角色会直接作为顶层 Agent 行动；Persona、世界、提示策略、状态和记忆都是可以独立选择、复用与组合的一等资源，而不是某张角色卡的附属设置。

Character Card、Chat Completion 预设、World Info、MVU、EJS 和 Tavern Helper 是目前优先接入的内容格式。它们让已有创作可以进入这套 Runtime，但不会反过来定义它的能力边界。

## 现在可以体验什么

- 从统一的「开始游玩」入口选择角色对话或世界场景，再组合 Persona、世界、提示策略与开场；已知的外部资源权限会在启动前一次处理。
- 导入 PNG、JSON、CHARX 角色卡，以及 World Info、Chat Completion 预设和 SillyTavern JSONL 聊天记录；角色、Persona、世界与预设可以分别保存和复用。
- 连续游玩一段可回溯的故事：重新生成、续写、切换回复版本、修改输入并创建分支，同时保存明确状态与长期记忆。
- 运行更复杂的社区内容：MVU、同步 EJS、世界书正则、显示正则、轻量 HTML 前端及一部分 Tavern Helper 脚本会进入各自受限的兼容环境，单项失败不会拖垮整段会话。
- 在沉浸视图与调试视图之间切换，查看实际生效的提示、世界召回、状态和运行诊断。

角色本身就是顶层 Agent。这里没有额外的旁白、协调器或 Character 子代理，角色对话直接发生在普通会话中。

## 安装

需要 Node.js 22.19+ 或 24+，以及 pnpm 11。没有 pnpm 时可以先运行 `npm install --global pnpm@11`。无需克隆仓库，桌面端统一使用 pnpm 安装与启动：

```powershell
pnpm dlx --reporter append-only '@deepseek-ai/dsh@latest' plugin --profile web add 'github:hewzhew/dsh-agent-rp#main'
pnpm dlx --reporter append-only '@deepseek-ai/dsh@latest' --profile web
```

以后更新插件时运行：

```powershell
pnpm dlx --reporter append-only '@deepseek-ai/dsh@latest' plugin --profile web update '@dsh-external/dsh-agent-rp'
```

`--reporter append-only` 会持续保留下载与安装阶段，不会只剩一个难以判断的旋转符号。这种安装方式也不会依赖某个长期留在原位的本地克隆目录。贡献者需要修改源码时，才应克隆仓库并在仓库根目录运行 `pnpm install`、`pnpm run build` 与 `dsh plugin --profile web add .`。

Windows 也提供带环境检查、阶段提示、安装后验证和重复更新判断的安装器。它会保留 `~\.dsh` 中已有的角色与会话，不会静默安装全局工具：

```powershell
$installerPath = Join-Path $env:TEMP 'install-dsh-agent-rp.ps1'
Invoke-WebRequest 'https://raw.githubusercontent.com/hewzhew/dsh-agent-rp/main/scripts/install-windows.ps1' -OutFile $installerPath
powershell -NoProfile -ExecutionPolicy Bypass -File $installerPath -Start
```

国内 npm registry 较慢时，可在最后一行加 `-ChinaMirror`。这个选项只改变本次安装使用的 npm registry；如果进度已经进入「安装 Agent RP」后卡住，访问的是 GitHub，切换 npm 镜像并不能解决那一段网络问题。

早期安装器写入的版本不会自动迁移。若启动错误中出现 `.dsh\plugins\dsh-agent-rp`，请先把该目录移出 `plugins` 目录作备份，确认 DSH 能启动后，再按上面的 profile 命令安装。不要删除整个 `.dsh`，会话数据与旧插件目录不是一回事。

如果你正在参与 DSH 内测并使用指定 RC 版本，请把上面两处 `@latest` 换成对应版本；不要在 Issue 或日志里公开自己的 NPM Token。

### Android / Termux 预览

ARM64、Android 11 及以上设备可以在 Termux 本机运行，不需要让电脑保持开机。安装器会准备 DSH 的安卓原生依赖、图片解码后备模块、Agent RP 插件与启动命令；首次安装需要编译原生模块，会比普通插件更新慢。

手机安装器默认使用已经验证的 DSH `0.1.0-rc.6`，不会在上游发布新版本时未经验证地自动换底座。

```bash
curl -fsSL https://raw.githubusercontent.com/hewzhew/dsh-agent-rp/main/scripts/install-termux.sh | bash
dsh-agent-rp --port 3080
```

若启动或导入角色卡时遇到问题，运行 `dsh-agent-rp-doctor` 即可得到一份可直接贴到 Issue 的脱敏体检结果。它只检查版本、模块和 Android 文件系统能力，不读取令牌、角色卡或会话内容。

随后在同一部手机的浏览器打开 `http://127.0.0.1:3080`。重新运行安装命令即可更新；角色卡和会话位于 `~/.dsh`，安装器不会删除它们。当前路线只承诺角色聊天所需能力，不把老设备上的 bash 沙箱或编码 Agent 计入手机预览范围。

需要长时间把页面留在后台时，可以先在 Termux 运行 `termux-wake-lock`，结束后运行 `termux-wake-unlock`，避免系统过早挂起本地服务；这不会绕过 Android 的电池优化设置。

页面正常打开后，可以在 Chrome 或 Edge 的菜单中选择“添加到主屏幕”或“安装应用”。DSH 已提供全屏 Web App 清单，图标启动后仍会连接 Termux 中的本地服务；重启手机后需要先重新运行 `dsh-agent-rp --port 3080`。

## 第一次开聊

1. 在 DSH 中新建空白会话。
2. 打开 Agent RP，选择「开始游玩」。
3. 选择「角色对话」或「世界场景」。
4. 组合角色或场景、Persona、世界与提示策略；角色模式还可以选择开场白。
5. 启动前检查已知权限，然后进入游玩。会话中仍可打开资源库、设置与调试视图。

导入后的角色、Persona、世界和预设会分别进入资源库。开始游玩后，“会话设置 → 预设”可以调整提示模块与预设正则的开关；修改只属于当前会话。

无需预先选择某个 Agent 预设；从空白的标准会话选择角色时，插件会自动进入角色会话。已经有聊天内容的普通会话不会被修改。

要迁移旧聊天，可在角色会话中附加一份 SillyTavern JSONL；将对应角色卡和 JSONL 放在同一条消息中，可以一次迁移角色身份与历史记录。导入会创建新的角色对话，不会修改源文件或来源会话。

## 外部生图工具与 Comfy Cloud MCP

角色 Agent 可以发现 DSH 已经配置的外部工具；Agent RP 不绑定某个生图服务，而是提供固定工具指导区和 `publish_roleplay_image` 发布工具。外部 MCP 负责生成和轮询；捆绑预设只为 Agent RP 启用受 DSH 沙箱与审批控制的 `pwsh`，用于执行 MCP 已经准备好的下载命令。发布工具只接受同一回合内工具直接返回的标准图片，或当前 Session 工作区中已经下载完成的本地图片，并把图片绑定到该回合的最终角色回复。

在 DSH WebUI 的“设置 → Agent RP → Agent 工具与生图策略”中可以控制总开关、框架工具说明、Agent RP 图片发布、三档自动生图策略，以及增删自定义 MCP 工具提示词。设置保存后会从下一次模型请求开始生效，当前角色会话无需重启。默认已经提供 Comfy Cloud Saved Workflow 模板，流程是：

1. 用 `get_saved_workflow` 读取 `image_z_image_turbo` 实际暴露的 `customizable_inputs`；找不到时再用 `list_saved_workflows` 取得精确文件名。
2. 只覆盖工具明确暴露的输入，再调用 `run_saved_workflow`；不猜参数名、节点 ID 或 slot。
3. 按工具真实返回值调用 `wait_for_job` 和 `get_output`。
4. `get_output` 返回下载命令时，使用可用的终端工具原样执行，不改写临时签名 URL。
5. 将命令实际下载出的工作区文件路径传给 `publish_roleplay_image`。

Comfy Cloud 的远程 MCP 地址是 `https://cloud.comfy.org/mcp`。默认工作流是 `image_z_image_turbo`；工作流输入始终以 MCP 当时暴露的 schema 为准，不确定时保留工作流默认值。认证与工具语义以[官方 MCP 文档](https://docs.comfy.org/agent-tools/mcp)为准。

页面中的总开关控制整个固定指导区和 Agent RP 发布工具；“框架工具说明”控制记忆/导入等内置说明；“Agent RP 图片发布”控制 `publish_roleplay_image`；自动生图策略可禁止、交由 Agent 判断，或要求每个普通 RP 回合尝试一次。自定义条目始终追加在角色卡或导入预设之后，因此不会被导入的系统提示覆盖。部署者仍可在 `preset/agent.cordis.yml` 中提供 `toolGuidance` 的启动默认值，但 WebUI 保存的设置是运行时配置来源。

## 目前的范围

这个里程碑优先完成可靠的单角色与世界场景闭环，而不是按功能数量追赶另一套前端。群聊、多人互动、多 Agent 编排和重前端/独立前端还没有完成。

需要脚本或远程 HTML 的内容会在启动前检查已知的脚本、样式、字体、图片、媒体、嵌入页与数据连接，并把许可限制在对应角色、预设、脚本和来源；动态出现的新能力仍会在实际触发时确认。可执行 HTML、Tavern Helper、EJS 与世界书正则运行在不同的受限环境中，不会获得 DSH Host 的文件、进程、凭据或页面 DOM。兼容层仍在依据真实内容补全，但新增能力会优先沉淀为可复用接口，不按单张卡片堆特例。

需要 OAuth 或其他回执的外部登录不会给角色卡 iframe 增加弹窗、同源或顶层导航权限。轻前端或 Tavern Helper 脚本发起绝对 HTTPS 窗口请求后，DSH 会展示目标站点；玩家确认后通过独立中转窗口打开登录页，只把有界的登录回执送回发起请求的隔离运行时。中转界面会区分“回执通过安全检查”和“请求运行时已确认接收”，成功后只提供关闭操作，不会继续诱导重复登录。要求 Discord 身份、论坛会员或角色组资格的服务必须继续使用原有第三方 OAuth 与服务端授权判断；DSH 不会以本机身份替代、增加第二登录方式或自动回退。

不依赖既有第三方账号资格的开放服务可以选择接入 DSH 本机身份。玩家在 Agent RP 设置中创建身份后，已接入的轻前端、Tavern Helper 脚本或它们嵌入的 HTTPS 页面可请求一份五分钟有效、绑定目标来源、服务 nonce 和当前卡片或脚本身份的 ES256 证明；显示名称需要单独授权，私钥始终由 Host 保管。这项能力不是 Discord 或其他第三方 OAuth 的替代凭据。协议与接入限制见 [安全扩展能力协议](docs/extension-capabilities.md#host-原生身份)。

更具体的格式支持与降级方式见 [SillyTavern 兼容说明](docs/sillytavern-compatibility.md)。

需要比较大型卡片改动时，可运行不含社区卡片内容的 [合成兼容基准与本地真实卡、预设验收流程](docs/compatibility-benchmark.md)。EJS 的可执行与保留范围见 [EJS 兼容表](docs/ejs-compatibility.md)；后续世界书与插件生态遵循 [安全扩展能力协议](docs/extension-capabilities.md)。

## 反馈与贡献

如果一张卡片的纯文本部分、世界书、预设或轻前端在 DSH 中表现不对，欢迎提交 Issue。请说明卡片格式、预期表现、实际表现与最小复现步骤；不要上传无权公开的角色卡、私有社区内容、Token 或完整 Session Log。

代码、兼容样本、交互设计和文档改进都欢迎。开始前请阅读 [贡献指南](CONTRIBUTING.md)。

本项目采用 [MIT License](LICENSE)。
