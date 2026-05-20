import { redirect } from 'next/navigation'
import { createServerComponentClient } from '@/lib/supabase-server'
import HeaderUser from '@/components/header-user'
import GlobalHeader from '@/components/GlobalHeader'

export default async function AssessmentResultPage() {
  const supabase = await createServerComponentClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: founder } = await supabase
    .from('founders')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle()

  const { data: score } = await supabase
    .from('scores')
    .select('*')
    .eq('founder_id', founder?.id ?? '')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!score) redirect('/assessment')

  const name = founder?.full_name?.split(' ')[0] ?? ''

  return (
    <main style={{ minHeight: '100vh', background: '#F9FAFB', fontFamily: 'Inter, sans-serif' }}>
      <GlobalHeader founder={founder} />

      <div style={{ maxWidth: 960, margin: '0 auto', padding: '40px 24px' }}>

        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <p style={{ fontSize: 13, color: '#6B7280', marginBottom: 4 }}>
            Assessment completed · {new Date(score.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: '#111827', margin: 0 }}>
            {name ? `${name}'s Business Health Report` : 'Business Health Report'}
          </h1>
        </div>

        {/* Overall score */}
        <div style={{ background: '#fff', borderRadius: 20, border: '1px solid #E5E7EB', padding: '32px 36px', marginBottom: 20 }}>
          <p style={{ fontSize: 12, fontWeight: 600, color: '#6B7280', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Overall Health Score</p>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, marginBottom: 12 }}>
            <span style={{ fontSize: 80, fontWeight: 800, color: '#111827', lineHeight: 1 }}>{score.overall_score}</span>
            <span style={{ fontSize: 24, color: '#9CA3AF', marginBottom: 8 }}>/100</span>
          </div>
          {score.overall_status && (
            <p style={{ color: '#374151', fontWeight: 600, marginBottom: 8 }}>{score.overall_status}</p>
          )}
          <p style={{ color: '#6B7280', lineHeight: 1.65, fontSize: 15, margin: 0 }}>{score.overall_summary}</p>
        </div>

        {/* Primary constraint */}
        {score.primary_constraint_summary && (
          <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 20, padding: '24px 28px', marginBottom: 20 }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: '#DC2626', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>⚡ Primary Constraint</p>
            <p style={{ color: '#1F2937', lineHeight: 1.65, fontSize: 15, margin: 0 }}>{score.primary_constraint_summary}</p>
          </div>
        )}

        {/* 6 dimension scores */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 20 }}>
          {[
            { label: 'Revenue', val: score.score_revenue as number | null },
            { label: 'Product-Market Fit', val: score.score_pmf as number | null },
            { label: 'Team & Operations', val: score.score_team as number | null },
            { label: 'Customer & Retention', val: score.score_customer as number | null },
            { label: 'Marketing & Growth', val: score.score_marketing as number | null },
            { label: 'Strategy & Goals', val: score.score_strategy as number | null },
          ].map(({ label, val }) => {
            const v = val ?? 0
            const color = v >= 66 ? '#059669' : v >= 41 ? '#D97706' : '#DC2626'
            return (
              <div key={label} style={{ background: '#fff', borderRadius: 16, border: '1px solid #E5E7EB', padding: '20px 22px' }}>
                <p style={{ fontSize: 12, color: '#6B7280', fontWeight: 600, marginBottom: 8 }}>{label}</p>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, marginBottom: 10 }}>
                  <span style={{ fontSize: 36, fontWeight: 800, color, lineHeight: 1 }}>{val ?? '—'}</span>
                  {val !== null && <span style={{ fontSize: 13, color: '#9CA3AF', marginBottom: 3 }}>/100</span>}
                </div>
                <div style={{ height: 6, background: '#F3F4F6', borderRadius: 99 }}>
                  <div style={{ height: 6, borderRadius: 99, background: color, width: `${v}%` }} />
                </div>
              </div>
            )
          })}
        </div>

        {/* Top 3 findings */}
        {score.top_3_findings && (
          <div style={{ background: '#fff', borderRadius: 20, border: '1px solid #E5E7EB', padding: '28px 32px', marginBottom: 20 }}>
            <h3 style={{ fontSize: 17, fontWeight: 700, color: '#111827', marginBottom: 20 }}>Top 3 Findings</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              {(score.top_3_findings as Array<{ rank: number; finding: string; impact: string }>).map(item => (
                <div key={item.rank} style={{ display: 'flex', gap: 14 }}>
                  <span style={{ flexShrink: 0, width: 28, height: 28, background: '#EFF6FF', color: '#2563EB', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800 }}>
                    {item.rank}
                  </span>
                  <div>
                    <p style={{ color: '#1F2937', fontWeight: 600, fontSize: 15, margin: '0 0 4px' }}>{item.finding}</p>
                    <p style={{ color: '#6B7280', fontSize: 13, margin: 0, lineHeight: 1.5 }}>{item.impact}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Next steps */}
        <div style={{ background: '#fff', borderRadius: 20, border: '1px solid #E5E7EB', padding: '28px 32px', marginBottom: 20 }}>
          <h3 style={{ fontSize: 17, fontWeight: 700, color: '#111827', marginBottom: 16 }}>What to do next</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
            <a href="/connect" style={{ padding: '18px', background: '#EFF6FF', borderRadius: 14, textDecoration: 'none', display: 'block' }}>
              <p style={{ fontSize: 20, marginBottom: 8 }}>🔌</p>
              <p style={{ fontSize: 14, fontWeight: 700, color: '#1D4ED8', margin: '0 0 4px' }}>Connect your tools</p>
              <p style={{ fontSize: 12, color: '#3B82F6', margin: 0 }}>Get live signals from Jira, GA4, Trustpilot</p>
            </a>
            <a href="/signals" style={{ padding: '18px', background: '#F0FDF4', borderRadius: 14, textDecoration: 'none', display: 'block' }}>
              <p style={{ fontSize: 20, marginBottom: 8 }}>📊</p>
              <p style={{ fontSize: 14, fontWeight: 700, color: '#15803D', margin: '0 0 4px' }}>View signals</p>
              <p style={{ fontSize: 12, color: '#16A34A', margin: 0 }}>See what your data is telling you right now</p>
            </a>
            <a href="/service-request?type=roadmap" style={{ padding: '18px', background: '#F5F3FF', borderRadius: 14, textDecoration: 'none', display: 'block' }}>
              <p style={{ fontSize: 20, marginBottom: 8 }}>🗺️</p>
              <p style={{ fontSize: 14, fontWeight: 700, color: '#6D28D9', margin: '0 0 4px' }}>Get AI roadmap</p>
              <p style={{ fontSize: 12, color: '#7C3AED', margin: 0 }}>90-day plan based on your results</p>
            </a>
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 12, justifyContent: 'space-between', alignItems: 'center' }}>
          <a href="/dashboard" style={{ padding: '12px 24px', background: '#2563EB', color: '#fff', borderRadius: 10, textDecoration: 'none', fontWeight: 600, fontSize: 14 }}>
            Go to dashboard →
          </a>
          <a href="/assessment" style={{ fontSize: 13, color: '#6B7280', textDecoration: 'none', padding: '8px 16px', border: '1px solid #E5E7EB', borderRadius: 8 }}>
            Retake assessment
          </a>
        </div>
      </div>
    </main>
  )
}
