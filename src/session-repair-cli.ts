#!/usr/bin/env node

import { repairAgentRpSessionFile } from './session-repair.ts'

function usage(): never {
  console.error('用法：dsh-agent-rp-repair-session [--apply] <session.jsonl.zstd>')
  console.error('默认只读检查；关闭 DSH 后显式加 --apply 才会备份并修复。')
  process.exit(2)
}

const args = process.argv.slice(2)
const apply = args.includes('--apply')
const positional = args.filter(arg => arg !== '--apply')
if (positional.length !== 1 || args.some(arg => arg.startsWith('--') && arg !== '--apply')) usage()

try {
  const result = await repairAgentRpSessionFile(positional[0]!, { apply })
  if (!apply) {
    console.log(`只读检查完成：${result.path}`)
    console.log(`需要修复的旧事件：${result.repairedEvents}`)
    console.log(`已经安全的 Agent RP 事件：${result.alreadySafeEvents}`)
    if (result.repairedEvents > 0) console.log('请先完全关闭 DSH，再用同一条命令加 --apply 执行。')
  } else if (result.applied) {
    console.log(`已修复 ${result.repairedEvents} 条旧事件。`)
    console.log(`原文件备份：${result.backupPath}`)
  } else {
    console.log('该会话不需要修复，未写入任何文件。')
  }
} catch (error: unknown) {
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
}
