'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

export default function ConnectTrustpilotPage() {
  const router = useRouter()
  const [domain, setDomain] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleConnect() {
    if (!domain.trim()) return
    setLoading(true)
    setError('')

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const { data: founder } = await supabase
      .from('founders')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle()

    if (!founder) { setError('Founder not found'); setLoading(false); return }

    // Save data source
    const { data: existingSource } = await supabase
    .from('data_sources')
    .select('id')
    .eq('founder_id', founder.id)
    .eq('source_type', 'trustpilot')
    .maybeSingle()
  
  const sourcePayload = {
    founder_id: founder.id,
    source_type: 'trustpilot',
    status: 'active',
    config: { domain: domain.trim(), url: `https://www.trustpilot.com/review/${domain.trim()}` },
    last_synced_at: new Date().toISOString(),
  }
  
  let sourceErr = null
  if (existingSource) {
    const { error } = await supabase.from('data_sources').update(sourcePayload).eq('id', existingSource.id)
    sourceErr = error
  } else {
    const { error } = await supabase.from('data_sources').insert(sourcePayload)
    sourceErr = error
  }
  
  if (sourceErr) { setError(sourceErr.message); setLoading(false); return }

    // Run first scan immediately
    const res = await fetch('/api/scrape/trustpilot', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ domain: domain.trim(), founderId: founder.id }),
    })

    const data = await res.json()
    if (!res.ok) { setError(data.error ?? 'Scan failed'); setLoading(false); return }

    router.push(`/signals?connected=trustpilot&signals=${data.signals}`)
  }

  return (
    <main style={{ minHeight: '100vh', background: '#F9FAFB', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter, sans-serif', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 480 }}>
        <a href="/connect" style={{ fontSize: 13, color: '#6B7280', textDecoration: 'none', display: 'block', marginBottom: 24 }}>← Back to connections</a>
        <div style={{ background: '#fff', borderRadius: 20, border: '1px solid #E5E7EB', padding: '36px 32px' }}>
          <div style={{ width: 56, height: 56, borderRadius: 14, background: '#E6F9F1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, marginBottom: 20 }}>⭐</div>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: '#111827', marginBottom: 8 }}>Connect Trustpilot</h2>
          <p style={{ fontSize: 14, color: '#6B7280', marginBottom: 28, lineHeight: 1.6 }}>
            Enter your brand domain. Elvanis will monitor your Trustpilot reviews and generate diagnostic signals automatically.
          </p>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
            Your Trustpilot domain
          </label>
          <input
            type="text"
            value={domain}
            onChange={e => setDomain(e.target.value.replace('https://www.trustpilot.com/review/', '').replace('https://', '').replace('www.', ''))}
            placeholder="yourbrand.com"
            style={{ width: '100%', padding: '12px 14px', border: '1.5px solid #E5E7EB', borderRadius: 10, fontSize: 15, marginBottom: 8, boxSizing: 'border-box' as const, outline: 'none' }}
          />
          <p style={{ fontSize: 12, color: '#9CA3AF', marginBottom: 24 }}>
            e.g. gymshark.com · We will scan trustpilot.com/review/gymshark.com
          </p>
          {error && (
            <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 10, padding: '10px 14px', marginBottom: 16 }}>
              <p style={{ color: '#DC2626', fontSize: 13, margin: 0 }}>{error}</p>
            </div>
          )}          <button
            onClick={handleConnect}
            disabled={loading || !domain.trim()}
            style={{ width: '100%', padding: '14px', background: loading || !domain.trim() ? '#E5E7EB' : '#00B67A', color: loading || !domain.trim() ? '#9CA3AF' : '#fff', border: 'none', borderRadius: 12, fontSize: 15, fontWeight: 700, cursor: loading || !domain.trim() ? 'not-allowed' : 'pointer' }}
          >
            {loading ? 'Connecting and scanning...' : 'Connect & run first scan →'}
          </button>
        </div>
      </div>
    </main>
  )
}
