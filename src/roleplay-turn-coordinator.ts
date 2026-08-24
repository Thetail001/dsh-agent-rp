/** Volatile coordination for prepared Roleplay plans consumed by the Agent loop. */

import type { RoleplayTurnPlan } from './roleplay-turn-plan.ts'
import type { BoundRoleplayTurnPlan } from './roleplay-turn-settlement.ts'

/** Volatile lane inside the act phase; durable evidence remains in the Session log. */
export type RoleplayActLane = 'narrative' | 'artifact-handoff'

function positiveInteger(value: number, label: string): void {
  if (!Number.isSafeInteger(value) || value < 1) {
    throw new Error(`Roleplay ${label} must be a positive integer`)
  }
}

/**
 * Binds each immutable prepare result to the exact turn/step that consumed it.
 * This state is deliberately volatile: durable settlement and presentation
 * records remain reconstructable from the Session log.
 */
export class RoleplayTurnCoordinator<Owner extends object> {
  readonly #prepared = new WeakMap<Owner, RoleplayTurnPlan>()
  readonly #turns = new WeakMap<Owner, Map<number, Map<number, RoleplayTurnPlan>>>()
  readonly #actLanes = new WeakMap<Owner, { readonly turn: number; readonly lane: RoleplayActLane }>()

  /** Make one freshly compiled plan available to the next Agent request. */
  prepare(owner: Owner, plan: RoleplayTurnPlan): void {
    this.#prepared.set(owner, plan)
    this.#actLanes.delete(owner)
  }

  /** Return the plan currently exposed to request and stream integrations. */
  current(owner: Owner): RoleplayTurnPlan | undefined {
    return this.#prepared.get(owner)
  }

  /** Return the prompt/tool lane for the open act phase. */
  currentActLane(owner: Owner): RoleplayActLane {
    return this.#actLanes.get(owner)?.lane ?? 'narrative'
  }

  /** Narrow a bound turn to artifact handoff after its visible narrative already exists. */
  enterArtifactHandoff(owner: Owner, turn: number): boolean {
    positiveInteger(turn, 'turn')
    if (this.#turns.get(owner)?.has(turn) !== true) return false
    this.#actLanes.set(owner, { turn, lane: 'artifact-handoff' })
    return true
  }

  /** Bind the current plan to one Agent-loop step, preserving the first binding on retries. */
  bindStep(
    owner: Owner,
    turn: number,
    step: number,
    finalize: (plan: RoleplayTurnPlan) => RoleplayTurnPlan = plan => plan,
  ): RoleplayTurnPlan | undefined {
    positiveInteger(turn, 'turn')
    positiveInteger(step, 'step')
    let turns = this.#turns.get(owner)
    if (turns === undefined) {
      turns = new Map()
      this.#turns.set(owner, turns)
    }
    let steps = turns.get(turn)
    if (steps === undefined) {
      steps = new Map()
      turns.set(turn, steps)
    }
    const bound = steps.get(step)
    if (bound !== undefined) return bound
    const prepared = this.#prepared.get(owner)
    if (prepared === undefined) return undefined
    const finalized = finalize(prepared)
    steps.set(step, finalized)
    const lane = this.#actLanes.get(owner)
    if (lane === undefined || lane.turn !== turn) this.#actLanes.set(owner, { turn, lane: 'narrative' })
    if (this.#prepared.get(owner) === prepared) this.#prepared.set(owner, finalized)
    return finalized
  }

  /** Inspect the immutable plans already consumed by an open turn without settling them. */
  plansForTurn(owner: Owner, turn: number): readonly BoundRoleplayTurnPlan[] {
    positiveInteger(turn, 'turn')
    const steps = this.#turns.get(owner)?.get(turn)
    if (steps === undefined) return []
    return [...steps]
      .map(([step, plan]) => ({ step, plan }))
      .sort((left, right) => left.step - right.step)
  }

  /**
   * Consume every plan used by one completed turn in deterministic step order.
   * A newer unconsumed plan is retained if a delayed turn/end arrives afterwards.
   */
  completeTurn(owner: Owner, turn: number): readonly BoundRoleplayTurnPlan[] {
    positiveInteger(turn, 'turn')
    const turns = this.#turns.get(owner)
    const steps = turns?.get(turn)
    if (steps === undefined || steps.size === 0) return []

    turns!.delete(turn)
    if (turns!.size === 0) this.#turns.delete(owner)
    const plans = [...steps]
      .map(([step, plan]) => ({ step, plan }))
      .sort((left, right) => left.step - right.step)
    const prepared = this.#prepared.get(owner)
    if (prepared !== undefined && plans.some(({ plan }) => plan === prepared)) {
      this.#prepared.delete(owner)
    }
    if (this.#actLanes.get(owner)?.turn === turn) this.#actLanes.delete(owner)
    return plans
  }

  /** Forget every volatile plan when its owning Agent is disposed. */
  release(owner: Owner): void {
    this.#prepared.delete(owner)
    this.#turns.delete(owner)
    this.#actLanes.delete(owner)
  }
}
