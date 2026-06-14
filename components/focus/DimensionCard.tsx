'use client'

import { DimensionStatus } from '@/lib/dimension-status'
import { useT } from '@/app/context/LanguageContext'

interface DimensionCardProps {
  status:  DimensionStatus
  onClick: () => void
}

function getScoreLabel(score: number): { label: string; color: string } {
  if (score === -1) return { label: 'No data',        color: '#9CA3AF' }
  if (score >= 70)  return { label: 'Healthy',         color: '#10B981' }
  if (score >= 40)  return { label: 'Needs attention', color: '#F59E0B' }
  return               { label: 'Critical',         color: '#EF4444' }
}

function getTrendArrow(trend: string | null): string {
  if (trend === 'improving') return '↑'
  if (trend === 'worsening') return '↓'
  if (trend === 'unchanged') return '→'
  return ''
}

function getTrendColor(trend: string | null): string {
  if (trend === 'improving') return '#10B981'
  if (trend === 'worsening') return '#EF4444'
  return '#9CA3AF'
}

export default function DimensionCard({ status, onClick }: DimensionCardProps) {
  const t = useT()
  const SCORE_LABELS: Record<string, { label: string; color: string }> = {
    no_data:   { label: t('focus.score_no_data'),   color: '#9CA3AF' },
    healthy:   { label: t('focus.score_healthy'),   color: '#10B981' },
    attention: { label: t('focus.score_attention'), color: '#F59E0B' },
    critical:  { label: t('focus.score_critical'),  color: '#EF4444' },
  }
  const getScoreLabelT = (score: number) => {
    if (score === -1) return SCORE_LABELS.no_data
    if (score >= 70)  return SCORE_LABELS.healthy
    if (score >= 40)  return SCORE_LABELS.attention
    return SCORE_LABELS.critical
  }
  const { label, color: scoreColor } = getScoreLabelT(status.score)
  const isDormant = status.state === 'locked' && !status.isReconnect
  const opacity   = isDormant ? 0.5 : 1

  return (
    <div
      onClick={onClick}
      title={status.description}
      style={{
        background:   '#FFFFFF',
        border:       `1.5px solid ${isDormant ? '#F3F4F6' : '#E5E7EB'}`,
        borderRadius: 12,
        padding:      '16px 20px',
        cursor:       'pointer',
        opacity,
        transition:   'all 0.2s ease',
        display:      'flex',
        alignItems:   'center',
        gap:          14,
      }}
      onMouseEnter={e => {
        if (!isDormant)
          (e.currentTarget as HTMLDivElement).style.borderColor = status.color
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLDivElement).style.borderColor =
          isDormant ? '#F3F4F6' : '#E5E7EB'
      }}
    >
      {/* Icon */}
      <span style={{ fontSize: 20, flexShrink: 0 }}>{status.icon}</span>

      {/* Label + state description */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{
          fontSize:   13,
          fontWeight: 700,
          color:      isDormant ? '#9CA3AF' : '#111827',
          margin:     '0 0 2px',
        }}>
          {status.shortLabel}
        </p>
        <p style={{
          fontSize:     11,
          color:        '#9CA3AF',
          margin:       0,
          whiteSpace:   'nowrap',
          overflow:     'hidden',
          textOverflow: 'ellipsis',
        }}>
          {status.state === 'locked'  ? (status.isReconnect ? t('focus.state_reconnect') : status.ctaText) :
           status.state === 'pending' ? t('focus.state_scan_needed')   :
           status.state === 'healthy' ? t('focus.state_no_issues')     :
           status.state === 'assessment_only' ? t('focus.state_assessment') :
           status.description}
        </p>
      </div>

      {/* Score + trend */}
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <p style={{
          fontSize:   20,
          fontWeight: 800,
          color:      isDormant ? '#9CA3AF' : scoreColor,
          margin:     '0 0 2px',
        }}>
          {isDormant            ? '—' :
           status.score === -1  ? '—' :
           status.state === 'healthy' ? '✓' :
           status.state === 'assessment_only' ? `${status.score}*` :
           status.score}
        </p>
        <p style={{
          fontSize:   11,
          color:      isDormant ? '#9CA3AF' : getTrendColor(status.trend),
          margin:     0,
          fontWeight: 600,
        }}>
           {isDormant ? (status.isReconnect ? status.hadSourceIcons.join(' ') : '') :
           status.state === 'healthy' ? t('focus.score_healthy') :
           status.state === 'pending' ? t('focus.state_pending') :
           status.state === 'assessment_only' ? t('focus.state_provisional') :
           status.state === 'active' && status.sourceIcons.length > 0
            ? `${getTrendArrow(status.trend)} ${status.sourceIcons.join(' ')}`
            : `${getTrendArrow(status.trend)} ${label}`}
        </p>
      </div>
    </div>
  )
}