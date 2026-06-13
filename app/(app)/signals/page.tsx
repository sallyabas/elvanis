import { redirect } from 'next/navigation'
import { createServerComponentClient } from '@/lib/supabase-server'
import { analyseSignalConflicts } from '@/lib/signal-analysis'
import type { SignalWithFlags } from '@/lib/signal-analysis'
import ScanButton from '@/components/ScanButton'
import ConnectedBanner from './connected-banner'
import AssessmentBanner from './assessment-banner'
import ConflictTrustButton from '@/components/conflict-trust-button'
import { getSourceFrequency, SOURCE_CONFIG } from '@/lib/source-config'
import { getT } from '@/lib/translations'

export default async function SignalsPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string; connected?: string; dimension?: string }>
}) {
  const supabase = await createServerComponentClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { filter, connected, dimension } = await searchParams

  const { data: founder } = await supabase
    .from('founders')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle()

  const t    = getT((founder?.language ?? 'en') as 'en' | 'ar')
  const lang = founder?.language ?? 'en'

  const { data: assessment } = await supabase
    .from('assessments')
    .select('id')
    .eq('founder_id', founder?.id ?? '')
    .limit(1)
    .maybeSingle()

  const hasAssessment = !!assessment

  const { data: sources } = await supabase
    .from('data_sources')
    .select('*')
    .eq('founder_id', founder?.id ?? '')
    .eq('status', 'active')

  const hasConnectedSources = (sources?.length ?? 0) > 0
  const lastScannedAt = sources?.reduce((latest, s) => {
    if (!latest) return s.last_synced_at
    return s.last_synced_at > latest ? s.last_synced_at : latest
  }, null as string | null) ?? null

  if (connected && founder?.id) {
    const { count } = await supabase
      .from('diagnostic_signals')
      .select('*', { count: 'exact', head: true })
      .eq('founder_id', founder.id)
      .eq('source', connected)
    if ((count ?? 0) === 0) {
      fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/scan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ founderId: founder.id, triggeredBy: 'connect' }),
      }).catch(console.error)
    }
  }

  const SOURCE_FILTERS = [
    { id: 'trustpilot', label: '⭐ Trustpilot' },
    { id: 'ga4',        label: '📊 Google Analytics' },
    { id: 'csv',        label: '📁 CSV' },
    { id: 'jira',       label: '🔧 Jira' },
    { id: 'shopify',    label: '🛍️ Shopify' },
    { id: 'intercom',   label: '💬 Intercom' },
    { id: 'manual',     label: '📋 Assessment' },
  ]

  const { data: allActiveRaw } = await supabase
    .from('diagnostic_signals')
    .select('*')
    .eq('founder_id', founder?.id ?? '')
    .in('status', ['new', 'acknowledged'])
    .order('severity', { ascending: true })
    .order('created_at', { ascending: false })

  const allActiveWithFlags: SignalWithFlags[] = (allActiveRaw ?? []).map(s => ({ ...s, flags: [] }))
  const allAnalysed = analyseSignalConflicts(allActiveWithFlags)

  const { data: allResolutions } = await supabase
    .from('conflict_resolutions')
    .select('signal_type, trusted_source, trusted_value')
    .eq('founder_id', founder?.id ?? '')
    .order('created_at', { ascending: false })

  const prefMap = new Map<string, { signal_type: string; trusted_source: string; trusted_value: unknown }>()
  for (const r of (allResolutions ?? [])) {
    if (!prefMap.has(r.signal_type)) prefMap.set(r.signal_type, r)
  }

  // ── Filter logic ──
  const SEVERITY_FILTERS = ['critical', 'warning', 'working', 'resolved', 'conflicts']
  const isSourceFilter   = SOURCE_FILTERS.map(s => s.id).includes(filter ?? '')
  const isSeverityFilter = SEVERITY_FILTERS.includes(filter ?? '')

  const baseFiltered = dimension
    ? allAnalysed.filter(s => s.dimension === dimension)
    : isSourceFilter
      ? allAnalysed.filter(s => s.source === filter)
      : allAnalysed

  let signals: SignalWithFlags[] = baseFiltered
  if (filter === 'critical')       signals = baseFiltered.filter(s => s.severity === 'critical')
  else if (filter === 'warning')   signals = baseFiltered.filter(s => s.severity === 'warning')
  else if (filter === 'working')   signals = baseFiltered.filter(s => s.status === 'acknowledged')
  else if (filter === 'resolved')  signals = []
  else if (filter === 'conflicts') signals = baseFiltered.filter(s => s.flags.some(f => f.type === 'conflict'))

  const { data: notApplicable } = await supabase
    .from('diagnostic_signals')
    .select('*')
    .eq('founder_id', founder?.id ?? '')
    .eq('founder_feedback', 'missed_the_mark')
    .in('status', ['new', 'acknowledged'])
    .order('feedback_at', { ascending: false })

  let resolvedQuery = supabase
    .from('diagnostic_signals')
    .select('*')
    .eq('founder_id', founder?.id ?? '')
    .eq('status', 'resolved')
    .order('updated_at', { ascending: false })

  if (isSourceFilter) {
    resolvedQuery = resolvedQuery.eq('source', filter) as typeof resolvedQuery
  }

  const { data: resolved } = await resolvedQuery

  const { data: deprioritised } = await supabase
    .from('diagnostic_signals')
    .select('*')
    .eq('founder_id', founder?.id ?? '')
    .eq('status', 'dismissed')
    .order('updated_at', { ascending: false })

  const { data: cooldownSetting } = await supabase
    .from('app_settings')
    .select('value')
    .eq('key', 'scan_cooldown_hours')
    .maybeSingle()

  const cooldownHours = parseInt(cooldownSetting?.value ?? '168', 10)

  const total     = allAnalysed.length
  const critical  = allAnalysed.filter(s => s.severity === 'critical').length
  const warning   = allAnalysed.filter(s => s.severity === 'warning').length
  const working   = allAnalysed.filter(s => s.status === 'acknowledged').length
  const conflicts = allAnalysed.filter(s => s.flags.some(f => f.type === 'conflict')).length
  const isFirstScan      = hasConnectedSources && total === 0
  const isFreeTier       = !founder || founder.subscription_tier === 'free'
  const subscriptionTier = founder?.subscription_tier ?? 'free'

  const daysUntilNextScan = (() => {
    if (!sources || sources.length === 0) return null
    const dueDays = sources
      .filter(s => s.source_type !== 'csv' && s.last_synced_at)
      .map(s => {
        const frequencyDays = getSourceFrequency(s.source_type, subscriptionTier, s.scan_frequency_days ?? null)
        const daysSince = (Date.now() - new Date(s.last_synced_at).getTime()) / (24 * 60 * 60 * 1000)
        return Math.max(0, Math.ceil(frequencyDays - daysSince))
      })
    if (dueDays.length === 0) return null
    return Math.min(...dueDays)
  })()

  const weeklyNavigatorSources = Object.entries(SOURCE_CONFIG)
    .filter(([, c]) => (c as { frequencyNavigator: number; uploadOnly: boolean }).frequencyNavigator === 7 && !(c as { uploadOnly: boolean }).uploadOnly)
    .map(([, c]) => (c as { displayName: string }).displayName)
    .join(' and ')

  const monthlySources = Object.entries(SOURCE_CONFIG)
    .filter(([, c]) => (c as { frequencyNavigator: number; uploadOnly: boolean }).frequencyNavigator === 30 && !(c as { uploadOnly: boolean }).uploadOnly)
    .map(([, c]) => (c as { displayName: string }).displayName)
    .join(', ')

  const tooltipText = `${weeklyNavigatorSources} scan every 7 days for Navigator. ${monthlySources} scan every 30 days. Available once per week for Navigator.`

  const name = founder?.full_name?.split(' ')[0] ?? ''
  const hour = new Date().getHours()
  const greeting = hour < 12 ? t('greeting.morning') : hour < 17 ? t('greeting.afternoon') : t('greeting.evening')

  const si = (signal: Record<string, unknown>) =>
    lang === 'ar' && signal.insight_summary_ar
      ? String(signal.insight_summary_ar)
      : String(signal.insight_summary ?? '')
  const ra = (signal: Record<string, unknown>) =>
    lang === 'ar' && signal.recommended_action_ar
      ? String(signal.recommended_action_ar)
      : String(signal.recommended_action ?? '')

  const severityColor = (s: string) => s === 'critical' ? '#DC2626' : s === 'warning' ? '#D97706' : '#6B7280'
  const severityBg    = (s: string) => s === 'critical' ? '#FEF2F2' : s === 'warning' ? '#FFFBEB' : '#F9FAFB'
  const dimensionIcon = (d: string) => ({ customer: '👥', team: '⚙️', marketing: '📣', revenue: '💰', product: '🎯', strategy: '🧭' }[d] ?? '📊')

  const SEVERITY_LABELS: Record<string, string> = {
    critical: t('signals.sev_critical'), warning: t('signals.sev_warning'), watch: t('signals.sev_watch'),
  }
  const EVIDENCE_TRANSLATIONS: Record<string, string> = {
    'Based on overall Trustpilot rating analysis': t('signals.evidence_trustpilot'),
    'Based on CSV data analysis': t('signals.evidence_csv'),
    'from Shopify order data': t('signals.evidence_shopify'),
    'from GA4 data': t('signals.evidence_ga4'),
  }
  const DIM_PLAIN: Record<string, string> = {
    revenue: t('signals.cat_revenue'), customer: t('signals.cat_customer'), marketing: t('signals.cat_marketing'),
    team: t('signals.cat_team'), product: t('signals.cat_product'), strategy: t('signals.cat_strategy'),
  }
  const DIMENSION_LABELS: Record<string, string> = {
    revenue:   `💰 ${t('signals.cat_revenue')}`,
    customer:  `👥 ${t('signals.cat_customer')}`,
    marketing: `📈 ${t('signals.cat_marketing')}`,
    team:      `⚙️ ${t('signals.cat_team')}`,
    product:   `🎯 ${t('signals.cat_product')}`,
    strategy:  `🧭 ${t('signals.cat_strategy')}`,
  }

  const sourceLabel: Record<string, string> = {
    trustpilot: '⭐ Trustpilot', ga4: '📊 GA4', csv: '📁 CSV',
    jira: '🔧 Jira', shopify: '🛍️ Shopify', intercom: '💬 Intercom', manual: `📋 ${t('signals.source_assessment')}`,
  }
  const sourceLabelShort: Record<string, string> = {
    trustpilot: 'Trustpilot', ga4: 'GA4', csv: 'CSV',
    jira: 'Jira', shopify: 'Shopify', intercom: 'Intercom', manual: t('signals.source_assessment'),
  }

  const getSectionTitle = () => {
    if (dimension && DIMENSION_LABELS[dimension]) return `${DIMENSION_LABELS[dimension]} ${t('signals.suffix')}`
    if (filter === 'critical')   return `${t('signals.critical')} ${t('signals.suffix')}`
    if (filter === 'warning')    return `${t('signals.warning')} ${t('signals.suffix')}`
    if (filter === 'working')    return t('signals.needs_strategy')
    if (filter === 'conflicts')  return t('signals.conflicts')
    if (filter === 'ga4')        return `Google Analytics ${t('signals.suffix')}`
    if (filter === 'trustpilot') return `Trustpilot ${t('signals.suffix')}`
    if (filter === 'csv')        return `CSV Upload ${t('signals.suffix')}`
    if (filter === 'jira')       return `Jira ${t('signals.suffix')}`
    if (filter === 'shopify')    return `Shopify ${t('signals.suffix')}`
    if (filter === 'intercom')   return `Intercom ${t('signals.suffix')}`
    if (filter === 'manual')     return `Assessment ${t('signals.suffix')}`
    return `${t('signals.all_active')} ${t('signals.suffix')}`
  }

  return (
    <main style={{ minHeight: '100vh', background: '#F9FAFB', fontFamily: 'Inter, sans-serif' }}>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '36px 24px' }}>
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: '#111827', margin: '0 0 4px' }}>
            {name ? `${greeting}, ${name}` : t('signals.your_command')}
          </h1>
          <p style={{ fontSize: 14, color: '#6B7280', margin: 0 }}>
            {new Date().toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>

        <div style={{ maxWidth: 960, margin: '0 auto', padding: '40px 24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
            <div>
              <h1 style={{ fontSize: 26, fontWeight: 800, color: '#111827', margin: '0 0 4px' }}>{t('signals.title')}</h1>
              {connected && <ConnectedBanner connected={connected} />}
            </div>
            <ScanButton
              founderId={founder?.id ?? ''}
              lastScannedAt={lastScannedAt}
              hasConnectedSources={hasConnectedSources}
              isFirstScan={isFirstScan}
              isFreeTier={isFreeTier}
              daysUntilNextScan={daysUntilNextScan}
              tooltipText={tooltipText}
              cooldownHours={cooldownHours}
            />
          </div>

          <AssessmentBanner hasAssessment={hasAssessment} />

          {/* ── Status filter cards ── */}
          <div className="signal-filter-cards">
            {[
              { label: t('signals.all_active'),     value: '',          count: total,                color: '#111827', bg: '#fff',     border: '#E5E7EB' },
              { label: t('signals.critical'),        value: 'critical',  count: critical,             color: '#DC2626', bg: '#FEF2F2', border: '#FECACA' },
              { label: t('signals.warning'),         value: 'warning',   count: warning,              color: '#D97706', bg: '#FFFBEB', border: '#FDE68A' },
              { label: t('signals.needs_strategy'),  value: 'working',   count: working,              color: '#2563EB', bg: '#EFF6FF', border: '#BFDBFE' },
              { label: t('signals.archived'),        value: 'resolved',  count: resolved?.length ?? 0,color: '#059669', bg: '#ECFDF5', border: '#A7F3D0' },
              { label: t('signals.conflicts'),       value: 'conflicts', count: conflicts,            color: '#D97706', bg: '#FFFBEB', border: '#FDE68A' },
            ].map(card => {
              const isSelected = filter === card.value || (!filter && card.value === '')
              const href = card.value
                ? `/signals?filter=${card.value}${dimension ? `&dimension=${dimension}` : ''}`
                : `/signals${dimension ? `?dimension=${dimension}` : ''}`
              return (
                <a key={card.label} href={href} style={{
                  flex: 1, minWidth: 130, padding: '16px 20px',
                  background: isSelected ? card.border : card.bg,
                  border: `1px solid ${card.border}`,
                  borderRadius: 12, textDecoration: 'none', display: 'block',
                  boxShadow: isSelected ? `0 0 0 2px ${card.color}30` : 'none',
                }}>
                  <p style={{ fontSize: 11, color: card.color, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>{card.label}</p>
                  <p style={{ fontSize: 32, fontWeight: 800, color: card.color, margin: 0 }}>{card.count}</p>
                </a>
              )
            })}
          </div>

          {/* ── Unified filter bar ── */}
          <div style={{ marginBottom: 20, marginTop: 24 }}>

            {/* By Output */}
            <div style={{ marginBottom: 10 }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase' as const, letterSpacing: '0.1em', marginBottom: 8 }}>
                {t('signals.by_output')}
              </p>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' as const }}>
                {[
                  { id: '',          label: t('signals.cat_all'),       icon: '📊' },
                  { id: 'revenue',   label: t('signals.cat_revenue'),   icon: '💰' },
                  { id: 'customer',  label: t('signals.cat_customer'),  icon: '👥' },
                  { id: 'marketing', label: t('signals.cat_marketing'), icon: '📈' },
                  { id: 'team',      label: t('signals.cat_team'),      icon: '⚙️' },
                  { id: 'product',   label: t('signals.cat_product'),   icon: '🎯' },
                  { id: 'strategy',  label: t('signals.cat_strategy'),  icon: '🧭' },
                ].map(dim => {
                  const count = dim.id ? allAnalysed.filter(s => s.dimension === dim.id).length : total
                  if (dim.id && count === 0) return null
                  const isSelected = dimension === dim.id || (!dimension && !isSourceFilter && dim.id === '')
                  const href = dim.id
                    ? `/signals?dimension=${dim.id}${isSeverityFilter ? `&filter=${filter}` : ''}`
                    : `/signals${isSeverityFilter ? `?filter=${filter}` : ''}`
                  return (
                    <a key={dim.id} href={href} style={{
                      padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                      background: isSelected ? '#111827' : '#F3F4F6',
                      color: isSelected ? '#fff' : '#6B7280',
                      textDecoration: 'none',
                    }}>
                      {dim.icon} {dim.label} {dim.id ? `(${count})` : ''}
                    </a>
                  )
                })}
              </div>
            </div>

            {/* Divider */}
            <div style={{ height: 1, background: '#F3F4F6', margin: '12px 0' }} />

            {/* By Source */}
            <div>
              <p style={{ fontSize: 11, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase' as const, letterSpacing: '0.1em', marginBottom: 8 }}>
                {t('signals.by_source')}
              </p>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' as const }}>
                <a
                  href={`/signals${dimension ? `?dimension=${dimension}` : ''}${isSeverityFilter ? `${dimension ? '&' : '?'}filter=${filter}` : ''}`}
                  style={{
                    padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                    background: !isSourceFilter ? '#111827' : '#F3F4F6',
                    color: !isSourceFilter ? '#fff' : '#6B7280',
                    textDecoration: 'none',
                  }}>
                  {t('signals.all_sources')}
                </a>
                {SOURCE_FILTERS.map(src => {
                  const count = (dimension
                    ? allAnalysed.filter(s => s.source === src.id && s.dimension === dimension)
                    : allAnalysed.filter(s => s.source === src.id)
                  ).length
                  if (count === 0) return null
                  const isSelected = isSourceFilter && filter === src.id
                  const href = `/signals?filter=${src.id}${dimension ? `&dimension=${dimension}` : ''}${isSeverityFilter ? `&filter=${filter}` : ''}`
                  return (
                    <a key={src.id} href={href} style={{
                      padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                      background: isSelected ? '#111827' : '#F3F4F6',
                      color: isSelected ? '#fff' : '#6B7280',
                      textDecoration: 'none',
                    }}>
                      {src.label} ({count})
                    </a>
                  )
                })}
              </div>
            </div>

            {/* Active filter pills */}
            {(dimension || isSourceFilter || isSeverityFilter) && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12, flexWrap: 'wrap' as const }}>
                <span style={{ fontSize: 12, color: '#9CA3AF', fontWeight: 600 }}>{t('signals.active_filters')}</span>
                {dimension && (
                  <a href={`/signals${isSeverityFilter ? `?filter=${filter}` : ''}`} style={{
                    padding: '4px 10px', background: '#EFF6FF', color: '#2563EB',
                    borderRadius: 20, fontSize: 12, fontWeight: 600, textDecoration: 'none',
                  }}>
                    {DIMENSION_LABELS[dimension] ?? dimension} ✕
                  </a>
                )}
                {isSourceFilter && (
                  <a href={`/signals${dimension ? `?dimension=${dimension}` : ''}`} style={{
                    padding: '4px 10px', background: '#EFF6FF', color: '#2563EB',
                    borderRadius: 20, fontSize: 12, fontWeight: 600, textDecoration: 'none',
                  }}>
                    {SOURCE_FILTERS.find(s => s.id === filter)?.label ?? filter} ✕
                  </a>
                )}
                {isSeverityFilter && (
                  <a href={`/signals${dimension ? `?dimension=${dimension}` : isSourceFilter ? `?filter=${filter}` : ''}`} style={{
                    padding: '4px 10px', background: '#FEF3C7', color: '#92400E',
                    borderRadius: 20, fontSize: 12, fontWeight: 600, textDecoration: 'none',
                  }}>
                    {filter === 'critical'  ? `🔴 ${t('signals.critical')}`    :
                     filter === 'warning'   ? `🟡 ${t('signals.warning')}`     :
                     filter === 'working'   ? `🔵 ${t('signals.needs_strategy')}` :
                     filter === 'conflicts' ? `⚠️ ${t('signals.conflicts')}`   : filter} ✕
                  </a>
                )}
                <a href="/signals" style={{ fontSize: 12, color: '#9CA3AF', textDecoration: 'none', fontWeight: 600 }}>
                  {t('signals.clear_all')}
                </a>
              </div>
            )}
          </div>

          {/* ── Scan frequency strip ── */}
          {hasConnectedSources && sources && sources.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', background: '#F9FAFB', borderRadius: 10, border: '1px solid #E5E7EB', marginBottom: 16, flexWrap: 'wrap' as const }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#6B7280' }}>{t('signals.next_scan')}</span>
              {sources.filter(s => s.source_type !== 'csv' && s.last_synced_at).map(s => {
                const freq = getSourceFrequency(s.source_type, subscriptionTier, s.scan_frequency_days ?? null)
                const daysSince = (Date.now() - new Date(s.last_synced_at!).getTime()) / (24 * 60 * 60 * 1000)
                const daysLeft = Math.max(0, Math.ceil(freq - daysSince))
                const label: Record<string, string> = { ga4: 'GA4', jira: 'Jira', shopify: 'Shopify', intercom: 'Intercom', trustpilot: 'Trustpilot' }
                return (
                  <span key={s.id} style={{ fontSize: 12, color: daysLeft === 0 ? '#059669' : '#374151', fontWeight: daysLeft === 0 ? 700 : 500, background: daysLeft === 0 ? '#ECFDF5' : '#fff', border: '1px solid #E5E7EB', borderRadius: 20, padding: '2px 10px' }}>
                    {label[s.source_type] ?? s.source_type}: {daysLeft === 0 ? `${t('common.ready_now')} ✓` : t('signals.next_scan_in').replace('{days}', String(daysLeft))}
                  </span>
                )
              })}
              {!isFreeTier && daysUntilNextScan === 0 && (
                <span style={{ fontSize: 12, color: '#059669', fontWeight: 600, marginLeft: 'auto' }}>{t('signals.run_refresh')}</span>
              )}
            </div>
          )}

          {/* ── Section title ── */}
          {filter !== 'resolved' && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <h2 style={{ fontSize: 15, fontWeight: 700, color: '#374151', margin: 0 }}>
                {getSectionTitle()}
              </h2>
            </div>
          )}

          {/* ── Assessment only banner ── */}
          {signals.some(s => s.source === 'manual') && !sources?.length && (
            <div style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 12, padding: '14px 20px', marginBottom: 20 }}>
              <p style={{ fontSize: 13, color: '#1D4ED8', margin: 0 }}>
                📋 {t('signals.assessment_only')} <a href="/connect" style={{ color: '#2563EB', fontWeight: 600 }}>{t('common.connect_tools')}</a> {t('signals.connect_higher')}
              </p>
            </div>
          )}

          {/* ── Empty state ── */}
          {signals.filter(s => String(s.founder_feedback ?? '') !== 'missed_the_mark').length === 0 && filter !== 'resolved' && (
            <div style={{ textAlign: 'center', padding: '48px', background: '#fff', borderRadius: 16, border: '1px solid #E5E7EB', marginBottom: 24 }}>
              <div style={{ fontSize: 36, marginBottom: 10 }}>{connected ? '🔍' : '✅'}</div>
              <p style={{ fontWeight: 700, color: '#111827', marginBottom: 4 }}>
                {connected ? t('signals.scanning_data') : filter ? t('signals.no_category') : t('signals.no_active')}
              </p>
              <p style={{ color: '#6B7280', fontSize: 14, margin: 0 }}>
                {connected           ? t('signals.refresh_seconds')    :
                 filter              ? t('signals.try_filter')          :
                 hasConnectedSources ? t('signals.run_new_scan')        :
                 hasAssessment       ? t('signals.connect_live')        :
                                       t('signals.take_or_connect')}
              </p>
              {!connected && !hasConnectedSources && (
                <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 16, flexWrap: 'wrap' }}>
                  {!hasAssessment && (
                    <a href="/assessment" style={{ display: 'inline-block', padding: '10px 24px', background: '#2563EB', color: '#fff', borderRadius: 10, textDecoration: 'none', fontSize: 14, fontWeight: 600 }}>
                      {t('assessment.start')}
                    </a>
                  )}
                  <a href="/connect" style={{ display: 'inline-block', padding: '10px 24px', background: hasAssessment ? '#2563EB' : '#F9FAFB', color: hasAssessment ? '#fff' : '#374151', border: hasAssessment ? 'none' : '1px solid #E5E7EB', borderRadius: 10, textDecoration: 'none', fontSize: 14, fontWeight: 600 }}>
                    {t('common.connect_tools')}
                  </a>
                </div>
              )}
            </div>
          )}

          {/* ── Signal cards ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 40 }}>
            {signals.filter(s => String(s.founder_feedback ?? '') !== 'missed_the_mark').map(signal => {
              const confirmFlag      = signal.flags.find(f => f.type === 'confirmed')
              const conflictFlag     = signal.flags.find(f => f.type === 'conflict')
              const conflictResolved = !!conflictFlag && !!prefMap.get(signal.signal_type)
              const borderColor = conflictFlag
                ? (conflictResolved ? '#A7F3D0' : '#FDE68A')
                : severityColor(signal.severity) + '25'
              const leftBorder = conflictFlag
                ? (conflictResolved ? '#059669' : '#D97706')
                : severityColor(signal.severity)
              const evidenceText = String(signal.raw_data?.evidence ?? '')
              const showEvidence = Boolean(signal.raw_data?.evidence) &&
                evidenceText !== 'Based on overall Trustpilot rating analysis' &&
                evidenceText !== 'From GA4 data' &&
                evidenceText !== 'Based on CSV data analysis'
              const conflictingSignal = conflictFlag
                ? allAnalysed.find(s => s.signal_type === signal.signal_type && s.source === conflictFlag.bySource)
                : undefined

              return (
                <div key={signal.id} style={{
                  background: '#fff', borderRadius: 16,
                  borderTopWidth: 1, borderTopStyle: 'solid', borderTopColor: borderColor,
                  borderLeft: `4px solid ${leftBorder}`,
                  padding: '20px 24px',
                }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10, gap: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 18 }}>{dimensionIcon(signal.dimension)}</span>
                      <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: severityBg(signal.severity), color: severityColor(signal.severity), letterSpacing: '0.05em' }}>
                        {SEVERITY_LABELS[signal.severity as string] ?? signal.severity}
                      </span>
                      <span style={{ fontSize: 11, color: '#9CA3AF' }}>{DIM_PLAIN[signal.dimension as string] ?? signal.dimension}</span>
                      <span style={{ fontSize: 11, padding: '1px 8px', borderRadius: 10, background: '#F3F4F6', color: '#6B7280', fontWeight: 500 }}>
                        {sourceLabel[signal.source] ?? signal.source}
                      </span>
                      <span style={{ fontSize: 11, color: '#9CA3AF' }}>
                        {Math.round((signal.confidence_score ?? 0) * 100)}% {t('signals.confidence')}
                      </span>
                      {confirmFlag && (
                        <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: '#ECFDF5', color: '#059669', fontWeight: 600 }}>
                          ✓ {t('signals.confirmed_by')} {sourceLabelShort[confirmFlag.bySource] ?? confirmFlag.bySource}
                        </span>
                      )}
                      {conflictFlag && !prefMap.get(signal.signal_type) && (
                        <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: '#FFFBEB', color: '#D97706', fontWeight: 600 }}>
                          ⚠ {t('signals.conflicts_with')} {sourceLabelShort[conflictFlag.bySource] ?? conflictFlag.bySource}
                        </span>
                      )}
                      {signal.status === 'acknowledged' && (
                        <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: '#EFF6FF', color: '#2563EB', fontWeight: 600 }}>{t('signals.in_progress')}</span>
                      )}
                      {signal.trend === 'improving' && (
                        <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: '#ECFDF5', color: '#059669', fontWeight: 600 }}>↑ {t('common.improving')}</span>
                      )}
                      {signal.trend === 'worsening' && (
                        <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: '#FEF2F2', color: '#DC2626', fontWeight: 600 }}>↓ {t('common.worsening')}</span>
                      )}
                      {signal.trend === 'unchanged' && signal.status === 'acknowledged' && (
                        <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: '#FFFBEB', color: '#D97706', fontWeight: 600 }}>{t('signals.no_change')}</span>
                      )}
                      {String(signal.founder_feedback ?? '') === 'accurate' && (
                        <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: '#ECFDF5', color: '#059669', fontWeight: 600 }}>{t('signals.signal_confirmed')}</span>
                      )}
                    </div>
                    <span style={{ fontSize: 12, color: '#9CA3AF', flexShrink: 0 }}>
                      {new Date(signal.created_at).toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-GB', { day: 'numeric', month: 'short' })}
                    </span>
                  </div>

                  {conflictFlag && (() => {
                    const pref = prefMap.get(signal.signal_type)
                    const currentValue     = signal.value !== null && signal.value !== undefined ? Number(signal.value) : null
                    const conflictingValue = conflictingSignal?.value !== null && conflictingSignal?.value !== undefined ? Number(conflictingSignal.value) : null
                    const initialChoice    = pref?.trusted_source ?? null
                    const isDeprioritised  = !!pref && pref.trusted_source !== signal.source
                    const trustedLabel     = pref ? (sourceLabel[pref.trusted_source] ?? pref.trusted_source) : undefined
                    return (
                      <ConflictTrustButton
                        signalType={signal.signal_type}
                        signalInsight={si(signal)}
                        initialChoice={initialChoice}
                        isDeprioritised={isDeprioritised}
                        trustedLabel={trustedLabel}
                        sources={[
                          { source: signal.source, value: currentValue, label: sourceLabel[signal.source] ?? signal.source },
                          { source: conflictFlag.bySource, value: conflictingValue, label: sourceLabel[conflictFlag.bySource] ?? conflictFlag.bySource },
                        ]}
                      />
                    )
                  })()}

                  <p style={{ fontSize: 15, color: '#111827', fontWeight: 600, marginBottom: 10, lineHeight: 1.5 }}>
                    {si(signal)}
                  </p>

                  <div style={{ background: '#EFF6FF', borderRadius: 10, padding: '10px 14px', marginBottom: 14 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#2563EB' }}>{t('signals.action')} </span>
                    <span style={{ fontSize: 13, color: '#1D4ED8', lineHeight: 1.5 }}>{ra(signal)}</span>
                  </div>

                  {showEvidence && (
                    <p style={{ fontSize: 12, color: '#9CA3AF', marginBottom: 14, fontStyle: 'italic' }}>
                      {t('signals.evidence_label')}: 
                      {EVIDENCE_TRANSLATIONS[evidenceText] ?? evidenceText}                    
                      </p>
                  )}

                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' as const }}>
                    {signal.status === 'new' && (
                      <a href={`/api/signals/${signal.id}/acknowledge?return=${filter ?? ''}`}
                        style={{ padding: '8px 18px', background: '#2563EB', color: '#fff', borderRadius: 8, fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>
                        {t('signals.working')}
                      </a>
                    )}
                    {signal.status === 'acknowledged' && (
                      <a href={`/api/signals/${signal.id}/resolve?return=${filter ?? ''}`}
                        style={{ padding: '8px 18px', background: '#059669', color: '#fff', borderRadius: 8, fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>
                        {t('signals.mark_fixed')}
                      </a>
                    )}
                    {!signal.founder_feedback && (
                      <>
                        <a href={`/api/signals/${signal.id}/feedback?type=accurate&return=${filter ?? ''}`}
                          style={{ padding: '8px 18px', background: '#ECFDF5', color: '#059669', borderRadius: 8, fontSize: 13, textDecoration: 'none' }}>
                          {t('signals.correct')}
                        </a>
                        <a href={`/api/signals/${signal.id}/feedback?type=missed&return=${filter ?? ''}`}
                          style={{ padding: '8px 18px', background: '#FEF2F2', color: '#DC2626', borderRadius: 8, fontSize: 13, textDecoration: 'none' }}>
                          {t('signals.not_applicable')}
                        </a>
                      </>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {/* ── Not applicable ── */}
          {notApplicable && notApplicable.length > 0 && (
            <div style={{ marginBottom: 32 }}>
              <h3 style={{ fontSize: 13, fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>
                {t('signals.not_applicable_list').replace('{count}', String(notApplicable.length))}
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {notApplicable.map(signal => (
                  <div key={signal.id} style={{ background: '#F9FAFB', borderRadius: 12, border: '1px solid #E5E7EB', padding: '14px 20px', opacity: 0.6, display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span>{dimensionIcon(String(signal.dimension ?? ''))}</span>
                    <p style={{ fontSize: 13, color: '#6B7280', margin: 0, flex: 1 }}>{si(signal)}</p>
                    <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: '#F3F4F6', color: '#6B7280', fontWeight: 600, flexShrink: 0 }}>✗ {t('signals.not_applicable')}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Fixed signals ── */}
          {resolved && resolved.length > 0 && (
            <div style={{ marginBottom: 32 }}>
              <h3 style={{ fontSize: 13, fontWeight: 600, color: '#059669', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>
                {t('signals.archived_list').replace('{count}', String(resolved.length))}
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {resolved.map(signal => (
                  <div key={signal.id} style={{ background: '#ECFDF5', borderRadius: 12, border: '1px solid #A7F3D0', padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span>✅</span>
                      <div>
                        <p style={{ fontSize: 14, color: '#065F46', fontWeight: 600, margin: '0 0 2px' }}>{si(signal)}</p>
                        <p style={{ fontSize: 12, color: '#059669', margin: 0 }}>{t('signals.marked_fixed')}</p>
                      </div>
                    </div>
                    <span style={{ fontSize: 12, color: '#059669', flexShrink: 0 }}>
                      {new Date(signal.updated_at).toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-GB', { day: 'numeric', month: 'short' })}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Deprioritised signals ── */}
          {deprioritised && deprioritised.length > 0 && (
            <div>
              <h3 style={{ fontSize: 13, fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>
                {t('signals.deprioritised_list').replace('{count}', String(deprioritised.length))}
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {deprioritised.map(signal => (
                  <div key={signal.id} style={{ background: '#fff', borderRadius: 12, border: '1px solid #E5E7EB', padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, opacity: 0.65 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span>{dimensionIcon(String(signal.dimension ?? ''))}</span>
                      <p style={{ fontSize: 14, color: '#374151', margin: 0 }}>{si(signal)}</p>
                    </div>
                    <a href={`/api/signals/${signal.id}/acknowledge`} style={{ fontSize: 12, color: '#2563EB', textDecoration: 'none', flexShrink: 0, fontWeight: 600, whiteSpace: 'nowrap' }}>
                      {t('signals.move_active')}
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>
    </main>
  )
}
