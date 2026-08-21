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
