import assert from 'node:assert/strict'
import test from 'node:test'
import {
  standardWerewolfLocationCanVote,
  standardWerewolfLocationIsLiving,
} from '../src/werewolf/werewolf-life.ts'

test('keeps a revealed Idiot in play without restoring a ballot', () => {
  assert.equal(standardWerewolfLocationIsLiving('alive'), true)
  assert.equal(standardWerewolfLocationCanVote('alive'), true)
  assert.equal(standardWerewolfLocationIsLiving('revealed-idiot'), true)
  assert.equal(standardWerewolfLocationCanVote('revealed-idiot'), false)
  assert.equal(standardWerewolfLocationIsLiving('dead'), false)
  assert.equal(standardWerewolfLocationCanVote('dead'), false)
})
