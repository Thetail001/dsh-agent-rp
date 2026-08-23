/** Volatile coordination for prepared Roleplay plans consumed by the Agent loop. */

import type { RoleplayTurnPlan } from './roleplay-turn-plan.ts'
import type { BoundRoleplayTurnPlan } from './roleplay-turn-settlement.ts'

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

  /** Make one freshly compiled plan available to the next Agent request. */
  prepare(owner: Owner, plan: RoleplayTurnPlan): void {
    this.#prepared.set(owner, plan)
  }

  /** Return the plan currently exposed to request and stream integrations. */
  current(owner: Owner): RoleplayTurnPlan | undefined {
    return this.#prepared.get(owner)
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
    if (this.#prepared.get(owner) === prepared) this.#prepared.set(owner, finalized)
    return finalized
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
    return plans
  }

  /** Forget every volatile plan when its owning Agent is disposed. */
  release(owner: Owner): void {
    this.#prepared.delete(owner)
    this.#turns.delete(owner)
  }
}
