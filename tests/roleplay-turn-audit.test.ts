import assert from 'node:assert/strict'
import test from 'node:test'
import { join } from 'node:path'
import { auditRoleplayTurn } from '../scripts/audit-roleplay-turn.ts'

const fixtures = join(process.cwd(), 'tests', 'fixtures')

test('audits a complete model-free turn and reopens it from the Session log', async () => {
  const result = await auditRoleplayTurn({
    cardPath: join(fixtures, 'manual-character-card.png'),
    presetPath: join(fixtures, 'manual-sillytavern-preset.json'),
    worldInfoPath: join(fixtures, 'manual-world-info.json'),
  })

  assert.equal(result.ok, true)
  assert.equal(result.settlement.receiptPresent, true)
  assert.equal(result.settlement.replyPresent, true)
  assert.equal(result.settlement.actSteps, 1)
  assert.equal(result.settlement.assistantActions, 1)
  assert.equal(result.settlement.toolCalls, 1)
  assert.equal(result.settlement.toolResults, 1)
  assert.equal(result.presentation.current, true)
  assert.equal(result.presentation.replySelected, true)
  assert.deepEqual(result.replay, {
    ...result.replay,
    settlementRecovered: true,
    presentationRecovered: true,
    preDispatchReceiptRecovered: true,
    recallReceiptRecovered: true,
    actReceiptRecovered: true,
    turnRecordRecovered: true,
    turnHealthRecovered: true,
    exactPlanRecovered: true,
    coldSettlementRecovered: true,
    resourceReferencesMatch: true,
    worldActivationMatches: true,
    stateReferencesResolve: true,
    memoryReferencesResolve: true,
    currentReplyMatches: true,
    nextPrepareContinues: true,
    nextRecallContinues: true,
  })
  assert.doesNotMatch(JSON.stringify(result), /角色|世界|预设|fixture|manual|Audit User/u)
})
