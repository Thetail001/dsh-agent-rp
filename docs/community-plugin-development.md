# 独立社区插件接入

Agent RP 为受信 DSH 插件分别发布 Host 与浏览器扩展面。扩展插件保留自己的存储、HTTP 接口和界面状态；Agent RP 只提供组合位置与回合生命周期，不把角色库对象、会话内部回调、Host DOM 或隔离脚本权限交给插件。

## 浏览器工作台扩展

`@dsh-external/dsh-agent-rp/client-extension/v0` 声明 `agent-rp.workbench.section` 列表 Slot。它位于侧栏的 Agent RP 工作台，现代 `sidebar.destinations` 与旧版 `sidebar.footer.action` 入口共用同一个声明。外部插件必须通过 `ctx.slots.inject()` 等待 Agent RP 声明 Slot，不能依赖客户端 bundle 的下载或执行顺序。

```ts
import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
import {
  AGENT_RP_WORKBENCH_SECTION_SLOT,
  type AgentRpWorkbenchSectionProps,
} from '@dsh-external/dsh-agent-rp/client-extension/v0'

export const inject = ['slots']

function WorldbookSection(props: AgentRpWorkbenchSectionProps) {
  // 打开插件自己的完整界面后可以关闭 Agent RP 工作台。
  void props.closeWorkbench
  return null
}

export function apply(ctx: ClientContext): void {
  ctx.slots.inject(AGENT_RP_WORKBENCH_SECTION_SLOT, () => ctx.slots.register({
    name: AGENT_RP_WORKBENCH_SECTION_SLOT,
    id: 'community-worldbook',
    order: 10,
    label: '世界书',
  }, WorldbookSection))
}
```

条目组件只收到 `closeWorkbench()` 与 DSH Slot 的 root 标准属性。需要当前会话、远程调用或设置存储时，插件应声明并使用对应 DSH 客户端服务；Agent RP 不复制这些服务，也不为扩展暴露私有 React 状态。

浏览器协议文件很小，可以由扩展的构建器打入自己的 client bundle。`dsh.client.inject` 只是客户端模块图的依赖说明，不负责激活顺序；Slot 声明等待由上面的 `ctx.slots.inject()` 完成。

## Host 扩展

`@dsh-external/dsh-agent-rp/extension/v0` 提供资源、运行时模块、回合 Worker、角色修订与 Tavern 预检注册。Host 插件应把使用的 Agent RP 服务键加入 Cordis `inject`，再在 `apply()` 中调用对应注册函数；注册函数使用调用方的 effect 生命周期，插件卸载时会撤销贡献。

回合 Worker 仍需把模型可见请求和结果写入 Session。运行时解析器只能从不可变 Session 事件生成绑定；浏览器工作台 Slot 不能替代 Host 事件、权限或重放记录。

## 当前分发边界

仓库目前没有发布 npm prerelease。源码协作、同一工作区夹具和本地 `file:` 安装可以使用这两个版本化导出，但不能据此承诺普通用户已经能从 DSH 插件目录安装或自动升级。正式包名、所有权与可信发布仍由单独的分发工作决定。

每次构建都会用一份仓库外观的消费夹具从发布后的 `client-extension/v0` 注册条目；`pnpm run check:published-imports` 同时验证运行时导出、依赖声明和这份独立 TypeScript 消费路径。
