'use client'
export const dynamic = 'force-dynamic'

import { useSearchParams } from 'next/navigation'

export default function ConnectIntercomPage() {
  const searchParams = useSearchParams()
  const urlError = searchParams.get('error')

  return (
    <main style={{ minHeight: '100vh', background: '#F9FAFB', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter, sans-serif', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 480 }}>
        <a href="/connect" style={{ fontSize: 13, color: '#6B7280', textDecoration: 'none', display: 'block', marginBottom: 24 }}>
          ← Back to connections
        </a>
        <div style={{ background: '#fff', borderRadius: 20, border: '1px solid #E5E7EB', padding: '36px 32px' }}>
          <div style={{ width: 56, height: 56, borderRadius: 14, background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, marginBottom: 20 }}>
            💬
          </div>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: '#111827', marginBottom: 8 }}>Connect Intercom</h2>
          <p style={{ fontSize: 14, color: '#6B7280', marginBottom: 24, lineHeight: 1.6 }}>
            Connect your Intercom workspace. Elvanis will monitor your support conversations, response times, repeat contacts, and CSAT scores automatically.
          </p>

          <div style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 12, padding: '14px 16px', marginBottom: 28 }}>
            <p style={{ fontSize: 13, color: '#1D4ED8', margin: '0 0 8px', fontWeight: 600 }}>What we read from Intercom:</p>
            <ul style={{ fontSize: 13, color: '#2563EB', margin: 0, paddingLeft: 20, lineHeight: 1.8 }}>
              <li>Conversation volume — last 30 days vs previous 30 days</li>
              <li>First response time and resolution time trends</li>
              <li>Repeat contact rate — users raising unresolved issues</li>
              <li>Conversations open more than 48 hours</li>
              <li>CSAT scores and satisfaction trends</li>
              <li>Activation issues — users stuck in onboarding</li>
            </ul>
          </div>

          {urlError && (
            <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 10, padding: '10px 14px', marginBottom: 20 }}>
              <p style={{ color: '#DC2626', fontSize: 13, margin: 0 }}>
                {urlError === 'token_failed'
                  ? 'Could not get access token. Please try again.'
                  : urlError === 'no_code'
                  ? 'Authorisation was cancelled. Please try again.'
                  : 'Connection failed. Please try again.'}
              </p>
            </div>
          )}

          <a
            href="/api/auth/intercom"
            style={{
              display: 'block',
              padding: '14px',
              background: '#1F8EFF',
              color: '#fff',
              border: 'none',
              borderRadius: 12,
              fontSize: 15,
              fontWeight: 700,
              cursor: 'pointer',
              textDecoration: 'none',
              textAlign: 'center',
              boxSizing: 'border-box' as const,
            }}
          >
            Connect Intercom →
          </a>

          <p style={{ fontSize: 12, color: '#9CA3AF', textAlign: 'center', marginTop: 16 }}>
            You will be redirected to Intercom to approve the connection. We only request read access.
          </p>
        </div>
      </div>
    </main>
  )
}
