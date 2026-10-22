/** Generation-ledger record shape and lightweight hidden-version scan.
 *
 * 独立成叶子模块的原因：prompt.ts 与 tavern-chat.ts 都需要按账本过滤
 * 非选中 swipe 版本，而完整校验版 readGenerationGroups 住在 generation.ts，
 * 它的依赖链（tavern-helper → tavern-chat）会和 tavern-chat 成环。
 * 这里只做防御性轻量扫描，供显示/组装路径使用；命令路径仍用完整校验。
 */

import type { SessionEvent } from '@deepseek-ai/dsh-session'
import { type JsonValue } from '@deepseek-ai/dsh-util-values'
import { decodeGenerationCommandResult } from './generation-command-result.ts'
import type { TavernHelperState } from './tavern-helper.ts'

/** A complete reply-version group snapshot stored after every mutation. */
export interface GenerationStateRecord {
  readonly format: 0
  readonly groupId: string
  readonly operation: 'regenerate' | 'continue' | 'select' | 'review'
  readonly originSeq: number
  readonly anchorSeq: number
  readonly assistantSeqs: readonly number[]
  readonly versions: readonly {
    readonly seq: number
    readonly text: string
    /** Assistant replies whose tool-stage decisions compose this visible version. */
    readonly artifactReplySeqs?: readonly number[]
    readonly tavernStateSeq?: number
    readonly mvu?: {
      readonly statData: JsonValue
      readonly updateCount: number
      readonly lastError?: string
    }
  }[]
  readonly baseTavernStateSeq?: number
  readonly baseMvu?: {
    readonly statData: JsonValue
    readonly updateCount: number
    readonly lastError?: string
  }
  readonly selectedVersionSeq: number
  readonly surfaceSeq: number
  readonly tavern?: TavernHelperState
  readonly mvu?: {
    readonly statData: JsonValue
    readonly updateCount: number
    readonly lastError?: string
  }
}

declare module '@deepseek-ai/dsh-session' {
  interface PluginRecordMap {
    /** Ignorable reply-version snapshot written by an automatic post-narrative Worker. */
    'plugin:agent-rp/generation-state': GenerationStateRecord
  }
  /** 镜像进 SessionEventMap 仅为读路径判别收窄；写入只走 appendPluginRecord。 */
  interface SessionEventMap {
    /** Ignorable reply-version snapshot written by an automatic post-narrative Worker. */
    'plugin:agent-rp/generation-state': GenerationStateRecord
  }
}

function ledgerSnapshot(event: SessionEvent): GenerationStateRecord | undefined {
  try {
    if (event.type === 'command/done' && event.data.kind === 'success') {
      return decodeGenerationCommandResult(event.data.text) as unknown as GenerationStateRecord | undefined
    }
    if (event.type === ('plugin:agent-rp/generation-state' as SessionEvent['type'])) {
      return (event as SessionEvent & { readonly data: GenerationStateRecord }).data
    }
  } catch {
    return undefined
  }
  return undefined
}

/**
 * 0.2.1: swipe 版本全部以 append 形式留在事件日志和表面上，
 * 「哪个版本被选中」由 generation-state 账本决定。
 * 轻量扫描账本隐藏（非选中）的 assistant 事件 seq 集合，
 * 供提示词组装、MVU 前缀、tavern 楼层枚举和显示层过滤。
 * 不做完整校验：读不出账本字段的事件直接跳过。
 */
export function hiddenReplyVersionSeqs(events: readonly SessionEvent[]): ReadonlySet<number> {
  const latestByGroup = new Map<string, GenerationStateRecord>()
  for (const event of events) {
    const data = ledgerSnapshot(event)
    if (data === undefined || typeof data.groupId !== 'string') continue
    latestByGroup.set(data.groupId, data)
  }
  const hidden = new Set<number>()
  for (const group of latestByGroup.values()) {
    if (!Array.isArray(group.assistantSeqs) || !Number.isSafeInteger(group.selectedVersionSeq)) continue
    for (const seq of group.assistantSeqs) {
      if (Number.isSafeInteger(seq) && seq !== group.selectedVersionSeq) hidden.add(seq)
    }
  }
  return hidden
}
