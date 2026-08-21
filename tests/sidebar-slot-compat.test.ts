import assert from 'node:assert/strict'
import test from 'node:test'

import { resolveLegacySidebarWidth } from '../src/client/sidebar-slot-compat.ts'

interface Rectangle {
  readonly left: number
  readonly right: number
  readonly height: number
}

function element(rectangle: Rectangle, parentElement: HTMLElement | null = null): HTMLElement {
  return {
    parentElement,
    getBoundingClientRect: () => rectangle,
  } as unknown as HTMLElement
}

test('derives the old slot drawer boundary from the nearest full-height sidebar ancestor', () => {
  const sidebar = element({ left: 0, right: 276, height: 844 })
  const footer = element({ left: 12, right: 264, height: 48 }, sidebar)
  const trigger = element({ left: 20, right: 56, height: 36 }, footer)

  assert.equal(resolveLegacySidebarWidth(trigger, 844), 276)
})

test('tracks the collapsed rail and falls back to the trigger without a sidebar ancestor', () => {
  const rail = element({ left: 0, right: 56, height: 844 })
  const trigger = element({ left: 10, right: 46, height: 36 }, rail)
  assert.equal(resolveLegacySidebarWidth(trigger, 844), 56)

  const isolated = element({ left: 14, right: 50.4, height: 36 })
  assert.equal(resolveLegacySidebarWidth(isolated, 844), 50)
})
