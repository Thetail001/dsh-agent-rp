/** Generic presentation of one observer-safe Roleplay session projection. */

import { useCallback, useEffect, useRef, useState } from 'react'
import type { ConvViewProps } from '@deepseek-ai/dsh-client-ui-conversation/client'
import type {
  RoleplayPlayerSurface,
  RoleplaySurfaceAction,
  RoleplaySurfaceActor,
  RoleplaySurfaceActorId,
  RoleplaySurfaceRecord,
} from '../runtime/client.ts'
import type { RoleplayViewInjected } from './index.ts'
import css from './RoleplayView.module.css'

/** Full component props derived from the conversation view and injected send face. */
export type RoleplayViewProps = ConvViewProps & RoleplayViewInjected

type PlayerMark = 'trust' | 'watch' | 'suspect'
type PlayerMarks = Readonly<Record<string, PlayerMark>>

const PLAYER_MARKS: readonly { readonly value: PlayerMark; readonly label: string; readonly symbol: string }[] = [
  { value: 'trust', label: '偏信', symbol: '✓' },
  { value: 'watch', label: '观察', symbol: '·' },
  { value: 'suspect', label: '怀疑', symbol: '!' },
]
const FRESH_SCENE_LAUNCH_TTL_MS = 30_000
let freshSceneLaunch: { readonly sourceSessionId: string; readonly startedAt: number } | undefined

function beginFreshSceneLaunch(sourceSessionId: string): void {
  freshSceneLaunch = { sourceSessionId, startedAt: Date.now() }
}

function freshSceneLaunchRemainingMs(): number {
  if (freshSceneLaunch === undefined) return 0
  return Math.max(0, FRESH_SCENE_LAUNCH_TTL_MS - (Date.now() - freshSceneLaunch.startedAt))
}

function finishFreshSceneLaunch(): void {
  freshSceneLaunch = undefined
}

function markStorageKey(sessionId: string): string {
  return `dsh-roleplay-player-marks:${sessionId}`
}

function isPlayerMark(value: unknown): value is PlayerMark {
  return value === 'trust' || value === 'watch' || value === 'suspect'
}

function readPlayerMarks(sessionId: string): PlayerMarks {
  if (typeof window === 'undefined') return {}
  let stored: string | null
  try {
    stored = window.localStorage.getItem(markStorageKey(sessionId))
  } catch (storageAccessError) {
    void storageAccessError
    return {}
  }
  if (stored === null) return {}
  let parsed: unknown
  try {
    parsed = JSON.parse(stored)
  } catch (malformedStoredMarks) {
    void malformedStoredMarks
    return {}
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return {}
  return Object.fromEntries(Object.entries(parsed).filter((entry): entry is [string, PlayerMark] =>
    isPlayerMark(entry[1])))
}

function persistPlayerMarks(sessionId: string, marks: PlayerMarks): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(markStorageKey(sessionId), JSON.stringify(marks))
  } catch (storageWriteError) {
    // Browser privacy settings may disable persistence; the current in-memory marks still work.
    void storageWriteError
  }
}

function Preparation({
  kind,
  disabled,
  error,
  onSubmit,
}: {
  kind: 'absent' | 'preparing' | 'unmatched'
  disabled?: boolean
  error?: string | null
  onSubmit?: () => void
}) {
  return (
    <main
      className={css.preparationShell}
      data-conversation-composer="hidden"
      data-conversation-view="exclusive"
      aria-busy={disabled}
    >
      <section className={css.preparation} aria-live="polite">
        <div className={css.preparationMark}>RP</div>
        <h2>{kind === 'preparing'
          ? '正在准备本局'
          : kind === 'absent' ? '这条会话没有场景' : '场景还不能显示'}</h2>
        <p>
          {kind === 'preparing'
            ? '正在分配座位和身份，完成后先确认本局身份。'
            : kind === 'absent'
              ? '这是一条旧会话。新建一局后，场景、身份和规则会自动准备。'
              : '场景已经接入，但当前版本还不能显示它。请刷新页面后再试。'}
        </p>
        {kind === 'absent' && (
          <div className={css.preparationActions}>
            <button className={css.primary} type="button" disabled={disabled} onClick={onSubmit}>
              {disabled ? '正在新建…' : '新建一局'}
            </button>
            <small>不会调用模型，也不会修改这条旧会话。</small>
          </div>
        )}
        {error !== null && error !== undefined && <p className={css.error} role="alert">{error}</p>}
      </section>
    </main>
  )
}

function actorLabel(actorById: ReadonlyMap<string, RoleplaySurfaceActor>, actorId: string | undefined): string {
  if (actorId === undefined) return '未知玩家'
  return actorById.get(actorId)?.label ?? actorId
}

function RecordRow({
  record,
  actorById,
  onSelectActor,
}: {
  record: RoleplaySurfaceRecord
  actorById: ReadonlyMap<string, RoleplaySurfaceActor>
  onSelectActor?: (actorId: RoleplaySurfaceActorId) => void
}) {
  const actor = record.actorId === undefined ? undefined : actorById.get(String(record.actorId))
  const target = record.targetActorId === undefined ? undefined : actorById.get(String(record.targetActorId))
  if (record.kind === 'statement') {
    return (
      <article className={css.statementCard}>
        {actor === undefined
          ? <strong>公开发言</strong>
          : (
            <button type="button" onClick={() => { onSelectActor?.(actor.id) }}>
              {actor.label}
            </button>
          )}
        <p>{record.text}</p>
      </article>
    )
  }
  if (record.kind === 'ballot') {
    return (
      <div className={css.ballotRow}>
        {actor === undefined
          ? <span>未知玩家</span>
          : (
            <button type="button" onClick={() => { onSelectActor?.(actor.id) }}>
              {actor.label}
            </button>
          )}
        <span aria-hidden="true">→</span>
        {target === undefined
          ? <strong>弃票</strong>
          : (
            <button type="button" onClick={() => { onSelectActor?.(target.id) }}>
              {target.label}
            </button>
          )}
      </div>
    )
  }
  return (
    <div className={css.outcomeRow}>
      <span className={css.outcomeIcon} aria-hidden="true">✓</span>
      <div>
        <small>本轮结果</small>
        <p>{record.text}</p>
      </div>
    </div>
  )
}

interface RecordGroup {
  readonly key: string
  readonly phase: string
  readonly records: RoleplaySurfaceRecord[]
  readonly narration?: string
}

type StatementFeedItem =
  | { readonly kind: 'statement'; readonly record: RoleplaySurfaceRecord }
  | {
    readonly kind: 'pass'
    readonly records: (RoleplaySurfaceRecord & { readonly actorId: RoleplaySurfaceActorId })[]
  }

function hasRecordActor(
  record: RoleplaySurfaceRecord,
): record is RoleplaySurfaceRecord & { readonly actorId: RoleplaySurfaceActorId } {
  return record.actorId !== undefined
}

function statementFeedItems(records: readonly RoleplaySurfaceRecord[]): StatementFeedItem[] {
  const items: StatementFeedItem[] = []
  for (const record of records) {
    if (record.text !== '过' || !hasRecordActor(record)) {
      items.push({ kind: 'statement', record })
      continue
    }
    const previous = items.at(-1)
    if (previous?.kind === 'pass') previous.records.push(record)
    else items.push({ kind: 'pass', records: [record] })
  }
  return items
}

function timelineGroups(surface: RoleplayPlayerSurface): RecordGroup[] {
  const narrationByRevision = new Map(surface.narration.map(item => [item.revision, item]))
  const recordsByRevision = new Map<number, RoleplaySurfaceRecord[]>()
  const legacyRecords: RoleplaySurfaceRecord[] = []
  for (const record of surface.records) {
    if (record.revision === undefined) {
      legacyRecords.push(record)
      continue
    }
    const records = recordsByRevision.get(record.revision)
    if (records === undefined) recordsByRevision.set(record.revision, [record])
    else records.push(record)
  }
  const revisions = [...new Set([...narrationByRevision.keys(), ...recordsByRevision.keys()])]
    .sort((left, right) => left - right)
  const revisionGroups = revisions.map((revision): RecordGroup => {
    const narration = narrationByRevision.get(revision)
    const records = recordsByRevision.get(revision) ?? []
    return {
      key: `revision-${String(revision)}`,
      phase: narration?.phase ?? records[0]?.phase ?? `阶段 ${String(revision)}`,
      records,
      ...(narration === undefined ? {} : { narration: narration.text }),
    }
  })
  const groups: RecordGroup[] = []
  for (const group of revisionGroups) {
    const previous = groups.at(-1)
    if (previous?.phase !== group.phase) {
      groups.push(group)
      continue
    }
    groups[groups.length - 1] = {
      key: previous.key,
      phase: previous.phase,
      records: [...previous.records, ...group.records],
      ...(group.narration === undefined ? {} : { narration: group.narration }),
    }
  }
  const legacyByPhase = new Map<string, RecordGroup>()
  for (const record of legacyRecords) {
    const matching = groups.findLast(group => group.phase === record.phase)
    if (matching !== undefined) {
      matching.records.push(record)
      continue
    }
    const existing = legacyByPhase.get(record.phase)
    if (existing !== undefined) {
      existing.records.push(record)
      continue
    }
    const group = { key: `legacy-${record.phase}`, phase: record.phase, records: [record] }
    legacyByPhase.set(record.phase, group)
    groups.push(group)
  }
  for (const record of surface.progress?.records ?? []) {
    const current = groups.at(-1)
    if (current?.phase !== record.phase) {
      groups.push({ key: `progress-${record.phase}`, phase: record.phase, records: [record] })
      continue
    }
    groups[groups.length - 1] = {
      key: current.key,
      phase: current.phase,
      records: [...current.records, record],
    }
  }
  return groups
}

function recordGroupCount(group: RecordGroup): string {
  const ballots = group.records.filter(record => record.kind === 'ballot').length
  if (ballots > 0) return `${String(ballots)} 张选票`
  const statements = group.records.filter(record => record.kind === 'statement').length
  if (statements > 0) return `${String(statements)} 条发言`
  const outcomes = group.records.filter(record => record.kind === 'outcome').length
  if (outcomes > 0) return `${String(outcomes)} 条结果`
  return group.narration === undefined ? '暂无公开记录' : '1 条阶段结果'
}

function visibleRecords(surface: RoleplayPlayerSurface): readonly RoleplaySurfaceRecord[] {
  return [...surface.records, ...(surface.progress?.records ?? [])]
}

function VoteTally({
  records,
  actorById,
}: {
  records: readonly RoleplaySurfaceRecord[]
  actorById: ReadonlyMap<string, RoleplaySurfaceActor>
}) {
  const ballots = records.filter(record => record.kind === 'ballot')
  if (ballots.length === 0) return null
  const tally = new Map<string, number>()
  for (const ballot of ballots) {
    const key = ballot.targetActorId === undefined ? 'abstain' : String(ballot.targetActorId)
    tally.set(key, (tally.get(key) ?? 0) + 1)
  }
  return (
    <div className={css.voteSummary}>
      <span className={css.voteSummaryLabel}>票数</span>
      <div className={css.voteTally} aria-label="本轮票数汇总">
        {[...tally.entries()]
          .sort((left, right) => right[1] - left[1])
          .map(([targetId, count]) => (
            <span key={targetId}>
              {targetId === 'abstain' ? '弃票' : actorLabel(actorById, targetId)}
              <strong>{count}</strong>
            </span>
          ))}
      </div>
    </div>
  )
}

function PublicRecordFeed({
  surface,
  waiting,
  onSelectActor,
}: {
  surface: RoleplayPlayerSurface
  waiting: boolean
  onSelectActor: (actorId: RoleplaySurfaceActorId) => void
}) {
  const actorById = new Map(surface.actors.map(actor => [String(actor.id), actor]))
  const groups = timelineGroups(surface)
  if (groups.length === 0) {
    return <p className={css.empty}>{waiting ? '正在等待第一条对局记录' : '对局记录会显示在这里'}</p>
  }
  return (
    <div className={css.recordGroups}>
      {groups.map((group, index) => {
        const ballots = group.records.filter(record => record.kind === 'ballot')
        const outcomes = group.records.filter(record => record.kind === 'outcome')
        const statements = group.records.filter(record => record.kind === 'statement')
        const statementItems = statementFeedItems(statements)
        return (
          <details key={group.key} className={css.recordGroup} open={index === groups.length - 1 ? true : undefined}>
            <summary>
              <span>{group.phase}</span>
              <small>{recordGroupCount(group)}</small>
            </summary>
            <div className={css.recordGroupBody}>
              {statements.length > 0 && (
                <div className={css.recordList}>
                  {statementItems.map(item => item.kind === 'statement'
                    ? (
                      <RecordRow
                        key={item.record.id}
                        record={item.record}
                        actorById={actorById}
                        onSelectActor={onSelectActor}
                      />
                    )
                    : (
                      <article key={`pass-${String(item.records[0]?.id)}`} className={css.statementCard}>
                        <div className={css.passActors}>
                          {item.records.map((record, actorIndex) => (
                            <span key={record.id}>
                              {actorIndex === 0 ? null : <span aria-hidden="true">、</span>}
                              <button type="button" onClick={() => { onSelectActor(record.actorId) }}>
                                {actorLabel(actorById, String(record.actorId))}
                              </button>
                            </span>
                          ))}
                        </div>
                        <p>过</p>
                      </article>
                    ))}
                </div>
              )}
              {ballots.length > 0 && (
                <div className={css.ballotSection}>
                  <VoteTally records={group.records} actorById={actorById} />
                  <details className={css.ballotDetails}>
                    <summary>
                      <span className={css.ballotClosedLabel}>查看 {ballots.length} 张选票</span>
                      <span className={css.ballotOpenLabel}>收起逐票明细</span>
                    </summary>
                    <div className={css.ballotList}>
                      {ballots.map(record => (
                        <RecordRow
                          key={record.id}
                          record={record}
                          actorById={actorById}
                          onSelectActor={onSelectActor}
                        />
                      ))}
                    </div>
                  </details>
                </div>
              )}
              {outcomes.length > 0 && (
                <div className={css.outcomeList}>
                  {outcomes.map(record => (
                    <RecordRow
                      key={record.id}
                      record={record}
                      actorById={actorById}
                      onSelectActor={onSelectActor}
                    />
                  ))}
                </div>
              )}
              {group.narration !== undefined && outcomes.length === 0 && (
                <article className={css.phaseNarration}>
                  <small>阶段结果</small>
                  <p>{group.narration}</p>
                </article>
              )}
            </div>
          </details>
        )
      })}
    </div>
  )
}

function markMeta(mark: PlayerMark | undefined) {
  return PLAYER_MARKS.find(candidate => candidate.value === mark)
}

function PlayerBoard({
  surface,
  marks,
  selectedActorId,
  selectedActionId,
  selectedTargetAction,
  targetActions,
  companionActions,
  targetGuidance,
  targetGuidanceDetail,
  actionLocked,
  onSelectActor,
  onSelectAction,
  onSubmitAction,
  onMark,
}: {
  surface: RoleplayPlayerSurface
  marks: PlayerMarks
  selectedActorId: RoleplaySurfaceActorId | null
  selectedActionId: string | null
  selectedTargetAction: RoleplaySurfaceAction | undefined
  targetActions: ReadonlyMap<string, RoleplaySurfaceAction>
  companionActions: readonly RoleplaySurfaceAction[]
  targetGuidance: string
  targetGuidanceDetail: string | undefined
  actionLocked: boolean
  onSelectActor: (actorId: RoleplaySurfaceActorId | null) => void
  onSelectAction: (action: RoleplaySurfaceAction) => void
  onSubmitAction: (action: RoleplaySurfaceAction) => void
  onMark: (actorId: RoleplaySurfaceActorId, mark: PlayerMark | undefined) => void
}) {
  const selected = selectedActorId === null
    ? undefined
    : surface.actors.find(actor => actor.id === selectedActorId)
  const actorById = new Map(surface.actors.map(actor => [String(actor.id), actor]))
  const selectedRecords = selected === undefined
    ? []
    : visibleRecords(surface).filter(record => record.actorId === selected.id)
  const inspectorClose = useRef<HTMLButtonElement | null>(null)
  useEffect(() => {
    if (selected === undefined) return
    inspectorClose.current?.focus()
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onSelectActor(null)
    }
    document.addEventListener('keydown', closeOnEscape)
    return () => { document.removeEventListener('keydown', closeOnEscape) }
  }, [onSelectActor, selected])
  return (
    <aside className={css.playerDesk} aria-label="席位与个人标记">
      <header className={css.panelHeader}>
        <div>
          <h2>席位</h2>
          <p>身份线索 · 个人标记</p>
        </div>
      </header>
      {selected !== undefined && (
        <section
          id="roleplay-player-inspector"
          className={css.playerInspector}
          role="dialog"
          aria-label={`${selected.label}公开档案`}
        >
          <header>
            <div>
              <p>公开档案</p>
              <h3>{selected.label}</h3>
            </div>
            <button
              ref={inspectorClose}
              type="button"
              aria-label="关闭玩家公开档案"
              onClick={() => { onSelectActor(null) }}
            >×</button>
          </header>
          <div className={css.markPicker} aria-label={`标记${selected.label}`}>
            {PLAYER_MARKS.map((option) => {
              const active = marks[String(selected.id)] === option.value
              return (
                <button
                  key={option.value}
                  type="button"
                  data-mark={option.value}
                  aria-pressed={active}
                  onClick={() => { onMark(selected.id, active ? undefined : option.value) }}
                >
                  <span>{option.symbol}</span>{option.label}
                </button>
              )
            })}
          </div>
          <p className={css.localOnly}>这些标记不会发送给角色或写入对局记录。</p>
          <div className={css.playerRecords}>
            {selectedRecords.length === 0
              ? <p className={css.empty}>这名玩家还没有公开发言或投票。</p>
              : selectedRecords.toReversed().map(record => (
                <div key={record.id}>
                  <span>{record.phase}</span>
                  <RecordRow record={record} actorById={actorById} />
                </div>
              ))}
          </div>
        </section>
      )}
      {surface.facts.length > 0 && (
        <details className={css.factsPanel} open>
          <summary>本局信息 <span>{surface.facts.length}</span></summary>
          <ul className={css.facts}>
            {surface.facts.map(fact => <li key={fact.id}>{fact.text}</li>)}
          </ul>
        </details>
      )}

      <ul className={css.actors}>
        {surface.actors.map((actor) => {
          const mark = marks[String(actor.id)]
          const selectedNow = actor.id === selectedActorId
          const targetAction = targetActions.get(String(actor.id))
          const actionSelected = targetAction !== undefined && String(targetAction.id) === selectedActionId
          return (
            <li
              key={actor.id}
              data-state={actor.state}
              data-mark={mark}
              data-selected={selectedNow || undefined}
              data-actionable={targetAction === undefined ? undefined : 'true'}
              data-action-selected={actionSelected || undefined}
            >
              <button
                type="button"
                className={css.actorButton}
                disabled={targetAction !== undefined && actionLocked}
                aria-label={targetAction === undefined
                  ? `${actor.label}，查看公开档案`
                  : `${actor.label}，${targetAction.label}`}
                aria-haspopup={targetAction === undefined ? 'dialog' : undefined}
                aria-expanded={targetAction === undefined ? selectedNow : undefined}
                aria-controls={targetAction === undefined ? 'roleplay-player-inspector' : undefined}
                aria-pressed={targetAction === undefined ? undefined : actionSelected}
                onClick={() => {
                  if (targetAction !== undefined) onSelectAction(targetAction)
                  else onSelectActor(selectedNow ? null : actor.id)
                }}
              >
                <span className={css.actorTopline}>
                  <span className={css.actorState} aria-hidden="true" />
                  <strong>{actor.label}</strong>
                  {markMeta(mark) !== undefined && (
                    <span className={css.markSymbol} aria-label={markMeta(mark)?.label}>
                      {markMeta(mark)?.symbol}
                    </span>
                  )}
                </span>
                <span className={css.actorBadges}>
                  {actor.badges?.map(badge => <em key={badge}>{badge}</em>)}
                  <small>{actor.detail ?? (actor.state === 'active' ? '当前在场' : '当前不在场')}</small>
                </span>
              </button>
              {targetAction !== undefined && (
                <button
                  type="button"
                  className={css.actorInspect}
                  aria-label={`查看${actor.label}公开档案`}
                  aria-haspopup="dialog"
                  aria-expanded={selectedNow}
                  aria-controls="roleplay-player-inspector"
                  onClick={() => { onSelectActor(selectedNow ? null : actor.id) }}
                >···</button>
              )}
            </li>
          )
        })}
      </ul>
      {targetActions.size > 0 && (
        <section className={css.targetControls} aria-label="目标行动">
          <div className={css.targetActionCopy} aria-live="polite">
            <p>{selectedTargetAction === undefined
              ? targetGuidance
              : `已选：${selectedTargetAction.label}`}</p>
            {selectedTargetAction === undefined && targetGuidanceDetail !== undefined && (
              <small>{targetGuidanceDetail}</small>
            )}
          </div>
          <div className={css.targetActionButtons}>
            {selectedTargetAction !== undefined && (
              <button
                type="button"
                className={css.primary}
                disabled={actionLocked}
                onClick={() => { onSubmitAction(selectedTargetAction) }}
              >
                确认{selectedTargetAction.label}
              </button>
            )}
            {companionActions.map(action => (
              <button
                key={action.id}
                type="button"
                className={action.emphasis === 'primary' ? css.primary : css.secondary}
                disabled={actionLocked}
                onClick={() => { onSubmitAction(action) }}
              >
                {action.label}
              </button>
            ))}
          </div>
        </section>
      )}
    </aside>
  )
}

function Review({ surface }: { surface: RoleplayPlayerSurface }) {
  const review = surface.review
  if (review === undefined) return null
  return (
    <section className={css.review} aria-label={review.title}>
      <header>
        <p>终局复盘</p>
        <h2>{review.title}</h2>
        <p>{review.detail}</p>
      </header>
      <ol>
        {review.entries.map(entry => (
          <li key={entry.id}>
            <details>
              <summary>
                <span>{entry.phase}</span>
                <strong>{entry.actor} · {entry.decision}</strong>
              </summary>
              <dl>
                <div><dt>选择理由</dt><dd>{entry.rationale}</dd></div>
                <div><dt>信心</dt><dd>{entry.confidence}</dd></div>
                <div><dt>引用依据</dt><dd>{entry.evidence.length === 0 ? '未引用额外依据' : entry.evidence.join('、')}</dd></div>
              </dl>
            </details>
          </li>
        ))}
      </ol>
    </section>
  )
}

function runningStatus(surface: RoleplayPlayerSurface): string {
  if (surface.progress !== undefined) return surface.progress.title
  if (surface.kind !== 'standard-werewolf') return '场景处理中'
  if (surface.phase.includes('警长竞选报名')) return '等待其他玩家报名'
  if (surface.phase.includes('警长投票') || surface.phase.includes('警长平票重投')) return '等待其他玩家投票'
  return '场景处理中'
}

function waitingGuidance(surface: RoleplayPlayerSurface, submittedActionLabel: string | null): string {
  if (surface.progress !== undefined) return surface.progress.detail
  if (submittedActionLabel !== null) return `已提交：${submittedActionLabel}`
  return '请稍候'
}

/** Render a generic Roleplay surface without interpreting scenario rules. */
export function RoleplayView({
  sessionId,
  useProjection,
  useSession,
  startScene,
  sendPrompt,
  runCommand,
}: RoleplayViewProps) {
  const surface = useProjection('roleplay')
  const running = useSession(snapshot => snapshot.running)
  const agentError = useSession(snapshot => snapshot.lastAgentError)
  const sessionKey = String(sessionId)
  const [draft, setDraft] = useState('')
  const [pending, setPending] = useState(false)
  const [launching, setLaunching] = useState(() => freshSceneLaunchRemainingMs() > 0)
  const [error, setError] = useState<string | null>(null)
  const [inputExpanded, setInputExpanded] = useState(false)
  const [selectedActorId, setSelectedActorId] = useState<RoleplaySurfaceActorId | null>(null)
  const [selectedActionId, setSelectedActionId] = useState<string | null>(null)
  const [submittedActionLabel, setSubmittedActionLabel] = useState<string | null>(null)
  const [marks, setMarks] = useState<PlayerMarks>(() => readPlayerMarks(sessionKey))
  const pendingRef = useRef(false)
  const automaticAttemptRef = useRef<string | null>(null)
  const recordViewport = useRef<HTMLDivElement | null>(null)
  const followLatestRecord = useRef(true)

  useEffect(() => {
    followLatestRecord.current = true
  }, [sessionKey])

  useEffect(() => {
    setInputExpanded(false)
    setSelectedActionId(null)
    setSubmittedActionLabel(null)
  }, [sessionKey, surface?.revision])

  useEffect(() => {
    if (!launching) return
    if (surface !== undefined && freshSceneLaunch?.sourceSessionId !== sessionKey) {
      finishFreshSceneLaunch()
      setLaunching(false)
      return
    }
    const remaining = freshSceneLaunchRemainingMs()
    if (remaining === 0) {
      finishFreshSceneLaunch()
      setLaunching(false)
      return
    }
    const timer = window.setTimeout(() => {
      finishFreshSceneLaunch()
      setLaunching(false)
    }, remaining)
    return () => { window.clearTimeout(timer) }
  }, [launching, sessionKey, surface])

  useEffect(() => {
    const viewport = recordViewport.current
    if (viewport === null || surface === undefined || surface === null) return
    if (!followLatestRecord.current) return
    viewport.scrollTop = viewport.scrollHeight
  }, [
    inputExpanded,
    pending,
    running,
    sessionKey,
    surface?.records.at(-1)?.id,
    surface?.progress?.records?.at(-1)?.id,
    surface?.narration.at(-1)?.revision,
  ])

  const submit = useCallback(async (
    value: string,
    trimPlayerInput: boolean,
    kind: 'prompt' | 'command',
    actionLabel: string | null = null,
  ) => {
    if (value.trim() === '' || pendingRef.current || running) return
    pendingRef.current = true
    setPending(true)
    setSubmittedActionLabel(actionLabel)
    setError(null)
    try {
      const submitted = trimPlayerInput ? value.trim() : value
      await (kind === 'command' ? runCommand(submitted) : sendPrompt(submitted))
      if (trimPlayerInput) setDraft('')
    } catch (cause) {
      setSubmittedActionLabel(null)
      setError(cause instanceof Error ? cause.message : String(cause))
    } finally {
      pendingRef.current = false
      setPending(false)
    }
  }, [runCommand, running, sendPrompt])

  useEffect(() => {
    if (surface === undefined
      || surface === null
      || surface.status === 'complete'
      || pending
      || running) return
    const action = surface.actions.find(candidate => candidate.automatic === true)
    if (action === undefined) return
    const attemptKey = `${sessionKey}:${String(surface.revision)}:${String(action.id)}`
    if (automaticAttemptRef.current === attemptKey) return
    automaticAttemptRef.current = attemptKey
    const value = action.submission.kind === 'prompt' ? action.submission.text : action.submission.line
    void submit(value, false, action.submission.kind, action.label)
  }, [pending, running, sessionKey, submit, surface])

  const launchScene = useCallback(async () => {
    if (pendingRef.current || running) return
    pendingRef.current = true
    setPending(true)
    setLaunching(true)
    beginFreshSceneLaunch(sessionKey)
    setError(null)
    let started = false
    try {
      await startScene()
      started = true
    } catch (cause) {
      finishFreshSceneLaunch()
      setError(cause instanceof Error ? cause.message : String(cause))
    } finally {
      pendingRef.current = false
      setPending(false)
      if (!started) setLaunching(false)
    }
  }, [running, sessionKey, startScene])

  const updateMark = useCallback((actorId: RoleplaySurfaceActorId, mark: PlayerMark | undefined) => {
    setMarks((current) => {
      const actorKey = String(actorId)
      const next = mark === undefined
        ? Object.fromEntries(Object.entries(current).filter(([key]) => key !== actorKey))
        : { ...current, [actorKey]: mark }
      persistPlayerMarks(sessionKey, next)
      return next
    })
  }, [sessionKey])

  const waiting = pending || running
  const visibleError = error ?? agentError
  if (surface === undefined) {
    return (
      <Preparation
        kind={launching ? 'preparing' : 'absent'}
        disabled={launching || running}
        error={error}
        onSubmit={() => { void launchScene() }}
      />
    )
  }
  if (surface === null) return <Preparation kind="unmatched" error={visibleError} />

  const locked = waiting || surface.status === 'complete'
  const surfaceInput = surface.input
  const inputNeedsChoice = surfaceInput !== undefined && surface.actions.length > 0
  const targetActions = new Map(surface.actions.flatMap(action =>
    action.actorId === undefined ? [] : [[String(action.actorId), action] as const]))
  const selectedTargetAction = surface.actions.find(action => String(action.id) === selectedActionId)
  const controlActions = surface.actions.filter(action => action.actorId === undefined
    && (action.automatic !== true || visibleError !== null))
  const targetCompanionActions = targetActions.size === 0 ? [] : controlActions
  const activityControlActions = targetActions.size === 0 ? controlActions : []
  const submitAction = (action: RoleplaySurfaceAction) => {
    void submit(
      action.submission.kind === 'prompt' ? action.submission.text : action.submission.line,
      false,
      action.submission.kind,
      action.label,
    )
  }

  return (
    <main
      className={css.view}
      data-roleplay-kind={surface.kind}
      data-conversation-composer="hidden"
      data-conversation-view="exclusive"
      aria-busy={waiting}
    >
      <header className={css.header}>
        <div className={css.gameIdentity}>
          <h1>{surface.title}</h1>
          <span aria-hidden="true">·</span>
          <p className={css.phase}>{surface.phase}</p>
        </div>
        <div className={css.headerActions}>
          <button
            type="button"
            className={css.secondary}
            disabled={waiting}
            onClick={() => { void launchScene() }}
          >
            {launching ? '正在开局…' : '新开一局'}
          </button>
          <span className={css.status} data-running={waiting ? 'true' : undefined} role="status">
            {surface.status === 'complete'
              ? '已结束'
              : launching
                ? '正在开局'
                : waiting && surface.progress !== undefined
                  ? surface.progress.title
                  : pending ? '正在提交行动' : running ? runningStatus(surface) : '等待你的行动'}
          </span>
        </div>
      </header>

      <div className={css.tabletop}>
        <section className={css.activity} aria-label="公开对局记录">
          <header className={css.panelHeader}>
            <div><h2>对局记录</h2></div>
          </header>
          <div
            ref={recordViewport}
            className={css.recordViewport}
            role="log"
            aria-label="对局时间线"
            onScroll={(event) => {
              const viewport = event.currentTarget
              const distanceFromLatest = viewport.scrollHeight - viewport.clientHeight - viewport.scrollTop
              followLatestRecord.current = distanceFromLatest <= 24
            }}
          >
            <div className={css.recordStack}>
              <PublicRecordFeed surface={surface} waiting={waiting} onSelectActor={setSelectedActorId} />
              <Review surface={surface} />
            </div>
          </div>

          {surface.notice !== undefined && (
            <section className={css.privateNotice} aria-label={surface.notice.title}>
              <span>仅你可见</span>
              <div>
                <strong>{surface.notice.title}</strong>
                <p>{surface.notice.text}</p>
              </div>
            </section>
          )}

          {(waiting
            || activityControlActions.length > 0
            || surfaceInput !== undefined
            || visibleError !== null) && (
            <section className={css.controls} aria-label="玩家行动">
              <div className={css.controlIntro}>
                <p className={css.guidance} aria-live="polite">
                  {waiting
                    ? waitingGuidance(surface, submittedActionLabel)
                    : surface.guidance}
                </p>
                {!waiting && surface.guidanceDetail !== undefined && (
                  <p className={css.guidanceDetail}>{surface.guidanceDetail}</p>
                )}
                {waiting
                && surface.progress?.completed !== undefined
                && surface.progress.total !== undefined
                && (
                  <div
                    className={css.progress}
                    role="progressbar"
                    aria-label={surface.progress.title}
                    aria-valuemin={0}
                    aria-valuemax={surface.progress.total}
                    aria-valuenow={surface.progress.completed}
                  >
                    <span style={{ width: `${String((surface.progress.completed / surface.progress.total) * 100)}%` }} />
                  </div>
                )}
              </div>
              {(activityControlActions.length > 0 || inputNeedsChoice) && (
                <div className={css.actions}>
                  {surfaceInput !== undefined && inputNeedsChoice && !inputExpanded && (
                    <button
                      type="button"
                      className={activityControlActions.length === 0 ? css.primary : css.secondary}
                      disabled={locked}
                      onClick={() => { setInputExpanded(true) }}
                    >
                      {surfaceInput.submitLabel}
                    </button>
                  )}
                  {activityControlActions.map(action => (
                    <button
                      key={action.id}
                      type="button"
                      className={action.emphasis === 'primary' ? css.primary : css.secondary}
                      disabled={locked}
                      onClick={() => { submitAction(action) }}
                    >
                      {action.automatic === true ? '重试' : action.label}
                    </button>
                  ))}
                </div>
              )}
              {surfaceInput !== undefined && (!inputNeedsChoice || inputExpanded) && (
                <form
                  className={css.freeform}
                  onSubmit={(event) => {
                    event.preventDefault()
                    const submission = surfaceInput.submission
                    void submit(
                      submission.kind === 'prompt' ? draft : `${submission.prefix} ${JSON.stringify(draft.trim())}`,
                      true,
                      submission.kind,
                    )
                  }}
                >
                  <label htmlFor="roleplay-player-input">输入内容</label>
                  <div>
                    <textarea
                      id="roleplay-player-input"
                      value={draft}
                      disabled={locked}
                      maxLength={surfaceInput.maxLength}
                      placeholder={surfaceInput.placeholder}
                      onChange={(event) => { setDraft(event.target.value) }}
                      onKeyDown={(event) => {
                        if (event.key !== 'Enter'
                        || event.shiftKey
                        || event.nativeEvent.isComposing
                        || locked
                        || draft.trim() === '') return
                        event.preventDefault()
                        event.currentTarget.form?.requestSubmit()
                      }}
                    />
                    <button type="submit" className={css.primary} disabled={locked || draft.trim() === ''}>
                      {surfaceInput.submitLabel}
                    </button>
                  </div>
                  {surfaceInput.maxLength !== undefined && (
                    <p className={css.inputLimit}>{draft.length}/{surfaceInput.maxLength}</p>
                  )}
                </form>
              )}
              {visibleError != null && <p className={css.error} role="alert">{visibleError}</p>}
            </section>
          )}
        </section>

        <PlayerBoard
          surface={surface}
          marks={marks}
          selectedActorId={selectedActorId}
          selectedActionId={selectedActionId}
          selectedTargetAction={selectedTargetAction}
          targetActions={targetActions}
          companionActions={targetCompanionActions}
          targetGuidance={surface.guidance}
          targetGuidanceDetail={surface.guidanceDetail}
          actionLocked={locked}
          onSelectActor={setSelectedActorId}
          onSelectAction={(action) => {
            setSelectedActionId(String(action.id))
            setSelectedActorId(null)
          }}
          onSubmitAction={submitAction}
          onMark={updateMark}
        />
      </div>
    </main>
  )
}
