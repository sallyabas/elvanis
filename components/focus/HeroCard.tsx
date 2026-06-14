'use client'

import { useRouter } from 'next/navigation'
import type { DimensionStatus } from '@/lib/dimension-status'
import { SIGNAL_DEPENDENCY_MAP, getDependencyAlertText, SignalType } from '@/lib/signal-dependency-map'
import { DIMENSIONS } from '@/lib/gravity-engine'
import { useT, useLang } from '@/app/context/LanguageContext'
import { SIGNAL_GOAL_MAP } from '@/lib/signal-goal-map'

interface Signal {
  id:                 string
  signal_type:        string
  severity:           string
  insight_summary:    string
  insight_summary_ar:    string
  recommended_action: string
  recommended_action_ar: string
  value:              number | null
  trend:              string | null
}

interface HeroCardProps {
  status:          DimensionStatus
  signals:         Signal[]
  allSignalTypes:  string[]
  founderStage:    string | null
  focusMetric:     string | null
  isUpdating?: boolean
}



function getTrendArrow(trend: string | null) {
  if (trend === 'improving') return '↑'
  if (trend === 'worsening') return '↓'
  if (trend === 'unchanged') return '→'
  return ''
}

function getTrendColor(trend: string | null) {
  if (trend === 'improving') return '#10B981'
  if (trend === 'worsening') return '#EF4444'
  return '#9CA3AF'
}

function getScoreColor(score: number) {
  if (score === -1) return '#9CA3AF'
  if (score >= 70)  return '#10B981'
  if (score >= 40)  return '#F59E0B'
  return '#EF4444'
}

function getWhyPrimary(
  founderStage: string | null,
  focusMetric:  string | null,
): string {
  const stageLabel: Record<string, string> = {
    early_stage:        'early stage',
    product_customers:  'post-revenue stage',
  }
  const focusLabel: Record<string, string> = {
    growth:    'growth focus',
    retention: 'retention focus',
    ops:       'ops focus',
    delivery:  'delivery focus',
  }
  const stage = stageLabel[founderStage ?? ''] ?? 'your stage'
  const focus = focusLabel[focusMetric  ?? ''] ?? 'your focus'
  return `Based on your ${focus} + ${stage}`
}

export default function HeroCard({
  status,
  signals,
  allSignalTypes,
  founderStage,
  focusMetric,
  isUpdating = false,
}: HeroCardProps) {
  const router = useRouter()
  const t      = useT()
  const lang   = useLang()
  const isAr   = lang === 'ar'

  const SEVERITY_MAP: Record<string, { bg: string; color: string; label: string }> = {
    critical: { bg: '#FEF2F2', color: '#DC2626', label: t('focus.severity_critical') },
    warning:  { bg: '#FFFBEB', color: '#D97706', label: t('focus.severity_warning')  },
    watch:    { bg: '#F0FDF4', color: '#059669', label: t('focus.severity_watch')    },
  }

  // Top 2 signals by severity
  const severityOrder = { critical: 0, warning: 1, watch: 2 }
  const topSignals = [...signals]
    .sort((a, b) =>
      (severityOrder[a.severity as keyof typeof severityOrder] ?? 3) -
      (severityOrder[b.severity as keyof typeof severityOrder] ?? 3)
    )
    .slice(0, 2)

  // Dependency chain
  const criticalSignal = topSignals.find(s => s.severity === 'critical') ?? topSignals[0]
  const dependencyAlert = criticalSignal
    ? getDependencyAlertText(criticalSignal.signal_type as SignalType, allSignalTypes)
    : null

  const downstreamDimensions = criticalSignal
    ? (SIGNAL_DEPENDENCY_MAP[criticalSignal.signal_type as SignalType]?.downstream ?? [])
        .slice(0, 2)
        .map(s => {
          const SIGNAL_TO_DIM: Record<string, string> = {
            churn_spike: 'customer', aov_decline: 'revenue', repeat_purchase_drop: 'revenue',
            refund_spike: 'revenue', conversion_fall: 'marketing', engagement_drop: 'marketing',
            traffic_source_shift: 'marketing', session_duration_drop: 'marketing',
            activation_drop: 'product', nps_decline: 'customer', csat_decline: 'customer',
            rating_decline: 'customer', repeat_complaint_pattern: 'customer',
            ticket_volume_increase: 'customer', response_time_increase: 'customer',
            velocity_drop: 'team', cycle_time_increase: 'team',
            bug_backlog_growth: 'team', blocked_tickets_spike: 'team',
          }
          const dimId = SIGNAL_TO_DIM[s]
          if (!dimId) return null
          const dim = DIMENSIONS[dimId as keyof typeof DIMENSIONS]
          return isAr ? (dim?.label_ar ?? dim?.label ?? null) : (dim?.label ?? null)
        })
        .filter((d): d is string => d !== null && d !== status.label)
        .filter((d, i, arr) => arr.indexOf(d) === i)
    : []

  return (
    <div className="hero-card" style={{
      background:   '#FFFFFF',
      border:       `2px solid ${status.color}`,
      borderRadius: 20,
      padding:      '32px 36px',
      boxShadow:    '0 4px 24px rgba(0,0,0,0.06)',
      position:     'relative',
    }}>
{/* Spinner overlay */}
{isUpdating && (
    <div style={{
      position:       'absolute',
      inset:          0,
      background:     'rgba(255,255,255,0.75)',
      borderRadius:   20,
      display:        'flex',
      alignItems:     'center',
      justifyContent: 'center',
      zIndex:         10,
    }}>
      <div style={{
        width:        28,
        height:       28,
        border:       '3px solid #E5E7EB',
        borderTop:    '3px solid #2563EB',
        borderRadius: '50%',
        animation:    'spin 0.7s linear infinite',
      }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )}
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, marginBottom: 8 }}>
        <span style={{ fontSize: 36, lineHeight: 1 }}>{status.icon}</span>
        <div style={{ flex: 1 }}>
          <p style={{
            fontSize:      11,
            fontWeight:    700,
            color:         status.color,
            letterSpacing: '0.14em',
            textTransform: 'uppercase' as const,
            margin:        '0 0 2px',
          }}>
            {t('focus.primary_focus')}
          </p>
          <h2 style={{ fontSize: 26, fontWeight: 900, color: '#111827', margin: '0 0 4px' }}>
            {status.label}
          </h2>
          <p style={{ fontSize: 12, color: '#9CA3AF', margin: 0, fontStyle: 'italic' }}>
            {t('focus.based_on')
              .replace('{focus}', t((`focus.focus_${focusMetric ?? 'growth'}`) as Parameters<typeof t>[0]))
              .replace('{stage}', t((`focus.stage_${founderStage === 'early_stage' ? 'early' : 'product'}`) as Parameters<typeof t>[0]))}
          </p>
        </div>

        {/* Score */}
        {(status.state === 'active' || status.state === 'assessment_only') && (
          <div style={{ textAlign: 'right' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, justifyContent: 'flex-end' }}>
            <span className="hero-score" style={{ fontSize: 64, fontWeight: 900, color: getScoreColor(status.score), lineHeight: 1 }}>
            {status.score === -1 ? '—' : status.score}
           { status.isProvisional && (
              <span style={{ fontSize: 32, color: '#F59E0B', fontWeight: 700 }}>*</span>
                 )}
</span>
{status.score !== -1 && (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
    <span style={{ fontSize: 18, color: '#9CA3AF' }}>/100</span>
    {status.isProvisional && (
        <span style={{ fontSize: 10, color: '#F59E0B', fontWeight: 700, letterSpacing: '0.05em' }}>
        📋 {t('focus.provisional')}
      </span>
    )}
  </div>
)}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'flex-end', marginTop: 4 }}>
             <span style={{ fontSize: 20, color: getTrendColor(status.trend), fontWeight: 700 }}>
               {getTrendArrow(status.trend)}
              </span>
              <span style={{ fontSize: 13, color: getTrendColor(status.trend), fontWeight: 600 }}>
                {status.trend === 'improving'  ? t('focus.improving')  :
                 status.trend === 'worsening'  ? t('focus.worsening')  :
                 status.trend === 'unchanged'  ? t('focus.stable')     : ''}
              </span>
              {status.state === 'active' && status.sourceIcons.length > 0 && (
               <span style={{ fontSize: 14, marginLeft: 4 }}>
                {status.sourceIcons.join(' ')}
              </span>
             )}
            </div>
          </div>
        )}
      </div>

      {/* Divider */}
      <div style={{ height: 1, background: '#F3F4F6', margin: '20px 0' }} />

      {/* ── STATE: LOCKED ── */}
      {status.state === 'locked' && (
  <div style={{ textAlign: 'center', padding: '16px 0 8px' }}>
    <p style={{ fontSize: 32, marginBottom: 12 }}>
      {status.isReconnect ? '⚠️' : '🔒'}
    </p>

    <p style={{ fontSize: 15, fontWeight: 600, color: '#111827', marginBottom: 8 }}>
      {status.isReconnect
        ? t('focus.reconnected').replace('{label}', status.label)
        : t('focus.not_activated').replace('{label}', status.label)}
    </p>

    <p style={{ fontSize: 14, color: '#6B7280', marginBottom: 24, lineHeight: 1.6 }}>
      {status.isReconnect ? status.reconnectText : status.unlockText}
    </p>

    <a
      href={status.ctaHref}
      style={{
        display:        'inline-block',
        padding:        '12px 24px',
        background:     status.color,
        color:          '#FFFFFF',
        borderRadius:   10,
        fontSize:       14,
        fontWeight:     700,
        textDecoration: 'none',
      }}
    >
      {status.isReconnect
        ? t('focus.reconnect_btn').replace('{label}', status.shortLabel)
        : `${status.ctaText} →`}
    </a>
    {status.isReconnect && status.hadSourceIcons.length > 0 && (
      <p style={{ fontSize: 13, color: '#9CA3AF', marginTop: 12 }}>
        {t('focus.previously')}{' '}
        <span style={{ opacity: 0.5 }}>
          {status.hadSourceIcons.join(' ')}
        </span>
      </p>
    )}
  </div>
)}

      {/* ── STATE: PENDING ── */}
      {status.state === 'pending' && (
        <div style={{ textAlign: 'center', padding: '16px 0 8px' }}>
          <p style={{ fontSize: 32, marginBottom: 12 }}>⏳</p>
          <p style={{ fontSize: 15, fontWeight: 600, color: '#111827', marginBottom: 8 }}>
            {t('focus.tools_connected')}
          </p>
          <p style={{ fontSize: 14, color: '#6B7280', marginBottom: 24, lineHeight: 1.6 }}>
            {status.pendingText}
          </p>
          <button
            onClick={() => router.push('/?scan=true')}
            style={{
              padding:      '12px 24px',
              background:   status.color,
              color:        '#FFFFFF',
              border:       'none',
              borderRadius: 10,
              fontSize:     14,
              fontWeight:   700,
              cursor:       'pointer',
              fontFamily:   'inherit',
            }}
          >
            {t('focus.run_first_scan')}
          </button>
        </div>
      )}

      {/* ── STATE: HEALTHY ── */}
      {status.state === 'healthy' && (
        <div style={{ textAlign: 'center', padding: '16px 0 8px' }}>
          <p style={{ fontSize: 32, marginBottom: 12 }}>✅</p>
          <p style={{ fontSize: 15, fontWeight: 600, color: '#10B981', marginBottom: 8 }}>
            {t('focus.is_healthy').replace('{label}', status.label)}
          </p>
          <p style={{ fontSize: 14, color: '#6B7280', lineHeight: 1.6 }}>
            {status.healthyText}
          </p>
        </div>
      )}

      {/* ── STATE: ASSESSMENT ONLY ── */}
{status.state === 'assessment_only' && (
  <div style={{ marginBottom: 20 }}>
    <div style={{
      background:   '#FFFBEB',
      border:       '1px solid #FDE68A',
      borderRadius: 10,
      padding:      '12px 16px',
      marginBottom: 16,
      display:      'flex',
      gap:          10,
      alignItems:   'flex-start',
    }}>
      <span style={{ fontSize: 16, flexShrink: 0 }}>📋</span>
      <div>
      <p style={{ fontSize: 13, fontWeight: 700, color: '#92400E', margin: '0 0 4px' }}>
  📋 {t('focus.assessment_only').replace('{score}', String(status.score))}
</p>
<p style={{ fontSize: 13, color: '#92400E', margin: '0 0 4px' }}>
  {status.assessmentOnlyText}
</p>

<p style={{ fontSize: 12, color: '#92400E', margin: 0, fontStyle: 'italic' }}>
  {t('focus.connect_validate')}
</p>
      </div>
    </div>
    <a
      href={status.ctaHref}
      style={{
        display:        'inline-block',
        padding:        '10px 20px',
        background:     '#F59E0B',
        color:          '#FFFFFF',
        borderRadius:   10,
        fontSize:       13,
        fontWeight:     700,
        textDecoration: 'none',
      }}
    >
      {status.ctaText} {t('focus.to_validate')}
    </a>
  </div>
)}

      {/* ── STATE: ACTIVE — signals ── */}
      {status.state === 'active' && topSignals.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <p style={{
            fontSize:      12,
            fontWeight:    700,
            color:         '#9CA3AF',
            textTransform: 'uppercase' as const,
            letterSpacing: '0.1em',
            marginBottom:  12,
          }}>
            {t('focus.whats_driving')}
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {topSignals.map(signal => (
              <div
                key={signal.id}
                style={{
                  background:   '#F9FAFB',
                  borderRadius: 10,
                  padding:      '14px 16px',
                  display:      'flex',
                  gap:          12,
                  alignItems:   'flex-start',
                }}
              >
                <span style={{
                  background:    SEVERITY_MAP[signal.severity]?.bg ?? '#F0FDF4',
                  color:         SEVERITY_MAP[signal.severity]?.color ?? '#059669',
                  fontSize:      11, fontWeight: 700, padding: '3px 8px',
                  borderRadius:  6, textTransform: 'uppercase' as const,
                  letterSpacing: '0.05em', flexShrink: 0,
                }}>
                  {SEVERITY_MAP[signal.severity]?.label ?? signal.severity}
                </span>
                <div style={{ flex: 1 }}>
                <p style={{ fontSize: 14, fontWeight: 600, color: '#111827', margin: '0 0 4px' }}>
                    {isAr && signal.insight_summary_ar ? signal.insight_summary_ar : signal.insight_summary}
                  </p>
                  <p style={{ fontSize: 12, color: '#6B7280', margin: 0 }}>
                    → {isAr && signal.recommended_action_ar ? signal.recommended_action_ar : signal.recommended_action}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Dependency chain alert ── */}
      {status.state === 'active' && dependencyAlert && downstreamDimensions.length > 0 && (
        <div style={{
          background:   '#FEF3C7',
          border:       '1px solid #FDE68A',
          borderRadius: 10,
          padding:      '12px 16px',
          marginBottom: 20,
          display:      'flex',
          gap:          10,
          alignItems:   'flex-start',
        }}>
          <span style={{ fontSize: 16, flexShrink: 0 }}>⚡</span>
          <div>
          <p style={{ fontSize: 13, fontWeight: 700, color: '#92400E', margin: '0 0 2px' }}>
              {t('focus.chain_alert')}
            </p>
            <p style={{ fontSize: 13, color: '#92400E', margin: 0 }}>
              {(() => {
                if (!dependencyAlert) return null
                const [key, n, sigs] = dependencyAlert.split('|')
                const sigNames = sigs.split(',').map(s => {
                  const meta = SIGNAL_GOAL_MAP[s.trim()]
                  return isAr ? (meta?.label_ar ?? s.replace(/_/g, ' ')) : (meta?.label ?? s.replace(/_/g, ' '))
                }).join(isAr ? '، ' : ', ')
                const translated = t(key as Parameters<typeof t>[0])
                  .replace('{n}', n)
                  .replace('{signals}', sigNames)
                return translated
              })()} {t('focus.chain_putting').replace('{dims}', downstreamDimensions.join(isAr ? ' و ' : ' and '))}
            </p>
          </div>
        </div>
      )}

      {/* ── CTA row (active state only) ── */}
      {(status.state === 'active' || status.state === 'assessment_only') && (
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <button
            onClick={() => router.push(`/signals?dimension=${status.id}`)}
            style={{
              padding:      '12px 24px',
              background:   status.color,
              color:        '#FFFFFF',
              border:       'none',
              borderRadius: 10,
              fontSize:     14,
              fontWeight:   700,
              cursor:       'pointer',
              fontFamily:   'inherit',
            }}
          >
           {t('focus.see_signals').replace('{label}', status.shortLabel)}
          </button>
          <button
            onClick={() => router.push('/plan')}
            style={{
              padding:      '12px 24px',
              background:   'none',
              color:        '#6B7280',
              border:       '1px solid #E5E7EB',
              borderRadius: 10,
              fontSize:     14,
              fontWeight:   600,
              cursor:       'pointer',
              fontFamily:   'inherit',
            }}
          >
            {t('focus.see_action_plan')}
            
          </button>
        </div>
      )}
    </div>
  )
}