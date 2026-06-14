import { redirect } from 'next/navigation'
import { createServerComponentClient } from '@/lib/supabase-server'
import GoalsSection from './goals-section'
import SignalsTabs from './signals-tabs'
import { getT } from '@/lib/translations'

const SIGNAL_LOWER_BETTER = new Set([
  'churn_spike', 'ticket_volume_increase', 'refund_spike',
  'response_time_increase', 'repeat_complaint_pattern',
  'bug_backlog_growth', 'traffic_source_shift',
  'cycle_time_increase', 'blocked_tickets_spike',
])

export default async function BusinessHealthTrackerPage() {
  const supabase  = await createServerComponentClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: founder } = await supabase
    .from('founders').select('*').eq('user_id', user.id).maybeSingle()

  const t    = getT((founder?.language ?? 'en') as 'en' | 'ar')
  const lang = founder?.language ?? 'en'

  const founderId = founder?.id ?? ''

  const { data: activeSignals } = await supabase
    .from('diagnostic_signals')
    .select('signal_type, value, severity')
    .eq('founder_id', founderId)
    .in('status', ['new', 'acknowledged'])

  const { data: allSignals } = await supabase
    .from('diagnostic_signals')
    .select('*')
    .eq('founder_id', founderId)
    .in('status', ['new', 'acknowledged'])
    .order('updated_at', { ascending: false })

  const { data: scans } = await supabase
    .from('scans')
    .select('*')
    .eq('founder_id', founderId)
    .is('parent_scan_id', null)
    .order('scanned_at', { ascending: false })
    .limit(10)

  const { data: healthHistory } = await supabase
    .from('health_score_history')
    .select('health_score, scanned_at')
    .eq('founder_id', founderId)
    .order('scanned_at', { ascending: true })
    .limit(30)

  const { data: resolvedSignals } = await supabase
    .from('diagnostic_signals')
    .select('id, signal_type, source, dimension, insight_summary, updated_at')
    .eq('founder_id', founderId)
    .eq('status', 'resolved')
    .neq('source', 'manual')
    .order('updated_at', { ascending: false })

  const { data: goalSummary } = await supabase
    .from('goals')
    .select('status')
    .eq('founder_id', founderId)

  const activeGoalCount = (goalSummary ?? []).filter(g => g.status === 'active' || g.status === 'at_risk').length

  const latestScan   = scans?.[0] ?? null
  const previousScan = scans?.[1] ?? null

  const withComparison = (allSignals ?? []).filter(s => {
    if ((s.scan_count ?? 1) < 2) return false
    if (s.previous_value === null || s.previous_value === undefined) return false
    if (s.trend === 'unchanged' && String(s.value ?? '') === String(s.previous_value ?? '')) return false
    return true
  })

  const improving  = withComparison.filter(s => s.trend === 'improving')
  const worsening  = withComparison.filter(s => s.trend === 'worsening')
  const unchanged  = withComparison.filter(s => s.trend === 'unchanged')
  const newSignals = (allSignals ?? []).filter(s => (s.scan_count ?? 1) === 1)

  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
  const recentWins    = (resolvedSignals ?? []).filter(s => new Date(s.updated_at) > ninetyDaysAgo)

  const hasNoData = (allSignals ?? []).length === 0 && (scans ?? []).length === 0 && activeGoalCount === 0

  const triggeredByLabel: Record<string, string> = {
    manual:  t('tracker.trigger_manual'),
    cron:    t('tracker.trigger_auto'),
    connect: t('tracker.trigger_connect'),
  }

  const scanStatusStyle = (status: string) => {
    if (status === 'completed')       return { bg: '#ECFDF5', color: '#059669', label: t('tracker.status_complete') }
    if (status === 'partial_failure') return { bg: '#FFFBEB', color: '#D97706', label: t('tracker.status_partial')  }
    if (status === 'processing')      return { bg: '#EFF6FF', color: '#2563EB', label: t('tracker.status_running')  }
    return { bg: '#F9FAFB', color: '#6B7280', label: status ?? '—' }
  }

  const dimensionIcon = (d: string) => ({ customer: '👥', team: '⚙️', marketing: '📣', revenue: '💰', product: '🎯', strategy: '🧭' }[d] ?? '📊')

  const sourceLabel: Record<string, string> = {
    ga4: '📊 GA4', jira: '🔧 Jira', trustpilot: '⭐ Trustpilot',
    intercom: '💬 Intercom', shopify: '🛍️ Shopify', csv: '📁 CSV',
  }

  const dateLocale = lang === 'ar' ? 'ar-EG' : 'en-GB'

  const formatScanDate = (iso: string) =>
    new Intl.DateTimeFormat(dateLocale, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(iso))

  const formatShortDate = (iso: string) =>
    new Intl.DateTimeFormat(dateLocale, { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(iso))

  const hasHistory = (scans?.length ?? 0) >= 2

  // ── Health score chart — scores stay as Western digits ──
  const chartW      = 600
  const chartH      = 80
  const scores      = (healthHistory ?? []).map(h => h.health_score)
  const minScore    = Math.max(0,   Math.min(...scores) - 10)
  const maxScore    = Math.min(100, Math.max(...scores) + 10)
  const range       = maxScore - minScore || 1
  const points      = scores.map((s, i) => {
    const x = scores.length === 1 ? chartW / 2 : (i / (scores.length - 1)) * chartW
    const y = chartH - ((s - minScore) / range) * chartH
    return `${x},${y}`
  }).join(' ')
  const latestScore = scores[scores.length - 1] ?? null
  const scoreColor  = latestScore !== null
    ? (latestScore >= 70 ? '#059669' : latestScore >= 40 ? '#D97706' : '#DC2626')
    : '#9CA3AF'

  return (
    <main style={{ minHeight: '100vh', background: '#F9FAFB', fontFamily: 'Inter, sans-serif' }}>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '36px 24px' }}>

        {/* ── Page header ── */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
            <div>
              <h1 style={{ fontSize: 26, fontWeight: 800, color: '#111827', margin: '0 0 4px' }}>{t('tracker.title')}</h1>
              <p style={{ fontSize: 14, color: '#6B7280', margin: 0 }}>{t('tracker.subtitle')}</p>
            </div>
            {latestScan && (
              <div style={{ textAlign: 'right' }}>
                <p style={{ fontSize: 11, color: '#9CA3AF', margin: '0 0 2px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t('tracker.last_scan')}</p>
                <p style={{ fontSize: 13, fontWeight: 600, color: '#374151', margin: 0 }}>{formatScanDate(latestScan.scanned_at)}</p>
                {previousScan && (
                  <p style={{ fontSize: 11, color: '#9CA3AF', margin: '2px 0 0' }}>{t('tracker.previous_scan')} {formatScanDate(previousScan.scanned_at)}</p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── Unified empty state ── */}
        {hasNoData ? (
          <div style={{ textAlign: 'center', padding: '80px 40px', background: '#fff', borderRadius: 16, border: '1px solid #E5E7EB' }}>
            <p style={{ fontSize: 40, marginBottom: 16 }}>📊</p>
            <p style={{ fontSize: 18, fontWeight: 700, color: '#111827', marginBottom: 8 }}>{t('tracker.no_data')}</p>
            <p style={{ fontSize: 14, color: '#6B7280', margin: '0 0 24px', maxWidth: 400, marginLeft: 'auto', marginRight: 'auto', lineHeight: 1.6 }}>
              {t('tracker.no_data_sub')}
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <a href="/connect" style={{ padding: '10px 22px', background: '#2563EB', color: '#fff', borderRadius: 10, textDecoration: 'none', fontSize: 14, fontWeight: 600 }}>
                {t('common.connect_tools')}
              </a>
              <a href="/signals" style={{ padding: '10px 22px', background: '#F3F4F6', color: '#374151', borderRadius: 10, textDecoration: 'none', fontSize: 14, fontWeight: 600 }}>
                {t('common.go_signals')}
              </a>
            </div>
          </div>
        ) : (
          <>
            {/* ── Summary strip ── */}
            <div className="grid-4-col" style={{ marginBottom: 24 }}>
              {/* Health score */}
              <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #E5E7EB', padding: '16px 20px' }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 6px' }}>{t('tracker.health_score')}</p>
                {latestScore !== null ? (
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4 }}>
                    <span style={{ fontSize: 36, fontWeight: 900, color: scoreColor, lineHeight: 1 }}>{latestScore}</span>
                    <span style={{ fontSize: 13, color: scoreColor, opacity: 0.7, marginBottom: 3 }}>/100</span>
                  </div>
                ) : (
                  <span style={{ fontSize: 24, fontWeight: 700, color: '#D1D5DB' }}>—</span>
                )}
              </div>

              {/* Active goals */}
              <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #E5E7EB', padding: '16px 20px' }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 6px' }}>{t('overview.goals_active')}</p>
                <span style={{ fontSize: 36, fontWeight: 900, color: '#2563EB', lineHeight: 1 }}>{activeGoalCount}</span>
                <span style={{ fontSize: 13, color: '#9CA3AF' }}>/3</span>
              </div>

              {/* Active signals */}
              <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #E5E7EB', padding: '16px 20px' }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 6px' }}>{t('overview.active_signals')}</p>
                <span style={{ fontSize: 36, fontWeight: 900, color: '#111827', lineHeight: 1 }}>{(allSignals ?? []).length}</span>
                {newSignals.length > 0 && (
                  <span style={{ fontSize: 12, color: '#2563EB', fontWeight: 600, marginLeft: 6 }}>+{newSignals.length} {t('tracker.new_badge')}</span>
                )}
              </div>

              {/* Resolved signals */}
              <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #E5E7EB', padding: '16px 20px' }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 6px' }}>{t('tracker.resolved')}</p>
                <span style={{ fontSize: 36, fontWeight: 900, color: '#059669', lineHeight: 1 }}>{(resolvedSignals ?? []).length}</span>
                {recentWins.length > 0 && (
                  <span style={{ fontSize: 12, color: '#059669', fontWeight: 600, marginLeft: 6 }}>{recentWins.length} {t('tracker.in_90d')}</span>
                )}
              </div>
            </div>

            {/* ── Section 1: Health Score Trend ── */}
            {scores.length > 0 && (
              <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #E5E7EB', padding: '20px 24px', marginBottom: 24 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                  <div>
                    <p style={{ fontSize: 11, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 4px' }}>{t('tracker.score_trend')}</p>
                    <p style={{ fontSize: 13, color: '#9CA3AF', margin: 0 }}>{t('tracker.last_n_scans').replace('{n}', String(scores.length))}</p>
                  </div>
                  {latestScore !== null && (
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: 36, fontWeight: 900, color: scoreColor, lineHeight: 1 }}>{latestScore}</span>
                      <p style={{ fontSize: 11, color: '#9CA3AF', margin: '2px 0 0' }}>{t('tracker.current_score')}</p>
                    </div>
                  )}
                </div>
                {scores.length >= 2 ? (
                  <svg viewBox={`0 0 ${chartW} ${chartH}`} style={{ width: '100%', height: 80, overflow: 'visible' }}>
                    <polyline
                      points={points}
                      fill="none"
                      stroke="#2563EB"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    {scores.map((s, i) => {
                      const x = scores.length === 1 ? chartW / 2 : (i / (scores.length - 1)) * chartW
                      const y = chartH - ((s - minScore) / range) * chartH
                      return <circle key={i} cx={x} cy={y} r="3" fill="#2563EB" />
                    })}
                  </svg>
                ) : (
                  <p style={{ fontSize: 13, color: '#9CA3AF', margin: 0 }}>{t('tracker.second_scan')}</p>
                )}
              </div>
            )}

            {/* ── Section 2: Signal Cycle Summary + Scan History ── */}
            <div style={{ marginBottom: 24 }}>
              <h2 style={{ fontSize: 15, fontWeight: 700, color: '#374151', margin: '0 0 14px' }}>{t('tracker.cycle_summary')}</h2>
              <div className="grid-4-col" style={{ marginBottom: 16 }}>
                {[
                  { label: t('tracker.new_detected'), count: newSignals.length,  color: '#2563EB', bg: '#EFF6FF', border: '#BFDBFE', icon: '🆕' },
                  { label: t('common.improving'),     count: improving.length,   color: '#059669', bg: '#ECFDF5', border: '#A7F3D0', icon: '↑'  },
                  { label: t('common.worsening'),     count: worsening.length,   color: '#DC2626', bg: '#FEF2F2', border: '#FECACA', icon: '↓'  },
                  { label: t('common.unchanged'),     count: unchanged.length,   color: '#D97706', bg: '#FFFBEB', border: '#FDE68A', icon: '→'  },
                ].map(card => (
                  <div key={card.label} style={{ background: card.bg, borderRadius: 14, border: `1px solid ${card.border}`, padding: '16px 18px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                      <span style={{ fontSize: 16 }}>{card.icon}</span>
                      <p style={{ fontSize: 11, fontWeight: 700, color: card.color, textTransform: 'uppercase', letterSpacing: '0.06em', margin: 0 }}>{card.label}</p>
                    </div>
                    <span style={{ fontSize: 36, fontWeight: 900, color: card.color, lineHeight: 1 }}>{card.count}</span>
                    {!hasHistory && card.label !== t('tracker.new_detected') && (
                      <p style={{ fontSize: 10, color: card.color, opacity: 0.6, margin: '4px 0 0' }}>{t('tracker.after_second')}</p>
                    )}
                  </div>
                ))}
              </div>

              {/* Scan history */}
              {scans && scans.length > 0 && (
                <details style={{ background: '#fff', borderRadius: 12, border: '1px solid #E5E7EB' }}>
                  <summary style={{ padding: '12px 18px', fontSize: 13, fontWeight: 600, color: '#374151', cursor: 'pointer', listStyle: 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span>{t('tracker.scan_history')}</span>
                    <span style={{ fontSize: 11, color: '#9CA3AF', fontWeight: 400 }}>{scans.length} {t('tracker.scans_expand')}</span>
                  </summary>
                  <div style={{ padding: '0 18px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {scans.map((scan, index) => {
                      const statusStyle = scanStatusStyle(scan.status)
                      return (
                        <div key={scan.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: index === 0 ? '#EFF6FF' : '#F9FAFB', borderRadius: 8, border: `1px solid ${index === 0 ? '#BFDBFE' : '#E5E7EB'}` }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                            {index === 0 && <span style={{ fontSize: 10, fontWeight: 700, color: '#2563EB', background: '#DBEAFE', padding: '1px 7px', borderRadius: 20 }}>{t('tracker.latest')}</span>}
                            <span style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>{formatScanDate(scan.scanned_at)}</span>
                            <span style={{ fontSize: 11, color: '#9CA3AF' }}>{scan.sources?.join(', ')}</span>
                            {scan.triggered_by && (
                              <span style={{ fontSize: 11, padding: '1px 6px', borderRadius: 6, background: '#F3F4F6', color: '#6B7280', fontWeight: 500 }}>
                                {triggeredByLabel[scan.triggered_by] ?? scan.triggered_by}
                              </span>
                            )}
                            <span style={{ fontSize: 11, padding: '1px 6px', borderRadius: 6, background: statusStyle.bg, color: statusStyle.color, fontWeight: 600 }}>
                              {statusStyle.label}
                            </span>
                          </div>
                          <div style={{ display: 'flex', gap: 10 }}>
                            {scan.signals_new > 0 && <span style={{ fontSize: 11, color: '#2563EB', fontWeight: 600 }}>+{scan.signals_new} {t('tracker.new_badge')}</span>}
                            {scan.signals_updated > 0 && <span style={{ fontSize: 11, color: '#6B7280' }}>{scan.signals_updated} {t('tracker.updated_badge')}</span>}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </details>
              )}
            </div>

            {/* ── Section 3: Goals ── */}
            <div id="goals">
              {founder && (
                <GoalsSection
                  founderId={founder.id}
                  subscriptionTier={founder.subscription_tier ?? 'free'}
                  activeSignals={(activeSignals ?? []).map(s => ({
                    signal_type: s.signal_type as string,
                    value:       s.value !== null ? Number(s.value) : null,
                    severity:    (s.severity as string) ?? 'watch',
                  }))}
                />
              )}
            </div>

            {/* ── Section 4: Signal Intelligence (tabbed) ── */}
            <div style={{ marginBottom: 32 }}>
              <h2 style={{ fontSize: 15, fontWeight: 700, color: '#374151', margin: '0 0 14px' }}>{t('tracker.signal_intelligence')}</h2>
              <SignalsTabs
                withComparison={withComparison}
                newSignals={newSignals}
                allSignals={allSignals ?? []}
                latestScan={latestScan}
                previousScan={previousScan}
              />
            </div>

            {/* ── Section 5: Resolved Signals ── */}
            {(resolvedSignals ?? []).length > 0 && (
              <div style={{ marginBottom: 32 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                  <div>
                    <h2 style={{ fontSize: 15, fontWeight: 700, color: '#374151', margin: '0 0 4px' }}>{t('tracker.resolved_signals')}</h2>
                    {recentWins.length > 0 && (
                      <p style={{ fontSize: 13, color: '#059669', margin: 0, fontWeight: 500 }}>
                        {t('tracker.risks_neutralised').replace('{risks}', `${recentWins.length} ${recentWins.length === 1 ? 'risk' : 'risks'}`)}
                      </p>
                    )}
                  </div>
                  <span style={{ fontSize: 12, color: '#9CA3AF' }}>{resolvedSignals?.length} {t('tracker.total')}</span>
                </div>

                {/* Scrollable Container */}
                <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #E5E7EB', overflowX: 'auto' }}>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'minmax(200px, 2fr) minmax(80px, 0.7fr) minmax(100px, 0.8fr) minmax(100px, 0.9fr) minmax(250px, 2fr)',
                    padding: '10px 20px',
                    background: '#F9FAFB',
                    borderBottom: '1px solid #E5E7EB',
                    minWidth: '750px',
                  }}>
                    {[
                      t('tracker.col_signal'),
                      t('tracker.col_source'),
                      t('tracker.col_category'),
                      t('tracker.col_date_resolved'),
                      t('tracker.col_outcome'),
                    ].map(h => (
                      <p key={h} style={{ fontSize: 11, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>{h}</p>
                    ))}
                  </div>

                  {(resolvedSignals ?? []).map((signal, index) => {
                    const isLast      = index === (resolvedSignals?.length ?? 0) - 1
                    const outcomeNote = String(signal.insight_summary ?? '')
                    return (
                      <div key={signal.id} style={{
                        display: 'grid',
                        gridTemplateColumns: 'minmax(200px, 2fr) minmax(80px, 0.7fr) minmax(100px, 0.8fr) minmax(100px, 0.9fr) minmax(250px, 2fr)',
                        padding: '10px 20px',
                        borderBottom: isLast ? 'none' : '1px solid #F3F4F6',
                        background: '#FAFFFE',
                        minWidth: '750px',
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: 14 }}>{dimensionIcon(signal.dimension)}</span>
                          <span style={{ fontSize: 13, fontWeight: 700, color: '#111827' }}>
                            {String(signal.signal_type).replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                          </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                          <span style={{ fontSize: 11, color: '#6B7280' }}>{sourceLabel[signal.source]?.replace(/^[^\s]+ /, '') ?? signal.source}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                          <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 20, background: '#ECFDF5', color: '#059669', border: '1px solid #A7F3D0' }}>
                            {signal.dimension}
                          </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                          <span style={{ fontSize: 11, color: '#9CA3AF' }}>{formatShortDate(signal.updated_at)}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                          <span title={outcomeNote} style={{ fontSize: 12, color: '#6B7280', fontStyle: 'italic', cursor: outcomeNote.length > 80 ? 'help' : 'default' }}>
                            {outcomeNote.substring(0, 80)}{outcomeNote.length > 80 ? '…' : ''}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  )
}
