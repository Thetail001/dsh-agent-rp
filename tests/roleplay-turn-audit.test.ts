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
  assert.equal(result.presentation.current, true)
  assert.equal(result.presentation.replySelected, true)
  assert.deepEqual(result.replay, {
    ...result.replay,
    settlementRecovered: true,
    presentationRecovered: true,
    resourceReferencesMatch: true,
    worldActivationMatches: true,
    stateReferencesResolve: true,
    memoryReferencesResolve: true,
    currentReplyMatches: true,
    nextPrepareContinues: true,
  })
  assert.doesNotMatch(JSON.stringify(result), /角色|世界|预设|fixture|manual|Audit User/u)
})
