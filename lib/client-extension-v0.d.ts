import { PropsRuntime } from "@deepseek-ai/dsh-client-ui-slots";

/** The API version encoded by the `@dsh-external/dsh-agent-rp/client-extension/v0` export. */
declare const AGENT_RP_CLIENT_EXTENSION_API_VERSION: 0;
/** Ordered external sections rendered inside the Agent RP sidebar workbench. */
declare const AGENT_RP_WORKBENCH_SECTION_SLOT: "agent-rp.workbench.section";
/** Host actions available to one independent workbench section. */
interface AgentRpWorkbenchSectionOwnerProps {
  /** Close the Agent RP workbench after the extension opens its own surface. */
  readonly closeWorkbench: () => void;
}
declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface SlotMap {
    /** Trusted client plugins can add complete task rows without receiving Agent RP private state. */
    'agent-rp.workbench.section': {
      kind: 'list';
      scope: 'root';
      owner: AgentRpWorkbenchSectionOwnerProps;
    };
  }
}
/** Props received by a registered Agent RP workbench section component. */
type AgentRpWorkbenchSectionProps = PropsRuntime<typeof AGENT_RP_WORKBENCH_SECTION_SLOT>;
export { AGENT_RP_CLIENT_EXTENSION_API_VERSION, AGENT_RP_WORKBENCH_SECTION_SLOT, AgentRpWorkbenchSectionOwnerProps, AgentRpWorkbenchSectionProps };