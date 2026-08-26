import { inspect } from 'node:util'

function failureError(error) {
  const cause = error?.cause ?? error
  if (typeof cause?.stack === 'string') return cause.stack
  if (typeof cause?.message === 'string') return cause.message
  return inspect(cause, { colors: false, depth: 5 })
}

function failureLocation(data) {
  if (data.file === undefined) return ''
  const line = data.line === undefined ? '' : `:${data.line}`
  const column = data.column === undefined ? '' : `:${data.column}`
  return `\n  at ${data.file}${line}${column}`
}

/** Report only failures, test output, and the aggregate result. */
export default async function * conciseReporter(source) {
  for await (const event of source) {
    if (event.type === 'test:fail' && event.data.skip === undefined && event.data.todo === undefined) {
      yield `\nFAIL ${event.data.name}${failureLocation(event.data)}\n${failureError(event.data.details.error)}\n`
      continue
    }
    if (event.type === 'test:stderr' || event.type === 'test:stdout') {
      yield event.data.message
      continue
    }
    if (event.type === 'test:diagnostic' && event.data.level !== 'info') {
      yield `${event.data.level.toUpperCase()} ${event.data.message}\n`
      continue
    }
    if (event.type !== 'test:summary' || event.data.file !== undefined) continue
    const { counts, duration_ms: durationMs, success } = event.data
    const failed = counts.tests - counts.passed - counts.cancelled - counts.skipped - counts.todo
    const detail = [
      `${counts.passed} passed`,
      ...(failed === 0 ? [] : [`${failed} failed`]),
      ...(counts.skipped === 0 ? [] : [`${counts.skipped} skipped`]),
      ...(counts.cancelled === 0 ? [] : [`${counts.cancelled} cancelled`]),
      ...(counts.todo === 0 ? [] : [`${counts.todo} todo`]),
    ].join(', ')
    yield `${success ? 'PASS' : 'FAIL'} ${counts.tests} tests (${detail}) in ${Math.round(durationMs)}ms\n`
  }
}
