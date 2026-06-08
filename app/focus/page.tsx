import { redirect } from 'next/navigation'
import { createServerComponentClient } from '@/lib/supabase-server'
import GlobalHeader from '@/components/GlobalHeader'
import FocusView from '@/components/focus/FocusView'
import { calculateHealthScore } from '@/lib/health-scoring'
import type { FounderStage, FocusMetric } from '@/lib/gravity-engine'

export default async function FocusPage() {
  const supabase = await createServerComponentClient()

  // ── Auth ────────────────────────────────────────────────────
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // ── Founder ─────────────────────────────────────────────────
  const { data: founder } = await supabase
    .from('founders')
    .select('id, full_name, business_name, founder_stage, focus_metric, subscription_tier, logo_url, guide_dismissed')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!founder) redirect('/onboarding')

  // ── Signals ─────────────────────────────────────────────────
  const { data: signals } = await supabase
    .from('diagnostic_signals')
    .select('id, signal_type, dimension, severity, status, source, insight_summary, recommended_action, value, trend, scan_count')
    .eq('founder_id', founder.id)
    .in('status', ['new', 'acknowledged', 'resolved'])
    .order('created_at', { ascending: false })

  // ── Data sources ─────────────────────────────────────────────
  const { data: dataSources } = await supabase
    .from('data_sources')
    .select('id, source_type, status, last_synced_at')
    .eq('founder_id', founder.id)

  // ── Assessment ───────────────────────────────────────────────
  const { data: assessment } = await supabase
    .from('assessments')
    .select('id')
    .eq('founder_id', founder.id)
    .maybeSingle()

  // ── Scans ────────────────────────────────────────────────────
  const { data: latestScan } = await supabase
    .from('scans')
    .select('id')
    .eq('founder_id', founder.id)
    .eq('status', 'completed')
    .order('scanned_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  // ── Health score ─────────────────────────────────────────────
  const activeSignals = (signals ?? []).filter(
    s => (s.status === 'new' || s.status === 'acknowledged') && s.source !== 'manual'
  )
  const overallScore = calculateHealthScore(
    activeSignals.map(s => ({
      signal_type: s.signal_type,
      severity:    s.severity,
      dimension:   s.dimension,
    }))
  )

  return (
    <div style={{ minHeight: '100vh', background: '#F9FAFB' }}>
      <GlobalHeader
        founder={founder}
      />
      <main style={{ paddingTop: 72 }}>
        <FocusView
          founderId={founder.id}
          founderName={founder.full_name ?? 'Founder'}
          founderStage={(founder.founder_stage as FounderStage) ?? null}
          focusMetric={(founder.focus_metric as FocusMetric) ?? null}
          signals={signals ?? []}
          dataSources={dataSources ?? []}
          hasAssessment={!!assessment}
          hasEverScanned={!!latestScan}
          overallScore={overallScore}
        />
      </main>
    </div>
  )
}