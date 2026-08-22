import assert from 'node:assert/strict'
import test from 'node:test'
import {
  AGENT_RP_NATIVE_BACK_EVENT,
  activeAgentRpNativeBackLayer,
  handleAgentRpNativeBack,
  installAgentRpNativeBack,
} from '../src/client/native-back.ts'

class FakeElement {
  hidden = false
  clicks = 0
  mouseDowns = 0

  constructor(
    readonly attributes: Readonly<Record<string, string>>,
    readonly close?: FakeElement,
  ) {}

  getAttribute(name: string): string | null { return this.attributes[name] ?? null }
  hasAttribute(name: string): boolean { return this.attributes[name] !== undefined }
  getClientRects(): { readonly length: number } { return { length: 1 } }
  matches(selector: string): boolean {
    return selector === '[role="menu"]' && this.attributes.role === 'menu'
  }
  querySelector(): FakeElement | null { return this.close ?? null }
  click(): void { this.clicks += 1 }
  dispatchEvent(): boolean { this.mouseDowns += 1; return true }
}

function root(elements: readonly FakeElement[], menuToggle?: FakeElement): ParentNode {
  return {
    querySelectorAll: () => elements,
    querySelector: () => menuToggle ?? null,
  } as unknown as ParentNode
}

const style = (zIndex: number) => ({ display: 'block', position: 'fixed', visibility: 'visible', zIndex: String(zIndex) })

test('selects and dismisses only the highest visible Agent RP layer', () => {
  const lowClose = new FakeElement({})
  const highClose = new FakeElement({})
  const low = new FakeElement({ 'aria-modal': 'true', z: '10' }, lowClose)
  const hidden = new FakeElement({ 'aria-modal': 'true', 'aria-hidden': 'true', z: '30' }, new FakeElement({}))
  const high = new FakeElement({ 'aria-modal': 'true', z: '20' }, highClose)
  const source = root([low, hidden, high])
  const styleOf = (element: Element) => style(Number((element as unknown as FakeElement).attributes.z))
  const event = new Event(AGENT_RP_NATIVE_BACK_EVENT, { cancelable: true })

  assert.equal(activeAgentRpNativeBackLayer(source, styleOf), high as unknown as Element)
  assert.equal(handleAgentRpNativeBack(event, source, styleOf, () => new Event('mousedown')), true)
  assert.equal(event.defaultPrevented, true)
  assert.equal(highClose.clicks, 1)
  assert.equal(lowClose.clicks, 0)
})

test('uses the session-settings toggle for the open menu layer', () => {
  const menu = new FakeElement({ role: 'menu', z: '40' })
  const toggle = new FakeElement({ 'aria-expanded': 'true' })
  const event = new Event(AGENT_RP_NATIVE_BACK_EVENT, { cancelable: true })

  assert.equal(handleAgentRpNativeBack(
    event,
    root([menu], toggle),
    () => style(40),
    () => new Event('mousedown'),
  ), true)
  assert.equal(toggle.clicks, 1)
  assert.equal(menu.mouseDowns, 0)
})

test('declines cleanly when Agent RP has no open layer and unwinds its listener', () => {
  let listener: EventListener | undefined
  let removed: EventListener | undefined
  const target = {
    addEventListener(_name: string, next: EventListenerOrEventListenerObject) {
      listener = next as EventListener
    },
    removeEventListener(_name: string, next: EventListenerOrEventListenerObject) {
      removed = next as EventListener
    },
  }
  const source = root([])
  const dispose = installAgentRpNativeBack(target, source)
  const event = new Event(AGENT_RP_NATIVE_BACK_EVENT, { cancelable: true })

  listener?.(event)
  assert.equal(event.defaultPrevented, false)
  dispose()
  assert.equal(removed, listener)
})
