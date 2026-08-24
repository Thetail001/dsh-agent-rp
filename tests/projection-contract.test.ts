import assert from 'node:assert/strict'
import test from 'node:test'
import { agentRpProjectionDefinition } from '../src/projection.ts'

test('serves the same Agent RP view through current and newer DSH projection contracts', () => {
  const state = agentRpProjectionDefinition.init()
  const currentHostView = agentRpProjectionDefinition.schema.parse(
    agentRpProjectionDefinition.view(state),
  )
  const newerHostView = agentRpProjectionDefinition.wire.viewSchema.parse(
    agentRpProjectionDefinition.wire.view(agentRpProjectionDefinition.stateSchema.parse(state)),
  )

  assert.deepEqual(currentHostView, newerHostView)
  assert.equal(agentRpProjectionDefinition.preload, false)
})

test('projects an effective conversation mode when the Host cannot persist Agent receipts', () => {
  const initial = agentRpProjectionDefinition.init()
  const selected = agentRpProjectionDefinition.apply(initial, {
    type: 'agent-rp/turn-mode',
    seq: 0,
    time: 1,
    ignorable: true,
    data: { format: 0, mode: 'agent', source: 'default' },
  })
  const view = agentRpProjectionDefinition.wire.view(selected)

  assert.equal(typeof view.hostCapabilities?.sessionEvents, 'boolean')
  assert.equal(view.turnMode, view.hostCapabilities?.sessionEvents === true ? 'agent' : 'conversation')
})
