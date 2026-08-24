import assert from 'node:assert/strict'
import test from 'node:test'
import { agentRpProjectionDefinition, createAgentRpProjectionDefinition } from '../src/projection.ts'

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

test('projects the selected turn mode from the live Host capability instead of a package-local Session class', () => {
  const supported = createAgentRpProjectionDefinition(undefined, () => true)
  const unsupported = createAgentRpProjectionDefinition(undefined, () => false)
  const selected = supported.apply(supported.init(), {
    type: 'agent-rp/turn-mode',
    seq: 0,
    time: 1,
    ignorable: true,
    data: { format: 0, mode: 'agent', source: 'default' },
  })
  const supportedView = supported.wire.view(selected)
  const unsupportedView = unsupported.wire.view(selected)

  assert.deepEqual(supportedView.hostCapabilities, { sessionEvents: true })
  assert.equal(supportedView.turnMode, 'agent')
  assert.deepEqual(unsupportedView.hostCapabilities, { sessionEvents: false })
  assert.equal(unsupportedView.turnMode, 'conversation')
})
