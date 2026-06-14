'use client'

import { useState } from 'react'
import { useT, useLang } from '@/app/context/LanguageContext'

type Signal = Record<string, unknown>

interface Props {
  withComparison: Signal[]
  newSignals:     Signal[]
  allSignals:     Signal[]
  latestScan:     { scanned_at: string } | null
  previousScan:   { scanned_at: string } | null
}

const SIGNAL_LOWER_BETTER = new Set([
  'churn_spike', 'ticket_volume_increase', 'refund_spike',
  'response_time_increase', 'repeat_complaint_pattern',
  'bug_backlog_growth', 'traffic_source_shift',
  'cycle_time_increase', 'blocked_tickets_spike',
])

const sourceTypes = ['ga4', 'jira', 'trustpilot', 'shopify', 'intercom', 'csv']

const sourceLabel: Record<string, string> = {
  ga4: '📊 GA4', jira: '🔧 Jira', trustpilot: '⭐ Trustpilot',
  intercom: '💬 Intercom', shopify: '🛍️ Shopify', csv: '📁 CSV',
}

const severityColor = (s: string) => s === 'critical' ? '#DC2626' : s === 'warning' ? '#D97706' : '#6B7280'
const severityBg    = (s: string) => s === 'critical' ? '#FEF2F2' : s === 'warning' ? '#FFFBEB' : '#F9FAFB'
const dimensionIcon = (d: string) => ({ customer: '👥', team: '⚙️', marketing: '📣', revenue: '💰', product: '🎯', strategy: '🧭' }[d] ?? '📊')
const trendIcon     = (t: string) => t === 'improving' ? '↑' : t === 'worsening' ? '↓' : t === 'new' ? '🆕' : '→'
const trendColor    = (t: string) => t === 'improving' ? '#059669' : t === 'worsening' ? '#DC2626' : t === 'new' ? '#2563EB' : '#D97706'
const trendBg       = (t: string) => t === 'improving' ? '#ECFDF5' : t === 'worsening' ? '#FEF2F2' : t === 'new' ? '#EFF6FF' : '#FFFBEB'

function formatValue(v: unknown): string {
  if (v === null || v === undefined) return '—'
  const n = Number(v)
  if (isNaN(n)) return String(v)
  if (Math.abs(n) >= 1000) return n.toLocaleString()
  return n % 1 === 0 ? String(n) : n.toFixed(1)
}

function changePercent(prev: unknown, curr: unknown): number | null {
  const p = Number(prev)
  const c = Number(curr)
  if (isNaN(p) || isNaN(c) || p === 0) return null
  return Math.round(((c - p) / Math.abs(p)) * 100)
}

function changePercentColor(signalType: string, pct: number): string {
  const lowerIsBetter = SIGNAL_LOWER_BETTER.has(signalType)
  if (lowerIsBetter) return pct > 0 ? '#DC2626' : '#059669'
  return pct > 0 ? '#059669' : '#DC2626'
}

function formatScanDate(iso: string, lang: string) {
  return new Date(iso).toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-GB', { day: 'numeric', month: 'short' })
}

export default function SignalsTabs({ withComparison, newSignals, allSignals, latestScan, previousScan }: Props) {
  const t    = useT()
  const lang = useLang()
  const [activeTab, setActiveTab] = useState<'changes' | 'new' | 'sources'>('changes')

  const tabs = [
    { id: 'changes' as const, label: t('tracker.tab_changes'), count: withComparison.length },
    { id: 'new'     as const, label: t('tracker.tab_new'),     count: newSignals.length     },
    { id: 'sources' as const, label: t('tracker.tab_by_source'), count: null                },
  ]
  const DIM_PLAIN: Record<string, string> = {
    revenue: t('signals.cat_revenue'), customer: t('signals.cat_customer'),
    marketing: t('signals.cat_marketing'), team: t('signals.cat_team'),
    product: t('signals.cat_product'), strategy: t('signals.cat_strategy'),
  }
  const SEVERITY_LABELS: Record<string, string> = {
    critical: t('signals.sev_critical'), warning: t('signals.sev_warning'), watch: t('signals.sev_watch'),
  }
  const trendLabel = (trend: string) => {
    if (trend === 'improving') return t('tracker.tab_improving')
    if (trend === 'worsening') return t('tracker.tab_worsening')
    if (trend === 'new')       return t('tracker.tab_new_label')
    return t('tracker.tab_unchanged')
  }

  const severityLabel = (s: string) => {
    if (s === 'critical') return t('signals.sev_critical')
    if (s === 'warning')  return t('signals.sev_warning')
    return t('signals.sev_watch')
  }

  return (
    <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #E5E7EB', overflow: 'hidden', marginBottom: 32 }}>

      {/* ── Tab header ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #E5E7EB', padding: '0 20px' }}>
        <div style={{ display: 'flex' }}>
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '14px 16px',
                fontSize: 13, fontWeight: activeTab === tab.id ? 700 : 500,
                color:    activeTab === tab.id ? '#111827' : '#6B7280',
                background: 'none', border: 'none', cursor: 'pointer',
                borderBottom: activeTab === tab.id ? '2px solid #2563EB' : '2px solid transparent',
                marginBottom: -1,
                display: 'flex', alignItems: 'center', gap: 6,
                transition: 'color 0.15s',
              }}
            >
              {tab.label}
              {tab.count !== null && tab.count > 0 && (
                <span style={{
                  fontSize: 11, fontWeight: 700,
                  padding: '1px 6px', borderRadius: 20,
                  background: activeTab === tab.id ? '#EFF6FF' : '#F3F4F6',
                  color:      activeTab === tab.id ? '#2563EB'  : '#6B7280',
                }}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
        {latestScan && previousScan && activeTab === 'changes' && (
          <p style={{ fontSize: 12, color: '#9CA3AF', margin: 0 }}>
            {formatScanDate(previousScan.scanned_at, lang)} → {formatScanDate(latestScan.scanned_at, lang)}
          </p>
        )}
      </div>

      {/* ── Tab: Changes ── */}
      {activeTab === 'changes' && (
        withComparison.length > 0 ? (
          <div style={{ overflow: 'hidden' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '2.5fr 0.8fr 0.8fr 0.9fr 0.9fr 1fr', padding: '10px 20px', background: '#F9FAFB', borderBottom: '1px solid #E5E7EB' }}>
              {[t('tracker.col_signal'), t('tracker.col_source'), t('signals.confidence'), t('tracker.previous_scan').replace(':', ''), t('tracker.current_score'), t('tracker.tab_changes')].map(h => (
                <p key={h} style={{ fontSize: 11, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>{h}</p>
              ))}
            </div>
            {withComparison.map((signal, index) => {
              const pct       = changePercent(signal.previous_value, signal.value)
              const trend     = signal.trend as string
              const isLastRow = index === withComparison.length - 1
              const pctColor  = pct !== null ? changePercentColor(signal.signal_type as string, pct) : '#9CA3AF'
              const insightKey = lang === 'ar' && signal.insight_summary_ar ? 'insight_summary_ar' : 'insight_summary'
              return (
                <div key={signal.id as string} style={{
                  display: 'grid', gridTemplateColumns: '2.5fr 0.8fr 0.8fr 0.9fr 0.9fr 1fr',
                  padding: '12px 20px',
                  borderBottom: isLastRow ? 'none' : '1px solid #F3F4F6',
                  background: trend === 'worsening' ? '#FFFAFA' : trend === 'improving' ? '#FAFFFD' : '#fff',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 15 }}>{dimensionIcon(signal.dimension as string)}</span>
                    <div>
                      <p style={{ fontSize: 13, fontWeight: 600, color: '#111827', margin: '0 0 2px', lineHeight: 1.3 }}>
                        {String(signal.signal_type).replace(/_/g, ' ')}
                      </p>
                      <p style={{ fontSize: 11, color: '#9CA3AF', margin: 0, lineHeight: 1.3 }}>
                        {String(signal[insightKey] ?? '').substring(0, 55)}{String(signal[insightKey] ?? '').length > 55 ? '…' : ''}
                      </p>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <span style={{ fontSize: 11, color: '#6B7280' }}>{sourceLabel[signal.source as string]?.replace(/^[^\s]+ /, '') ?? String(signal.source)}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: severityBg(signal.severity as string), color: severityColor(signal.severity as string) }}>
                      {severityLabel(signal.severity as string)}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <span style={{ fontSize: 13, color: '#9CA3AF', fontWeight: 500 }}>{formatValue(signal.previous_value)}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <span style={{ fontSize: 13, color: '#111827', fontWeight: 700 }}>{formatValue(signal.value)}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 12, padding: '3px 8px', borderRadius: 20, background: trendBg(trend), color: trendColor(trend), fontWeight: 700, whiteSpace: 'nowrap' as const }}>
                      {trendIcon(trend)} {trendLabel(trend)}
                    </span>
                    {pct !== null && (
                      <span style={{ fontSize: 11, color: pctColor, fontWeight: 600 }}>
                        {pct > 0 ? '+' : ''}{pct}%
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div style={{ padding: '32px', textAlign: 'center' }}>
            <p style={{ fontSize: 14, color: '#6B7280', margin: 0 }}>{t('tracker.tab_no_comparison')}</p>
          </div>
        )
      )}

      {/* ── Tab: New ── */}
      {activeTab === 'new' && (
        newSignals.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {newSignals.map((signal, index) => {
              const insightKey = lang === 'ar' && signal.insight_summary_ar ? 'insight_summary_ar' : 'insight_summary'
              return (
                <div key={signal.id as string} style={{
                  padding: '14px 20px',
                  borderBottom: index === newSignals.length - 1 ? 'none' : '1px solid #F3F4F6',
                  display: 'flex', alignItems: 'center', gap: 12,
                }}>
                  <span style={{ fontSize: 16 }}>{dimensionIcon(signal.dimension as string)}</span>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 13, fontWeight: 600, color: '#111827', margin: '0 0 2px' }}>{String(signal[insightKey] ?? '')}</p>
                    <p style={{ fontSize: 11, color: '#6B7280', margin: 0 }}>
                    {sourceLabel[signal.source as string] ?? String(signal.source)} · {DIM_PLAIN[signal.dimension as string] ?? String(signal.dimension)} ·{' '}
                      {new Date(signal.created_at as string).toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-GB', { day: 'numeric', month: 'short' })}
                    </p>
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: severityBg(signal.severity as string), color: severityColor(signal.severity as string), flexShrink: 0 }}>
                    {severityLabel(signal.severity as string)}
                  </span>
                </div>
              )
            })}
          </div>
        ) : (
          <div style={{ padding: '32px', textAlign: 'center' }}>
            <p style={{ fontSize: 14, color: '#6B7280', margin: 0 }}>{t('tracker.tab_no_new')}</p>
          </div>
        )
      )}

      {/* ── Tab: By Source ── */}
      {activeTab === 'sources' && (
        <div style={{ padding: '20px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          {sourceTypes.map(src => {
            const srcSignals   = (allSignals ?? []).filter(s => s.source === src)
            if (srcSignals.length === 0) return null
            const srcImproving = srcSignals.filter(s => s.trend === 'improving').length
            const srcWorsening = srcSignals.filter(s => s.trend === 'worsening').length
            const srcNew       = srcSignals.filter(s => (s.scan_count as number ?? 1) === 1).length
            const srcUnchanged = srcSignals.filter(s => s.trend === 'unchanged').length
            const srcCritical  = srcSignals.filter(s => s.severity === 'critical').length
            const latestScanAt = srcSignals[0]?.updated_at as string | undefined
            return (
              <div key={src} style={{ background: '#F9FAFB', borderRadius: 12, border: '1px solid #E5E7EB', padding: '16px 18px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <p style={{ fontSize: 14, fontWeight: 700, color: '#111827', margin: 0 }}>{sourceLabel[src] ?? src}</p>
                  {srcCritical > 0 && (
                    <span style={{ fontSize: 10, fontWeight: 700, color: '#DC2626', background: '#FEF2F2', padding: '2px 8px', borderRadius: 20 }}>{srcCritical} {t('tracker.tab_critical')}</span>
                  )}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  {srcNew > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: 12, color: '#2563EB' }}>{t('tracker.tab_new_label')}</span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#2563EB' }}>{srcNew}</span>
                    </div>
                  )}
                  {srcImproving > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: 12, color: '#059669' }}>{t('tracker.tab_improving')}</span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#059669' }}>{srcImproving}</span>
                    </div>
                  )}
                  {srcWorsening > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: 12, color: '#DC2626' }}>{t('tracker.tab_worsening')}</span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#DC2626' }}>{srcWorsening}</span>
                    </div>
                  )}
                  {srcUnchanged > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: 12, color: '#D97706' }}>{t('tracker.tab_unchanged')}</span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#D97706' }}>{srcUnchanged}</span>
                    </div>
                  )}
                  <div style={{ height: 1, background: '#E5E7EB', margin: '4px 0' }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 11, color: '#9CA3AF' }}>{t('tracker.tab_active_signals')}</span>
                    <span style={{ fontSize: 11, fontWeight: 600, color: '#374151' }}>{srcSignals.length}</span>
                  </div>
                  {latestScanAt && (
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: 11, color: '#9CA3AF' }}>{t('tracker.tab_last_scanned')}</span>
                      <span style={{ fontSize: 11, color: '#9CA3AF' }}>
                        {new Date(latestScanAt).toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-GB', { day: 'numeric', month: 'short' })}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
          {sourceTypes.every(src => !(allSignals ?? []).some(s => s.source === src)) && (
            <div style={{ gridColumn: '1 / -1', padding: '24px', textAlign: 'center' }}>
              <p style={{ fontSize: 14, color: '#6B7280', margin: 0 }}>{t('tracker.tab_no_source')}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
