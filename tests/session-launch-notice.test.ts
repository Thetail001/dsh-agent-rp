import assert from 'node:assert/strict'
import test from 'node:test'
import { createSessionLaunchNoticeSource } from '../src/client/session-launch-notice.ts'

test('publishes the latest launch warning and ignores a stale dismissal', () => {
  const source = createSessionLaunchNoticeSource()
  let notifications = 0
  const unsubscribe = source.subscribe(() => { notifications++ })

  const first = source.publish('第一次挂靠失败')
  const second = source.publish('第二次挂靠失败')
  source.clear(first.id)

  assert.deepEqual(source.getSnapshot(), second)
  assert.equal(notifications, 2)

  source.clear(second.id)
  assert.equal(source.getSnapshot(), undefined)
  assert.equal(notifications, 3)

  unsubscribe()
  source.publish('无人订阅')
  assert.equal(notifications, 3)
})
