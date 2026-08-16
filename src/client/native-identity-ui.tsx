/** Browser settings and readiness state for DSH native identity. */

import { useEffect, useState } from 'react'
import type { NativeIdentityProfile } from '../native-identity-protocol.ts'
import {
  nativeIdentityApprovalsChangedEvent,
  nativeIdentityProfileChangedEvent,
  readApprovedNativeIdentities,
  readNativeIdentityProfile,
  writeApprovedNativeIdentities,
  writeNativeIdentityDisplayName,
} from './native-identity.ts'

const fieldStyle = {
  background: 'var(--dsw-alias-bg-layer-1, #202024)',
  border: '1px solid var(--dsw-alias-border-l2, #3d3d43)',
  borderRadius: '8px', boxSizing: 'border-box', color: 'inherit', font: 'inherit', fontSize: '12px',
  minWidth: 0, padding: '8px 9px', width: '100%',
} as const

const secondaryButtonStyle = {
  background: 'transparent', border: '1px solid var(--dsw-alias-border-l2, #424248)', borderRadius: '6px',
  color: 'inherit', cursor: 'pointer', font: 'inherit', fontSize: '11px', height: '34px',
  minWidth: '25px', padding: '5px 14px',
} as const

const primaryButtonStyle = {
  ...secondaryButtonStyle,
  background: 'var(--dsw-alias-state-business-primary, #6f78e8)',
  borderColor: 'var(--dsw-alias-state-business-primary, #6f78e8)',
  color: '#fff',
  fontWeight: 600,
} as const

/** Native identity readiness shown to isolated card and Tavern runtimes. */
export type NativeIdentityDiagnosticState = 'loading' | 'unconfigured' | 'ready' | 'error'

/** Track the Host profile without creating an identity as a side effect. */
export function useNativeIdentityDiagnosticState(): NativeIdentityDiagnosticState {
  const [state, setState] = useState<NativeIdentityDiagnosticState>('loading')
  useEffect(() => {
    let mounted = true
    const load = (): void => {
      setState('loading')
      void readNativeIdentityProfile().then(profile => {
        if (mounted) setState(profile === undefined ? 'unconfigured' : 'ready')
      }, () => {
        if (mounted) setState('error')
      })
    }
    load()
    window.addEventListener(nativeIdentityProfileChangedEvent, load)
    return () => {
      mounted = false
      window.removeEventListener(nativeIdentityProfileChangedEvent, load)
    }
  }, [])
  return state
}

/** Manage the public native identity profile and revoke browser-side grants. */
export function NativeIdentitySettingsPanel() {
  const [profile, setProfile] = useState<NativeIdentityProfile>()
  const [displayName, setDisplayName] = useState('')
  const [status, setStatus] = useState<'loading' | 'ready' | 'saving'>('loading')
  const [error, setError] = useState<string>()
  const [approvalCount, setApprovalCount] = useState(() => readApprovedNativeIdentities().size)
  const load = (): void => {
    setStatus('loading')
    setError(undefined)
    void readNativeIdentityProfile().then(value => {
      setProfile(value)
      setDisplayName(value?.displayName ?? '')
      setStatus('ready')
    }, reason => {
      setError(reason instanceof Error ? reason.message : String(reason))
      setStatus('ready')
    })
  }
  useEffect(load, [])
  useEffect(() => {
    const sync = (): void => { setApprovalCount(readApprovedNativeIdentities().size) }
    window.addEventListener(nativeIdentityApprovalsChangedEvent, sync)
    return () => { window.removeEventListener(nativeIdentityApprovalsChangedEvent, sync) }
  }, [])
  const save = (): void => {
    setStatus('saving')
    setError(undefined)
    void writeNativeIdentityDisplayName(displayName).then(value => {
      setProfile(value)
      setDisplayName(value.displayName)
    }, reason => {
      setError(reason instanceof Error ? reason.message : String(reason))
    }).finally(() => { setStatus('ready') })
  }
  const dirty = displayName.trim() !== (profile?.displayName ?? '')
  return <section style={{
    border: '1px solid var(--dsw-alias-border-l2, #3d3d43)', borderRadius: '12px', marginTop: '24px', padding: '15px',
  }}>
    <h3 style={{ fontSize: '14px', margin: '0 0 6px' }}>本机身份（新生态）</h3>
    <p style={{ fontSize: '12px', lineHeight: 1.65, margin: '0 0 14px', opacity: .62 }}>
      为兼容前端签发五分钟有效、目标来源绑定的身份证明，不打开 OAuth 页面。私钥由 DSH Host 保管，角色卡只能取得短期证明。
    </p>
    <div style={{ alignItems: 'end', display: 'grid', gap: '9px', gridTemplateColumns: 'minmax(0, 1fr) auto' }}>
      <label style={{ display: 'grid', fontSize: '12px', gap: '6px' }}>显示名称（仅在单独授权后写入证明）
        <input value={displayName} maxLength={80} placeholder="例如：旅行者" disabled={status !== 'ready'}
          onChange={event => { setDisplayName(event.target.value) }} style={fieldStyle} />
      </label>
      <button type="button" disabled={status !== 'ready' || displayName.trim() === '' || !dirty}
        onClick={save} style={primaryButtonStyle}>
        {status === 'saving' ? '正在保存…' : profile === undefined ? '创建本机身份' : '保存名称'}
      </button>
    </div>
    {status === 'loading' && <p role="status" style={{ fontSize: '12px', margin: '10px 0 0', opacity: .55 }}>正在读取本机身份…</p>}
    {profile !== undefined && <p role="status" style={{
      color: 'var(--dsw-alias-state-success, #5dbb84)', fontSize: '12px', margin: '10px 0 0',
    }}>身份密钥已就绪 · {approvalCount} 项角色卡或脚本授权</p>}
    {approvalCount > 0 && <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
      <button type="button" onClick={() => {
        writeApprovedNativeIdentities(new Set())
      }} style={secondaryButtonStyle}>撤销全部前端授权</button>
    </div>}
    {error !== undefined && <p role="alert" style={{
      color: 'var(--dsw-alias-state-danger, #d64d5f)', fontSize: '12px', margin: '10px 0 0',
    }}>{error}</p>}
  </section>
}
