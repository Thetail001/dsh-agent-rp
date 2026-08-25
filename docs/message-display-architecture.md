# 消息显示架构

Agent RP 将消息显示分为显示计划、DSH 适配器和兼容运行时三层。显示计划只读取 Session 投影、当前显示规则、回复版本和脚本覆盖，按消息返回 `host`、`hidden` 或 `render`；它不读取 DOM，也不创建 iframe。DSH 适配器把 Chat Node 对应到显示计划，并恢复官方正文、隐藏未选回复或挂载渲染结果。兼容运行时继续承载 inline HTML、完整前端文档、状态栏、Tavern Helper 交互和已获准资源。

当前 DSH 的 `conversation.chat.node` 是 keyed slot。同一 key 可以用不同优先级 shadow，活动 renderer 崩溃后也可以回退到下一项；但一个 renderer 一旦赢得 cell，就不能针对某一条消息 decline 或调用下一 renderer。直接 shadow `user` 或 `assistant-step` 因此要求 Agent RP 同时复制官方 Markdown、推理、图片、工具、复制、分支和文件引用界面，不能作为普通正文原生显示的接入点。

在 DSH 提供消息正文级 chain 之前，Agent RP 保留 DOM 适配器，但正则执行、回复版本选择、脚本覆盖和编译路由统一由 `src/roleplay-display-plan.ts` 决定。停用显示规则会产生 `host` 计划，适配器必须卸载旧替换并恢复官方正文，不能让过时 iframe 留在页面上。

未来原生显示路径必须作为第二个适配器接入同一个显示计划。适合迁移的 DSH 扩展点需要同时满足：按单条 user 或 Assistant 正文调用；向贡献者提供原始文本和必要的消息身份；贡献者可对不适用的消息 decline；Host fallback 保留官方消息操作和非文本 block；扩展点随 Session 和插件卸载自动清理。满足这些条件后，可以先让纯 Markdown 和简单装饰 HTML 走原生适配器，inline HTML iframe 与完整前端 iframe 仍作为并行、可回退的兼容后端。

迁移验收必须覆盖同一输入在 DOM 与原生适配器下得到相同显示计划、关闭规则后恢复 Host 正文、回复版本切换、用户与 Assistant 正则深度、脚本 `refreshOneMessage` 覆盖、流式 Assistant、推理和图片 block，以及复杂前端继续进入既有 iframe。未达到这些条件时，不用复制 DSH 内部组件换取表面上的原生渲染。
