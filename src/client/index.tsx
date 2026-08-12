/** Agent RP browser affordances for native SillyTavern migration. */
import type { Context } from '@deepseek-ai/cordis'
import type { SessionId } from '@deepseek-ai/dsh-client-runtime/client'
import type { IConversation } from '@deepseek-ai/dsh-client-ui-conversation/client'
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import { selectSillyTavernChatImportName, type DraftAttachmentLike } from './import-hint.ts'

interface ImportHintProps {
  readonly sessionId: SessionId
  readonly input: {
    readonly attachmentIds?: readonly string[]
    readonly imageIds?: readonly string[]
  }
}

interface DraftResolver {
  readonly draftAttachments: (ids: readonly string[]) => readonly DraftAttachmentLike[]
}

const hintStyle = {
  alignItems: 'center',
  background: 'color-mix(in srgb, var(--color-primary, #7c6ee6) 8%, transparent)',
  border: '1px solid color-mix(in srgb, var(--color-primary, #7c6ee6) 24%, transparent)',
  borderRadius: '10px',
  display: 'flex',
  gap: '10px',
  padding: '9px 12px',
} as const

const markStyle = {
  alignItems: 'center',
  background: 'color-mix(in srgb, var(--color-primary, #7c6ee6) 16%, transparent)',
  borderRadius: '8px',
  display: 'flex',
  flex: '0 0 30px',
  fontSize: '16px',
  height: '30px',
  justifyContent: 'center',
} as const

const textStyle = { minWidth: 0 } as const
const titleStyle = { fontSize: '13px', fontWeight: 600, lineHeight: 1.45 } as const
const fileStyle = {
  fontWeight: 400,
  marginLeft: '6px',
  opacity: 0.72,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
} as const
const detailStyle = { fontSize: '12px', lineHeight: 1.45, marginTop: '2px', opacity: 0.62 } as const

/** Explain the otherwise implicit send-to-import step for one JSONL draft. */
function importHintComponent(ctx: Context): (props: ImportHintProps) => JSX.Element | null {
  return function SillyTavernImportHint({ input, sessionId }: ImportHintProps): JSX.Element | null {
    const summary = ctx.sessions.list.getSnapshot().byId[sessionId]
    if (summary?.agentPreset !== 'agent-rp') return null
    const scoped = ctx.sessions.scope(sessionId)
    const conversation = scoped?.get('conversation') as (IConversation & Partial<DraftResolver>) | undefined
    const ids = input.attachmentIds ?? input.imageIds ?? []
    const filename = selectSillyTavernChatImportName(conversation?.draftAttachments?.(ids) ?? [])
    if (filename === undefined) return null
    return <div style={hintStyle} role="status">
      <div style={markStyle} aria-hidden="true">↗</div>
      <div style={textStyle}>
        <div style={titleStyle}>
          导入 SillyTavern 对话
          <span style={fileStyle}>{filename}</span>
        </div>
        <div style={detailStyle}>将创建新的角色会话，点击发送开始导入</div>
      </div>
    </div>
  }
}

/** Client services required by the import hint. */
export const inject = ['slots', 'sessions']

/** Register the Agent RP-only JSONL import hint above the composer. */
export function apply(ctx: Context): void {
  ctx.slots.inject('conversation.input.dock', () => ctx.slots.register({
    name: 'conversation.input.dock',
    id: 'agent-rp-sillytavern-import-hint',
    order: -10,
  }, importHintComponent(ctx)))
}
