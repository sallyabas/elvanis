'use client'

import { useState, useEffect } from 'react'
import { DimensionId, DIMENSIONS } from '@/lib/gravity-engine'

interface RevealAnimationProps {
  onComplete: () => void
}

const SCAN_MESSAGES = [
  { id: 'revenue'  as DimensionId, delay: 400  },
  { id: 'customer' as DimensionId, delay: 800  },
  { id: 'marketing'as DimensionId, delay: 1200 },
  { id: 'team'     as DimensionId, delay: 1600 },
  { id: 'product'  as DimensionId, delay: 2000 },
  { id: 'strategy' as DimensionId, delay: 2400 },
]

export default function RevealAnimation({ onComplete }: RevealAnimationProps) {
  const [phase,    setPhase]    = useState<'scanning' | 'scores' | 'reveal'>('scanning')
  const [visible,  setVisible]  = useState<DimensionId[]>([])
  const [opacity,  setOpacity]  = useState(1)

  useEffect(() => {
    // Phase 1 — show dimensions one by one
    SCAN_MESSAGES.forEach(({ id, delay }) => {
      setTimeout(() => {
        setVisible(v => [...v, id])
      }, delay)
    })

    // Phase 2 — show scores
    setTimeout(() => setPhase('scores'), 2800)

    // Phase 3 — fade out and reveal
    setTimeout(() => setPhase('reveal'), 3400)
    setTimeout(() => setOpacity(0), 3600)
    setTimeout(() => onComplete(), 4000)
  }, [onComplete])

  return (
    <div style={{
      position:        'fixed',
      inset:           0,
      background:      '#0F172A',
      display:         'flex',
      flexDirection:   'column',
      alignItems:      'center',
      justifyContent:  'center',
      zIndex:          1000,
      opacity,
      transition:      'opacity 0.4s ease',
      fontFamily:      'Inter, -apple-system, sans-serif',
    }}>

      {/* Header */}
      <p style={{
        fontSize:      11,
        fontWeight:    700,
        color:         '#2563EB',
        letterSpacing: '0.2em',
        textTransform: 'uppercase',
        marginBottom:  48,
      }}>
        {phase === 'reveal' ? '✓ Diagnostic complete' : '⚡ Running diagnostic'}
      </p>

      {/* Dimension list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, minWidth: 320 }}>
        {SCAN_MESSAGES.map(({ id }) => {
          const isVisible = visible.includes(id)
          const dim       = DIMENSIONS[id]

          return (
            <div
              key={id}
              style={{
                display:    'flex',
                alignItems: 'center',
                gap:        16,
                opacity:    isVisible ? 1 : 0,
                transform:  isVisible ? 'translateX(0)' : 'translateX(-20px)',
                transition: 'all 0.4s ease',
              }}
            >
              {/* Icon */}
              <span style={{ fontSize: 20, width: 28, textAlign: 'center' }}>
                {isVisible ? dim.icon : '○'}
              </span>

              {/* Label */}
              <span style={{
                fontSize:   15,
                fontWeight: 600,
                color:      isVisible ? '#FFFFFF' : '#374151',
                flex:       1,
              }}>
                {dim.label}
              </span>

              {/* Status */}
              <span style={{
                fontSize:   12,
                color:      phase === 'scores' || phase === 'reveal' ? '#10B981' : '#3B82F6',
                fontWeight: 600,
              }}>
                {!isVisible
                  ? ''
                  : phase === 'scores' || phase === 'reveal'
                    ? '✓ Read'
                    : 'Reading...'}
              </span>
            </div>
          )
        })}
      </div>

      {/* Bottom message */}
      {phase === 'reveal' && (
        <p style={{
          marginTop:  48,
          fontSize:   14,
          color:      '#6B7280',
          textAlign:  'center',
          animation:  'fadeIn 0.5s ease forwards',
        }}>
          Your business is now live on Elvanis
        </p>
      )}

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px) }
          to   { opacity: 1; transform: translateY(0) }
        }
      `}</style>
    </div>
  )
}