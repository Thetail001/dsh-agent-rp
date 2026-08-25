import assert from 'node:assert/strict'
import test from 'node:test'
import {
  worldInfoFailureReport,
  type WorldInfoFailureReportBook,
} from '../src/client/world-info-failure-report.ts'

test('reports local World Info failures without copying entry content or keywords', () => {
  const books: readonly WorldInfoFailureReportBook[] = [{
    name: '测试世界',
    source: 'character',
    entries: [{
      sourceId: '17', name: '天气计算', reason: 'template-error', template: 'syntax-error',
    }, {
      sourceId: '18', name: '正常条目', reason: 'active-keyword', template: 'rendered',
    }, {
      sourceId: '19', comment: '危险表达式', reason: 'regex-execution-limit',
    }],
  }]
  const report = worldInfoFailureReport(books)

  assert.equal(report, [
    'Agent RP 世界书失败详情',
    '格式: agent-rp-world-info-failures-v0',
    '失败数: 2',
    '',
    '[1] 天气计算',
    '世界书: 测试世界',
    '来源: 角色卡',
    '条目编号: 17',
    '类别: template-error',
    '细分: syntax-error',
    '',
    '[2] 危险表达式',
    '世界书: 测试世界',
    '来源: 角色卡',
    '条目编号: 19',
    '类别: regex-execution-limit',
  ].join('\n'))
  assert.doesNotMatch(report ?? '', /正常条目|active-keyword/u)
})

test('returns no report when every World Info entry completed normal evaluation', () => {
  assert.equal(worldInfoFailureReport([{
    name: '空世界', source: 'standalone', entries: [{ sourceId: '1', reason: 'primary-unmatched' }],
  }]), undefined)
})

test('keeps report labels on one bounded line', () => {
  const report = worldInfoFailureReport([{
    name: `换行\n${'书'.repeat(300)}`,
    source: 'standalone',
    entries: [{ sourceId: '2', name: '第一行\n第二行', reason: 'decorator-unsupported' }],
  }])
  assert.match(report ?? '', /\[1\] 第一行 第二行/u)
  assert.doesNotMatch(report ?? '', /换行\n书/u)
  const bookLine = report?.split('\n').find(line => line.startsWith('世界书: '))
  assert.match(bookLine ?? '', /^世界书: 换行 书+…$/u)
  assert.equal(bookLine?.length, '世界书: '.length + 241)
})
