'use client'

import { useRouter } from 'next/navigation'
import type { DimensionStatus } from '@/lib/dimension-status'
import { SIGNAL_DEPENDENCY_MAP, getDependencyAlertText, SignalType } from '@/lib/signal-dependency-map'

interface Signal {
  id:                 string
  signal_type:        string
  severity:           string
  insight_summary:    string
  recommended_action: string
  value:              number | null
  trend:              string | null
}

interface HeroCardProps {
  status:          DimensionStatus
  signals:         Signal[]
  allSignalTypes:  string[]
  founderStage:    string | null
  focusMetric:     string | null
}

function SeverityBadge({ severity }: { severity: string }) {
  const map: Record<string, { bg: string; color: string; label: string }> = {
    critical: { bg: '#FEF2F2', color: '#DC2626', label: 'Critical' },
    warning:  { bg: '#FFFBEB', color: '#D97706', label: 'Warning'  },
    watch:    { bg: '#F0FDF4', color: '#059669', label: 'Watch'    },
  }
  const s = map[severity] ?? map.watch
  return (
    <span style={{
      background:    s.bg,
      color:         s.color,
      fontSize:      11,
      fontWeight:    700,
      padding:       '3px 8px',
      borderRadius:  6,
      textTransform: 'uppercase' as const,
      letterSpacing: '0.05em',
      flexShrink:    0,
    }}>
      {s.label}
    </span>
  )
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
}: HeroCardProps) {
  const router = useRouter()

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
          const dimMap: Record<string, string> = {
            churn_spike:              'Revenue Engine',
            aov_decline:              'Revenue Engine',
            repeat_purchase_drop:     'Revenue Engine',
            refund_spike:             'Revenue Engine',
            conversion_fall:          'Growth & Acquisition',
            engagement_drop:          'Growth & Acquisition',
            traffic_source_shift:     'Growth & Acquisition',
            session_duration_drop:    'Growth & Acquisition',
            activation_drop:          'Product-Market Fit',
            nps_decline:              'Customer Health',
            csat_decline:             'Customer Health',
            rating_decline:           'Customer Health',
            repeat_complaint_pattern: 'Customer Health',
            ticket_volume_increase:   'Customer Health',
            response_time_increase:   'Customer Health',
            velocity_drop:            'Execution Capacity',
            cycle_time_increase:      'Execution Capacity',
            bug_backlog_growth:       'Execution Capacity',
            blocked_tickets_spike:    'Execution Capacity',
          }
          return dimMap[s] ?? null
        })
        .filter((d): d is string => d !== null && d !== status.label)
        .filter((d, i, arr) => arr.indexOf(d) === i)
    : []

  return (
    <div style={{
      background:   '#FFFFFF',
      border:       `2px solid ${status.color}`,
      borderRadius: 20,
      padding:      '32px 36px',
      boxShadow:    '0 4px 24px rgba(0,0,0,0.06)',
    }}>

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
            Primary Focus
          </p>
          <h2 style={{ fontSize: 26, fontWeight: 900, color: '#111827', margin: '0 0 4px' }}>
            {status.label}
          </h2>
          <p style={{ fontSize: 12, color: '#9CA3AF', margin: 0, fontStyle: 'italic' }}>
            {getWhyPrimary(founderStage, focusMetric)}
          </p>
        </div>

        {/* Score */}
        {status.state === 'active' && (
          <div style={{ textAlign: 'right' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, justifyContent: 'flex-end' }}>
              <span style={{ fontSize: 64, fontWeight: 900, color: getScoreColor(status.score), lineHeight: 1 }}>
                {status.score === -1 ? '—' : status.score}
              </span>
              {status.score !== -1 && (
                <span style={{ fontSize: 18, color: '#9CA3AF' }}>/100</span>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'flex-end', marginTop: 4 }}>
              <span style={{ fontSize: 20, color: getTrendColor(status.trend), fontWeight: 700 }}>
                {getTrendArrow(status.trend)}
              </span>
              <span style={{ fontSize: 13, color: getTrendColor(status.trend), fontWeight: 600 }}>
                {status.trend === 'improving'  ? 'Improving'  :
                 status.trend === 'worsening'  ? 'Worsening'  :
                 status.trend === 'unchanged'  ? 'Stable'     : ''}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Divider */}
      <div style={{ height: 1, background: '#F3F4F6', margin: '20px 0' }} />

      {/* ── STATE: LOCKED ── */}
      {status.state === 'locked' && (
        <div style={{ textAlign: 'center', padding: '16px 0 8px' }}>
          <p style={{ fontSize: 32, marginBottom: 12 }}>🔒</p>
          <p style={{ fontSize: 15, fontWeight: 600, color: '#111827', marginBottom: 8 }}>
            {status.label} not yet activated
          </p>
          <p style={{ fontSize: 14, color: '#6B7280', marginBottom: 24, lineHeight: 1.6 }}>
            {status.unlockText}
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
            {status.ctaText} →
          </a>
        </div>
      )}

      {/* ── STATE: PENDING ── */}
      {status.state === 'pending' && (
        <div style={{ textAlign: 'center', padding: '16px 0 8px' }}>
          <p style={{ fontSize: 32, marginBottom: 12 }}>⏳</p>
          <p style={{ fontSize: 15, fontWeight: 600, color: '#111827', marginBottom: 8 }}>
            Tools connected — scan needed
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
            Run first scan →
          </button>
        </div>
      )}

      {/* ── STATE: HEALTHY ── */}
      {status.state === 'healthy' && (
        <div style={{ textAlign: 'center', padding: '16px 0 8px' }}>
          <p style={{ fontSize: 32, marginBottom: 12 }}>✅</p>
          <p style={{ fontSize: 15, fontWeight: 600, color: '#10B981', marginBottom: 8 }}>
            {status.label} is healthy
          </p>
          <p style={{ fontSize: 14, color: '#6B7280', lineHeight: 1.6 }}>
            {status.healthyText}
          </p>
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
            What's driving this
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
                <SeverityBadge severity={signal.severity} />
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 14, fontWeight: 600, color: '#111827', margin: '0 0 4px' }}>
                    {signal.insight_summary}
                  </p>
                  <p style={{ fontSize: 12, color: '#6B7280', margin: 0 }}>
                    → {signal.recommended_action}
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
              Chain alert
            </p>
            <p style={{ fontSize: 13, color: '#92400E', margin: 0 }}>
              {dependencyAlert}. Fix this first — it's putting{' '}
              <strong>{downstreamDimensions.join(' and ')}</strong> at risk.
            </p>
          </div>
        </div>
      )}

      {/* ── CTA row (active state only) ── */}
      {status.state === 'active' && (
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
            See all {status.shortLabel} signals →
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
            See action plan
          </button>
        </div>
      )}
    </div>
  )
}