import { redirect } from 'next/navigation'
import { createServerComponentClient } from '@/lib/supabase-server'
import { analyseSignalConflicts, calculatePriorityScore } from '@/lib/signal-analysis'
import type { SignalWithFlags } from '@/lib/signal-analysis'
import { SIGNAL_GOAL_MAP } from '@/lib/signal-goal-map'
import { calculateHealthScore, getHealthLabel, ScoringInput } from '@/lib/health-scoring'

const STRIPE_PAYMENT_LINK = process.env.NEXT_PUBLIC_STRIPE_PAYMENT_LINK

const AI_OPPORTUNITY_SIGNALS: Record<string, { title: string; description: string; saving: string; complexity: 'low' | 'medium' | 'high' }> = {
  ticket_volume_increase:   { title: 'AI Support Agent',           description: 'Automate responses to repetitive support tickets',                          saving: '10-15 hrs/week', complexity: 'low'    },
  response_time_increase:   { title: 'AI Ticket Triage',           description: 'Auto-categorise and prioritise incoming tickets',                           saving: '5-8 hrs/week',   complexity: 'low'    },
  repeat_complaint_pattern: { title: 'AI Knowledge Base',          description: 'Answer common complaints automatically',                                    saving: '8-12 hrs/week',  complexity: 'low'    },
  velocity_drop:            { title: 'AI Sprint Planning',         description: 'AI-assisted estimation and dependency detection',                           saving: '3-5 hrs/sprint', complexity: 'medium' },
  bug_backlog_growth:       { title: 'AI Code Review',             description: 'Catch bugs before they ship',                                              saving: '6-10 hrs/week',  complexity: 'medium' },
  engagement_drop:          { title: 'AI Personalisation',         description: 'Tailor user journeys by behaviour',                                        saving: 'Revenue impact', complexity: 'high'   },
  conversion_fall:          { title: 'AI Conversion Optimisation', description: 'Automatically test and optimise conversion paths',                         saving: 'Revenue impact', complexity: 'high'   },
  activation_drop:          { title: 'AI Onboarding Agent',        description: 'Automate activation sequences for new users',                              saving: '8-12 hrs/week',  complexity: 'medium' },
  nps_decline:              { title: 'AI Feedback Analysis',       description: 'Automatically analyse and categorise NPS responses',                       saving: '4-6 hrs/week',   complexity: 'low'    },
  csat_decline:             { title: 'AI Support Optimisation',    description: 'Identify root causes of low satisfaction automatically',                   saving: '5-8 hrs/week',   complexity: 'low'    },
  cycle_time_increase:      { title: 'AI Workflow Automation',     description: 'Identify bottlenecks and automate handoffs',                               saving: '6-10 hrs/week',  complexity: 'medium' },
  traffic_source_shift:     { title: 'AI SEO & Content Engine',    description: 'Reduce paid traffic dependency with AI-generated organic content',         saving: 'Revenue impact', complexity: 'high'   },
  session_duration_drop:    { title: 'AI Personalisation',         description: 'Dynamically adapt content to keep users engaged',                          saving: 'Revenue impact', complexity: 'high'   },
  blocked_tickets_spike:    { title: 'AI Workflow Automation',     description: 'Detect and resolve common blockers before they stall the team',            saving: '4-6 hrs/week',   complexity: 'medium' },
}

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
    if (technicalCapacity === 'Yes — strong technical team' || technicalCapacity === 'Yes — limited technical capacity' || (teamSize && ['6–15 people', '16–50 people', '50+ people'].includes(teamSize))) capacityBonus += 15
  }
  return { score: Math.min(baseScore + capacityBonus, 100), opportunities, hasEnoughData: true }
}

function getNextScanDate(sourceType: string, lastSynced: string | null, subscriptionTier?: string): string {
  if (!lastSynced) return 'Ready to scan'
  const last = new Date(lastSynced)
  const weeklyTypes     = ['jira', 'intercom']
  const uploadOnlyTypes = ['csv']
  if (uploadOnlyTypes.includes(sourceType)) return 'On upload'
  const isNavigator = subscriptionTier === 'navigator'
  const days = (weeklyTypes.includes(sourceType) && !isNavigator) ? 30 : weeklyTypes.includes(sourceType) ? 7 : 30
  const next = new Date(last.getTime() + days * 24 * 60 * 60 * 1000)
  const now  = new Date()
  if (next <= now) return 'Ready now'
  const daysLeft = Math.ceil((next.getTime() - now.getTime()) / (24 * 60 * 60 * 1000))
  return `in ${daysLeft}d`
}

function buildCycleSummary(improving: number, worsening: number, unchanged: number): string {
  const parts: string[] = []
  if (worsening > 0) parts.push(`${worsening} worsened`)
  if (improving > 0) parts.push(`${improving} improved`)
  if (unchanged > 0) parts.push(`${unchanged} unchanged`)
  if (parts.length === 0) return ''
  return `Since last scan — ${parts.join(', ')}`
}

export default async function OverviewPage() {
  const supabase = await createServerComponentClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: founder } = await supabase
    .from('founders').select('*').eq('user_id', user.id).maybeSingle()
  if (!founder) redirect('/login')
  if (founder.account_status === 'suspended') redirect('/suspended')

  const { data: assessment } = await supabase
    .from('assessments').select('*').eq('founder_id', founder?.id ?? '')
    .order('created_at', { ascending: false }).limit(1).maybeSingle()

  const { data: score } = await supabase
    .from('scores').select('*').eq('founder_id', founder?.id ?? '')
    .order('created_at', { ascending: false }).limit(1).maybeSingle()

  const { data: allSignals } = await supabase
    .from('diagnostic_signals').select('*').eq('founder_id', founder?.id ?? '')
    .order('created_at', { ascending: false })

  const { data: activeGoals } = await supabase
    .from('goals').select('*').eq('founder_id', founder?.id ?? '')
    .in('status', ['active', 'at_risk']).order('created_at', { ascending: false })

  const { data: goalCounts } = await supabase
    .from('goals').select('status').eq('founder_id', founder?.id ?? '')
    .in('status', ['achieved', 'missed'])

  const achievedCount = (goalCounts ?? []).filter(g => g.status === 'achieved').length
  const missedCount   = (goalCounts ?? []).filter(g => g.status === 'missed').length

  const { data: sources } = await supabase
    .from('data_sources').select('source_type, last_synced_at, config, status')
    .eq('founder_id', founder?.id ?? '')
    .in('status', ['active', 'token_expired'])

  const signals: SignalWithFlags[] = (allSignals ?? []).map(s => ({ ...s, flags: [] }))
  const analysedSignals = analyseSignalConflicts(signals)

  const activeSignals           = analysedSignals.filter(s => s.status === 'new' || s.status === 'acknowledged')
  const activeRealSignals       = activeSignals.filter(s => s.source !== 'manual')
  const activeAssessmentSignals = activeSignals.filter(s => s.source === 'manual')
  const resolvedSignals         = analysedSignals.filter(s => s.status === 'resolved')
  const workingOnSignals        = analysedSignals.filter(s => s.status === 'acknowledged')

  const { data: trendSignals } = await supabase
    .from('diagnostic_signals').select('*').eq('founder_id', founder?.id ?? '')
    .in('status', ['new', 'acknowledged'])
    .or('trend.in.(improving,worsening),and(trend.eq.unchanged,severity.eq.critical)')
    .neq('source', 'manual').not('previous_value', 'is', null)
    .order('updated_at', { ascending: false }).limit(5)

  const { data: cycleSignals } = await supabase
    .from('diagnostic_signals').select('trend, source, severity, signal_type, scan_count, value, previous_value')
    .eq('founder_id', founder?.id ?? '')
    .in('status', ['new', 'acknowledged'])
    .in('trend', ['improving', 'worsening', 'unchanged'])
    .neq('source', 'manual').gte('scan_count', 2).not('previous_value', 'is', null)
    .order('updated_at', { ascending: false }).limit(100)

  const filteredCycleSignals = (cycleSignals ?? []).filter(s => {
    if (s.trend !== 'unchanged') return true
    return String(s.value ?? '') !== String(s.previous_value ?? '')
  })

  const cycleImproving   = filteredCycleSignals.filter(s => s.trend === 'improving').length
  const cycleWorsening   = filteredCycleSignals.filter(s => s.trend === 'worsening').length
  const cycleUnchanged   = filteredCycleSignals.filter(s => s.trend === 'unchanged').length
  const hasCycleData     = (cycleImproving + cycleWorsening + cycleUnchanged) > 0
  const cycleSummaryText = buildCycleSummary(cycleImproving, cycleWorsening, cycleUnchanged)

  const scoringInputs: ScoringInput[] = activeRealSignals.map(s => ({ signal_type: s.signal_type, severity: s.severity }))
  const healthScore  = calculateHealthScore(scoringInputs)
  const hasRealData  = healthScore !== -1
  const health       = getHealthLabel(hasRealData ? healthScore : 0)

  const scoredActiveSignals = activeSignals
    .map(s => ({ signal: s, priority: calculatePriorityScore(s, activeSignals) }))
    .sort((a, b) => b.priority - a.priority).map(s => s.signal)

  const top3Signals       = scoredActiveSignals.slice(0, 3)
  const criticalCount     = activeSignals.filter(s => s.severity === 'critical').length
  const warningCount      = activeSignals.filter(s => s.severity === 'warning').length
  const watchCount        = activeSignals.filter(s => s.severity === 'watch').length
  const conflictedSignals = activeSignals.filter(s => s.flags.some(f => f.type === 'conflict'))

  const allActiveSignals = activeSignals
  const aiReadiness      = calculateAIReadiness(allActiveSignals, assessment as Record<string, unknown> | null)

  const isFreeTier  = !founder || founder.subscription_tier === 'free'
  const isNavigator = founder?.subscription_tier === 'navigator'
  const name        = founder?.full_name?.split(' ')[0] ?? ''
  const overallScoreColor = score
    ? ((score.overall_score as number) >= 66 ? '#059669' : (score.overall_score as number) >= 41 ? '#D97706' : '#DC2626')
    : '#6B7280'
  const complexityColor = (c: string) => c === 'low' ? '#059669' : c === 'medium' ? '#D97706' : '#7C3AED'

  const sourceLabel: Record<string, string> = {
    ga4: 'GA4', jira: 'Jira', trustpilot: 'Trustpilot',
    intercom: 'Intercom', shopify: 'Shopify', csv: 'CSV', manual: 'Assessment',
  }
  const severityBg     = (s: string) => s === 'critical' ? '#FEF2F2' : s === 'warning' ? '#FFFBEB' : '#F9FAFB'
  const severityColor  = (s: string) => s === 'critical' ? '#DC2626' : s === 'warning' ? '#D97706' : '#6B7280'
  const severityBorder = (s: string, conflict: boolean) => conflict ? '#FDE68A' : s === 'critical' ? '#FECACA' : s === 'warning' ? '#FDE68A' : '#E5E7EB'

  return (
    <main style={{ minHeight: '100vh', background: '#F9FAFB', fontFamily: 'Inter, sans-serif' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '36px 24px' }}>

        {/* ── Header ── */}
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: '#111827', margin: '0 0 4px' }}>
            {name ? `${new Date().getHours() < 12 ? 'Good morning' : new Date().getHours() < 17 ? 'Good afternoon' : 'Good evening'}, ${name}` : 'Business Overview'}
          </h1>
          <p style={{ fontSize: 14, color: '#6B7280', margin: 0 }}>
            {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>

        {/* ── Free tier upgrade banner ── */}
        {isFreeTier && (
          <div style={{ background: '#F5F3FF', border: '1px solid #DDD6FE', borderRadius: 12, padding: '14px 20px', marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 18 }}>🔒</span>
              <div>
                <p style={{ fontSize: 14, fontWeight: 700, color: '#4C1D95', margin: '0 0 2px' }}>You are on the free plan</p>
                <p style={{ fontSize: 13, color: '#7C3AED', margin: 0 }}>Upgrade to Navigator to unlock your Action Digest, automated weekly scans, and unlimited tool connections</p>
              </div>
            </div>
            {STRIPE_PAYMENT_LINK ? (
              <a href={STRIPE_PAYMENT_LINK} target="_blank" rel="noopener noreferrer" style={{ padding: '8px 18px', background: '#7C3AED', color: '#fff', borderRadius: 9, fontSize: 13, fontWeight: 700, textDecoration: 'none', whiteSpace: 'nowrap', flexShrink: 0 }}>
                Upgrade — £49/mo →
              </a>
            ) : (
              <a href="/advisory?type=upgrade" style={{ padding: '8px 18px', background: '#7C3AED', color: '#fff', borderRadius: 9, fontSize: 13, fontWeight: 700, textDecoration: 'none', whiteSpace: 'nowrap', flexShrink: 0 }}>
                Contact us to upgrade →
              </a>
            )}
          </div>
        )}

        {/* ── Score cards ── */}
        <div className="grid-4-col" style={{ marginBottom: 20 }}>

          {/* Business Health */}
          <div style={{ background: hasRealData ? health.bg : '#F9FAFB', borderRadius: 16, border: `1px solid ${hasRealData ? health.color + '30' : '#E5E7EB'}`, padding: '20px 22px' }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: hasRealData ? health.color : '#6B7280', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Business Health</p>
            {hasRealData ? (
              <>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, marginBottom: 6 }}>
                  <span style={{ fontSize: 52, fontWeight: 900, color: health.color, lineHeight: 1 }}>{healthScore}</span>
                  <span style={{ fontSize: 18, color: health.color, marginBottom: 6, opacity: 0.7 }}>/100</span>
                </div>
                <span style={{ fontSize: 13, fontWeight: 600, color: health.color }}>{health.label}</span>
              </>
            ) : (
              <>
                <span style={{ fontSize: 36, fontWeight: 900, color: '#D1D5DB', lineHeight: 1, display: 'block', marginBottom: 6 }}>—</span>
                <span style={{ fontSize: 12, color: '#9CA3AF', display: 'block', marginBottom: 8 }}>Connect tools to measure</span>
                <a href="/connect" style={{ fontSize: 11, color: '#2563EB', textDecoration: 'none', background: '#EFF6FF', borderRadius: 8, padding: '5px 10px', display: 'inline-block', fontWeight: 600 }}>Connect tools →</a>
              </>
            )}
          </div>

          {/* Active Signals */}
          <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #E5E7EB', padding: '20px 22px' }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Active Signals</p>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, marginBottom: 8 }}>
              <span style={{ fontSize: 52, fontWeight: 900, color: '#111827', lineHeight: 1 }}>{activeSignals.length}</span>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {criticalCount > 0 && <span style={{ fontSize: 12, color: '#DC2626', fontWeight: 600 }}>{criticalCount} critical</span>}
              {warningCount  > 0 && <span style={{ fontSize: 12, color: '#D97706', fontWeight: 600 }}>{warningCount} warning</span>}
              {watchCount    > 0 && <span style={{ fontSize: 12, color: '#6B7280', fontWeight: 600 }}>{watchCount} watch</span>}
              {activeSignals.length === 0 && <span style={{ fontSize: 12, color: '#9CA3AF' }}>Take assessment or connect tools</span>}
            </div>
          </div>

          {/* In Progress */}
          <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #E5E7EB', padding: '20px 22px' }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>In Progress</p>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, marginBottom: 8 }}>
              <span style={{ fontSize: 52, fontWeight: 900, color: '#2563EB', lineHeight: 1 }}>{workingOnSignals.length}</span>
            </div>
            <span style={{ fontSize: 12, color: '#059669', fontWeight: 600 }}>{resolvedSignals.length} fixed — awaiting scan</span>
          </div>

          {/* 4th card — conditional: AI Readiness if enough data, else Assessment */}
          {aiReadiness.hasEnoughData ? (
            <div style={{ background: '#F5F3FF', borderRadius: 16, border: '1px solid #DDD6FE', padding: '20px 22px' }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: '#7C3AED', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>✨ AI Readiness</p>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, marginBottom: 6 }}>
                <span style={{ fontSize: 52, fontWeight: 900, color: '#7C3AED', lineHeight: 1 }}>{aiReadiness.score}</span>
                <span style={{ fontSize: 18, color: '#7C3AED', marginBottom: 6, opacity: 0.7 }}>/100</span>
              </div>
              <a href="/" style={{ fontSize: 12, color: '#7C3AED', fontWeight: 600, textDecoration: 'none' }}>
                {aiReadiness.opportunities.length} opportunit{aiReadiness.opportunities.length === 1 ? 'y' : 'ies'} →
              </a>
            </div>
          ) : (
            <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #E5E7EB', padding: '20px 22px' }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Assessment</p>
              {score ? (
                <>
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, marginBottom: 6 }}>
                    <span style={{ fontSize: 52, fontWeight: 900, color: overallScoreColor, lineHeight: 1 }}>{score.overall_score as number}</span>
                    <span style={{ fontSize: 18, color: overallScoreColor, marginBottom: 6, opacity: 0.7 }}>/100</span>
                  </div>
                  <a href="/assessment/result" style={{ fontSize: 12, color: '#2563EB', fontWeight: 600, textDecoration: 'none' }}>View full report →</a>
                </>
              ) : (
                <>
                  <span style={{ fontSize: 36, fontWeight: 900, color: '#D1D5DB', lineHeight: 1, display: 'block', marginBottom: 6 }}>—</span>
                  <a href="/assessment" style={{ fontSize: 11, color: '#2563EB', textDecoration: 'none', background: '#EFF6FF', borderRadius: 8, padding: '5px 10px', display: 'inline-block', fontWeight: 600 }}>Take assessment →</a>
                </>
              )}
            </div>
          )}
        </div>

        {/* ── Goals section ── */}
        {(activeGoals ?? []).length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <h2 style={{ fontSize: 15, fontWeight: 700, color: '#111827', margin: 0 }}>Active Goals</h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 12, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: '#EFF6FF', color: '#2563EB' }}>
                  🎯 Active: {(activeGoals ?? []).length}
                </span>
                {achievedCount > 0 && (
                  <a href="/tracker#goals" style={{ fontSize: 12, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: '#ECFDF5', color: '#059669', textDecoration: 'none' }}>
                    ✓ Achieved: {achievedCount}
                  </a>
                )}
                {missedCount > 0 && (
                  <a href="/tracker#goals" style={{ fontSize: 12, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: '#FEF2F2', color: '#DC2626', textDecoration: 'none' }}>
                    ✗ Missed: {missedCount}
                  </a>
                )}
                <a href="/tracker#goals" style={{ fontSize: 12, color: '#6B7280', textDecoration: 'none', marginLeft: 4 }}>Manage →</a>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 12 }}>
              {(activeGoals ?? []).map(goal => {
                const meta     = SIGNAL_GOAL_MAP[goal.signal_type as string]
                if (!meta) return null
                const current  = goal.current_value !== null ? Number(goal.current_value) : null
                const start    = goal.start_value   !== null ? Number(goal.start_value)   : null
                const target   = Number(goal.target_value)
                const isAtRisk = goal.status === 'at_risk'
                const [y, m, d] = (goal.target_date as string).split('-').map(Number)
                const targetDay = new Date(y, m - 1, d)
                const today     = new Date(); today.setHours(0, 0, 0, 0)
                const daysLeft  = Math.ceil((targetDay.getTime() - today.getTime()) / (24 * 60 * 60 * 1000))
                const progressPct = (start !== null && current !== null && start !== target)
                  ? Math.min(100, Math.max(0, meta.lowerBetter
                      ? Math.round(((start - current) / (start - target)) * 100)
                      : Math.round(((current - start) / (target - start)) * 100)))
                  : 0
                const totalDays  = Math.ceil((new Date(goal.target_date as string).getTime() - new Date(goal.created_at as string).getTime()) / (24 * 60 * 60 * 1000))
                const threshold  = Math.max(totalDays * 0.5, 3)
                const daysAtRisk = (goal.at_risk_since as string | null)
                  ? Math.ceil((Date.now() - new Date(goal.at_risk_since as string).getTime()) / (24 * 60 * 60 * 1000))
                  : 0
                const severity   = (goal.severity as string | null) ?? 'watch'
                const upsellShow = isAtRisk && severity !== 'watch' && (
                  severity === 'critical' ? daysAtRisk > threshold * 0.5 : daysAtRisk > threshold
                )
                return (
                  <div key={goal.id as string} style={{ background: '#fff', borderRadius: 14, border: `1.5px solid ${isAtRisk ? '#FECACA' : '#E5E7EB'}`, padding: '16px 18px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                      <p style={{ fontSize: 14, fontWeight: 700, color: '#111827', margin: 0 }}>{meta.label}</p>
                      <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: isAtRisk ? '#FEF2F2' : '#EFF6FF', color: isAtRisk ? '#DC2626' : '#2563EB' }}>
                        {isAtRisk ? 'At Risk' : 'Active'}
                      </span>
                    </div>
                    <p style={{ fontSize: 13, color: '#6B7280', margin: '0 0 10px' }}>
                      Target: <strong>{goal.target_value as string}{meta.unit === '%' ? '%' : ` ${meta.unit}`}</strong>
                      {' · '}
                      <span style={{ color: daysLeft <= 7 ? '#DC2626' : daysLeft <= 14 ? '#D97706' : '#6B7280', fontWeight: daysLeft <= 14 ? 700 : 400 }}>
                        {daysLeft > 0 ? `${daysLeft} days left` : 'Due today'}
                      </span>
                    </p>
                    <div style={{ height: 6, background: '#F3F4F6', borderRadius: 99, marginBottom: 6 }}>
                      <div style={{ height: 6, borderRadius: 99, background: isAtRisk ? '#DC2626' : '#2563EB', width: `${progressPct}%`, transition: 'width 1s ease-in-out' }} />
                    </div>
                    <p style={{ fontSize: 12, color: '#9CA3AF', margin: 0 }}>
                      Current: {current !== null ? `${current}${meta.unit === '%' ? '%' : ` ${meta.unit}`}` : 'No data yet'}
                      {' · '}{progressPct}% progress
                    </p>
                    {upsellShow && (
                      <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #FECACA' }}>
                        <p style={{ fontSize: 12, color: '#991B1B', margin: '0 0 6px' }}>⚠️ {meta.upsellCopy}</p>
                        {isNavigator ? (
                          <a href={`${meta.serviceUrl}&goal=${goal.signal_type}&current=${goal.current_value ?? ''}&target=${goal.target_value}&unit=${meta.unit}`} style={{ fontSize: 12, fontWeight: 700, color: '#2563EB', textDecoration: 'none' }}>
                            Request implementation →
                          </a>
                        ) : (
                          <a href={meta.serviceUrl} style={{ fontSize: 12, fontWeight: 700, color: '#2563EB', textDecoration: 'none' }}>
                            {meta.serviceLabel} {meta.servicePrice} →
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ── Token expiry alert ── */}
        {sources?.some(s => s.status === 'token_expired') && (
          <div style={{ background: '#FFFBEB', borderRadius: 16, border: '1px solid #FDE68A', padding: '16px 24px', marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 18 }}>⚠️</span>
              <div>
                <p style={{ fontSize: 13, fontWeight: 700, color: '#D97706', margin: '0 0 2px' }}>Connection issue detected</p>
                <p style={{ fontSize: 12, color: '#92400E', margin: 0 }}>
                  {sources.filter(s => s.status === 'token_expired').map(s => sourceLabel[s.source_type] ?? s.source_type).join(', ')} — expired.
                </p>
              </div>
            </div>
            <a href="/connect" style={{ fontSize: 13, fontWeight: 600, color: '#D97706', textDecoration: 'none', whiteSpace: 'nowrap', flexShrink: 0, background: '#FEF3C7', padding: '7px 14px', borderRadius: 8, border: '1px solid #FDE68A' }}>
              Reconnect →
            </a>
          </div>
        )}

        {/* ── Conflicts ── */}
        {conflictedSignals.length > 0 && (
          <div style={{ background: '#FFFBEB', borderRadius: 16, border: '1px solid #FDE68A', padding: '20px 24px', marginBottom: 20 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: '#D97706', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>⚠️ Conflicting Signals — Review Before Acting</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
              {conflictedSignals.map(signal => {
                const conflictFlags = signal.flags.filter(f => f.type === 'conflict')
                return (
                  <div key={signal.id} style={{ background: '#fff', borderRadius: 10, padding: '12px 16px', border: '1px solid #FDE68A', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: '#D97706', background: '#FEF3C7', padding: '2px 8px', borderRadius: 20 }}>{sourceLabel[signal.source] ?? signal.source}</span>
                        <span style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>{signal.signal_type.replace(/_/g, ' ')}</span>
                      </div>
                      <p style={{ fontSize: 12, color: '#6B7280', margin: 0 }}>{conflictFlags.map(f => f.note).join(' · ')}</p>
                    </div>
                    <a href="/signals?filter=conflicts" style={{ fontSize: 12, color: '#D97706', fontWeight: 600, textDecoration: 'none', whiteSpace: 'nowrap', flexShrink: 0 }}>Resolve →</a>
                  </div>
                )
              })}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 12, borderTop: '1px solid #FDE68A', flexWrap: 'wrap', gap: 8 }}>
              <p style={{ fontSize: 12, color: '#92400E', margin: 0 }}>ⓘ Unresolved conflicts default to tool source in your next Action Digest</p>
              <div style={{ display: 'flex', gap: 16, flexShrink: 0 }}>
                <a href="/signals?filter=conflicts" style={{ fontSize: 12, color: '#D97706', fontWeight: 600, textDecoration: 'none' }}>Resolve conflicts →</a>
                <a href="/advisory?type=conflict" style={{ fontSize: 12, color: '#92400E', fontWeight: 600, textDecoration: 'none' }}>Get expert help →</a>
              </div>
            </div>
          </div>
        )}

        {/* ── Fix This First + Connected Sources ── */}
        <div className="grid-2-1" style={{ marginBottom: 20 }}>
          {top3Signals.length > 0 ? (
            <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #E5E7EB', padding: '24px 28px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: '#DC2626', textTransform: 'uppercase', letterSpacing: '0.06em', margin: 0 }}>⚡ Fix This First</p>
                {activeRealSignals.length === 0 && activeAssessmentSignals.length > 0 && (
                  <span style={{ fontSize: 11, color: '#9CA3AF', background: '#F3F4F6', padding: '3px 8px', borderRadius: 8 }}>Based on assessment — connect tools to verify</span>
                )}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {top3Signals.map((signal, index) => {
                  const confirmFlag  = signal.flags.find(f => f.type === 'confirmed')
                  const conflictFlag = signal.flags.find(f => f.type === 'conflict')
                  return (
                    <div key={signal.id} style={{ padding: '14px 16px', background: severityBg(signal.severity), borderRadius: 12, border: `1px solid ${severityBorder(signal.severity, !!conflictFlag)}` }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                        <span style={{ width: 20, height: 20, borderRadius: '50%', background: severityColor(signal.severity), color: '#fff', fontSize: 11, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{index + 1}</span>
                        <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 20, background: severityBg(signal.severity), color: severityColor(signal.severity), textTransform: 'uppercase' as const, border: `1px solid ${severityColor(signal.severity)}30` }}>{signal.severity}</span>
                        <span style={{ fontSize: 10, color: '#9CA3AF', textTransform: 'uppercase' as const }}>{sourceLabel[signal.source] ?? signal.source}</span>
                        {confirmFlag && <span style={{ fontSize: 10, color: '#059669', background: '#ECFDF5', padding: '2px 7px', borderRadius: 20, fontWeight: 600 }}>✓ Confirmed by {sourceLabel[confirmFlag.bySource] ?? confirmFlag.bySource}</span>}
                        {conflictFlag && <span style={{ fontSize: 10, color: '#D97706', background: '#FFFBEB', padding: '2px 7px', borderRadius: 20, fontWeight: 600 }}>⚠ Conflicts with {sourceLabel[conflictFlag.bySource] ?? conflictFlag.bySource}</span>}
                      </div>
                      <p style={{ fontSize: 13, fontWeight: 600, color: '#111827', margin: '0 0 4px', lineHeight: 1.4 }}>{String(signal.insight_summary ?? '')}</p>
                      <p style={{ fontSize: 12, color: '#6B7280', margin: 0, lineHeight: 1.4 }}>{String(signal.recommended_action ?? '')}</p>
                    </div>
                  )
                })}
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                <a href="/signals" style={{ padding: '9px 20px', background: '#2563EB', color: '#fff', borderRadius: 9, fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>View all signals →</a>
                {criticalCount > 0 && <a href="/signals?filter=critical" style={{ padding: '9px 20px', background: '#FEF2F2', color: '#DC2626', borderRadius: 9, fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>{criticalCount} critical</a>}
              </div>
            </div>
          ) : (
            <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #E5E7EB', padding: '32px 28px' }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 16px' }}>⚡ Start Here</p>
              <p style={{ fontSize: 20, fontWeight: 800, color: '#111827', margin: '0 0 8px' }}>Get your first signals</p>
              <p style={{ fontSize: 14, color: '#6B7280', margin: '0 0 24px', lineHeight: 1.6 }}>
                {assessment ? 'Connect a tool to get live signals from your real data.' : 'Takes 10 minutes. No tools needed to start — the assessment works immediately.'}
              </p>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <a href="/assessment" style={{ padding: '12px 24px', background: '#2563EB', color: '#fff', borderRadius: 10, fontSize: 14, fontWeight: 700, textDecoration: 'none' }}>
                  {assessment ? 'Retake assessment →' : 'Take the assessment →'}
                </a>
                <a href="/connect" style={{ padding: '12px 24px', background: '#F9FAFB', color: '#374151', border: '1px solid #E5E7EB', borderRadius: 10, fontSize: 14, fontWeight: 600, textDecoration: 'none' }}>
                  Connect a tool →
                </a>
              </div>
            </div>
          )}

          {/* Connected Sources */}
          <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #E5E7EB', padding: '24px 28px' }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 14 }}>Connected Sources</p>
            {sources && sources.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {sources.map((s, index) => {
                  const icons: Record<string, string> = { trustpilot: '⭐', ga4: '📊', jira: '🔧', csv: '📁', shopify: '🛍️', intercom: '💬' }
                  const names: Record<string, string> = { trustpilot: 'Trustpilot', ga4: 'Google Analytics', jira: 'Jira', csv: 'CSV', shopify: 'Shopify', intercom: 'Intercom' }
                  const csvTemplateNames: Record<string, string> = { support: 'CSV — Support', orders: 'CSV — Orders', velocity: 'CSV — Velocity', satisfaction: 'CSV — NPS/CSAT' }
                  const nextScan    = getNextScanDate(s.source_type, s.last_synced_at, founder?.subscription_tier ?? 'free')
                  const isExpired   = s.status === 'token_expired'
                  const displayName = s.source_type === 'csv' ? csvTemplateNames[(s.config as Record<string, string>)?.template_type ?? ''] ?? 'CSV' : names[s.source_type] ?? s.source_type
                  const csvLabel    = s.source_type === 'csv' ? (s.config as Record<string, string>)?.template_type ?? index.toString() : s.source_type
                  return (
                    <div key={`${s.source_type}-${csvLabel}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 15 }}>{icons[s.source_type] ?? '📡'}</span>
                        <div>
                          <p style={{ fontSize: 13, fontWeight: 600, color: '#374151', margin: 0 }}>{displayName}</p>
                          <p style={{ fontSize: 11, color: isExpired ? '#D97706' : '#9CA3AF', margin: 0 }}>{isExpired ? 'Needs reconnection' : `Next scan: ${nextScan}`}</p>
                        </div>
                      </div>
                      {isExpired ? (
                        <a href="/connect" style={{ fontSize: 11, color: '#D97706', fontWeight: 600, textDecoration: 'none' }}>↻ Refresh</a>
                      ) : (
                        <span style={{ fontSize: 11, color: '#059669', fontWeight: 600 }}>✓ Live</span>
                      )}
                    </div>
                  )
                })}
                <a href="/connect" style={{ fontSize: 13, color: '#2563EB', textDecoration: 'none', fontWeight: 600, marginTop: 4 }}>+ Add source</a>
              </div>
            ) : (
              <div>
                <p style={{ fontSize: 15, color: '#111827', fontWeight: 700, marginBottom: 6 }}>No tools connected yet</p>
                <p style={{ fontSize: 13, color: '#6B7280', marginBottom: 16, lineHeight: 1.5 }}>Elvanis reads your real data and generates signals automatically</p>
                <div style={{ display: 'flex', gap: 14, fontSize: 13, fontWeight: 600, color: '#374151', whiteSpace: 'nowrap', marginBottom: 12, flexWrap: 'wrap' }}>
                  <span>⭐ Trustpilot</span><span>📊 GA4</span><span>🔧 Jira</span><span>📁 CSV</span><span>🛍️ Shopify</span><span>💬 Intercom</span>
                </div>
                <a href="/connect" style={{ fontSize: 13, color: '#2563EB', fontWeight: 600, textDecoration: 'none' }}>Connect your first tool →</a>
              </div>
            )}
          </div>
        </div>

        {/* ── Impact Tracking ── */}
        <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #E5E7EB', padding: '24px 28px', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.06em', margin: 0 }}>📈 Impact Tracking — Did your fixes work?</p>
            {hasCycleData && <a href="/tracker" style={{ fontSize: 13, color: '#2563EB', textDecoration: 'none', fontWeight: 600 }}>Open Tracker →</a>}
          </div>
          {hasCycleData && cycleSummaryText && (
            <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 10, padding: '10px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 16 }}>🔄</span>
              <p style={{ fontSize: 13, fontWeight: 600, color: '#065F46', margin: 0 }}>{cycleSummaryText}</p>
            </div>
          )}
          {hasCycleData && (
            <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
              {cycleWorsening > 0 && <div style={{ padding: '8px 14px', background: '#FEF2F2', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 6 }}><span>↓</span><span style={{ fontSize: 12, fontWeight: 600, color: '#DC2626' }}>{cycleWorsening} worsening</span></div>}
              {cycleImproving > 0 && <div style={{ padding: '8px 14px', background: '#ECFDF5', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 6 }}><span>↑</span><span style={{ fontSize: 12, fontWeight: 600, color: '#059669' }}>{cycleImproving} improving</span></div>}
              {cycleUnchanged > 0 && <div style={{ padding: '8px 14px', background: '#FFFBEB', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 6 }}><span>→</span><span style={{ fontSize: 12, fontWeight: 600, color: '#D97706' }}>{cycleUnchanged} unchanged</span></div>}
            </div>
          )}
          {trendSignals && trendSignals.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {([...(trendSignals as Array<Record<string, unknown>>)]
                .filter(s => { if (s.trend !== 'unchanged') return true; if (s.severity === 'critical') return true; return String(s.value ?? '') !== String(s.previous_value ?? '') })
                .sort((a, b) => {
                  const p = (s: Record<string, unknown>) => s.trend === 'worsening' ? 3 : (s.trend === 'unchanged' && s.severity === 'critical') ? 2 : 1
                  return p(b) - p(a)
                })).map(signal => {
                  const isPersisting = signal.trend === 'unchanged' && signal.severity === 'critical'
                  const scanCount    = Number(signal.scan_count ?? 1)
                  const trendConfig  = isPersisting
                    ? { icon: '⚠️', label: `Persisting · ${scanCount} scan${scanCount !== 1 ? 's' : ''}`, color: '#D97706', bg: '#FFFBEB' }
                    : ({ improving: { icon: '↑', label: 'Improving', color: '#059669', bg: '#ECFDF5' }, worsening: { icon: '↓', label: 'Worsening', color: '#DC2626', bg: '#FEF2F2' } } as Record<string, { icon: string; label: string; color: string; bg: string }>)[signal.trend as string] ?? { icon: '·', label: 'Tracking', color: '#6B7280', bg: '#F9FAFB' }
                  return (
                    <div key={signal.id as string} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', background: trendConfig.bg, borderRadius: 10 }}>
                      <span style={{ fontSize: 18, fontWeight: 800, color: trendConfig.color }}>{trendConfig.icon}</span>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: 13, fontWeight: 600, color: '#111827', margin: '0 0 2px' }}>{String(signal.insight_summary ?? '')}</p>
                        <p style={{ fontSize: 11, color: '#6B7280', margin: 0 }}>Was {String(signal.previous_value ?? '—')} → Now {String(signal.value ?? '—')} · {sourceLabel[signal.source as string] ?? String(signal.source)}</p>
                      </div>
                      <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 20, background: '#fff', color: trendConfig.color, fontWeight: 700, border: `1px solid ${trendConfig.color}30`, flexShrink: 0 }}>{trendConfig.label}</span>
                    </div>
                  )
                })}
            </div>
          ) : (
            <div style={{ padding: '20px', background: '#F9FAFB', borderRadius: 12, textAlign: 'center' }}>
              <p style={{ fontSize: 14, fontWeight: 600, color: '#374151', margin: '0 0 6px' }}>No impact data yet</p>
              <p style={{ fontSize: 13, color: '#6B7280', margin: 0 }}>Connect tools and run a second scan after fixing signals to see whether your changes worked.</p>
              <a href="/signals" style={{ fontSize: 13, color: '#2563EB', textDecoration: 'none', fontWeight: 600, display: 'block', marginTop: 8 }}>Go to signals →</a>
            </div>
          )}
        </div>

        {/* ── Assessment full breakdown ── */}
        <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #E5E7EB', padding: '24px 28px', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.06em', margin: 0 }}>Assessment Score</p>
            {score && (
              <div style={{ display: 'flex', gap: 8 }}>
                <a href="/assessment/result" style={{ fontSize: 13, color: '#2563EB', textDecoration: 'none', padding: '6px 14px', border: '1px solid #BFDBFE', borderRadius: 8, fontWeight: 600 }}>Full report →</a>
                <a href="/assessment" style={{ fontSize: 13, color: '#6B7280', textDecoration: 'none', padding: '6px 14px', border: '1px solid #E5E7EB', borderRadius: 8 }}>Retake</a>
              </div>
            )}
          </div>
          {!score ? (
            <div style={{ padding: '24px', background: '#F9FAFB', borderRadius: 14, display: 'flex', alignItems: 'center', gap: 20 }}>
              <div style={{ width: 56, height: 56, background: '#EFF6FF', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, flexShrink: 0 }}>🎯</div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 15, fontWeight: 700, color: '#111827', margin: '0 0 4px' }}>No assessment taken yet</p>
                <p style={{ fontSize: 13, color: '#6B7280', margin: '0 0 12px', lineHeight: 1.5 }}>Answer 26 questions and get a scored diagnosis across 6 dimensions. Takes 10 minutes.</p>
                <a href="/assessment" style={{ display: 'inline-block', padding: '9px 20px', background: '#2563EB', color: '#fff', borderRadius: 9, fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>Start assessment →</a>
              </div>
            </div>
          ) : (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16, padding: '16px 20px', background: '#F9FAFB', borderRadius: 12, border: '1px solid #E5E7EB' }}>
                <div style={{ textAlign: 'center', flexShrink: 0 }}>
                  <p style={{ fontSize: 10, color: '#6B7280', fontWeight: 700, margin: '0 0 2px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Overall</p>
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2 }}>
                    <span style={{ fontSize: 40, fontWeight: 900, color: overallScoreColor, lineHeight: 1 }}>{score.overall_score as number}</span>
                    <span style={{ fontSize: 13, color: '#9CA3AF', marginBottom: 3 }}>/100</span>
                  </div>
                </div>
                <div style={{ width: 1, height: 48, background: '#E5E7EB', flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 14, fontWeight: 700, color: '#111827', margin: '0 0 4px' }}>{score.overall_status as string}</p>
                  <p style={{ fontSize: 12, color: '#6B7280', margin: 0, lineHeight: 1.5 }}>{(score.overall_summary as string)?.substring(0, 150)}...</p>
                </div>
              </div>
              <div className="grid-3-col" style={{ marginBottom: 16 }}>
                {[
                  { label: 'Revenue',              val: score.score_revenue   as number | null },
                  { label: 'Product-Market Fit',   val: score.score_pmf       as number | null },
                  { label: 'Team & Operations',    val: score.score_team      as number | null },
                  { label: 'Customer & Retention', val: score.score_customer  as number | null },
                  { label: 'Marketing & Growth',   val: score.score_marketing as number | null },
                  { label: 'Strategy & Goals',     val: score.score_strategy  as number | null },
                ].map(({ label, val }) => {
                  const v     = val ?? 0
                  const color = v >= 66 ? '#059669' : v >= 41 ? '#D97706' : '#DC2626'
                  return (
                    <div key={label} style={{ background: '#F9FAFB', borderRadius: 12, padding: '14px 16px' }}>
                      <p style={{ fontSize: 11, color: '#6B7280', fontWeight: 600, marginBottom: 6 }}>{label}</p>
                      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, marginBottom: 8 }}>
                        <span style={{ fontSize: 28, fontWeight: 800, color, lineHeight: 1 }}>{val ?? '—'}</span>
                        {val !== null && <span style={{ fontSize: 12, color: '#9CA3AF', marginBottom: 2 }}>/100</span>}
                      </div>
                      <div style={{ height: 4, background: '#E5E7EB', borderRadius: 99 }}>
                        <div style={{ height: 4, borderRadius: 99, background: color, width: `${v}%` }} />
                      </div>
                    </div>
                  )
                })}
              </div>
              {score.primary_constraint_summary && (
                <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 10, padding: '12px 16px' }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#DC2626' }}>Primary constraint: </span>
                  <span style={{ fontSize: 13, color: '#374151' }}>{score.primary_constraint_summary as string}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── AI Readiness + Opportunities (no CTAs) ── */}
        {aiReadiness.hasEnoughData && aiReadiness.opportunities.length > 0 && (
          <div style={{ background: '#F5F3FF', borderRadius: 16, border: '1px solid #DDD6FE', padding: '24px 28px', marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div>
                <p style={{ fontSize: 11, fontWeight: 700, color: '#7C3AED', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 4px' }}>✨ AI Readiness</p>
                <p style={{ fontSize: 13, color: '#6B7280', margin: 0 }}>Based on your active signals</p>
              </div>
              <div style={{ background: '#fff', borderRadius: 12, padding: '8px 16px', flexShrink: 0 }}>
                <span style={{ fontSize: 28, fontWeight: 900, color: '#7C3AED', lineHeight: 1 }}>{aiReadiness.score}</span>
                <span style={{ fontSize: 13, color: '#7C3AED' }}>/100</span>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 10 }}>
              {aiReadiness.opportunities.slice(0, 3).map(opp => (
                <div key={opp.signal_type} style={{ background: '#fff', borderRadius: 12, padding: '14px 16px', border: '1px solid #EDE9FE' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <p style={{ fontSize: 13, fontWeight: 700, color: '#4C1D95', margin: 0 }}>{opp.title}</p>
                    <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 20, background: '#F5F3FF', color: complexityColor(opp.complexity), fontWeight: 700 }}>{opp.complexity}</span>
                  </div>
                  <p style={{ fontSize: 12, color: '#6D28D9', margin: '0 0 6px', lineHeight: 1.5 }}>{opp.description}</p>
                  <p style={{ fontSize: 11, color: '#7C3AED', fontWeight: 600, margin: 0 }}>⏱ {opp.saving}</p>
                </div>
              ))}
            </div>
            <p style={{ fontSize: 12, color: '#A78BFA', margin: '12px 0 0', textAlign: 'center' }}>
              Go to <a href="/" style={{ color: '#7C3AED', fontWeight: 600, textDecoration: 'none' }}>Home</a> to request your AI Roadmap or book a CPO session
            </p>
          </div>
        )}

      </div>
    </main>
  )
}