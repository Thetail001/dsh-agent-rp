import assert from 'node:assert/strict'
import test from 'node:test'
import {
  AGENT_RP_NATIVE_SHARE_EVENT,
  handleAgentRpNativeShare,
  installAgentRpNativeShare,
} from '../src/client/native-share.ts'

class FakeLauncher {
  clicks = 0
  click(): void { this.clicks += 1 }
}

function root(launcher: FakeLauncher | null): ParentNode {
  return { querySelector: () => launcher } as unknown as ParentNode
}

test('opens the resource workbench for a bounded content-free Android share hint', () => {
  const launcher = new FakeLauncher()
  const event = new CustomEvent(AGENT_RP_NATIVE_SHARE_EVENT, {
    cancelable: true,
    detail: { name: 'character.png', mediaType: 'image/png' },
  })

  assert.equal(handleAgentRpNativeShare(event, root(launcher)), true)
  assert.equal(event.defaultPrevented, true)
  assert.equal(launcher.clicks, 1)
})

test('declines malformed hints and pages without the Agent RP workbench', () => {
  const malformed = new CustomEvent(AGENT_RP_NATIVE_SHARE_EVENT, {
    cancelable: true, detail: { name: '', uri: 'content://must-not-cross' },
  })
  const valid = new CustomEvent(AGENT_RP_NATIVE_SHARE_EVENT, {
    cancelable: true, detail: { name: 'world.json' },
  })

  assert.equal(handleAgentRpNativeShare(malformed, root(new FakeLauncher())), false)
  assert.equal(malformed.defaultPrevented, false)
  assert.equal(handleAgentRpNativeShare(valid, root(null)), false)
})

test('unwinds the effect-scoped native share listener', () => {
  let added: EventListener | undefined
  let removed: EventListener | undefined
  const target = {
    addEventListener(_name: string, listener: EventListenerOrEventListenerObject) {
      added = listener as EventListener
    },
    removeEventListener(_name: string, listener: EventListenerOrEventListenerObject) {
      removed = listener as EventListener
    },
  }

  const dispose = installAgentRpNativeShare(target, root(new FakeLauncher()))
  dispose()
  assert.equal(removed, added)
})
