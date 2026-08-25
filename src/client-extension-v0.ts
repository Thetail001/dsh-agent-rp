/** Versioned browser contract for independent DSH plugins extending Agent RP UI. */

import type { PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'

/** The API version encoded by the `@dsh-external/dsh-agent-rp/client-extension/v0` export. */
export const AGENT_RP_CLIENT_EXTENSION_API_VERSION = 0 as const

/** Ordered external sections rendered inside the Agent RP sidebar workbench. */
export const AGENT_RP_WORKBENCH_SECTION_SLOT = 'agent-rp.workbench.section' as const

/** Host actions available to one independent workbench section. */
export interface AgentRpWorkbenchSectionOwnerProps {
  /** Close the Agent RP workbench after the extension opens its own surface. */
  readonly closeWorkbench: () => void
}

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface SlotMap {
    /** Trusted client plugins can add complete task rows without receiving Agent RP private state. */
    'agent-rp.workbench.section': {
      kind: 'list'
      scope: 'root'
      owner: AgentRpWorkbenchSectionOwnerProps
    }
  }
}

/** Props received by a registered Agent RP workbench section component. */
export type AgentRpWorkbenchSectionProps = PropsRuntime<typeof AGENT_RP_WORKBENCH_SECTION_SLOT>
