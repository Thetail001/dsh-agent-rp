import assert from 'node:assert/strict'
import test from 'node:test'

import {
  computedColorContrast,
  parseComputedColor,
  roleplayContrastOverride,
} from '../src/client/theme-contrast.ts'

test('parses browser-normalized computed colors', () => {
  assert.deepEqual(parseComputedColor('rgb(249, 250, 251)'), {
    red: 249, green: 250, blue: 251, alpha: 1,
  })
  assert.deepEqual(parseComputedColor('rgba(10, 11, 15, 0.76)'), {
    red: 10, green: 11, blue: 15, alpha: .76,
  })
  assert.equal(parseComputedColor('transparent'), undefined)
})

test('preserves readable themes and repairs white text on a light skin', () => {
  assert.ok((computedColorContrast('rgb(249, 250, 251)', 'rgb(31, 31, 33)') ?? 0) > 4.5)
  assert.equal(roleplayContrastOverride('rgb(249, 250, 251)', 'rgb(31, 31, 33)'), undefined)
  assert.equal(roleplayContrastOverride('rgb(249, 250, 251)', 'rgb(248, 246, 241)'), 'dark')
  assert.equal(roleplayContrastOverride('rgb(23, 24, 29)', 'rgb(20, 22, 27)'), 'light')
})
