'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

type JiraProject = {
  id: string
  key: string
  name: string
  projectTypeKey: string
  avatarUrls: { '48x48': string }
}

export default function JiraSelectPage() {
  const router = useRouter()
  const [projects, setProjects] = useState<JiraProject[]>([])
  const [selected, setSelected] = useState<JiraProject | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/auth/jira/projects', { credentials: 'include', cache: 'no-store' })
      .then(async r => {
        const data = await r.json()
        if (!r.ok) {
          setError(data.error ?? 'Failed to load projects')
          setLoading(false)
          return
        }
        setProjects(data.projects ?? [])
        setLoading(false)
      })
      .catch(() => { setError('Failed to load projects'); setLoading(false) })
  }, [])

  async function handleSelect() {
    if (!selected) return
    setSaving(true)
    const res = await fetch('/api/auth/jira/select-project', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectId: selected.id,
        projectKey: selected.key,
        projectName: selected.name,
      }),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error ?? 'Failed to save'); setSaving(false); return }
    router.push('/signals?connected=jira')
  }

  return (
    <main style={{ minHeight: '100vh', background: '#F9FAFB', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter, sans-serif', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 560 }}>
        <a href="/connect" style={{ fontSize: 13, color: '#6B7280', textDecoration: 'none', display: 'block', marginBottom: 24 }}>
          ← Back to connections
        </a>
        <div style={{ background: '#fff', borderRadius: 20, border: '1px solid #E5E7EB', padding: '36px 32px' }}>
          <div style={{ width: 52, height: 52, borderRadius: 12, background: '#E6F0FF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, marginBottom: 20 }}>
            🔧
          </div>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: '#111827', marginBottom: 8 }}>
            Select your Jira project
          </h2>
          <p style={{ fontSize: 14, color: '#6B7280', marginBottom: 28, lineHeight: 1.6 }}>
            Elvanis will read sprint velocity, bug backlog, and issue data from this project to generate diagnostic signals.
          </p>

          {loading && (
            <p style={{ color: '#6B7280', fontSize: 14, textAlign: 'center', padding: '20px 0' }}>
              Loading your Jira projects...
            </p>
          )}

          {error && (
            <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 10, padding: '12px 14px', marginBottom: 16 }}>
              <p style={{ color: '#DC2626', fontSize: 13, margin: 0 }}>{error}</p>
            </div>
          )}

          {!loading && projects.length === 0 && !error && (
            <p style={{ color: '#6B7280', fontSize: 14 }}>
              No Jira projects found. Make sure you have at least one project in your Jira workspace.
            </p>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
            {projects.map(p => (
              <button
                key={p.id}
                onClick={() => setSelected(p)}
                style={{
                  padding: '14px 18px',
                  border: `2px solid ${selected?.id === p.id ? '#0052CC' : '#E5E7EB'}`,
                  borderRadius: 12,
                  background: selected?.id === p.id ? '#E6F0FF' : '#fff',
                  textAlign: 'left',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                }}
              >
                <div style={{ width: 36, height: 36, borderRadius: 8, background: '#0052CC', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
                  {p.key.substring(0, 2)}
                </div>
                <div>
                  <p style={{ fontSize: 15, fontWeight: 600, color: '#111827', margin: '0 0 2px' }}>{p.name}</p>
                  <p style={{ fontSize: 12, color: '#9CA3AF', margin: 0 }}>
                    {p.key} · {p.projectTypeKey}
                  </p>
                </div>
              </button>
            ))}
          </div>

          {selected && (
            <div style={{ background: '#E6F0FF', borderRadius: 10, padding: '12px 14px', marginBottom: 20 }}>
              <p style={{ fontSize: 13, color: '#0052CC', margin: 0 }}>
                Elvanis will read velocity, bug backlog, and sprint data from <strong>{selected.name}</strong>
              </p>
            </div>
          )}

          <button
            onClick={handleSelect}
            disabled={!selected || saving}
            style={{
              width: '100%', padding: '14px',
              background: !selected || saving ? '#E5E7EB' : '#0052CC',
              color: !selected || saving ? '#9CA3AF' : '#fff',
              border: 'none', borderRadius: 12, fontSize: 15, fontWeight: 700,
              cursor: !selected || saving ? 'not-allowed' : 'pointer',
            }}
          >
            {saving ? 'Connecting and scanning...' : 'Connect this project →'}
          </button>
        </div>
      </div>
    </main>
  )
}