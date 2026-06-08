'use client'

import { DimensionId, DimensionConfig, DIMENSIONS } from '@/lib/gravity-engine'
import { SIGNAL_DEPENDENCY_MAP, getDependencyAlertText, SignalType } from '@/lib/signal-dependency-map'
import { useRouter } from 'next/navigation'

interface Signal {
  id:                string
  signal_type:       string
  severity:          string
  insight_summary:   string
  recommended_action:string
  value:             number | null
  trend:             string | null
  scan_count:        number
}

interface HeroCardProps {
  dimensionId:      DimensionId
  score:            number
  trend:            'improving' | 'worsening' | 'unchanged' | null
  signals:          Signal[]
  allSignalTypes:   string[]
}

function SeverityBadge({ severity }: { severity: string }) {
  const map: Record<string, { bg: string; color: string; label: string }> = {
    critical: { bg: '#FEF2F2', color: '#DC2626', label: 'Critical'  },
    warning:  { bg: '#FFFBEB', color: '#D97706', label: 'Warning'   },
    watch:    { bg: '#F0FDF4', color: '#059669', label: 'Watch'     },
  }
  const style = map[severity] ?? map.watch
  return (
    <span style={{
      background:   style.bg,
      color:        style.color,
      fontSize:     11,
      fontWeight:   700,
      padding:      '3px 8px',
      borderRadius: 6,
      textTransform:'uppercase' as const,
      letterSpacing:'0.05em',
    }}>
      {style.label}
    </span>
  )
}

function getScoreColor(score: number): string {
  if (score === -1) return '#9CA3AF'
  if (score >= 70)  return '#10B981'
  if (score >= 40)  return '#F59E0B'
  return '#EF4444'
}

function getTrendArrow(trend: string | null): string {
  if (trend === 'improving')  return '↑'
  if (trend === 'worsening')  return '↓'
  if (trend === 'unchanged')  return '→'
  return ''
}

function getTrendColor(trend: string | null): string {
  if (trend === 'improving') return '#10B981'
  if (trend === 'worsening') return '#EF4444'
  return '#9CA3AF'
}

export default function HeroCard({
  dimensionId,
  score,
  trend,
  signals,
  allSignalTypes,
}: HeroCardProps) {
  const router  = useRouter()
  const config  = DIMENSIONS[dimensionId]
  const scoreColor = getScoreColor(score)

  // Top 2 signals by severity
  const severityOrder = { critical: 0, warning: 1, watch: 2 }
  const topSignals = [...signals]
    .filter(s => s.signal_type)
    .sort((a, b) =>
      (severityOrder[a.severity as keyof typeof severityOrder] ?? 3) -
      (severityOrder[b.severity as keyof typeof severityOrder] ?? 3)
    )
    .slice(0, 2)

  // Dependency chain — find most critical downstream risk
  const criticalSignal = topSignals.find(s => s.severity === 'critical') ?? topSignals[0]
  const dependencyAlert = criticalSignal
    ? getDependencyAlertText(criticalSignal.signal_type as SignalType, allSignalTypes)
    : null

  // Which dimensions are at risk downstream
  const downstreamDimensions = criticalSignal
    ? (SIGNAL_DEPENDENCY_MAP[criticalSignal.signal_type as SignalType]?.downstream ?? [])
        .slice(0, 2)
        .map(s => {
          // Find which dimension this signal belongs to — rough mapping
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
        .filter((d): d is string => d !== null && d !== config.label)
        .filter((d, i, arr) => arr.indexOf(d) === i) // deduplicate
    : []

  return (
    <div style={{
      background:   '#FFFFFF',
      border:       `2px solid ${config.color}`,
      borderRadius: 20,
      padding:      '32px 36px',
      position:     'relative',
      boxShadow:    '0 4px 24px rgba(0,0,0,0.06)',
    }}>

      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, marginBottom: 24 }}>
        <span style={{ fontSize: 36, lineHeight: 1 }}>{config.icon}</span>
        <div style={{ flex: 1 }}>
          <p style={{
            fontSize:      11,
            fontWeight:    700,
            color:         config.color,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            margin:        '0 0 4px',
          }}>
            Primary Focus
          </p>
          <h2 style={{ fontSize: 26, fontWeight: 900, color: '#111827', margin: 0 }}>
            {config.label}
          </h2>
        </div>

        {/* Score */}
        <div style={{ textAlign: 'right' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, justifyContent: 'flex-end' }}>
            <span style={{ fontSize: 64, fontWeight: 900, color: scoreColor, lineHeight: 1 }}>
              {score === -1 ? '—' : score}
            </span>
            {score !== -1 && (
              <span style={{ fontSize: 18, color: '#9CA3AF' }}>/100</span>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'flex-end', marginTop: 4 }}>
            <span style={{ fontSize: 20, color: getTrendColor(trend), fontWeight: 700 }}>
              {getTrendArrow(trend)}
            </span>
            <span style={{ fontSize: 13, color: getTrendColor(trend), fontWeight: 600 }}>
              {trend === 'improving'  ? 'Improving'  :
               trend === 'worsening' ? 'Worsening'  :
               trend === 'unchanged' ? 'Stable'     : ''}
            </span>
          </div>
        </div>
      </div>

      {/* Divider */}
      <div style={{ height: 1, background: '#F3F4F6', marginBottom: 24 }} />

      {/* Top signals */}
      {topSignals.length > 0 ? (
        <div style={{ marginBottom: 24 }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>
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
      ) : (
        <div style={{ marginBottom: 24 }}>
          <p style={{ fontSize: 14, color: '#9CA3AF', fontStyle: 'italic' }}>
            No active signals in this dimension. Healthy.
          </p>
        </div>
      )}

      {/* Dependency chain alert */}
      {dependencyAlert && downstreamDimensions.length > 0 && (
        <div style={{
          background:   '#FEF3C7',
          border:       '1px solid #FDE68A',
          borderRadius: 10,
          padding:      '12px 16px',
          marginBottom: 24,
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

      {/* CTA row */}
      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        <button
          onClick={() => router.push(`/signals?dimension=${dimensionId}`)}
          style={{
            padding:      '12px 24px',
            background:   config.color,
            color:        '#FFFFFF',
            border:       'none',
            borderRadius: 10,
            fontSize:     14,
            fontWeight:   700,
            cursor:       'pointer',
            fontFamily:   'inherit',
          }}
        >
          See all {config.shortLabel} signals →
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
    </div>
  )
}