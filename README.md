# DSH Agent RP

把 SillyTavern 角色卡、预设和聊天记录带进 DSH，在原生会话里继续一段角色对话。

这是一个面向下一代 Agent RP 的公开预览版。现在已经可以从角色库选择角色，设置开场和 Persona，并在 DSH 会话中使用角色卡、世界书、预设、轻前端与持久记忆。欢迎带着自己有权使用的卡片来体验，也欢迎一起补全不同卡片生态的兼容性。

## 现在可以体验什么

- 导入 Character Card V1/V2/V3：PNG、JSON 与 CHARX。
- 保存角色到可视化角色库，收起或恢复角色，不影响已有对话。
- 选择默认或备选开场，并为玩家选择可复用 Persona。
- 导入 SillyTavern JSONL 聊天记录，或与对应角色卡一起迁移。
- 使用角色世界书，并在开聊表单直接导入社区推荐的 SillyTavern Chat Completion 预设；独立 World Info 也可导入会话。世界书正则关键词在受限 QuickJS 运行时中匹配，不会交给 Host JavaScript 执行。
- 在隔离的 QuickJS 环境中运行世界书、角色提示和预设里的同步 EJS 模板；单条模板或正则失败不会中断会话。
- 在隔离脚本环境中运行兼容的 Tavern Helper 脚本、显示正则、轻量 HTML 界面与 MVU 状态。
- 重写、续写和切换回复版本，并保留明确的长期记忆。
- 在沉浸视图与调试视图之间切换，检查实际生效的提示内容。

角色本身就是顶层 Agent。这里没有额外的旁白、协调器或 Character 子代理，角色对话直接发生在普通会话中。

## 安装

需要已经公开发布的 DSH，以及 Node.js 和 pnpm。无需克隆仓库，直接从公开仓库安装：

```powershell
npx -p @deepseek-ai/dsh@latest dsh plugin --profile web add github:hewzhew/dsh-agent-rp#main
npx -p @deepseek-ai/dsh@latest dsh --profile web
```

以后更新插件时运行：

```powershell
npx -p @deepseek-ai/dsh@latest dsh plugin --profile web update @dsh-external/dsh-agent-rp
```

这种安装方式不会依赖某个长期留在原位的本地克隆目录。贡献者需要修改源码时，才应克隆仓库并在仓库根目录运行 `pnpm install`、`pnpm run build` 与 `dsh plugin --profile web add .`。

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
2. 点击输入框下方的「选择角色」。
3. 选择已有角色，或导入 PNG、JSON、CHARX 角色卡。
4. 选择开场与 Persona，然后点击「开始对话」。
5. 进入会话后，可在标题栏打开角色信息、角色库、预设、世界书或调试视图。

导入后的预设可在角色库开聊表单或会话的“预设库”中改名。开始对话后，“会话设置 → 预设”可以调整提示模块与预设正则的开关；修改只属于当前会话。

无需预先选择某个 Agent 预设；从空白的标准会话选择角色时，插件会自动进入角色会话。已经有聊天内容的普通会话不会被修改。

要迁移旧聊天，可在角色会话中附加一份 SillyTavern JSONL；将对应角色卡和 JSONL 放在同一条消息中，可以一次迁移角色身份与历史记录。导入会创建新的角色对话，不会修改源文件或来源会话。

## 目前的范围

这个里程碑聚焦单角色 RP、SillyTavern 迁移与轻前端卡片。群聊、多人互动和重前端/独立前端尚未纳入当前兼容范围。需要脚本或远程 HTML 的应用型开场不会在角色库预览里后台启动；进入对话前后都可查看卡片声明的 HTTPS 来源，并由玩家逐项允许。可执行卡片 HTML 会在没有同源权限的沙箱 iframe 中运行；Tavern Helper 脚本只能加载内置或玩家明确批准来源的 HTTPS 模块，不能直接访问 Host 页面、文件或进程；EJS 与世界书正则在独立 QuickJS/WASM 运行时中执行，不会获得 Host 的文件、网络、进程或模块接口。

更具体的格式支持与降级方式见 [SillyTavern 兼容说明](docs/sillytavern-compatibility.md)。

需要比较大型卡片改动时，可运行不含社区卡片内容的 [合成兼容基准](docs/compatibility-benchmark.md)。EJS 的可执行与保留范围见 [EJS 兼容表](docs/ejs-compatibility.md)。

## 反馈与贡献

如果一张卡片的纯文本部分、世界书、预设或轻前端在 DSH 中表现不对，欢迎提交 Issue。请说明卡片格式、预期表现、实际表现与最小复现步骤；不要上传无权公开的角色卡、私有社区内容、Token 或完整 Session Log。

代码、兼容样本、交互设计和文档改进都欢迎。开始前请阅读 [贡献指南](CONTRIBUTING.md)。

本项目采用 [MIT License](LICENSE)。
