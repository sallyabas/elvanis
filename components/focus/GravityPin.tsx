'use client'

import { useState, useEffect } from 'react'
import { DimensionId, DIMENSIONS } from '@/lib/gravity-engine'

interface GravityPinProps {
  pinnedId:     DimensionId | null
  pinnedAt:     string | null  // ISO timestamp
  onPin:        (id: DimensionId) => void
  onUnpin:      () => void
  orderedIds:   DimensionId[]
}

const PIN_DURATION_DAYS = 7

function getDaysLeft(pinnedAt: string | null): number {
  if (!pinnedAt) return 0
  const pinDate  = new Date(pinnedAt)
  const expiry   = new Date(pinDate.getTime() + PIN_DURATION_DAYS * 24 * 60 * 60 * 1000)
  const now      = new Date()
  const diffMs   = expiry.getTime() - now.getTime()
  return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)))
}

export function usePinnedDimension() {
  const [pinnedId,  setPinnedId]  = useState<DimensionId | null>(null)
  const [pinnedAt,  setPinnedAt]  = useState<string | null>(null)
  const [daysLeft,  setDaysLeft]  = useState(0)

  useEffect(() => {
    // Load from localStorage
    const stored = localStorage.getItem('elvanis_gravity_pin')
    if (stored) {
      try {
        const { id, at } = JSON.parse(stored)
        const left = getDaysLeft(at)
        if (left > 0) {
          setPinnedId(id)
          setPinnedAt(at)
          setDaysLeft(left)
        } else {
          // Expired — clear
          localStorage.removeItem('elvanis_gravity_pin')
        }
      } catch {
        localStorage.removeItem('elvanis_gravity_pin')
      }
    }
  }, [])

  function pin(id: DimensionId) {
    const at = new Date().toISOString()
    setPinnedId(id)
    setPinnedAt(at)
    setDaysLeft(PIN_DURATION_DAYS)
    localStorage.setItem('elvanis_gravity_pin', JSON.stringify({ id, at }))
  }

  function unpin() {
    setPinnedId(null)
    setPinnedAt(null)
    setDaysLeft(0)
    localStorage.removeItem('elvanis_gravity_pin')
  }

  return { pinnedId, pinnedAt, daysLeft, pin, unpin }
}

export default function GravityPin({
  pinnedId,
  pinnedAt,
  onPin,
  onUnpin,
  orderedIds,
}: GravityPinProps) {
  const [open, setOpen] = useState(false)
  const daysLeft = getDaysLeft(pinnedAt)

  if (!pinnedId) {
    return (
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          background:   'none',
          border:       '1px solid #E5E7EB',
          borderRadius: 8,
          padding:      '6px 12px',
          fontSize:     12,
          color:        '#9CA3AF',
          cursor:       'pointer',
          display:      'flex',
          alignItems:   'center',
          gap:          6,
        }}
      >
        📌 Pin a focus
        {open && (
          <span style={{ color: '#6B7280' }}>▲</span>
        )}
        {!open && (
          <span style={{ color: '#6B7280' }}>▼</span>
        )}
      </button>
    )
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{
        background:   '#FEF3C7',
        border:       '1px solid #FDE68A',
        borderRadius: 8,
        padding:      '6px 12px',
        fontSize:     12,
        color:        '#92400E',
        display:      'flex',
        alignItems:   'center',
        gap:          8,
      }}>
        <span>📌</span>
        <span>
          {DIMENSIONS[pinnedId].label} pinned — Gravity resumes in {daysLeft}d
        </span>
        <button
          onClick={onUnpin}
          style={{
            background: 'none',
            border:     'none',
            color:      '#92400E',
            cursor:     'pointer',
            fontSize:   12,
            padding:    0,
            fontWeight: 600,
          }}
        >
          Unpin →
        </button>
      </div>
    </div>
  )
}

// ── Dropdown for pin selection ────────────────────────────────
export function GravityPinDropdown({
  orderedIds,
  onPin,
  onClose,
}: {
  orderedIds: DimensionId[]
  onPin:      (id: DimensionId) => void
  onClose:    () => void
}) {
  return (
    <div style={{
      position:     'absolute',
      top:          '100%',
      left:         0,
      marginTop:    8,
      background:   '#FFFFFF',
      border:       '1px solid #E5E7EB',
      borderRadius: 12,
      boxShadow:    '0 4px 24px rgba(0,0,0,0.08)',
      padding:      8,
      zIndex:       100,
      minWidth:     220,
    }}>
      <p style={{ fontSize: 11, color: '#9CA3AF', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', padding: '4px 8px', margin: '0 0 4px' }}>
        Pin a dimension for 7 days
      </p>
      {orderedIds.map(id => (
        <button
          key={id}
          onClick={() => { onPin(id); onClose() }}
          style={{
            display:      'flex',
            alignItems:   'center',
            gap:          10,
            width:        '100%',
            padding:      '8px 12px',
            background:   'none',
            border:       'none',
            borderRadius: 8,
            cursor:       'pointer',
            fontSize:     13,
            color:        '#374151',
            textAlign:    'left',
          }}
          onMouseEnter={e => (e.currentTarget.style.background = '#F9FAFB')}
          onMouseLeave={e => (e.currentTarget.style.background = 'none')}
        >
          <span>{DIMENSIONS[id].icon}</span>
          <span>{DIMENSIONS[id].label}</span>
        </button>
      ))}
    </div>
  )
}