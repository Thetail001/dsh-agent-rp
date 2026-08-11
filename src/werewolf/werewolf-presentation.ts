/**
 * Observer-safe Simplified Chinese presentation for the standard Werewolf scenario.
 * @module @deepseek-ai/dsh-roleplay-demo/werewolf-presentation
 */

import {
  asRoleplayActorId,
  asRoleplaySurfaceActionId,
  asRoleplaySurfaceActorId,
  asRoleplaySurfaceFactId,
  asRoleplaySurfaceKind,
  asRoleplaySurfaceRecordId,
  type RoleplayActorId,
  type RoleplayPlayerPresentation,
  type RoleplaySurfaceAction,
  type RoleplaySurfaceInput,
  type RoleplaySurfacePresenter,
  type RoleplaySurfaceRecord,
  type RoleplayView,
} from '../runtime/index.ts'
import {
  observerOf,
  SEATS,
  STANDARD_WEREWOLF_HUMAN_SEATS,
  standardWerewolfAlignmentIn,
  standardWerewolfRoleConfirmed,
  standardWerewolfRoleLabel,
  standardWerewolfRoleIn,
  standardWerewolfWolfProposals,
} from './werewolf.ts'
import { presentStandardWerewolfProgress } from './werewolf-progress.ts'
import { presentStandardWerewolfReview } from './werewolf-review.ts'
import { STANDARD_WEREWOLF_STATEMENT_MAX_LENGTH } from './werewolf-decision-limits.ts'

interface StandardWerewolfGuide {
  readonly phase: string
  readonly nextAction: string
  readonly nextActionDetail?: string
  readonly status: 'active' | 'complete'
  readonly actions: readonly RoleplaySurfaceAction[]
  readonly input?: RoleplaySurfaceInput
}

function roundAt(location: string, phase: string): number | undefined {
  const match = new RegExp(`^${phase}-(\\d+)$`).exec(location)
  return match?.[1] === undefined ? undefined : Number(match[1])
}

function hunterShotAt(location: string): { readonly origin: 'night' | 'exile'; readonly round: number } | undefined {
  const match = /^hunter-shot-(night|exile)-(\d+)$/.exec(location)
  if (match?.[1] === undefined || match[2] === undefined) return undefined
  return { origin: match[1] as 'night' | 'exile', round: Number(match[2]) }
}

function seatLabel(actorId: RoleplayActorId): string {
  const match = /^seat-(\d+)$/.exec(actorId)
  if (match?.[1] === undefined) {
    throw new Error(`standard Werewolf player presentation found invalid seat ${JSON.stringify(actorId)}`)
  }
  return `${match[1]} 号玩家`
}

function seatList(actorIds: readonly RoleplayActorId[]): string {
  return actorIds.map(seatLabel).join('、')
}

function firstSeat(actorIds: readonly RoleplayActorId[], phase: string): RoleplayActorId {
  const [first] = actorIds
  if (first === undefined) {
    throw new Error(`standard Werewolf player presentation found no candidates during ${phase}`)
  }
  return first
}

function candidateIds(view: RoleplayView): RoleplayActorId[] {
  const prefix = 'sheriff:candidate:'
  return view.choices.flatMap((choice) => {
    const id = String(choice.id)
    return id.startsWith(prefix) ? [asRoleplayActorId(id.slice(prefix.length))] : []
  })
}

function nightWolfTarget(view: RoleplayView, round: number): RoleplayActorId | undefined {
  const prefix = `night:${String(round)}:wolf-kill:`
  const id = view.choices.map(choice => String(choice.id)).find(choiceId => choiceId.startsWith(prefix))
  return id === undefined ? undefined : seatFromRecord(id.slice(prefix.length))
}

function potionSpent(view: RoleplayView, potion: 'save' | 'poison'): boolean {
  return view.choices.some(choice => new RegExp(`^night:\\d+:witch:${potion}:`, 'u').test(String(choice.id)))
}

function surfaceActorId(actorId: RoleplayActorId) {
  return asRoleplaySurfaceActorId(String(actorId))
}

function seatFromRecord(value: string): RoleplayActorId | undefined {
  const actorId = asRoleplayActorId(value)
  return SEATS.includes(actorId) ? actorId : undefined
}

function statementAfter(text: string, prefix: string, fallback: string): string {
  return text.startsWith(prefix) ? text.slice(prefix.length).trim() : fallback
}

interface SheriffBallotReference {
  readonly phase: string
  readonly targetId?: RoleplayActorId
}

function sheriffBallotReference(choiceId: string): SheriffBallotReference | undefined {
  const ballot = /^sheriff-(election|pk):(\d+):seat-\d+:(seat-\d+|abstain)$/u.exec(choiceId)
  if (ballot?.[1] === undefined || ballot[2] === undefined || ballot[3] === undefined) return undefined
  const targetId = ballot[3] === 'abstain' ? undefined : seatFromRecord(ballot[3])
  if (ballot[3] !== 'abstain' && targetId === undefined) return undefined
  return {
    phase: `第 ${ballot[2]} 天 · ${ballot[1] === 'pk' ? '警长平票重投' : '警长投票'}`,
    ...(targetId === undefined ? {} : { targetId }),
  }
}

function precedingSheriffBallots(
  view: RoleplayView,
  outcomeIndex: number,
): { readonly phase: string; readonly targets: readonly (RoleplayActorId | undefined)[] } | undefined {
  const targets: (RoleplayActorId | undefined)[] = []
  let phase: string | undefined
  for (let index = outcomeIndex - 1; index >= 0; index -= 1) {
    const ballot = sheriffBallotReference(String(view.choices[index]?.id))
    if (ballot === undefined || (phase !== undefined && ballot.phase !== phase)) break
    phase = ballot.phase
    targets.push(ballot.targetId)
  }
  return phase === undefined ? undefined : { phase, targets }
}

function uncontestedSheriffCandidate(view: RoleplayView, outcomeIndex: number): RoleplayActorId | undefined {
  if (view.choices.slice(0, outcomeIndex).some(choice => sheriffBallotReference(String(choice.id)) !== undefined)) {
    return undefined
  }
  const candidates = view.choices.slice(0, outcomeIndex).flatMap((choice) => {
    const id = /^sheriff:candidate:(seat-\d+)$/u.exec(String(choice.id))?.[1]
    const actorId = id === undefined ? undefined : seatFromRecord(id)
    return actorId === undefined ? [] : [actorId]
  })
  return candidates.length === 1 ? candidates[0] : undefined
}

function publicRecords(view: RoleplayView): RoleplaySurfaceRecord[] {
  return view.choices.flatMap((choice, choiceIndex): RoleplaySurfaceRecord[] => {
    const id = String(choice.id)
    const recordId = asRoleplaySurfaceRecordId(id)
    const candidate = /^sheriff:candidate:(seat-\d+)$/u.exec(id)?.[1]
    if (candidate !== undefined) {
      const actorId = seatFromRecord(candidate)
      if (actorId === undefined) return []
      return [{
        id: recordId,
        kind: 'statement',
        phase: '第 1 天 · 警长竞选报名',
        actorId: surfaceActorId(actorId),
        text: statementAfter(choice.text, `${actorId} stood for Sheriff:`, '报名参选'),
      }]
    }

    const sheriffBallot = /^sheriff-(election|pk):(\d+):(seat-\d+):(seat-\d+|abstain)$/u.exec(id)
    if (sheriffBallot?.[1] !== undefined
      && sheriffBallot[2] !== undefined
      && sheriffBallot[3] !== undefined
      && sheriffBallot[4] !== undefined) {
      const actorId = seatFromRecord(sheriffBallot[3])
      const targetId = sheriffBallot[4] === 'abstain' ? undefined : seatFromRecord(sheriffBallot[4])
      if (actorId === undefined || (sheriffBallot[4] !== 'abstain' && targetId === undefined)) return []
      return [{
        id: recordId,
        kind: 'ballot',
        phase: `第 ${sheriffBallot[2]} 天 · ${sheriffBallot[1] === 'pk' ? '警长平票重投' : '警长投票'}`,
        actorId: surfaceActorId(actorId),
        ...(targetId === undefined ? {} : { targetActorId: surfaceActorId(targetId) }),
        text: targetId === undefined ? '弃票' : `投给${seatLabel(targetId)}`,
      }]
    }

    const speech = /^day:(\d+):speech:(seat-\d+)$/u.exec(id)
    if (speech?.[1] !== undefined && speech[2] !== undefined) {
      const actorId = seatFromRecord(speech[2])
      if (actorId === undefined) return []
      return [{
        id: recordId,
        kind: 'statement',
        phase: `第 ${speech[1]} 天 · 公开发言`,
        actorId: surfaceActorId(actorId),
        text: statementAfter(choice.text, `${actorId}:`, choice.text),
      }]
    }

    const exileBallot = /^day:(\d+):(exile-vote|pk-vote):(seat-\d+):(seat-\d+|abstain)$/u.exec(id)
    if (exileBallot?.[1] !== undefined
      && exileBallot[2] !== undefined
      && exileBallot[3] !== undefined
      && exileBallot[4] !== undefined) {
      const actorId = seatFromRecord(exileBallot[3])
      const targetId = exileBallot[4] === 'abstain' ? undefined : seatFromRecord(exileBallot[4])
      if (actorId === undefined || (exileBallot[4] !== 'abstain' && targetId === undefined)) return []
      return [{
        id: recordId,
        kind: 'ballot',
        phase: `第 ${exileBallot[1]} 天 · ${exileBallot[2] === 'pk-vote' ? '放逐平票重投' : '放逐投票'}`,
        actorId: surfaceActorId(actorId),
        ...(targetId === undefined ? {} : { targetActorId: surfaceActorId(targetId) }),
        text: targetId === undefined ? '弃票' : `投给${seatLabel(targetId)}`,
      }]
    }

    const sheriff = /^sheriff:holder:(seat-\d+)$/u.exec(id)?.[1]
    if (sheriff !== undefined) {
      const actorId = seatFromRecord(sheriff)
      if (actorId === undefined) return []
      const election = precedingSheriffBallots(view, choiceIndex)
      const uncontested = election === undefined ? uncontestedSheriffCandidate(view, choiceIndex) : undefined
      const votes = election?.targets.filter(targetId => targetId === actorId).length
      return [{
        id: recordId,
        kind: 'outcome',
        phase: election?.phase ?? (uncontested === actorId ? '第 1 天 · 警长竞选' : '警徽流转'),
        actorId: surfaceActorId(actorId),
        text: election === undefined
          ? uncontested === actorId
            ? `${seatLabel(actorId)}唯一参选，自动当选警长`
            : `${seatLabel(actorId)}持有警徽`
          : `${seatLabel(actorId)}当选警长 · ${String(votes)} 票`,
      }]
    }
    if (id === 'sheriff:none' || id === 'sheriff:destroyed') {
      const election = id === 'sheriff:none' ? precedingSheriffBallots(view, choiceIndex) : undefined
      return [{
        id: recordId,
        kind: 'outcome',
        phase: election?.phase ?? (id === 'sheriff:none' ? '第 1 天 · 警长竞选' : '警徽流转'),
        text: id === 'sheriff:none'
          ? election === undefined ? '无人报名，本局没有警长' : '本轮未产生警长'
          : '警徽已销毁',
      }]
    }
    return []
  })
}

function currentVisibleSheriff(view: RoleplayView): RoleplayActorId | undefined {
  const marker = view.choices.findLast((choice) => {
    const id = String(choice.id)
    return id === 'sheriff:none' || id === 'sheriff:destroyed' || id.startsWith('sheriff:holder:')
  })
  if (marker === undefined || marker.id === 'sheriff:none' || marker.id === 'sheriff:destroyed') return undefined
  return seatFromRecord(String(marker.id).slice('sheriff:holder:'.length))
}

function pendingBadgeHolder(view: RoleplayView): RoleplayActorId | undefined {
  if (view.scene.location.startsWith('game-over-')) return undefined
  const marker = view.choices.findLast((choice) => {
    const id = String(choice.id)
    return id === 'sheriff:destroyed' || id.startsWith('sheriff:holder:')
  })
  if (marker === undefined || marker.id === 'sheriff:destroyed') return undefined
  const holder = asRoleplayActorId(String(marker.id).slice('sheriff:holder:'.length))
  const actor = view.actors.find(candidate => candidate.id === holder)
  return actor !== undefined && actor.location !== 'alive' && actor.location !== 'revealed-idiot'
    ? holder
    : undefined
}

function coordinatedAction(
  id: string,
  label: string,
  revision: number,
  emphasis: RoleplaySurfaceAction['emphasis'] = 'secondary',
  options: {
    readonly actorId?: RoleplayActorId
    readonly automatic?: boolean
  } = {},
): RoleplaySurfaceAction {
  return {
    id: asRoleplaySurfaceActionId(id),
    label,
    submission: { kind: 'command', line: `/roleplay-action ${String(revision)} ${id}` },
    emphasis,
    ...(options.actorId === undefined ? {} : { actorId: surfaceActorId(options.actorId) }),
    ...(options.automatic === true ? { automatic: true } : {}),
  }
}

function guide(
  phase: string,
  nextAction: string,
  actions: readonly RoleplaySurfaceAction[],
  input?: RoleplaySurfaceInput,
  status: StandardWerewolfGuide['status'] = 'active',
  nextActionDetail?: string,
): StandardWerewolfGuide {
  return {
    phase,
    nextAction,
    ...(nextActionDetail === undefined ? {} : { nextActionDetail }),
    actions,
    ...(input === undefined ? {} : { input }),
    status,
  }
}

function assertHumanView(view: RoleplayView): NonNullable<RoleplayView['actors'][number]> {
  const humanActorId = STANDARD_WEREWOLF_HUMAN_SEATS.find(
    actorId => view.observerId === observerOf(actorId),
  )
  if (humanActorId === undefined) {
    throw new Error(
      'standard Werewolf player presentation requires observer for a playable seat, '
      + `got ${JSON.stringify(view.observerId)}`,
    )
  }
  const human = view.actors.find(actor => actor.id === humanActorId)
  if (human === undefined) throw new Error('standard Werewolf player presentation cannot find the human seat')
  return human
}

function roleIntroduction(view: RoleplayView, actorId: RoleplayActorId): string {
  const role = standardWerewolfRoleIn(view, actorId)
  switch (role) {
    case 'villager':
      return '好人阵营，没有夜间技能；白天通过发言和投票找出狼人'
    case 'seer':
      return '好人阵营；每夜可查验一名其他存活玩家的阵营，结果仅你可见'
    case 'witch':
      return '好人阵营；持有一瓶解药和一瓶毒药，每晚最多使用一瓶，仅第一夜可以自救，且不能毒杀自己'
    case 'hunter':
      return '好人阵营；被狼人袭击或被放逐出局时必须开枪带走一名存活玩家，中毒出局不能开枪'
    case 'idiot':
      return '好人阵营；被放逐时翻牌并继续留在场上，此后失去投票权'
    case 'wolf': {
      const sameSide = view.actors
        .filter(candidate => candidate.id !== actorId
          && view.facts.some(fact => String(fact.id) === `${String(candidate.id)}-role`)
          && standardWerewolfRoleIn(view, candidate.id) === 'wolf')
        .map(candidate => candidate.id)
      return `狼人阵营；每夜各自提出目标，再由所有存活狼人等权投票；最高票目标生效，平票按本夜随机顺序决定；同阵营：${seatList(sameSide)}`
    }
  }
}

function standardWerewolfGuide(view: RoleplayView): StandardWerewolfGuide {
  const human = assertHumanView(view)
  const humanRole = standardWerewolfRoleIn(view, human.id)
  const location = view.scene.location
  if (view.revision === 0
    && location === 'night-1'
    && !standardWerewolfRoleConfirmed(view, human.id)) {
    return guide(
      '身份确认',
      '确认身份后进入第一夜',
      [coordinatedAction('role-confirm', '进入第一夜', view.revision)],
    )
  }
  const hunterShot = hunterShotAt(location)
  if (hunterShot !== undefined) {
    if (humanRole === 'hunter') {
      const targets = view.actors
        .filter(actor => actor.location === 'alive' || actor.location === 'revealed-idiot')
        .map(actor => actor.id)
      return guide(
        hunterShot.origin === 'night'
          ? `第 ${hunterShot.round} 天 · 猎人结算`
          : `第 ${hunterShot.round} 天 · 放逐后猎人结算`,
        '选择猎人的开枪目标',
        targets.map(target => coordinatedAction(
          `hunter-shot-${String(target)}`,
          `开枪带走 ${seatLabel(target)}`,
          view.revision,
          'secondary',
          { actorId: target },
        )),
        undefined,
        'active',
        '猎人不能放弃开枪',
      )
    }
    return guide(
      hunterShot.origin === 'night'
        ? `第 ${hunterShot.round} 天 · 猎人结算`
        : `第 ${hunterShot.round} 天 · 放逐后猎人结算`,
      '猎人正在选择开枪目标',
      [coordinatedAction(
        'hunter-shot-continue',
        '等待猎人行动',
        view.revision,
        'primary',
        { automatic: true },
      )],
    )
  }
  const deadSheriff = pendingBadgeHolder(view)
  if (deadSheriff !== undefined) {
    if (deadSheriff !== human.id) {
      return guide(
        '警徽流转',
        `${seatLabel(deadSheriff)}已出局，正在决定警徽去向`,
        [coordinatedAction(
          'sheriff-badge-continue',
          '等待警徽去向',
          view.revision,
          'primary',
          { automatic: true },
        )],
      )
    }
    const targets = view.actors
      .filter(actor => actor.location === 'alive' || actor.location === 'revealed-idiot')
      .map(actor => actor.id)
    return guide(
      '警徽流转',
      '决定警徽去向',
      [
        ...targets.map(target => coordinatedAction(
          `sheriff-badge-${String(target)}`,
          `移交给 ${seatLabel(target)}`,
          view.revision,
          'secondary',
          { actorId: target },
        )),
        coordinatedAction('sheriff-badge-destroy', '销毁警徽', view.revision),
      ],
      undefined,
      'active',
      '警徽可移交给一名存活玩家，也可销毁',
    )
  }
  const night = roundAt(location, 'night')
  if (night !== undefined) {
    const role = humanRole
    if (human.location === 'alive' && role === 'seer') {
      const targets = view.actors
        .filter(actor => actor.location === 'alive' && actor.id !== human.id)
        .map(actor => actor.id)
      return guide(
        `第 ${night} 夜`,
        '选择今晚要查验的玩家',
        targets.map(target => coordinatedAction(
          `night-${String(night)}-seer-${String(target)}`,
          `查验 ${seatLabel(target)}`,
          view.revision,
          'secondary',
          { actorId: target },
        )),
        undefined,
        'active',
        '查验结果仅你可见',
      )
    }
    if (human.location === 'alive' && role === 'wolf') {
      const targets = view.actors
        .filter(actor => actor.location === 'alive')
        .map(actor => actor.id)
      const proposals = standardWerewolfWolfProposals(view, night)
      if (proposals.length > 0) {
        return guide(
          `第 ${night} 夜`,
          '投出狼队最终票',
          targets.map(target => coordinatedAction(
            `night-${String(night)}-wolf-vote-${String(target)}`,
            `投给 ${seatLabel(target)}`,
            view.revision,
            'secondary',
            { actorId: target },
          )),
          undefined,
          'active',
          `每名存活狼人一票，最高票目标生效；平票按本夜随机顺序决定。当前提议：${proposals.map(proposal =>
            `${seatLabel(proposal.actorId)} → ${seatLabel(proposal.targetId)}`).join('；')}`,
        )
      }
      return guide(
        `第 ${night} 夜`,
        '提出一名袭击目标',
        targets.map(target => coordinatedAction(
          `night-${String(night)}-wolf-propose-${String(target)}`,
          `提议 ${seatLabel(target)}`,
          view.revision,
          'secondary',
          { actorId: target },
        )),
        undefined,
        'active',
        '提交后汇总所有存活狼人的提议',
      )
    }
    if (human.location === 'alive' && role === 'witch') {
      const wolfTarget = nightWolfTarget(view, night)
      if (wolfTarget === undefined) {
        return guide(
          `第 ${night} 夜`,
          '等待狼人行动',
          [coordinatedAction(
            `night-${String(night)}-witch-observe`,
            '查看今晚情况',
            view.revision,
            'primary',
            { automatic: true },
          )],
          undefined,
          'active',
          '狼人行动后，女巫决定是否用药',
        )
      }
      const canSave = !potionSpent(view, 'save') && (wolfTarget !== human.id || night === 1)
      const canPoison = !potionSpent(view, 'poison')
      const poisonTargets = view.actors
        .filter(actor => actor.location === 'alive' && actor.id !== human.id)
        .map(actor => actor.id)
      return guide(
        `第 ${night} 夜`,
        '选择今晚的用药方式',
        [
          ...(canSave ? [coordinatedAction(
            `night-${String(night)}-witch-save`,
            `使用解药救下 ${seatLabel(wolfTarget)}`,
            view.revision,
          )] : []),
          ...(canPoison ? poisonTargets.map(target => coordinatedAction(
            `night-${String(night)}-witch-poison-${String(target)}`,
            `使用毒药毒杀 ${seatLabel(target)}`,
            view.revision,
            'secondary',
            { actorId: target },
          )) : []),
          coordinatedAction(`night-${String(night)}-witch-pass`, '不使用药剂', view.revision),
        ],
        undefined,
        'active',
        `今晚，${seatLabel(wolfTarget)}遭到狼人袭击`,
      )
    }
    return guide(
      `第 ${night} 夜`,
      '等待天亮',
      [coordinatedAction(
        `night-${night}`,
        '等待天亮',
        view.revision,
        'primary',
        { automatic: true },
      )],
      undefined,
      'active',
      human.location === 'alive'
        ? `${standardWerewolfRoleLabel(role)}夜间没有可执行的技能`
        : '出局玩家不再参与夜间行动',
    )
  }

  const sheriffElection = roundAt(location, 'sheriff-election')
  if (sheriffElection !== undefined) {
    const candidates = candidateIds(view)
    if (candidates.length === 0) {
      if (human.location !== 'alive') {
        return guide(
          `第 ${sheriffElection} 天 · 警长竞选报名`,
          '你已出局，可旁观其他玩家报名',
          [coordinatedAction(
            'sheriff-registration-continue',
            '查看报名结果',
            view.revision,
            'primary',
            { automatic: true },
          )],
        )
      }
      return guide(
        `第 ${sheriffElection} 天 · 警长竞选报名`,
        '是否参加警长竞选？',
        [coordinatedAction('sheriff-skip', '不竞选', view.revision)],
        {
          placeholder: '输入竞选发言',
          submitLabel: '参加竞选',
          maxLength: STANDARD_WEREWOLF_STATEMENT_MAX_LENGTH,
          submission: {
            kind: 'command',
            prefix: `/roleplay-action ${String(view.revision)} sheriff-join`,
          },
        },
        'active',
        '参选者需填写竞选发言',
      )
    }
    const labels = seatList(candidates)
    const humanCanVote = human.location === 'alive' && !candidates.includes(human.id)
    return guide(
      `第 ${sheriffElection} 天 · 警长投票`,
      !humanCanVote
        ? human.location === 'alive'
          ? '候选人不参与本轮投票'
          : '你已出局，可旁观本轮投票'
        : '选择一名候选人，或弃票',
      !humanCanVote
        ? [coordinatedAction(
          'sheriff-vote-continue',
          human.location === 'alive' ? '等待投票结果' : '查看投票结果',
          view.revision,
          'primary',
          { automatic: true },
        )]
        : [
          ...candidates.map(candidate => coordinatedAction(
            `sheriff-vote-${String(candidate)}`,
            `投给 ${seatLabel(candidate)}`,
            view.revision,
            'secondary',
            { actorId: candidate },
          )),
          coordinatedAction('sheriff-vote-abstain', '弃票', view.revision),
        ],
      undefined,
      'active',
      humanCanVote ? `候选人：${labels}` : undefined,
    )
  }

  const sheriffPk = roundAt(location, 'sheriff-pk')
  if (sheriffPk !== undefined) {
    const candidates = view.scene.participantIds
    if (candidates.length === 0) {
      throw new Error('standard Werewolf player presentation found no candidates during Sheriff runoff')
    }
    const labels = seatList(candidates)
    const humanCanVote = human.location === 'alive' && !candidates.includes(human.id)
    return guide(
      `第 ${sheriffPk} 天 · 警长平票重投`,
      !humanCanVote
        ? human.location === 'alive'
          ? '平票候选人不参与本轮重投'
          : '你已出局，可旁观本轮重投'
        : '在平票候选人中选择一人，或弃票',
      !humanCanVote
        ? [coordinatedAction(
          'sheriff-runoff-continue',
          human.location === 'alive' ? '等待重投结果' : '查看重投结果',
          view.revision,
          'primary',
          { automatic: true },
        )]
        : [
          ...candidates.map(candidate => coordinatedAction(
            `sheriff-runoff-${String(candidate)}`,
            `投给 ${seatLabel(candidate)}`,
            view.revision,
            'secondary',
            { actorId: candidate },
          )),
          coordinatedAction('sheriff-runoff-abstain', '弃票', view.revision),
        ],
      undefined,
      'active',
      humanCanVote ? `候选人：${labels}` : undefined,
    )
  }

  const discussion = roundAt(location, 'discussion')
  if (discussion !== undefined) {
    const speechPrefix = `day:${String(discussion)}:speech:`
    const spoken = new Set(view.choices.flatMap(choice => String(choice.id).startsWith(speechPrefix)
      ? [String(choice.id).slice(speechPrefix.length)]
      : []))
    const nextSpeaker = view.actors.find(actor => actor.location === 'alive' && !spoken.has(String(actor.id)))
    if (nextSpeaker === undefined) {
      throw new Error('standard Werewolf player presentation found no remaining discussion speaker')
    }
    const humanTurn = nextSpeaker.id === human.id
    return humanTurn
      ? guide(
        `第 ${discussion} 天 · 公开发言`,
        '轮到你发言',
        [],
        {
          placeholder: '输入发言内容',
          submitLabel: '发言',
          maxLength: STANDARD_WEREWOLF_STATEMENT_MAX_LENGTH,
          submission: {
            kind: 'command',
            prefix: `/roleplay-action ${String(view.revision)} discussion-speak`,
          },
        },
        'active',
        '每名存活玩家本轮发言一次，也可选择“过”',
      )
      : guide(
        `第 ${discussion} 天 · 公开发言`,
        human.location === 'alive'
          ? `${seatLabel(nextSpeaker.id)}先发言`
          : '你已出局，可旁观本轮发言',
        [coordinatedAction(
          'discussion-continue',
          human.location !== 'alive'
            ? '听其他玩家发言'
            : spoken.has(String(human.id)) ? '开始后续发言' : '开始发言',
          view.revision,
          'primary',
          { automatic: true },
        )],
        undefined,
        'active',
        human.location === 'alive'
          ? spoken.has(String(human.id))
            ? '其他玩家按座位顺序发言'
            : '轮到你时，输入框会自动出现'
          : `下一位：${seatLabel(nextSpeaker.id)}`,
      )
  }

  const exileVote = roundAt(location, 'exile-vote')
  if (exileVote !== undefined) {
    if (human.location !== 'alive') {
      return guide(
        `第 ${exileVote} 天 · 放逐投票`,
        '你已出局，可旁观本轮投票',
        [coordinatedAction(
          'exile-vote-continue',
          '查看投票结果',
          view.revision,
          'primary',
          { automatic: true },
        )],
      )
    }
    const candidates = view.actors
      .filter(actor => (
        actor.location === 'alive' || actor.location === 'revealed-idiot'
      ) && actor.id !== human.id)
      .map(actor => actor.id)
    firstSeat(candidates, 'exile vote')
    return guide(
      `第 ${exileVote} 天 · 放逐投票`,
      '选择一名玩家放逐，或弃票',
      [
        ...candidates.map(candidate => coordinatedAction(
          `exile-vote-${String(candidate)}`,
          `放逐 ${seatLabel(candidate)}`,
          view.revision,
          'secondary',
          { actorId: candidate },
        )),
        coordinatedAction('exile-vote-abstain', '弃票', view.revision),
      ],
      undefined,
      'active',
      '投票提交后不可更改',
    )
  }

  const exilePk = roundAt(location, 'exile-pk')
  if (exilePk !== undefined) {
    const candidates = view.scene.participantIds
    const labels = seatList(candidates)
    firstSeat(candidates, 'exile runoff')
    const humanCanVote = human.location === 'alive' && !candidates.includes(human.id)
    return guide(
      `第 ${exilePk} 天 · 放逐平票重投`,
      !humanCanVote
        ? human.location === 'alive'
          ? '平票候选人不参与本轮重投'
          : '你已出局，可旁观本轮重投'
        : '在平票候选人中选择一人，或弃票',
      !humanCanVote
        ? [coordinatedAction(
          'exile-runoff-continue',
          human.location === 'alive' ? '等待重投结果' : '查看重投结果',
          view.revision,
          'primary',
          { automatic: true },
        )]
        : [
          ...candidates.map(candidate => coordinatedAction(
            `exile-runoff-${String(candidate)}`,
            `放逐 ${seatLabel(candidate)}`,
            view.revision,
            'secondary',
            { actorId: candidate },
          )),
          coordinatedAction('exile-runoff-abstain', '弃票', view.revision),
        ],
      undefined,
      'active',
      humanCanVote ? `候选人：${labels}；投票提交后不可更改` : undefined,
    )
  }

  if (location === 'game-over-good' || location === 'game-over-wolves') {
    return guide(
      '游戏结束',
      '这局已经结束。新建一局即可再次游玩。',
      [],
      undefined,
      'complete',
    )
  }

  throw new Error(
    `standard Werewolf player presentation does not support scene ${JSON.stringify(location)}`,
  )
}

function visibleFactText(
  view: RoleplayView,
  id: string,
  text: string,
  humanActorId: RoleplayActorId,
): string {
  if (id === `${humanActorId}-role`) {
    return `你的身份：${standardWerewolfRoleLabel(standardWerewolfRoleIn(view, humanActorId))}。`
  }
  if (id === `${humanActorId}-alignment`) {
    return `你的阵营：${standardWerewolfAlignmentIn(view, humanActorId) === 'wolf' ? '狼人' : '好人'}阵营。`
  }
  if (id === 'standard-good-victory') return '好人阵营赢得了本局游戏。'
  if (id === 'standard-wolf-victory') return '狼人阵营通过屠边赢得了本局游戏。'
  const roleMatch = /^(seat-\d+)-role$/u.exec(id)
  if (roleMatch?.[1] !== undefined) {
    const actorId = asRoleplayActorId(roleMatch[1])
    if (!SEATS.includes(actorId)) return text
    const role = standardWerewolfRoleLabel(standardWerewolfRoleIn(view, actorId))
    return `${seatLabel(actorId)}的身份：${role}。`
  }
  const alignmentMatch = /^(seat-\d+)-alignment$/u.exec(id)
  if (alignmentMatch?.[1] !== undefined) {
    const actorId = asRoleplayActorId(alignmentMatch[1])
    if (!SEATS.includes(actorId)) return text
    return `${seatLabel(actorId)}的阵营：${standardWerewolfAlignmentIn(view, actorId) === 'wolf' ? '狼人' : '好人'}阵营。`
  }
  return text
}

function isActorKnowledgeFact(id: string): boolean {
  return /^seat-\d+-(?:role|alignment)$/u.test(id)
}

function visibleActorDetail(
  view: RoleplayView,
  actorId: RoleplayActorId,
  humanActorId: RoleplayActorId,
): string | undefined {
  const roleVisible = view.facts.some(fact => String(fact.id) === `${String(actorId)}-role`)
  if (roleVisible) {
    const role = standardWerewolfRoleIn(view, actorId)
    if (actorId !== humanActorId
      && role === 'wolf'
      && standardWerewolfRoleIn(view, humanActorId) === 'wolf') return '队友'
    return standardWerewolfRoleLabel(role)
  }
  const alignmentVisible = view.facts.some(fact => String(fact.id) === `${String(actorId)}-alignment`)
  if (!alignmentVisible || actorId === humanActorId) return undefined
  return `查验：${standardWerewolfAlignmentIn(view, actorId) === 'wolf' ? '狼人' : '好人'}阵营`
}

function privateNotice(view: RoleplayView, humanActorId: RoleplayActorId): { readonly title: string; readonly text: string } | undefined {
  if (standardWerewolfRoleIn(view, humanActorId) !== 'seer') return undefined
  const inspection = view.choices.findLast(choice => /^night:\d+:seer:inspect:seat-\d+$/u.test(String(choice.id)))
  if (inspection === undefined) return undefined
  const targetId = String(inspection.id).split(':').at(-1)
  if (targetId === undefined) throw new Error('standard Werewolf Seer inspection lacks its target')
  const factId = `${targetId}-alignment`
  const fact = view.facts.find(candidate => String(candidate.id) === factId)
  if (fact === undefined) throw new Error('standard Werewolf Seer inspection lacks its revealed alignment')
  return { title: '查验结果', text: visibleFactText(view, factId, fact.text, humanActorId) }
}

/**
 * Produce the complete scenario-owned player surface from one safe view.
 * @param view - observer-safe standard Werewolf view for the human player.
 * @returns Chinese phase, roster, facts, shortcuts, and optional freeform input.
 */
export function presentStandardWerewolfPlayerSurface(view: RoleplayView): RoleplayPlayerPresentation {
  const human = assertHumanView(view)
  const current = standardWerewolfGuide(view)
  const sheriff = currentVisibleSheriff(view)
  const roleConfirmed = standardWerewolfRoleConfirmed(view, human.id)
  const notice = view.revision === 0
    && !roleConfirmed
    && view.scene.location === 'night-1'
    ? {
      title: `你的身份 · ${standardWerewolfRoleLabel(standardWerewolfRoleIn(view, human.id))}`,
      text: roleIntroduction(view, human.id),
    }
    : privateNotice(view, human.id)
  return {
    kind: asRoleplaySurfaceKind('standard-werewolf'),
    locale: 'zh-CN',
    title: '十二人狼人杀',
    phase: current.phase,
    guidance: current.nextAction,
    ...(current.nextActionDetail === undefined ? {} : { guidanceDetail: current.nextActionDetail }),
    status: current.status,
    actors: view.actors.map((actor) => {
      const living = actor.location === 'alive' || actor.location === 'revealed-idiot'
      const knownDetail = visibleActorDetail(view, actor.id, human.id)
      const selfDetail = knownDetail ?? standardWerewolfRoleLabel(standardWerewolfRoleIn(view, human.id))
      const badges = [
        ...(actor.id === human.id ? ['你'] : []),
        ...(actor.id === sheriff ? ['警长'] : []),
        ...(actor.location === 'revealed-idiot' ? ['白痴已翻牌'] : []),
      ]
      return {
        id: surfaceActorId(actor.id),
        label: seatLabel(actor.id),
        state: living ? 'active' : 'inactive',
        detail: actor.id === human.id
          ? living ? selfDetail : `已出局 · ${selfDetail}`
          : actor.location === 'revealed-idiot'
            ? '存活 · 白痴已翻牌'
            : living ? knownDetail ?? '存活' : knownDetail === undefined ? '已出局' : `已出局 · ${knownDetail}`,
        ...(badges.length === 0 ? {} : { badges }),
      }
    }),
    facts: view.facts
      .filter(fact => !isActorKnowledgeFact(String(fact.id)))
      .map(fact => ({
        id: asRoleplaySurfaceFactId(String(fact.id)),
        text: visibleFactText(view, String(fact.id), fact.text, human.id),
      })),
    ...(notice === undefined ? {} : { notice }),
    records: publicRecords(view),
    actions: current.actions,
    ...(current.input === undefined ? {} : { input: current.input }),
  }
}

/** Standard Werewolf presenter registered by the Web profile plugin. */
export const STANDARD_WEREWOLF_PRESENTER: RoleplaySurfacePresenter = {
  name: 'standard-werewolf',
  matches: view => STANDARD_WEREWOLF_HUMAN_SEATS.some(
    actorId => view.observerId === observerOf(actorId),
  )
    && view.actors.length === SEATS.length
    && SEATS.every(seat => view.actors.some(actor => actor.id === seat)),
  present: presentStandardWerewolfPlayerSurface,
  narration: (before, after, text) => roundAt(before.scene.location, 'night') !== undefined
    && before.scene.location === after.scene.location
    ? null
    : text,
  progress: presentStandardWerewolfProgress,
  review: presentStandardWerewolfReview,
}

/**
 * Render the current public phase and one actionable next-turn hint.
 * @param view - observer-safe standard Werewolf view for the human player.
 * @returns two-line Simplified Chinese player guidance without protocol ids.
 */
export function renderStandardWerewolfPlayerGuide(view: RoleplayView): string {
  const current = standardWerewolfGuide(view)
  return `当前阶段：${current.phase}\n下一步：${current.nextAction}`
}
