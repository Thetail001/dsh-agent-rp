/** @jsxRuntime classic */
/** @jsx React.createElement */
/** Local status list for every Tavern Helper script in the active Session. */

import React, { type ReactElement } from 'react'
import type { TavernScriptTreeScope } from '../tavern-helper.ts'
import type { TavernScriptRuntimePhase } from './tavern-runtime.ts'

const MAX_LOCAL_ERROR_LENGTH = 2_000

/** One script's local, player-visible lifecycle status. */
export interface TavernScriptStatusEntry {
  readonly key: string
  readonly name: string
  readonly scope: TavernScriptTreeScope
  readonly phase: TavernScriptRuntimePhase
  readonly error?: string
}

function scopeLabel(scope: TavernScriptTreeScope): string {
  switch (scope) {
    case 'global': return '全局'
    case 'preset': return '预设'
    case 'character': return '角色'
  }
}

function phaseLabel(phase: TavernScriptRuntimePhase): string {
  switch (phase) {
    case 'preparing': return '准备中'
    case 'permission-required': return '等待权限'
    case 'load-error': return '加载失败'
    case 'booting': return '启动中'
    case 'ready': return '运行中'
    case 'runtime-error': return '运行失败'
  }
}

function failed(phase: TavernScriptRuntimePhase): boolean {
  return phase === 'load-error' || phase === 'runtime-error'
}

function boundedError(error: string): string {
  return error.length <= MAX_LOCAL_ERROR_LENGTH
    ? error
    : `${error.slice(0, MAX_LOCAL_ERROR_LENGTH)}…`
}

/** Show all local script phases while keeping names and errors out of copied diagnostics. */
export function TavernScriptStatusList(props: {
  readonly entries: readonly TavernScriptStatusEntry[]
}): ReactElement {
  const ready = props.entries.filter(entry => entry.phase === 'ready').length
  const failures = props.entries.filter(entry => failed(entry.phase)).length
  return <details open={failures > 0} data-agent-rp-tavern-local-status style={{
    borderBottom: '1px solid var(--dsw-alias-border-l2, #35373d)', flex: '0 0 auto', maxHeight: '42%',
    overflow: 'auto', padding: '0 12px',
  }}>
    <summary style={{ cursor: 'pointer', fontSize: '11px', opacity: .76, padding: '8px 0' }}>
      运行状态 {ready}/{props.entries.length}{failures === 0 ? '' : ` · ${failures} 个失败`}
    </summary>
    <div style={{ display: 'grid', gap: '6px', padding: '0 0 10px' }}>
      {props.entries.map(entry => <div key={entry.key}
        data-agent-rp-tavern-local-phase={entry.phase}
        data-agent-rp-tavern-local-scope={entry.scope}
        style={{
          background: 'var(--dsw-alias-bg-elevated, #202228)', borderRadius: '8px', padding: '7px 9px',
        }}>
        <div style={{ alignItems: 'center', display: 'flex', gap: '10px' }}>
          <span style={{ flex: '1 1 auto', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {entry.name.trim() || '未命名脚本'}
          </span>
          <span style={{
            color: failed(entry.phase) ? 'var(--dsw-alias-state-warning, #d5a64c)' : 'inherit',
            flex: '0 0 auto', fontSize: '11px', opacity: .7,
          }}>{scopeLabel(entry.scope)} · {phaseLabel(entry.phase)}</span>
        </div>
        {failed(entry.phase) && entry.error !== undefined && <p role="alert" style={{
          color: 'var(--dsw-alias-state-warning, #d5a64c)', fontSize: '11px', lineHeight: 1.5,
          margin: '6px 0 0', overflowWrap: 'anywhere', whiteSpace: 'pre-wrap',
        }}>{boundedError(entry.error)}</p>}
      </div>)}
    </div>
  </details>
}
