/** Player-requested local report for World Info evaluation failures. */

import type { EjsTemplateFailureKind } from '../ejs-template.ts'
import type { LorebookActivationReason } from '../import/lorebook.ts'

const MAX_REPORT_LABEL_LENGTH = 240
const MAX_FAILURE_REPORT_LENGTH = 64 * 1024

type WorldInfoFailureReason = Extract<LorebookActivationReason,
  | 'regex-runtime-unavailable'
  | 'regex-invalid'
  | 'regex-execution-limit'
  | 'regex-resource-limit'
  | 'decorator-unsupported'
  | 'template-unsupported'
  | 'template-error'
>

/** Minimal private identifiers needed to let a player locate one failing entry. */
export interface WorldInfoFailureReportBook {
  readonly name: string
  readonly source: 'character' | 'standalone'
  readonly entries: readonly {
    readonly sourceId: string
    readonly name?: string
    readonly comment?: string
    readonly reason: LorebookActivationReason
    readonly template?: 'rendered' | EjsTemplateFailureKind
  }[]
}

function failureReason(reason: LorebookActivationReason): reason is WorldInfoFailureReason {
  return reason === 'regex-runtime-unavailable'
    || reason === 'regex-invalid'
    || reason === 'regex-execution-limit'
    || reason === 'regex-resource-limit'
    || reason === 'decorator-unsupported'
    || reason === 'template-unsupported'
    || reason === 'template-error'
}

function boundedLabel(value: string, fallback: string): string {
  const normalized = value.replace(/\s+/gu, ' ').trim() || fallback
  return normalized.length <= MAX_REPORT_LABEL_LENGTH
    ? normalized
    : `${normalized.slice(0, MAX_REPORT_LABEL_LENGTH)}…`
}

function sourceLabel(source: WorldInfoFailureReportBook['source']): string {
  return source === 'character' ? '角色卡' : '独立世界书'
}

/** Build a local report without copying entry content, keywords, expressions, or model-visible text. */
export function worldInfoFailureReport(books: readonly WorldInfoFailureReportBook[]): string | undefined {
  const failures = books.flatMap(book => book.entries
    .filter(entry => failureReason(entry.reason))
    .map(entry => ({ book, entry })))
  if (failures.length === 0) return undefined
  const report = [
    'Agent RP 世界书失败详情',
    '格式: agent-rp-world-info-failures-v0',
    `失败数: ${failures.length}`,
    '',
    ...failures.flatMap(({ book, entry }, index) => [
      `[${index + 1}] ${boundedLabel(entry.name ?? entry.comment ?? '', `条目 ${entry.sourceId}`)}`,
      `世界书: ${boundedLabel(book.name, '未命名世界书')}`,
      `来源: ${sourceLabel(book.source)}`,
      `条目编号: ${boundedLabel(entry.sourceId, '未知')}`,
      `类别: ${entry.reason}`,
      ...(entry.reason === 'template-error' && entry.template !== undefined && entry.template !== 'rendered'
        ? [`细分: ${entry.template}`] : []),
      '',
    ]),
  ].join('\n').trimEnd()
  return report.length <= MAX_FAILURE_REPORT_LENGTH
    ? report
    : `${report.slice(0, MAX_FAILURE_REPORT_LENGTH - 10).trimEnd()}\n…内容已截断`
}
