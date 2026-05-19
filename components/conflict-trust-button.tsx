'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

type ConflictSource = {
  source: string
  value: number | null
  label: string
}

export default function ConflictTrustButton({
  signalType,
  signalInsight,
  sources,
  initialChoice,
  isDeprioritised,
  trustedLabel,
}: {
  signalType: string
  signalInsight: string
  sources: ConflictSource[]
  initialChoice?: string | null
  isDeprioritised?: boolean
  trustedLabel?: string
}) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // isChanging: true when founder clicks "Change" — collapses back to Trust buttons
  // Resets to false when initialChoice changes (after router.refresh())
  const [isChanging, setIsChanging] = useState(false)
  const [localChosen, setLocalChosen] = useState<string | null>(null)

  // When initialChoice updates (after router.refresh), reset isChanging
  // This ensures the green banner shows correctly on both cards
  useEffect(() => {
    setIsChanging(false)
    setLocalChosen(null)
  }, [initialChoice])

  async function handleTrust(source: ConflictSource) {
    setSaving(true)
    setError(null)

    // Derive the conflicting side — the source the founder did NOT choose
    const conflicting = sources.find(s => s.source !== source.source)

    const conflictingValues: Record<string, number | null> = {}
    sources.forEach(s => { conflictingValues[s.source] = s.value })

    try {
      const res = await fetch('/api/signals/resolve-conflict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          signalType,
          signalInsight,
          conflictingSources: sources.map(s => s.source),
          conflictingValues,
          trustedSource: source.source,
          trustedValue: source.value,
          conflictingSource: conflicting?.source ?? null,
          conflictingValue: conflicting?.value ?? null,
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data?.error ?? `Save failed (${res.status})`)
      }

      setLocalChosen(source.source)
      setIsChanging(false)
      router.refresh() // re-runs server component — updates initialChoice on both cards
    } catch (err) {
      console.error('Failed to save conflict preference:', err)
      setError(err instanceof Error ? err.message : 'Failed to save — please try again')
    } finally {
      setSaving(false)
    }
  }

  // Derive display state from props + local state
  // Show green when: initialChoice exists OR just saved locally, AND not currently changing
  const effectiveChoice = localChosen ?? initialChoice ?? null
  const showGreen = !!effectiveChoice && !isChanging

  if (showGreen) {
    const chosenLabel = sources.find(s => s.source === effectiveChoice)?.label ?? effectiveChoice
    const message = isDeprioritised
      ? `✓ ${trustedLabel ?? 'Other source'} preferred — this signal deprioritised`
      : `✓ Trusting ${chosenLabel} — saved for next Action Digest`

    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
        <span style={{
          fontSize: 11, padding: '4px 12px', borderRadius: 20,
          background: '#ECFDF5', color: '#059669', fontWeight: 600,
          display: 'inline-flex', alignItems: 'center', gap: 4,
        }}>
          {message}
        </span>
        <button
          onClick={() => setIsChanging(true)}
          style={{
            fontSize: 11, padding: '3px 10px', borderRadius: 20,
            background: 'transparent', color: '#9CA3AF',
            border: '1px solid #E5E7EB',
            fontWeight: 500, cursor: 'pointer',
          }}
        >
          Change
        </button>
      </div>
    )
  }

  return (
    <div style={{
      background: '#FFFBEB',
      border: '1px solid #FDE68A',
      borderRadius: 10,
      padding: '10px 14px',
      marginBottom: 10,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
        <div>
          <p style={{ fontSize: 12, fontWeight: 700, color: '#92400E', margin: '0 0 2px' }}>
            ⚡ Choose your data source
          </p>
          <p style={{ fontSize: 11, color: '#B45309', margin: 0 }}>
            Your choice will be used in your next Action Digest. Unresolved conflicts default to the tool source.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', flexShrink: 0 }}>
          {sources.map(source => (
            <button
              key={source.source}
              onClick={() => handleTrust(source)}
              disabled={saving}
              style={{
                fontSize: 12,
                padding: '6px 14px',
                borderRadius: 8,
                background: saving ? '#F3F4F6' : '#D97706',
                color: saving ? '#9CA3AF' : '#fff',
                border: 'none',
                fontWeight: 600,
                cursor: saving ? 'not-allowed' : 'pointer',
                whiteSpace: 'nowrap' as const,
              }}
            >
              {saving ? 'Saving...' : `Trust ${source.label}${source.value !== null ? ` (${source.value})` : ''}`}
            </button>
          ))}
        </div>
      </div>

      {/* Error feedback — only shown on save failure */}
      {error && (
        <p style={{
          fontSize: 11,
          color: '#DC2626',
          margin: '8px 0 0',
          padding: '6px 10px',
          background: '#FEF2F2',
          borderRadius: 6,
          border: '1px solid #FECACA',
        }}>
          ⚠ {error}
        </p>
      )}
    </div>
  )
}
