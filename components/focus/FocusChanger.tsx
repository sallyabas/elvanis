'use client'

import { useState, useEffect, useRef } from 'react'
import { FocusMetric } from '@/lib/gravity-engine'

interface FocusChangerProps {
  focusMetric:   FocusMetric | null
  onFocusChange: (metric: FocusMetric) => void
}

const FOCUS_OPTIONS: { value: FocusMetric; label: string; icon: string; desc: string }[] = [
  { value: 'growth',    label: 'Accelerate Growth',   icon: '📈', desc: 'Revenue, conversion, new customers'      },
  { value: 'retention', label: 'Maximise Retention',  icon: '🔄', desc: 'Churn, NPS, satisfaction, LTV'           },
  { value: 'ops',       label: 'Optimise Operations', icon: '⚙️', desc: 'Ticket volume, response time, efficiency' },
  { value: 'delivery',  label: 'Boost Delivery',      icon: '⚡', desc: 'Velocity, cycle time, bug backlog'       },
]

export default function FocusChanger({ focusMetric, onFocusChange }: FocusChangerProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const current = FOCUS_OPTIONS.find(f => f.value === focusMetric)

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          background:   '#F9FAFB',
          border:       '1px solid #E5E7EB',
          borderRadius: 8,
          padding:      '6px 12px',
          fontSize:     12,
          color:        '#374151',
          cursor:       'pointer',
          display:      'flex',
          alignItems:   'center',
          gap:          6,
          fontFamily:   'inherit',
        }}
      >
        <span>{current?.icon ?? '🎯'}</span>
        <span>Focus: {current?.label ?? 'Not set'}</span>
        <span style={{ color: '#9CA3AF' }}>{open ? '▲' : '▼'}</span>
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
          <p style={{ fontSize: 11, color: '#9CA3AF', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', padding: '4px 8px', margin: '0 0 4px' }}>
            Change primary focus
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
              onMouseEnter={e => { if (focusMetric !== opt.value) (e.currentTarget.style.background = '#F9FAFB') }}
              onMouseLeave={e => { if (focusMetric !== opt.value) (e.currentTarget.style.background = 'none') }}
            >
              <span style={{ fontSize: 18 }}>{opt.icon}</span>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: '#111827', margin: 0 }}>{opt.label}</p>
                <p style={{ fontSize: 11, color: '#9CA3AF', margin: 0 }}>{opt.desc}</p>
              </div>
              {focusMetric === opt.value && (
                <span style={{ color: '#2563EB', fontSize: 14 }}>✓</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}