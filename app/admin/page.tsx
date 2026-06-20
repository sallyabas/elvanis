'use client'

import { useState } from 'react'

type Founder = {
  id: string
  full_name: string | null
  email: string
  business_name: string | null
  subscription_tier: string
  subscription_status: string
  language: string
  founder_stage: string | null
}

type ActionLog = {
  id: string
  label: string
  status: 'pending' | 'success' | 'error'
  detail?: string
}

export default function AdminPage() {
  const [authed, setAuthed]       = useState(false)
  const [password, setPassword]   = useState('')
  const [authError, setAuthError] = useState('')

  const [query, setQuery]               = useState('')
  const [results, setResults]           = useState<Founder[]>([])
  const [selected, setSelected]         = useState<Founder | null>(null)
  const [searching, setSearching]       = useState(false)
  const [logs, setLogs]                 = useState<ActionLog[]>([])
  const [busy, setBusy]                 = useState(false)

  function authHeaders() {
    return { 'Content-Type': 'application/json', 'x-admin-password': password }
  }

  async function handleLogin() {
    const res = await fetch('/api/admin/founders?q=test', { headers: authHeaders() })
    if (res.status === 401) {
      setAuthError('Incorrect password')
      return
    }
    setAuthed(true)
    setAuthError('')
  }

  async function handleSearch(q: string) {
    setQuery(q)
    if (q.length < 2) { setResults([]); return }
    setSearching(true)
    const res = await fetch(`/api/admin/founders?q=${encodeURIComponent(q)}`, { headers: authHeaders() })
    const data = await res.json()
    setResults(data.founders ?? [])
    setSearching(false)
  }

  function pushLog(label: string): string {
    const id = `${Date.now()}-${Math.random()}`
    setLogs(prev => [{ id, label, status: 'pending' }, ...prev])
    return id
  }

  function updateLog(id: string, status: 'success' | 'error', detail?: string) {
    setLogs(prev => prev.map(l => l.id === id ? { ...l, status, detail } : l))
  }

  async function runFullScan() {
    if (!selected) return
    setBusy(true)
    const id = pushLog(`Full scan — ${selected.business_name ?? selected.email}`)
    try {
      const res = await fetch('/api/scan', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ founderId: selected.id, force: true, sendEmail: true, triggeredBy: 'manual' }),
      })
      const data = await res.json()
      if (res.ok && data.success) {
        const total = data.results?.reduce((s: number, r: { signals: number }) => s + (r.signals ?? 0), 0) ?? 0
        updateLog(id, 'success', `${total} signal(s) found across ${data.results?.length ?? 0} source(s). Scan email sent.`)
      } else {
        updateLog(id, 'error', data.error ?? 'Unknown error')
      }
    } catch (err) {
      updateLog(id, 'error', String(err))
    }
    setBusy(false)
  }

  async function runSingleSourceScan(sourceType: string) {
    if (!selected) return
    setBusy(true)
    const id = pushLog(`Scan ${sourceType} — ${selected.business_name ?? selected.email}`)
    try {
      const res = await fetch('/api/scan', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ founderId: selected.id, sourceType, force: true, sendEmail: false, triggeredBy: 'manual' }),
      })
      const data = await res.json()
      if (res.ok && data.success) {
        const total = data.results?.reduce((s: number, r: { signals: number }) => s + (r.signals ?? 0), 0) ?? 0
        updateLog(id, 'success', `${total} signal(s) found.`)
      } else {
        updateLog(id, 'error', data.error ?? 'Unknown error')
      }
    } catch (err) {
      updateLog(id, 'error', String(err))
    }
    setBusy(false)
  }

  async function generatePlan() {
    if (!selected) return
    setBusy(true)
    const id = pushLog(`Generate Plan — ${selected.business_name ?? selected.email}`)
    try {
      const res = await fetch('/api/admin/plan-trigger', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ founderId: selected.id }),
      })
      const data = await res.json()
      if (res.ok && data.success) {
        updateLog(id, 'success', `Digest generated (id: ${data.digestId}). Plan-ready email sent automatically.`)
      } else {
        updateLog(id, 'error', data.error ?? 'Unknown error')
      }
    } catch (err) {
      updateLog(id, 'error', String(err))
    }
    setBusy(false)
  }

  async function sendMonthlyReport() {
    if (!selected) return
    setBusy(true)
    const id = pushLog(`Monthly Report — ${selected.business_name ?? selected.email}`)
    try {
      const res = await fetch('/api/admin/monthly-report', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ founderId: selected.id }),
      })
      const data = await res.json()
      if (res.ok && data.success) {
        updateLog(id, 'success', `Monthly report sent. Health score: ${data.healthScore}/100.`)
      } else {
        updateLog(id, 'error', data.error ?? 'Unknown error')
      }
    } catch (err) {
      updateLog(id, 'error', String(err))
    }
    setBusy(false)
  }

  async function makeNavigator() {
    if (!selected) return
    setBusy(true)
    const id = pushLog(`Make Navigator (£49) — ${selected.business_name ?? selected.email}`)
    try {
      const res = await fetch('/api/admin/make-navigator', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ founderId: selected.id }),
      })
      const data = await res.json()
      if (res.ok && data.success) {
        updateLog(id, 'success', 'Subscription tier set to navigator. £49 payment record added.')
        setSelected({ ...selected, subscription_tier: 'navigator', subscription_status: 'active' })
      } else {
        updateLog(id, 'error', data.error ?? 'Unknown error')
      }
    } catch (err) {
      updateLog(id, 'error', String(err))
    }
    setBusy(false)
  }

  if (!authed) {
    return (
      <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F9FAFB', fontFamily: 'Inter, sans-serif' }}>
        <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #E5E7EB', padding: 40, width: 360 }}>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: '#111827', marginBottom: 8 }}>Elvanis Admin</h1>
          <p style={{ fontSize: 13, color: '#6B7280', marginBottom: 20 }}>Internal tool — password required.</p>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
            placeholder="Admin password"
            style={{ width: '100%', padding: '10px 14px', border: '1px solid #E5E7EB', borderRadius: 10, fontSize: 14, marginBottom: 12, boxSizing: 'border-box' }}
          />
          {authError && <p style={{ fontSize: 12, color: '#DC2626', marginBottom: 12 }}>{authError}</p>}
          <button onClick={handleLogin} style={{ width: '100%', padding: 12, background: '#111827', color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
            Enter →
          </button>
        </div>
      </main>
    )
  }

  return (
    <main style={{ minHeight: '100vh', background: '#F9FAFB', fontFamily: 'Inter, sans-serif', padding: '40px 24px' }}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: '#111827', marginBottom: 24 }}>Elvanis Admin</h1>

        {/* Founder search */}
        <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #E5E7EB', padding: 24, marginBottom: 20 }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', marginBottom: 10 }}>Find founder</p>
          <input
            value={query}
            onChange={e => handleSearch(e.target.value)}
            placeholder="Search by name, email, or business..."
            style={{ width: '100%', padding: '12px 16px', border: '1px solid #E5E7EB', borderRadius: 10, fontSize: 14, boxSizing: 'border-box' }}
          />
          {searching && <p style={{ fontSize: 12, color: '#9CA3AF', marginTop: 8 }}>Searching...</p>}
          {results.length > 0 && (
            <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
              {results.map(f => (
                <button
                  key={f.id}
                  onClick={() => { setSelected(f); setResults([]); setQuery('') }}
                  style={{ textAlign: 'left', padding: '10px 14px', background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: 8, cursor: 'pointer' }}
                >
                  <p style={{ fontSize: 14, fontWeight: 700, color: '#111827', margin: 0 }}>{f.full_name ?? '—'} · {f.business_name ?? '—'}</p>
                  <p style={{ fontSize: 12, color: '#6B7280', margin: '2px 0 0' }}>{f.email} · {f.subscription_tier}</p>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Selected founder + actions */}
        {selected && (
          <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #E5E7EB', padding: 24, marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div>
                <p style={{ fontSize: 16, fontWeight: 800, color: '#111827', margin: 0 }}>{selected.full_name ?? selected.email}</p>
                <p style={{ fontSize: 13, color: '#6B7280', margin: '2px 0 0' }}>{selected.business_name ?? '—'} · {selected.email}</p>
              </div>
              <span style={{ fontSize: 12, fontWeight: 700, padding: '4px 12px', borderRadius: 20, background: selected.subscription_tier === 'navigator' ? '#ECFDF5' : '#F3F4F6', color: selected.subscription_tier === 'navigator' ? '#059669' : '#6B7280' }}>
                {selected.subscription_tier}
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
              <button disabled={busy} onClick={runFullScan} style={btnStyle('#2563EB')}>🔍 Run Full Scan Now</button>
              <button disabled={busy} onClick={generatePlan} style={btnStyle('#7C3AED')}>✨ Generate Plan Now</button>
              <button disabled={busy} onClick={sendMonthlyReport} style={btnStyle('#D97706')}>📊 Send Monthly Report</button>
              <button disabled={busy} onClick={makeNavigator} style={btnStyle('#059669')}>⭐ Make Navigator (£49)</button>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {['shopify', 'jira', 'ga4', 'intercom', 'trustpilot'].map(src => (
                  <button key={src} disabled={busy} onClick={() => runSingleSourceScan(src)} style={{ ...btnStyle('#374151'), flex: 1, fontSize: 11, padding: '8px 6px' }}>
                    {src}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Action log */}
        {logs.length > 0 && (
          <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #E5E7EB', padding: 24 }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', marginBottom: 12 }}>Action Log</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {logs.map(l => (
                <div key={l.id} style={{ padding: '10px 14px', background: l.status === 'success' ? '#ECFDF5' : l.status === 'error' ? '#FEF2F2' : '#F9FAFB', borderRadius: 8, border: `1px solid ${l.status === 'success' ? '#A7F3D0' : l.status === 'error' ? '#FECACA' : '#E5E7EB'}` }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: '#111827', margin: 0 }}>
                    {l.status === 'pending' ? '⏳' : l.status === 'success' ? '✓' : '✗'} {l.label}
                  </p>
                  {l.detail && <p style={{ fontSize: 12, color: '#6B7280', margin: '4px 0 0' }}>{l.detail}</p>}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  )
}

function btnStyle(color: string): React.CSSProperties {
  return {
    padding: '12px 16px', background: color, color: '#fff', border: 'none',
    borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer',
  }
}