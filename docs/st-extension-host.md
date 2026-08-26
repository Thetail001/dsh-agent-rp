# SillyTavern 扩展宿主

本文约束“已安装的 SillyTavern 第三方扩展”在 Agent RP 中的宿主生命周期。它不描述角色卡或预设携带的 Tavern Helper 脚本；后者继续由现有的逐脚本 iframe 运行时承载。

当前功能分支已提供浏览器注册表、单例 document、版本化客户端注册服务、独立设置持久化、当前 Session 重新绑定和生成前提示写入。安装型宿主从 DSH Session 列表的 `agentRp` 投影生成页面快照，同一 Session 的投影更新也会同步到共享 document；当前页面接口包括只读 `SillyTavern.getContext()` 数据、本地事件源、页面级设置保存方法、真实追加消息对应的 `MESSAGE_SENT` 和 `MESSAGE_RECEIVED`，以及 `setExtensionPrompt()`、`extension_prompts`、`extension_prompt_types` 和 `extension_prompt_roles`。改写或切换 Session 只建立新基线，不会把已有历史重新发成新消息。每个自包含 ESM bundle 在共享 document 中只导入一次，热注册和撤销会合并为一次完整重建；当前 Session 切换发送 `dsh-agent-rp-session-change` 浏览器事件，不会重新导入扩展。这层装配仍不是完整 ST 页面实现，因此不能宣称支持任意 ST 第三方扩展。社区插件也不能通过向每个 Tavern Helper iframe 拼接相同源码来模拟页面级扩展加载。

## 上游生命周期

本节以 SillyTavern `release` 的提交 [`8172dcd`](https://github.com/SillyTavern/SillyTavern/tree/8172dcd0ee672d3cd9a5e5f7af134f91a45cd2b8) 为依据：

- [`activeExtensions`](https://github.com/SillyTavern/SillyTavern/blob/8172dcd0ee672d3cd9a5e5f7af134f91a45cd2b8/public/scripts/extensions.js#L36-L46) 是页面级集合；[`activateExtensions()`](https://github.com/SillyTavern/SillyTavern/blob/8172dcd0ee672d3cd9a5e5f7af134f91a45cd2b8/public/scripts/extensions.js#L564-L585) 按 manifest 顺序激活尚未加载的扩展。
- [`addExtensionScript()`](https://github.com/SillyTavern/SillyTavern/blob/8172dcd0ee672d3cd9a5e5f7af134f91a45cd2b8/public/scripts/extensions.js#L809-L841) 向主 document 添加具有唯一 id 的 module script，同一个扩展不会随角色卡脚本数量重复加载。
- [`extension_settings`](https://github.com/SillyTavern/SillyTavern/blob/8172dcd0ee672d3cd9a5e5f7af134f91a45cd2b8/public/scripts/extensions.js#L141-L176) 是页面级设置对象；[`loadExtensionSettings()`](https://github.com/SillyTavern/SillyTavern/blob/8172dcd0ee672d3cd9a5e5f7af134f91a45cd2b8/public/scripts/extensions.js#L1779-L1808) 发现 manifest、恢复设置并启动扩展。
- 主页面只声明一组 [`#extensions_settings`](https://github.com/SillyTavern/SillyTavern/blob/8172dcd0ee672d3cd9a5e5f7af134f91a45cd2b8/public/index.html#L5760-L5777) 与 [`#extensions_settings2`](https://github.com/SillyTavern/SillyTavern/blob/8172dcd0ee672d3cd9a5e5f7af134f91a45cd2b8/public/index.html#L5778-L5795) 设置容器。

因此，Agent RP 的安装型 ST 扩展宿主必须在一个浏览器 ClientContext 中保持单例。它可以显式切换当前绑定的 DSH Session，但不能为每个 global、preset 或 character Tavern Helper 脚本创建一份扩展实例。

## 与 Tavern Helper 帧分离

现有 `TavernScriptRuntime` 为每个 global、preset 或 character 脚本创建独立 iframe，并按角色、预设、脚本作用域和脚本标识保存变量、设置、许可与错误。这个隔离单位适合角色卡和预设内容，也允许同名脚本互不覆盖。

安装型 ST 扩展属于 DSH 插件安装，不属于角色卡或预设脚本树。它需要独立的稳定扩展标识、manifest 顺序、启用状态、设置存储和运行错误；切换角色、预设或会话不能复制扩展设置，也不能改变扩展的安装身份。页面快照不包含任何角色卡脚本的私有变量、状态面板或授权来源。扩展生成的模型可见输入和持久会话改动仍必须通过现有 Host 能力写入 Session，不能只保存在浏览器 iframe 中；对应能力完成前不应暴露会等待响应的写 API。

每脚本 iframe 可以继续提供 Tavern Helper API 兼容垫片和该脚本自己的设置界面，但不得加载安装型扩展 bundle，也不得为同一个已安装扩展创建重复的 `#extensions_settings` 宿主。

## 客户端注册

扩展宿主的注册表属于 Agent RP 的浏览器插件面。独立 DSH 插件应在自己的 `./client` 中通过 `agentRpStExtensions` 注册 manifest 与构建产物，并在 `dsh.client.inject` 中声明同名服务。Host `ctx.provide()` 与同名服务键不会把对象送入浏览器；需要 Host 数据时必须使用明确的客户端服务、RPC、HTTP 或 Session 投影。

注册和撤销会更新可订阅的 revision；同一 JavaScript 任务中的连续变化合并为一次确定顺序的重建。旧 iframe 随重建或 Client 插件卸载一并撤销，过期 generation 的消息不会改变当前宿主状态。一个扩展失败不会阻止后续扩展启动，也不会让角色卡和预设 Tavern Helper 帧停止工作。

安装型扩展与注册它的 DSH Client 插件采用同一信任级别：Client 插件本来就能访问页面和网络，因此共享 iframe 是可整体撤销的 document 生命周期容器，不是额外的安全沙箱。扩展网络请求按浏览器同源、CORS 和混合内容规则执行。角色卡与预设携带的脚本不是已安装插件，继续运行在逐脚本隔离 iframe 中，不能借用安装型扩展的页面权限。

扩展源码不能直接拼进 HTML `<script>` 文本。宿主必须使用不会被 `</script>`、行分隔符或 source map 注释截断的传输与执行格式，并同时限制扩展数量、单项字节数和聚合字节数。

## 设置与界面

宿主提供单例 `#extensions_settings` 和 `#extensions_settings2`，并允许扩展按 ST 约定挂载界面。空容器不会显示入口；加入可见内容后，Agent RP 工作台显示“ST 扩展设置”，并打开常驻的侧边对话框。关闭对话框只隐藏外壳，不移动、销毁或重新导入其中的共享 iframe。iframe 使用浏览器的深色系统前景色承接没有自带文字颜色的扩展界面，扩展仍可用自己的样式覆盖它。

扩展设置使用固定的安装集合身份持久化，不复用 `tavernExtensionSettingsIdentity(characterId, presetId, scope)`，也不会抢占旧浏览器全局设置的迁移资格。共享 document 提供 `extension_settings`、`saveSettings()` 和 `saveSettingsDebounced()`；角色卡和预设的 `extension_settings` 兼容对象继续属于各自的 Tavern 脚本树，不能覆盖安装型扩展设置。

## 生成屏障

共享 document 只有在扩展完成启动、绑定当前 Session 并保持同源长轮询时才参与 Agent 请求。`agent/inbox/claimed` 为当前回合创建一次生成请求；system prompt 组装等待浏览器先发出 `GENERATION_STARTED`，再按注册顺序等待各条目的 `generateInterceptor`。页面随后把 `setExtensionPrompt()` 的完整有效集合写入 Session 的 `replace-installed-extension-prompts` 状态，Host 确认写入完成后才放行 Agent 重新编译本轮 Roleplay plan。页面关闭、扩展未安装或 iframe 尚未就绪时不会增加等待；浏览器失败、切换 Session 或失联时最多等待 15 秒并沿用屏障前的计划。

Web Host 与每个 Agent 能力预设运行在彼此独立的 Cordis 根，DSH 插件装载器也可能为同一包创建不同 ESM 实例。Host coordinator 因此注册到同一 Node 全局对象上的版本化目录；Agent 只选择已经持有目标 Session 浏览器长轮询的 coordinator，并把该精确实例绑定到当前 turn。没有在线 poll 时目录查询直接返回，不为普通请求建立计时器或跨根伪服务。

安装型扩展提示与角色卡或预设脚本提示使用相同的 `before`、`after`、`in_chat` 和扫描投影，但拥有独立的页面级集合，不伪造 `scriptScope` 或 `scriptId`。提示写入先进入 Session，模型请求随后从同一事件前缀重建，因此模型可见内容可重放。Host 会保留一个提前完成的浏览器结果，直到对应 system prompt 组装实际消费它；这避免本地浏览器比 Agent 调度更快时漏掉本轮提示。

注册项的 `generateInterceptor` 对应 ST manifest 的 `generate_interceptor` 全局函数名。默认仍先派发 `GENERATION_STARTED` 再调用 interceptor。若某个上游扩展同时用事件监听和 interceptor 执行同一工作，注册者可以显式设置 `generationStartedEvent: 'interceptor-only'`，只屏蔽该扩展在加载阶段注册的重复生成事件监听；没有 `generateInterceptor` 时不能选择这个模式。

## 实现验收

本地开发先运行 `pnpm run test:provider-seam`。该门禁使用当前本机 DSH 构建的真实 Cordis、Agent Loop、Session、System Prompt、Tool Runtime 与 LLM Runtime，并由 recording adapter 捕获最终 `GenerateOptions.messages`；相邻夹具把安装型扩展的提示写入 Session、等待生成屏障、重新编译本轮 plan，再断言同一提示进入 provider。它不访问网络、不启动浏览器或 sidecar，也不发送真实模型请求。

独立 DSH Client 插件已经在真实 3080 页面完成基础宿主验收：三个扩展按顺序启动，其中一个扩展的预期失败未阻断另外两个；设置容器可见，IndexedDB 设置在页面重载后恢复；连续切换两个 Session 时共享 iframe 保持单例、扩展没有重新导入，且只收到两次准确的 Session 变更。最终 `getContext().chatId`、Host Session 与选中 Session 一致；同一 Session 的投影同步不会误发 Session 变更事件。

公开扩展验收固定使用 Woven Imprint 的提交 [`2356815`](https://github.com/virtaava/sillytavern-woven-imprint/tree/23568156ed86111dc81d59c6d9df9338892e1178)。未改写的 11,384 字节入口与样式在真实 3080 页面启动，生成可从 Agent RP 工作台打开的设置界面，并在 sidecar 不存在时明确显示不可达；关闭功能后重载页面可以恢复设置。关闭并重新打开设置对话框时，iframe 身份和扩展启动计数保持不变。连续切换两个 Session 没有重新导入扩展，撤销注册会重建共享 document 并移除 Woven Imprint，重新注册后设置仍然保留。页面角色对象同时暴露 ST 使用的根级 `description`、`personality` 和原始 `data`，真实追加消息在快照同步后按顺序进入扩展事件源。

Woven Imprint 的该提交没有在 `manifest.json` 声明它已经公开的 `wovenImprintInterceptor`，并且源码中的 `GENERATION_STARTED` 监听器没有返回异步记忆请求。Agent RP 的本地适配注册因此明确填写 `generateInterceptor: 'wovenImprintInterceptor'` 与 `generationStartedEvent: 'interceptor-only'`：生成事件仍会发送给其他扩展，Woven 自己只执行一次可等待的记忆查询。真实 sidecar 与模型请求验收完成前，这仍是功能分支能力，不是“Woven 已正式支持”的发布承诺。

可运行实现至少需要证明：

- 没有任何角色卡或预设 Tavern 脚本时，已安装扩展仍能启动并显示设置界面。
- 同时存在多个 global、preset 与 character 脚本时，每个已安装扩展只激活一次。
- 切换当前 Session、角色或预设不会复制设置、重复监听事件或残留旧 Session 的运行状态。
- 客户端插件注册、撤销和 HMR 会触发一次有序重建，旧 iframe、监听器和定时器全部撤销。
- manifest 顺序、扩展依赖、禁用状态、两个设置容器和独立错误呈现都有覆盖。
- 包含 `</script>` 的合法扩展源码不会截断宿主文档；单项、数量与聚合上限分别拒绝超限输入。
- 一个扩展加载失败时，其他扩展与所有角色卡或预设 Tavern Helper 帧继续运行。
- 没有在线共享 document 时 Agent 请求不等待；有在线 document 时，提示写入完成早于浏览器完成回报，浏览器完成回报早于本轮 Roleplay plan 重建。
- 快速浏览器在 system prompt 开始等待前完成时，本轮仍能消费该结果；失联浏览器、Session 切换和 iframe 重建会在上限内释放请求。
- `GENERATION_STARTED`、manifest interceptor 顺序、`setExtensionPrompt()` 的四种位置与三种角色、提示删除、过滤器和提示上限都有覆盖。
- 至少一个公开 ST 扩展通过真实 3080 导入、启动、设置持久化、Session 切换和卸载验收；测试结束后可以用受管数据重置清理。

在这些条件完成前，版本化公共接口不应宣称支持任意 ST 第三方扩展。每脚本兼容垫片可以作为另一项较窄能力发布，但名称和文档必须明确它不会创建页面级扩展宿主。
