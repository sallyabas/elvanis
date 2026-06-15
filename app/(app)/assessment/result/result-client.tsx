'use client'

import { useState } from 'react'

// ── PriorityCard ─────────────────────────────────────────────
interface RoadmapItem {
  priority:  number
  action:    string
  dimension: string
  timeframe: string
  effort:    string
  impact:    string
}

interface PriorityItem {
  priority:  number
  action:    string
  dimension: string
  reason:    string
  timeframe: string
  effort:    string
  impact:    string
  roadmap?:  RoadmapItem
}

interface PriorityCardProps {
  item: PriorityItem
  lang: string
  labels: {
    detailsExpand:   string
    detailsCollapse: string
    implSteps:       string
    effortLow:       string
    effortMedium:    string
    effortHigh:      string
    effortLabel:     string
  }
}

export function PriorityCard({ item, lang, labels }: PriorityCardProps) {
  const [expanded, setExpanded] = useState(false)
  const isAr = lang === 'ar'

  const effortColor = item.effort === 'low' ? '#059669' : item.effort === 'medium' ? '#D97706' : '#DC2626'
  const impactColor = item.impact === 'high' ? '#2563EB' : item.impact === 'medium' ? '#7C3AED' : '#6B7280'

  return (
    <div
      dir={isAr ? 'rtl' : 'ltr'}
      style={{
        background:   '#fff',
        border:       '1px solid #E5E7EB',
        borderRadius: 14,
        overflow:     'hidden',
        marginBottom: 12,
      }}
    >
      {/* Card header */}
      <div style={{ padding: '16px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
          {/* Priority number */}
          <div style={{
            width:          32,
            height:         32,
            borderRadius:   '50%',
            background:     '#2563EB',
            color:          '#fff',
            fontSize:       14,
            fontWeight:     800,
            display:        'flex',
            alignItems:     'center',
            justifyContent: 'center',
            flexShrink:     0,
          }}>
            {item.priority}
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 15, fontWeight: 700, color: '#111827', margin: '0 0 6px' }}>
              {item.action}
            </p>
            <p style={{ fontSize: 13, color: '#6B7280', margin: '0 0 10px', lineHeight: 1.5 }}>
              {item.reason}
            </p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: '#F3F4F6', color: '#374151', fontWeight: 600 }}>
                ⏱ {item.timeframe}
              </span>
              <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: '#F3F4F6', color: effortColor, fontWeight: 600 }}>
              {labels.effortLabel} {item.effort === 'low' ? labels.effortLow : item.effort === 'medium' ? labels.effortMedium : labels.effortHigh}
              </span>
              <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: '#EFF6FF', color: impactColor, fontWeight: 600 }}>
                ↑ {item.impact}
              </span>
            </div>
          </div>
          {/* Expand toggle */}
          {item.roadmap && (
            <button
              onClick={() => setExpanded(e => !e)}
              style={{
                background:   'none',
                border:       '1px solid #E5E7EB',
                borderRadius: 8,
                padding:      '4px 10px',
                fontSize:     12,
                color:        '#6B7280',
                cursor:       'pointer',
                fontFamily:   'inherit',
                flexShrink:   0,
              }}
            >
              {expanded ? '▲' : '▼'} {expanded ? labels.detailsCollapse : labels.detailsExpand}
            </button>
          )}
        </div>
      </div>

      {/* Expanded roadmap details */}
      {expanded && item.roadmap && (
        <div style={{
          padding:    '14px 20px',
          background: '#F9FAFB',
          borderTop:  '1px solid #E5E7EB',
        }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 8px' }}>
          {labels.implSteps}
          </p>
          <p style={{ fontSize: 13, color: '#374151', margin: 0, lineHeight: 1.6 }}>
            {item.roadmap.action}
          </p>
        </div>
      )}
    </div>
  )
}

// ── CausalChainCard ──────────────────────────────────────────
interface CausalChain {
  chain_name:          string
  cause_dimension:     string
  cause_signal:        string
  symptom_dimensions:  string[]
  fix_order:           string
  causeLabel:          string
  symptomLabels:       string[]
}

interface CausalChainCardProps {
  chain: CausalChain
  lang:  string
  labels: {
    signalLabel:   string
    fixOrderLabel: string
  }
}

export function CausalChainCard({ chain, lang, labels }: CausalChainCardProps) {
  const [expanded, setExpanded] = useState(false)
  const isAr = lang === 'ar'

  return (
    <div
      dir={isAr ? 'rtl' : 'ltr'}
      style={{
        background:   '#fff',
        border:       '1px solid #E5E7EB',
        borderRadius: 14,
        overflow:     'hidden',
        marginBottom: 12,
      }}
    >
      <div
        onClick={() => setExpanded(e => !e)}
        style={{
          padding:  '14px 20px',
          cursor:   'pointer',
          display:  'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
        }}
      >
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 14, fontWeight: 700, color: '#111827', margin: '0 0 4px' }}>
            ⚡ {chain.chain_name}
          </p>
          <p style={{ fontSize: 12, color: '#6B7280', margin: 0 }}>
            {chain.causeLabel} → {chain.symptomLabels.join(', ')}
          </p>
        </div>
        <span style={{ fontSize: 12, color: '#9CA3AF', flexShrink: 0 }}>
          {expanded ? '▲' : '▼'}
        </span>
      </div>

      {expanded && (
        <div style={{
          padding:    '14px 20px',
          background: '#FFF7ED',
          borderTop:  '1px solid #FDE68A',
        }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: '#92400E', margin: '0 0 6px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          {labels.signalLabel}
          </p>
          <p style={{ fontSize: 13, color: '#374151', margin: '0 0 12px', lineHeight: 1.5 }}>
            {chain.cause_signal}
          </p>
          <p style={{ fontSize: 12, fontWeight: 700, color: '#92400E', margin: '0 0 6px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          {labels.fixOrderLabel}
          </p>
          <p style={{ fontSize: 13, color: '#374151', margin: 0, lineHeight: 1.5 }}>
            {chain.fix_order}
          </p>
        </div>
      )}
    </div>
  )
}
