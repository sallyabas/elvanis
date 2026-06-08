'use client'

import { useState, useEffect, useRef } from 'react'
import { FocusMetric } from '@/lib/gravity-engine'

interface FocusChangerProps {
  focusMetric:   FocusMetric | null
  onFocusChange: (metric: FocusMetric) => void
}

const FOCUS_OPTIONS: {
  value: FocusMetric
  label: string
  icon:  string
  desc:  string
}[] = [
  { value: 'growth',    label: 'Accelerate Growth',   icon: '📈', desc: 'Revenue, conversion, new customers'       },
  { value: 'retention', label: 'Maximise Retention',  icon: '🔄', desc: 'Churn, NPS, satisfaction, LTV'            },
  { value: 'ops',       label: 'Optimise Operations', icon: '⚙️', desc: 'Ticket volume, response time, efficiency'  },
  { value: 'delivery',  label: 'Boost Delivery',      icon: '⚡', desc: 'Velocity, cycle time, bug backlog'        },
]

const TOOLTIP_TEXT =
  'Your focus metric tells Elvanis which business outcome matters most right now. ' +
  'It determines which dimension appears as your primary focus and how signals are weighted.'

export default function FocusChanger({
  focusMetric,
  onFocusChange,
}: FocusChangerProps) {
  const [open,        setOpen]        = useState(false)
  const [showTooltip, setShowTooltip] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const current = FOCUS_OPTIONS.find(f => f.value === focusMetric)

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>

      {/* ── Info tooltip ── */}
      <div style={{ position: 'relative' }}>
        <button
          onMouseEnter={() => setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
          style={{
            background:   'none',
            border:       'none',
            cursor:       'pointer',
            fontSize:     13,
            color:        '#9CA3AF',
            padding:      '4px',
            lineHeight:   1,
            fontFamily:   'inherit',
          }}
        >
          ?
        </button>
        {showTooltip && (
          <div style={{
            position:     'absolute',
            top:          'calc(100% + 8px)',
            right:        0,
            background:   '#111827',
            color:        '#F9FAFB',
            fontSize:     12,
            lineHeight:   1.6,
            padding:      '10px 14px',
            borderRadius: 8,
            width:        260,
            zIndex:       300,
            boxShadow:    '0 4px 16px rgba(0,0,0,0.2)',
          }}>
            {TOOLTIP_TEXT}
          </div>
        )}
      </div>

      {/* ── Focus dropdown ── */}
      <div ref={ref} style={{ position: 'relative' }}>
        <button
          onClick={() => setOpen(o => !o)}
          style={{
            background:   focusMetric ? '#F9FAFB' : '#EFF6FF',
            border:       `1px solid ${focusMetric ? '#E5E7EB' : '#BFDBFE'}`,
            borderRadius: 8,
            padding:      '6px 12px',
            fontSize:     12,
            color:        focusMetric ? '#374151' : '#2563EB',
            cursor:       'pointer',
            display:      'flex',
            alignItems:   'center',
            gap:          6,
            fontFamily:   'inherit',
            fontWeight:   focusMetric ? 400 : 600,
          }}
        >
          {focusMetric ? (
            <>
              <span>{current?.icon}</span>
              <span>Focus: {current?.label}</span>
            </>
          ) : (
            <span>Set your focus →</span>
          )}
          <span style={{ color: '#9CA3AF', fontSize: 10 }}>
            {open ? '▲' : '▼'}
          </span>
        </button>

        {open && (
          <div style={{
            position:     'absolute',
            top:          'calc(100% + 8px)',
            right:        0,
            background:   '#FFFFFF',
            border:       '1px solid #E5E7EB',
            borderRadius: 12,
            boxShadow:    '0 4px 24px rgba(0,0,0,0.10)',
            padding:      8,
            zIndex:       200,
            minWidth:     260,
          }}>
            <p style={{
              fontSize:      11,
              color:         '#9CA3AF',
              fontWeight:    700,
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              padding:       '4px 8px',
              margin:        '0 0 4px',
            }}>
              {focusMetric ? 'Change primary focus' : 'Set your primary focus'}
            </p>
            {FOCUS_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => { onFocusChange(opt.value); setOpen(false) }}
                style={{
                  display:      'flex',
                  alignItems:   'center',
                  gap:          10,
                  width:        '100%',
                  padding:      '10px 12px',
                  background:   focusMetric === opt.value ? '#EFF6FF' : 'none',
                  border:       'none',
                  borderRadius: 8,
                  cursor:       'pointer',
                  fontSize:     13,
                  color:        '#374151',
                  textAlign:    'left' as const,
                  fontFamily:   'inherit',
                }}
                onMouseEnter={e => {
                  if (focusMetric !== opt.value)
                    (e.currentTarget.style.background = '#F9FAFB')
                }}
                onMouseLeave={e => {
                  if (focusMetric !== opt.value)
                    (e.currentTarget.style.background = 'none')
                }}
              >
                <span style={{ fontSize: 18 }}>{opt.icon}</span>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: '#111827', margin: 0 }}>
                    {opt.label}
                  </p>
                  <p style={{ fontSize: 11, color: '#9CA3AF', margin: 0 }}>
                    {opt.desc}
                  </p>
                </div>
                {focusMetric === opt.value && (
                  <span style={{ color: '#2563EB', fontSize: 14 }}>✓</span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}