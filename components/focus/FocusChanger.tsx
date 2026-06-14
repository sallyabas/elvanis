'use client'

import { useState, useEffect, useRef } from 'react'
import { FocusMetric } from '@/lib/gravity-engine'
import { useT } from '@/app/context/LanguageContext'

interface FocusChangerProps {
  focusMetric:   FocusMetric | null
  onFocusChange: (metric: FocusMetric) => void
}


const TOOLTIP_TEXT =
  'Your focus metric tells Elvanis which business outcome matters most right now. ' +
  'It determines which dimension appears as your primary focus and how signals are weighted.'

export default function FocusChanger({
  focusMetric,
  onFocusChange,
}: FocusChangerProps) {
  const t = useT()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const FOCUS_OPTIONS: { value: FocusMetric; label: string; icon: string; desc: string }[] = [
    { value: 'growth',    label: t('profile.focus_growth'),    icon: '📈', desc: t('onboarding.focus_growth_desc')    },
    { value: 'retention', label: t('profile.focus_retention'), icon: '🔄', desc: t('onboarding.focus_retention_desc') },
    { value: 'ops',       label: t('profile.focus_ops'),       icon: '⚙️', desc: t('onboarding.focus_ops_desc')       },
    { value: 'delivery',  label: t('profile.focus_delivery'),  icon: '⚡', desc: t('onboarding.focus_delivery_desc')  },
  ]

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
<button
  title={TOOLTIP_TEXT}
  style={{
    background: 'none',
    border:     'none',
    cursor:     'help',
    fontSize:   13,
    color:      '#9CA3AF',
    padding:    '4px',
    lineHeight: 1,
    fontFamily: 'inherit',
  }}
>
  ?
</button>

      {/* ── Focus dropdown ── */}
      <div ref={ref} style={{ position: 'relative' }}>
        <button
          onClick={() => setOpen(o => !o)}
          style={{
            background:   focusMetric ? '#EFF6FF' : '#2563EB',
            border:       `1.5px solid ${focusMetric ? '#2563EB' : '#1D4ED8'}`,
            borderRadius: 20,
            padding:      '6px 14px',
            fontSize:     12,
            color:        focusMetric ? '#1D4ED8' : '#FFFFFF',
            cursor:       'pointer',
            display:      'flex',
            alignItems:   'center',
            gap:          6,
            fontFamily:   'inherit',
            fontWeight:   600,
            transition:   'all 0.2s ease',
            boxShadow:    focusMetric ? '0 0 0 3px rgba(37,99,235,0.12)' : 'none',
          }}
        >

          { focusMetric ? (
            <>
              <span>{current?.icon}</span>
              <span>{t('focus.focus_prefix')} {current?.label}</span>
            </>
          ) : (
            <span>{t('focus.set_focus')}</span>
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
             {focusMetric ? t('focus.change_focus') : t('focus.set_primary')}
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
                  cursor: 'pointer',
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