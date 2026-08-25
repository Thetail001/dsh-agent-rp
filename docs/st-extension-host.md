# SillyTavern 扩展宿主

本文约束“已安装的 SillyTavern 第三方扩展”在 Agent RP 中的宿主生命周期。它不描述角色卡或预设携带的 Tavern Helper 脚本；后者继续由现有的逐脚本 iframe 运行时承载。

当前 `main` 尚未提供可运行的 ST 扩展宿主。社区插件可以使用版本化 Host 与浏览器扩展协议接入 Agent RP 工作台，但不能通过向每个 Tavern Helper iframe 拼接相同源码来模拟页面级扩展加载。

## 上游生命周期

本节以 SillyTavern `release` 的提交 [`8172dcd`](https://github.com/SillyTavern/SillyTavern/tree/8172dcd0ee672d3cd9a5e5f7af134f91a45cd2b8) 为依据：

- [`activeExtensions`](https://github.com/SillyTavern/SillyTavern/blob/8172dcd0ee672d3cd9a5e5f7af134f91a45cd2b8/public/scripts/extensions.js#L36-L46) 是页面级集合；[`activateExtensions()`](https://github.com/SillyTavern/SillyTavern/blob/8172dcd0ee672d3cd9a5e5f7af134f91a45cd2b8/public/scripts/extensions.js#L564-L585) 按 manifest 顺序激活尚未加载的扩展。
- [`addExtensionScript()`](https://github.com/SillyTavern/SillyTavern/blob/8172dcd0ee672d3cd9a5e5f7af134f91a45cd2b8/public/scripts/extensions.js#L809-L841) 向主 document 添加具有唯一 id 的 module script，同一个扩展不会随角色卡脚本数量重复加载。
- [`extension_settings`](https://github.com/SillyTavern/SillyTavern/blob/8172dcd0ee672d3cd9a5e5f7af134f91a45cd2b8/public/scripts/extensions.js#L141-L176) 是页面级设置对象；[`loadExtensionSettings()`](https://github.com/SillyTavern/SillyTavern/blob/8172dcd0ee672d3cd9a5e5f7af134f91a45cd2b8/public/scripts/extensions.js#L1779-L1808) 发现 manifest、恢复设置并启动扩展。
- 主页面只声明一组 [`#extensions_settings`](https://github.com/SillyTavern/SillyTavern/blob/8172dcd0ee672d3cd9a5e5f7af134f91a45cd2b8/public/index.html#L5760-L5777) 与 [`#extensions_settings2`](https://github.com/SillyTavern/SillyTavern/blob/8172dcd0ee672d3cd9a5e5f7af134f91a45cd2b8/public/index.html#L5778-L5795) 设置容器。

因此，Agent RP 的安装型 ST 扩展宿主必须在一个浏览器 ClientContext 中保持单例。它可以显式切换当前绑定的 DSH Session，但不能为每个 global、preset 或 character Tavern Helper 脚本创建一份扩展实例。

## 与 Tavern Helper 帧分离

现有 `TavernScriptRuntime` 为每个 global、preset 或 character 脚本创建独立 iframe，并按角色、预设、脚本作用域和脚本标识保存变量、设置、许可与错误。这个隔离单位适合角色卡和预设内容，也允许同名脚本互不覆盖。

安装型 ST 扩展属于 DSH 插件安装，不属于角色卡或预设脚本树。它需要独立的稳定扩展标识、manifest 顺序、启用状态、设置存储和运行错误；切换角色、预设或会话不能复制扩展设置，也不能改变扩展的安装身份。扩展生成的模型可见输入和持久会话改动仍必须通过现有 Host 能力写入 Session，不能只保存在浏览器 iframe 中。

每脚本 iframe 可以继续提供 Tavern Helper API 兼容垫片和该脚本自己的设置界面，但不得加载安装型扩展 bundle，也不得为同一个已安装扩展创建重复的 `#extensions_settings` 宿主。

## 客户端注册

扩展宿主的注册表属于 Agent RP 的浏览器插件面。独立 DSH 插件应在自己的 `./client` 中注册 manifest 与构建产物，并通过 `dsh.client.inject` 等待版本化的 Agent RP 客户端服务。Host `ctx.provide()` 与同名服务键不会把对象送入浏览器；需要 Host 数据时必须使用明确的客户端服务、RPC、HTTP 或 Session 投影。

注册和撤销必须更新可订阅的 revision。当前扩展宿主应在 revision 变化时以确定顺序重建一次；只提供 `sources()` 快照而不通知现有运行时，会使热安装、插件卸载和 HMR 保留过期代码。一个扩展失败不得阻止后续扩展启动，也不得让角色卡和预设 Tavern Helper 帧停止工作。

扩展源码不能直接拼进 HTML `<script>` 文本。宿主必须使用不会被 `</script>`、行分隔符或 source map 注释截断的传输与执行格式，并同时限制扩展数量、单项字节数和聚合字节数。

## 设置与界面

宿主提供单例 `#extensions_settings` 和 `#extensions_settings2`，并允许扩展按 ST 约定挂载界面。空容器不应让 Agent RP 自动打开面板；加入可见内容后，界面应通过现有工作台或独立扩展面板出现。

扩展设置按稳定的安装扩展标识持久化，不复用 `tavernExtensionSettingsIdentity(characterId, presetId, scope)`。角色卡和预设的 `extension_settings` 兼容对象继续属于各自的 Tavern 脚本树，不能覆盖安装型扩展设置。

## 实现验收

可运行实现至少需要证明：

- 没有任何角色卡或预设 Tavern 脚本时，已安装扩展仍能启动并显示设置界面。
- 同时存在多个 global、preset 与 character 脚本时，每个已安装扩展只激活一次。
- 切换当前 Session、角色或预设不会复制设置、重复监听事件或残留旧 Session 的运行状态。
- 客户端插件注册、撤销和 HMR 会触发一次有序重建，旧 iframe、监听器和定时器全部撤销。
- manifest 顺序、扩展依赖、禁用状态、两个设置容器和独立错误呈现都有覆盖。
- 包含 `</script>` 的合法扩展源码不会截断宿主文档；单项、数量与聚合上限分别拒绝超限输入。
- 一个扩展加载失败时，其他扩展与所有角色卡或预设 Tavern Helper 帧继续运行。
- 至少一个公开 ST 扩展通过真实 3080 导入、启动、设置持久化、Session 切换和卸载验收；测试结束后可以用受管数据重置清理。

在这些条件完成前，版本化公共接口不应宣称支持任意 ST 第三方扩展。每脚本兼容垫片可以作为另一项较窄能力发布，但名称和文档必须明确它不会创建页面级扩展宿主。
