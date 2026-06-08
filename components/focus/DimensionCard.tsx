'use client'

import { DimensionConfig, DimensionState } from '@/lib/gravity-engine'

interface DimensionCardProps {
  config:    DimensionConfig
  score:     number
  state:     DimensionState
  trend:     'improving' | 'worsening' | 'unchanged' | null
  isHero?:   boolean
  onClick?:  () => void
}

function getScoreLabel(score: number): { label: string; color: string } {
  if (score === -1) return { label: 'No data',        color: '#9CA3AF' }
  if (score >= 70)  return { label: 'Healthy',         color: '#10B981' }
  if (score >= 40)  return { label: 'Needs attention', color: '#F59E0B' }
  return               { label: 'Critical',         color: '#EF4444' }
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

export default function DimensionCard({
  config,
  score,
  state,
  trend,
  isHero,
  onClick,
}: DimensionCardProps) {
  const { label, color: scoreColor } = getScoreLabel(score)
  const isDormant  = state === 'dormant'
  const opacity    = isDormant ? 0.35 : 1

  if (isHero) {
    // Hero card — large, full detail
    return (
      <div
        onClick={onClick}
        style={{
          background:    '#FFFFFF',
          border:        `2px solid ${isDormant ? '#E5E7EB' : config.color}`,
          borderRadius:  16,
          padding:       '28px 32px',
          cursor:        onClick ? 'pointer' : 'default',
          opacity,
          transition:    'all 0.3s ease',
          position:      'relative',
        }}
      >

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <span style={{ fontSize: 28 }}>{config.icon}</span>
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, color: config.color, letterSpacing: '0.12em', textTransform: 'uppercase', margin: 0 }}>
              PRIMARY FOCUS
            </p>
            <h2 style={{ fontSize: 22, fontWeight: 800, color: '#111827', margin: 0 }}>
              {config.label}
            </h2>
          </div>
        </div>

        {/* Score row */}
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 8 }}>
          <span style={{ fontSize: 56, fontWeight: 900, color: isDormant ? '#9CA3AF' : scoreColor, lineHeight: 1 }}>
            {isDormant ? '—' : score === -1 ? '—' : score}
          </span>
          {!isDormant && score !== -1 && (
            <>
              <span style={{ fontSize: 16, color: '#9CA3AF' }}>/100</span>
              <span style={{ fontSize: 22, color: getTrendColor(trend), fontWeight: 700 }}>
                {getTrendArrow(trend)}
              </span>
            </>
          )}
        </div>

        {/* Label */}
        <p style={{ fontSize: 14, fontWeight: 600, color: isDormant ? '#9CA3AF' : scoreColor, marginBottom: 8 }}>
          {isDormant ? 'Activates as you scale' : label}
        </p>

        {/* Description */}
        <p style={{ fontSize: 13, color: '#6B7280', margin: 0, lineHeight: 1.6 }}>
          {isDormant
            ? 'This dimension becomes your primary focus as revenue comes in. Connect tools to activate.'
            : config.description
          }
        </p>
      </div>
    )
  }

  // Compact card — secondary dimensions
  return (
    <div
      onClick={onClick}
      style={{
        background:   '#FFFFFF',
        border:       `1.5px solid ${isDormant ? '#F3F4F6' : '#E5E7EB'}`,
        borderRadius: 12,
        padding:      '16px 20px',
        cursor:       onClick ? 'pointer' : 'default',
        opacity,
        transition:   'all 0.2s ease',
        display:      'flex',
        alignItems:   'center',
        gap:          14,
      }}
      onMouseEnter={e => { if (!isDormant) (e.currentTarget as HTMLDivElement).style.borderColor = config.color }}
      onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = isDormant ? '#F3F4F6' : '#E5E7EB' }}
    >
      {/* Icon */}
      <span style={{ fontSize: 20, flexShrink: 0 }}>{config.icon}</span>

      {/* Label + description */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 13, fontWeight: 700, color: isDormant ? '#9CA3AF' : '#111827', margin: '0 0 2px' }}>
          {config.shortLabel}
        </p>
        <p style={{ fontSize: 11, color: '#9CA3AF', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {isDormant ? 'Activates as you scale' : config.description}
        </p>
      </div>

      {/* Score */}
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <p style={{ fontSize: 20, fontWeight: 800, color: isDormant ? '#9CA3AF' : scoreColor, margin: '0 0 2px' }}>
          {isDormant ? '—' : score === -1 ? '—' : score}
        </p>
        <p style={{ fontSize: 11, color: getTrendColor(trend), margin: 0, fontWeight: 600 }}>
          {getTrendArrow(trend)} {isDormant ? '' : label}
        </p>
      </div>
    </div>
  )
}