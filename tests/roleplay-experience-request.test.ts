import assert from 'node:assert/strict'
import test from 'node:test'
import {
  characterExperienceLaunchRequest,
  sceneExperienceLaunchRequest,
} from '../src/client/roleplay-experience-request.ts'
import { parseAgentRpSessionLaunchRequest } from '../src/session-launch.ts'

test('maps browser library choices to a content-free character experience request', () => {
  const request = characterExperienceLaunchRequest({
    sourceSessionId: 'source-session',
    characterId: 'card-0123456789abcdef0123456789abcdef',
    greetingIndex: 2,
    persona: {
      id: 'persona-01234567-89ab-4def-8123-0123456789ab',
      name: '不会进入请求的名字',
      description: '不会进入请求的完整 Persona 正文',
    },
    presetId: 'imported-0123456789abcdef',
    worldInfoIds: ['world-info-0123456789abcdef0123456789abcdef'],
  })
  assert.deepEqual(parseAgentRpSessionLaunchRequest(request), request)
  assert.deepEqual(request, {
    format: 0,
    sourceSessionId: 'source-session',
    kind: 'experience',
    mode: 'character',
    actor: {
      kind: 'actor',
      id: 'character:library:card-0123456789abcdef0123456789abcdef',
      variant: 'greeting:2',
    },
    participant: { kind: 'persona', id: 'persona-01234567-89ab-4def-8123-0123456789ab' },
    worlds: [{
      kind: 'world', id: 'standalone:library:world-info-0123456789abcdef0123456789abcdef',
    }],
    promptPolicy: { kind: 'prompt-policy', id: 'preset:library:imported-0123456789abcdef' },
  })
  assert.equal(JSON.stringify(request).includes('完整 Persona 正文'), false)
})

test('keeps the primary scene world first in a source-neutral request', () => {
  const request = sceneExperienceLaunchRequest({
    sourceSessionId: 'source-session',
    primaryWorldInfoId: 'world-info-00000000000000000000000000000000',
    supportingWorldInfoIds: [
      'world-info-11111111111111111111111111111111',
      'world-info-22222222222222222222222222222222',
    ],
  })
  assert.deepEqual(parseAgentRpSessionLaunchRequest(request), request)
  assert.ok(request.worlds)
  assert.deepEqual(request.worlds.map(world => world.id), [
    'standalone:library:world-info-00000000000000000000000000000000',
    'standalone:library:world-info-11111111111111111111111111111111',
    'standalone:library:world-info-22222222222222222222222222222222',
  ])
})
