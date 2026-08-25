# 多 Agent 回合 Worker

Agent 模式将一轮拆成职责隔离、顺序固定的模型阶段。角色 Agent 继续持有角色卡、世界书、酒馆预设和工具；后续 Worker 只接收完成自身任务所需的最小输入，不重新运行角色 Agent 的完整提示。

当前顺序是：

1. 角色 Agent 完成剧情正文与必要的工具调用。
2. 可选的 `narrative-review` Worker 只审阅最终正文的表达，不重新推演剧情。它默认关闭，在「Agent RP 全局设置 → 多 Agent 回合」中启用。
3. `state-settlement` Worker 在存在结构化状态计划时读取最终可见正文，计算状态操作。

Worker 注册表按 `review`、`settle` 阶段和稳定顺序串行执行。单个 Worker 返回 `applied`、`unchanged`、`skipped` 或 `failed`；异常被隔离，后续 Worker 仍会运行。第一版不让模型动态生成任务图，也不要求尚未进入当前 DSH 正式包的 Subagent API。

受信 Host 插件可以从 `@dsh-external/dsh-agent-rp/extension/v0` 导入 `registerRoleplayTurnWorker`，注册稳定 id、阶段、顺序和 `run()`。这是进程内插件扩展点，不向角色卡或隔离脚本开放 Host 对象；第三方 Worker 仍应把模型可见请求和结果写入 Session，而不能只保存在进程内存中。

正文审阅使用当前会话的模型提供方，但强制关闭推理并使用独立的短 system prompt。请求只包含待审阅回复，不包含酒馆预设、世界书或完整聊天历史。审阅失败或返回不可用内容时保留角色 Agent 原文。审阅成功时，原文与审阅版进入同一个回复版本组，玩家可以用回复版本切换器恢复原文。

每次 Worker 运行都写入内容无关的 `agent-rp/turn-worker-result`。发给模型的完整审阅请求和终止结果分别写入 `agent-rp/narrative-review-request` 与 `agent-rp/narrative-review-result`；状态结算继续使用 `agent-rp/staged-state-request` 与 `agent-rp/staged-state-result`。这些记录都通过 Host 的 ignorable 插件事件接口进入 Session，能够随会话导出、分支和重放。

正文替换发生在角色 Agent step 关闭之后，因此它属于回合 Worker 的 surface 投影，不计入角色 Agent 的 action receipt。状态结算从同一 Session 前缀折叠 canonical surface，只读取当前可见版本，不会把原文与审阅版重复拼入状态请求。
