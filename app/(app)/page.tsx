import { redirect } from 'next/navigation'
import { createServerComponentClient } from '@/lib/supabase-server'
import FocusView from '@/components/focus/FocusView'
import { DashboardTour } from './guide'
import { calculateHealthScore } from '@/lib/health-scoring'
import { getT } from '@/lib/translations'
import type { FounderStage, FocusMetric } from '@/lib/gravity-engine'
import { AI_OPPORTUNITY_SIGNALS } from '@/lib/ai-opportunities'
import { getStatusLabel, getDisplaySummary, getDisplayConstraint, getScoreDimensions, getPriorityOrder, getClosingMessage } from '@/lib/assessment-status'


const STRIPE_PAYMENT_LINK = process.env.NEXT_PUBLIC_STRIPE_PAYMENT_LINK

function calculateAIReadiness(
  signals: Array<{ status: string; signal_type: string; severity: string; source: string }>,
  assessment: Record<string, unknown> | null
) {
  const activeSignals     = signals.filter(s => s.status === 'new' || s.status === 'acknowledged')
  const activeSignalTypes = activeSignals.map(s => s.signal_type)
  const severityRank: Record<string, number> = { critical: 3, warning: 2, watch: 1 }

  const opportunities = Object.entries(AI_OPPORTUNITY_SIGNALS)
    .filter(([type]) => activeSignalTypes.includes(type))
    .map(([type, data]) => {
      const highestSeverity = activeSignals
        .filter(s => s.signal_type === type)
        .reduce((highest, s) => (severityRank[s.severity] ?? 0) > (severityRank[highest] ?? 0) ? s.severity : highest, 'watch' as string)
      return { signal_type: type, severity: highestSeverity, ...data }
    })
    .sort((a, b) => (severityRank[b.severity] ?? 0) - (severityRank[a.severity] ?? 0))

  const hasEnoughData = activeSignals.length >= 2
  if (!hasEnoughData) return { score: 0, opportunities: [], hasEnoughData: false }

  const baseScore = Math.min(opportunities.length * 15, 60)
  let capacityBonus = 0
  if (assessment) {
    const runway            = assessment.runway as string
    const technicalCapacity = assessment.technical_capacity as string
    const teamSize          = assessment.team_size as string
    const investmentStatus  = assessment.investment_status as string
    if (investmentStatus && !['Bootstrapped — self-funded'].includes(investmentStatus)) capacityBonus += 15
    if (runway && ['More than 18 months', '12–18 months', 'Not applicable — profitable'].includes(runway)) capacityBonus += 10
    if (
      technicalCapacity === 'Yes — strong technical team' ||
      technicalCapacity === 'Yes — limited technical capacity' ||
      (teamSize && ['6–15 people', '16–50 people', '50+ people'].includes(teamSize))
    ) capacityBonus += 15
  }
  return { score: Math.min(baseScore + capacityBonus, 100), opportunities, hasEnoughData: true }
}

export default async function HomePage() {
  const supabase = await createServerComponentClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: founder } = await supabase
    .from('founders')
    .select('id, full_name, business_name, founder_stage, focus_metric, subscription_tier, logo_url, guide_dismissed, language')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!founder) redirect('/onboarding')
    const t = getT((founder.language ?? 'en') as 'en' | 'ar')

  const { data: signals } = await supabase
    .from('diagnostic_signals')
    .select('id, signal_type, dimension, severity, status, source, insight_summary, insight_summary_ar, recommended_action, recommended_action_ar, value, trend, scan_count')
    .eq('founder_id', founder.id)
    .in('status', ['new', 'acknowledged', 'resolved'])
    .order('created_at', { ascending: false })

  const { data: dataSources } = await supabase
    .from('data_sources')
    .select('id, source_type, status, last_synced_at')
    .eq('founder_id', founder.id)

  const connectedSourceTypes = (dataSources ?? [])
    .filter(s => s.status === 'active')
    .map(s => s.source_type)

  const { data: assessment } = await supabase
    .from('assessments')
    .select('*')
    .eq('founder_id', founder.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const { data: score } = await supabase
    .from('scores')
    .select('*')
    .eq('founder_id', founder.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const { data: latestScan } = await supabase
    .from('scans')
    .select('id')
    .eq('founder_id', founder.id)
    .eq('status', 'completed')
    .order('scanned_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const { data: latestDigest } = await supabase
    .from('action_digests')
    .select('id, digest, digest_ar, generated_at, status')
    .eq('founder_id', founder.id)
    .eq('status', 'active')
    .maybeSingle()

  const activeSignals = (signals ?? []).filter(
    s => (s.status === 'new' || s.status === 'acknowledged') && s.source !== 'manual'
  )
  const overallScore = calculateHealthScore(
    activeSignals.map(s => ({ signal_type: s.signal_type, severity: s.severity, dimension: s.dimension }))
  )

  const allActiveSignals = (signals ?? []).filter(s => s.status === 'new' || s.status === 'acknowledged')
  const aiReadiness      = calculateAIReadiness(allActiveSignals, assessment as Record<string, unknown> | null)

  const isFreeTier      = !founder || founder.subscription_tier === 'free'
  const displaySummary    = score ? getDisplaySummary(score as Record<string, unknown>, founder.language ?? 'en') : null
  const displayConstraint  = score ? getDisplayConstraint(score as Record<string, unknown>, founder.language ?? 'en') : null
  const priorityOrder      = score ? getPriorityOrder(score as Record<string, unknown>, founder.language ?? 'en') as Array<{ priority: number; action: string; reason: string; timeframe: string; effort: string; impact: string }> | null : null
  const closingMessage     = score ? getClosingMessage(score as Record<string, unknown>, founder.language ?? 'en') : null
  const topPriority        = priorityOrder?.[0] ?? null
  const overallScoreColor = score
    ? ((score.overall_score as number) >= 66 ? '#059669' : (score.overall_score as number) >= 41 ? '#D97706' : '#DC2626')
    : '#6B7280'
  const complexityColor = (c: string) => c === 'low' ? '#059669' : c === 'medium' ? '#D97706' : '#7C3AED'

  return (
    <div style={{ background: '#F9FAFB', minHeight: '100vh' }}>

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
        connectedSourceTypes={connectedSourceTypes}
        subscriptionTier={founder.subscription_tier}
      />

      <div style={{ maxWidth: 960, margin: '0 auto', padding: '0 24px 48px' }}>

        {/* ── Overview cross-link ── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, paddingTop: 8 }}>
          <p style={{ fontSize: 13, color: '#9CA3AF', margin: 0 }}>{t('home.more_intelligence')}</p>
          <a href="/overview" style={{ fontSize: 13, color: '#2563EB', fontWeight: 600, textDecoration: 'none' }}>
          {t('home.see_full_health')}
          </a>
        </div>

        {/* ── Assessment card ── */}
        <div id="tour-assessment-card" style={{ background: '#fff', borderRadius: 16, border: '1px solid #E5E7EB', padding: '24px 28px', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: score ? 16 : 0 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.06em', margin: 0 }}>
            {t('assessment.score')}
           </p>
            {score && (
              <div style={{ display: 'flex', gap: 8 }}>
                <a href="/assessment/result" style={{ fontSize: 13, color: '#2563EB', textDecoration: 'none', padding: '6px 14px', border: '1px solid #BFDBFE', borderRadius: 8, fontWeight: 600 }}>
                {t('assessment.full_report')}
                </a>
                <a href="/assessment" style={{ fontSize: 13, color: '#6B7280', textDecoration: 'none', padding: '6px 14px', border: '1px solid #E5E7EB', borderRadius: 8 }}>
                {t('assessment.retake')}
                </a>
              </div>
            )}
          </div>
          {!score ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 20, padding: '20px', background: '#F9FAFB', borderRadius: 12 }}>
              <div style={{ width: 52, height: 52, background: '#EFF6FF', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, flexShrink: 0 }}>🎯</div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 15, fontWeight: 700, color: '#111827', margin: '0 0 4px' }}> {t('assessment.no_assessment')}</p>
                <p style={{ fontSize: 13, color: '#6B7280', margin: '0 0 12px', lineHeight: 1.5 }}>{t('assessment.no_assessment_sub')}</p>
                <a href="/assessment" style={{ display: 'inline-block', padding: '9px 20px', background: '#2563EB', color: '#fff', borderRadius: 9, fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>
                {t('assessment.start')}
                </a>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '16px 20px', background: '#F9FAFB', borderRadius: 12, border: '1px solid #E5E7EB' }}>
              <div style={{ textAlign: 'center', flexShrink: 0 }}>
              <p style={{ fontSize: 10, color: '#6B7280', fontWeight: 700, margin: '0 0 2px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t('assessment.overall')}</p>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2 }}>
                  <span style={{ fontSize: 40, fontWeight: 900, color: overallScoreColor, lineHeight: 1 }}>{score.overall_score as number}</span>
                  <span style={{ fontSize: 13, color: '#9CA3AF', marginBottom: 3 }}>/100</span>
                </div>
              </div>
              <div style={{ width: 1, height: 48, background: '#E5E7EB', flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
              <p style={{ fontSize: 14, fontWeight: 700, color: '#111827', margin: '0 0 4px' }}>{getStatusLabel(score.overall_status as string, t as (k: string) => string)}</p>
                <p style={{ fontSize: 12, color: '#6B7280', margin: '0 0 8px', lineHeight: 1.5 }}>
                {(displaySummary ?? score.overall_summary as string)?.substring(0, 120)}...
                </p>
                {displayConstraint && (
                  <span style={{ fontSize: 11, color: '#DC2626', fontWeight: 600 }}>
                    ⚠ {displayConstraint.substring(0, 80)}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ── AI Readiness ── */}
        <div id="tour-ai-card" style={{ background: '#F5F3FF', borderRadius: 16, border: '1px solid #DDD6FE', padding: '24px 28px', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div>
            <p style={{ fontSize: 11, fontWeight: 700, color: '#7C3AED', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 4px' }}>{t('common.ai_readiness')}</p>
            <p style={{ fontSize: 13, color: '#6B7280', margin: 0 }}>
                {allActiveSignals.length > 0 ? t('common.based_on_signals') : t('common.based_on_profile')}
              </p>
            </div>
            {aiReadiness.hasEnoughData && aiReadiness.opportunities.length > 0 && (
              <div style={{ background: '#fff', borderRadius: 12, padding: '8px 16px', flexShrink: 0 }}>
                <span style={{ fontSize: 28, fontWeight: 900, color: '#7C3AED', lineHeight: 1 }}>{aiReadiness.score}</span>
                <span style={{ fontSize: 13, color: '#7C3AED' }}>/100</span>
              </div>
            )}
          </div>
          {!aiReadiness.hasEnoughData ? (
            <div style={{ background: '#EDE9FE', borderRadius: 12, padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
              <p style={{ fontSize: 13, color: '#6D28D9', margin: 0 }}>{t('home.take_assessment')}</p>
              <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
              {!assessment && <a href="/assessment" style={{ padding: '8px 16px', background: '#7C3AED', color: '#fff', borderRadius: 8, fontSize: 12, fontWeight: 600, textDecoration: 'none' }}>{t('common.take_assessment')}</a>}
              <a href="/connect" style={{ padding: '8px 16px', background: '#fff', color: '#7C3AED', borderRadius: 8, fontSize: 12, fontWeight: 600, textDecoration: 'none', border: '1px solid #DDD6FE' }}>{t('common.connect_tools')}</a>
              </div>
            </div>
          ) : aiReadiness.opportunities.length === 0 ? (
            <p style={{ fontSize: 13, color: '#A78BFA', margin: 0 }}>{t('common.no_ai_opportunities')}</p>
          ) : (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 10, marginBottom: 16 }}>
                {aiReadiness.opportunities.slice(0, 3).map(opp => (
                  <div key={opp.signal_type} style={{ background: '#fff', borderRadius: 12, padding: '14px 16px', border: '1px solid #EDE9FE' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <p style={{ fontSize: 13, fontWeight: 700, color: '#4C1D95', margin: 0 }}>{founder.language === 'ar' ? opp.title_ar : opp.title}</p>
                      <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 20, background: '#F5F3FF', color: complexityColor(opp.complexity), fontWeight: 700 }}>{t((`focus.complexity_${opp.complexity}`) as Parameters<typeof t>[0])}</span>
                    </div>
                    <p style={{ fontSize: 12, color: '#6D28D9', margin: '0 0 6px', lineHeight: 1.5 }}>{founder.language === 'ar' ? opp.description_ar : opp.description}</p>
                    <p style={{ fontSize: 11, color: '#7C3AED', fontWeight: 600, margin: 0 }}>⏱ {founder.language === 'ar' ? opp.saving_ar : opp.saving}</p>
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
              <a href="/advisory?type=roadmap" style={{ padding: '9px 20px', background: '#7C3AED', color: '#fff', borderRadius: 9, fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>{t('home.request_roadmap')}</a>
              <a href="/advisory?type=cpo" style={{ padding: '9px 20px', background: '#fff', color: '#7C3AED', borderRadius: 9, fontSize: 13, fontWeight: 600, textDecoration: 'none', border: '1px solid #DDD6FE' }}>{t('home.book_cpo')}</a>
              </div>
            </>
          )}
        </div>
        
        {/* ── Action Digest ── */}
        {!isFreeTier ? (
          <div id="tour-digest-card" style={{ background: latestDigest ? '#F5F3FF' : '#F9FAFB', borderRadius: 16, border: latestDigest ? '1px solid #DDD6FE' : '1px solid #E5E7EB', padding: '24px 28px', marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: latestDigest ? 14 : 0 }}>
              <div>
              <p style={{ fontSize: 14, color: '#9CA3AF', margin: 0 }}>{t('home.digest_anniversary')}</p>
              {latestDigest ? (
                  <p style={{ fontSize: 14, color: '#6B7280', margin: 0 }}>
                   {t('plan.generated')} {new Date((latestDigest as Record<string, unknown>).generated_at as string).toLocaleDateString(founder.language === 'ar' ? 'ar-EG' : 'en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                ) : (
                  <p style={{ fontSize: 14, color: '#9CA3AF', margin: 0 }}>{t('home.digest_anniversary')}</p>
                )}
              </div>
              <a href="/plan" style={{ padding: '8px 18px', background: latestDigest ? '#7C3AED' : '#E5E7EB', color: latestDigest ? '#fff' : '#9CA3AF', borderRadius: 9, fontSize: 13, fontWeight: 700, textDecoration: 'none', whiteSpace: 'nowrap', flexShrink: 0 }}>
              {latestDigest ? t('home.view_digest') : t('home.no_digest')}
              </a>
            </div>
            {latestDigest && (
              <p style={{ fontSize: 14, color: '#374151', lineHeight: 1.7, margin: 0, paddingTop: 14, borderTop: '1px solid #EDE9FE' }}>
                {(() => {
                  const d = (latestDigest as Record<string, unknown>).digest as Record<string, unknown>
                  const dAr = (latestDigest as Record<string, unknown>).digest_ar as Record<string, unknown> | undefined
                  const summary = (founder.language === 'ar' && dAr?.summary_ar) ? String(dAr.summary_ar) : String(d?.summary ?? '')
                  return summary.substring(0, 200) + (summary.length > 200 ? '...' : '')
                })()}
              </p>
            )}
          </div>
        ) : (
          <div id="tour-digest-card" style={{ background: '#F5F3FF', borderRadius: 16, border: '1px solid #DDD6FE', padding: '24px 28px', marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap' as const }}>
            <div>
              <p style={{ fontSize: 14, color: '#6D28D9', margin: '0 0 4px', fontWeight: 600 }}>{t('home.upgrade_plan')}</p>
              <p style={{ fontSize: 13, color: '#A78BFA', margin: 0 }}>{t('home.upgrade_sub')}</p>
            </div>
            {STRIPE_PAYMENT_LINK ? (
              <a href={STRIPE_PAYMENT_LINK} target="_blank" rel="noopener noreferrer" style={{ padding: '10px 22px', background: '#7C3AED', color: '#fff', borderRadius: 10, fontSize: 13, fontWeight: 700, textDecoration: 'none', whiteSpace: 'nowrap', flexShrink: 0 }}>
                {t('home.upgrade_cta')}
              </a>
            ) : (
              <a href="/advisory?type=upgrade" style={{ padding: '10px 22px', background: '#7C3AED', color: '#fff', borderRadius: 10, fontSize: 13, fontWeight: 700, textDecoration: 'none', whiteSpace: 'nowrap', flexShrink: 0 }}>
                {t('common.contact_upgrade')}
              </a>
            )}
          </div>
        )}

        {/* ── Service CTA ── */}
        <div style={{ background: '#1E1B4B', borderRadius: 16, padding: '32px 36px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 24, flexWrap: 'wrap' as const }}>
          <div>
            <p style={{ fontSize: 18, fontWeight: 800, color: '#fff', margin: '0 0 6px' }}>{t('home.service_title')}</p>
            <p style={{ fontSize: 14, color: '#A5B4FC', margin: 0 }}>{t('home.service_sub')}</p>
          </div>
          <div style={{ display: 'flex', gap: 10, flexShrink: 0, flexWrap: 'wrap' as const }}>
            <a href="/advisory?type=roadmap" style={{ padding: '12px 22px', background: '#4F46E5', color: '#fff', borderRadius: 10, fontSize: 13, fontWeight: 700, textDecoration: 'none', whiteSpace: 'nowrap' }}> {t('home.get_roadmap')}</a>
            <a href="/advisory?type=cpo" style={{ padding: '12px 22px', background: 'transparent', color: '#A5B4FC', borderRadius: 10, fontSize: 13, fontWeight: 600, textDecoration: 'none', border: '1px solid #4F46E5', whiteSpace: 'nowrap' }}> {t('home.book_cpo')}</a>
          </div>
        </div>

      </div>

      {/* ── Tour ── */}
      <DashboardTour guideDismissed={founder.guide_dismissed ?? false} />

    </div>
  )
}