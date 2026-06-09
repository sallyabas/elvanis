'use client'

import { DimensionStatus } from '@/lib/dimension-status'

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
  const { label, color: scoreColor } = getScoreLabel(status.score)
  const isDormant = status.state === 'locked'
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
          {status.state === 'locked'  ? status.ctaText  :
           status.state === 'pending' ? 'Scan needed'   :
           status.state === 'healthy' ? '✓ No issues'   :
           status.state === 'assessment_only' ? '📋 Assessment only'  :
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
          {isDormant ? '' :
           status.state === 'healthy' ? 'Healthy' :
           status.state === 'pending' ? 'Pending' :
           status.state === 'assessment_only' ? 'Provisional' :
           `${getTrendArrow(status.trend)} ${label}`}
        </p>
      </div>
    </div>
  )
}