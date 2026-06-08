'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { DimensionId, DIMENSIONS } from '@/lib/gravity-engine'

type OnboardingStage = 'no_sources' | 'has_sources' | 'ready_to_scan'

interface OnboardingProps {
  stage:          OnboardingStage
  connectedCount: number
  hasAssessment:  boolean
  founderId:      string
  founderName:    string
}

// Faded dimension grid shown behind onboarding surface
function FadedDimensionGrid() {
  const ids: DimensionId[] = ['revenue', 'customer', 'marketing', 'team', 'product', 'strategy']
  const [heroId, ...restIds] = ids

  return (
    <div style={{ opacity: 0.08, pointerEvents: 'none', userSelect: 'none' }}>
      {/* Faded hero */}
      <div style={{
        background:   '#FFFFFF',
        border:       '2px solid #E5E7EB',
        borderRadius: 16,
        padding:      '28px 32px',
        marginBottom: 16,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <span style={{ fontSize: 28 }}>{DIMENSIONS[heroId].icon}</span>
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, color: '#9CA3AF', letterSpacing: '0.12em', textTransform: 'uppercase', margin: 0 }}>
              PRIMARY FOCUS
            </p>
            <h2 style={{ fontSize: 22, fontWeight: 800, color: '#111827', margin: 0 }}>
              {DIMENSIONS[heroId].label}
            </h2>
          </div>
        </div>
        <div style={{ fontSize: 56, fontWeight: 900, color: '#9CA3AF', lineHeight: 1, marginBottom: 8 }}>
          —
        </div>
        <p style={{ fontSize: 14, color: '#9CA3AF' }}>Awaiting data</p>
      </div>

      {/* Faded secondary grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12 }}>
        {restIds.map(id => (
          <div key={id} style={{
            background:   '#FFFFFF',
            border:       '1.5px solid #F3F4F6',
            borderRadius: 12,
            padding:      '16px 20px',
            display:      'flex',
            alignItems:   'center',
            gap:          14,
          }}>
            <span style={{ fontSize: 20 }}>{DIMENSIONS[id].icon}</span>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: '#111827', margin: '0 0 2px' }}>
                {DIMENSIONS[id].shortLabel}
              </p>
              <p style={{ fontSize: 11, color: '#9CA3AF', margin: 0 }}>Awaiting data</p>
            </div>
            <div style={{ fontSize: 20, fontWeight: 800, color: '#9CA3AF' }}>—</div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function OnboardingSurface({
  stage,
  connectedCount,
  hasAssessment,
  founderId,
  founderName,
}: OnboardingProps) {
  const router  = useRouter()
  const [scanning, setScanning] = useState(false)

  async function handleFirstScan() {
    setScanning(true)
    try {
      await fetch('/api/scan', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ founderId, triggeredBy: 'connect' }),
      })
      router.refresh()
    } catch {
      setScanning(false)
    }
  }

  const firstName = founderName.split(' ')[0] || 'there'

  return (
    <div style={{ position: 'relative' }}>

      {/* Faded grid behind */}
      <FadedDimensionGrid />

      {/* Overlay surface */}
      <div style={{
        position:      'absolute',
        inset:         0,
        display:       'flex',
        alignItems:    'center',
        justifyContent:'center',
        zIndex:        10,
      }}>
        <div style={{
          background:   '#FFFFFF',
          border:       '1px solid #E5E7EB',
          borderRadius: 20,
          padding:      '40px 48px',
          maxWidth:     520,
          width:        '100%',
          boxShadow:    '0 8px 40px rgba(0,0,0,0.08)',
          textAlign:    'center',
        }}>

          {/* Stage 1 — No sources */}
          {stage === 'no_sources' && (
            <>
              <div style={{ fontSize: 48, marginBottom: 16 }}>🔧</div>
              <h2 style={{ fontSize: 24, fontWeight: 800, color: '#111827', marginBottom: 8 }}>
                Calibrating your business engine
              </h2>
              <p style={{ fontSize: 15, color: '#6B7280', lineHeight: 1.6, marginBottom: 32 }}>
                Connect your first tool so Elvanis can read your real operational data — not just what you tell it.
              </p>

              {/* Checklist */}
              <div style={{ textAlign: 'left', marginBottom: 32 }}>
                {[
                  { label: 'Take assessment',    done: hasAssessment,    href: '/assessment' },
                  { label: 'Connect first tool', done: connectedCount > 0, href: '/connect' },
                  { label: 'Run first scan',     done: false,            href: null },
                ].map(({ label, done, href }) => (
                  <div key={label} style={{
                    display:       'flex',
                    alignItems:    'center',
                    gap:           12,
                    padding:       '10px 0',
                    borderBottom:  '1px solid #F3F4F6',
                  }}>
                    <span style={{
                      width:        24,
                      height:       24,
                      borderRadius: '50%',
                      background:   done ? '#10B981' : '#F3F4F6',
                      display:      'flex',
                      alignItems:   'center',
                      justifyContent: 'center',
                      fontSize:     13,
                      flexShrink:   0,
                    }}>
                      {done ? '✓' : '○'}
                    </span>
                    <span style={{ fontSize: 14, color: done ? '#6B7280' : '#111827', fontWeight: done ? 400 : 600 }}>
                      {label}
                    </span>
                    {!done && href && (
                      <a href={href} style={{ marginLeft: 'auto', fontSize: 13, color: '#2563EB', fontWeight: 600, textDecoration: 'none' }}>
                        Start →
                      </a>
                    )}
                    {done && (
                      <span style={{ marginLeft: 'auto', fontSize: 12, color: '#10B981', fontWeight: 600 }}>Done ✓</span>
                    )}
                  </div>
                ))}
              </div>

              <a
                href="/connect"
                style={{
                  display:      'block',
                  width:        '100%',
                  padding:      '14px',
                  background:   '#2563EB',
                  color:        '#FFFFFF',
                  borderRadius: 12,
                  fontSize:     15,
                  fontWeight:   700,
                  textDecoration: 'none',
                  textAlign:    'center',
                  boxSizing:    'border-box' as const,
                }}
              >
                Connect a tool →
              </a>
            </>
          )}

          {/* Stage 2 — Has sources, no scan */}
          {stage === 'has_sources' && (
            <>
              <div style={{ fontSize: 48, marginBottom: 16 }}>⚡</div>
              <h2 style={{ fontSize: 24, fontWeight: 800, color: '#111827', marginBottom: 8 }}>
                Engine warming up
              </h2>
              <p style={{ fontSize: 15, color: '#6B7280', lineHeight: 1.6, marginBottom: 12 }}>
                {connectedCount} {connectedCount === 1 ? 'tool' : 'tools'} connected. Ready for your first diagnostic scan.
              </p>
              <p style={{ fontSize: 13, color: '#9CA3AF', marginBottom: 32 }}>
                This takes 30–60 seconds. We read across all your sources simultaneously.
              </p>

              <button
                onClick={handleFirstScan}
                disabled={scanning}
                style={{
                  width:        '100%',
                  padding:      '14px',
                  background:   scanning ? '#9CA3AF' : '#2563EB',
                  color:        '#FFFFFF',
                  border:       'none',
                  borderRadius: 12,
                  fontSize:     15,
                  fontWeight:   700,
                  cursor:       scanning ? 'not-allowed' : 'pointer',
                  marginBottom: 12,
                  fontFamily:   'inherit',
                }}
              >
                {scanning ? 'Scanning your business...' : 'Run first scan →'}
              </button>

              <a
                href="/connect"
                style={{ fontSize: 13, color: '#6B7280', textDecoration: 'none' }}
              >
                Connect more tools first
              </a>
            </>
          )}

          {/* Stage 3 — Scanning in progress */}
          {stage === 'ready_to_scan' && (
            <>
              <div style={{ fontSize: 48, marginBottom: 16 }}>🔍</div>
              <h2 style={{ fontSize: 24, fontWeight: 800, color: '#111827', marginBottom: 8 }}>
                Reading your business...
              </h2>
              <p style={{ fontSize: 15, color: '#6B7280', lineHeight: 1.6, marginBottom: 32 }}>
                Elvanis is scanning across all your connected tools. This takes about 30 seconds.
              </p>
              <div style={{
                width:        '100%',
                height:       4,
                background:   '#F3F4F6',
                borderRadius: 2,
                overflow:     'hidden',
              }}>
                <div style={{
                  height:     '100%',
                  background: '#2563EB',
                  borderRadius: 2,
                  animation:  'scan-progress 30s linear forwards',
                  width:      '0%',
                }} />
              </div>
              <style>{`
                @keyframes scan-progress {
                  from { width: 0% }
                  to   { width: 90% }
                }
              `}</style>
            </>
          )}

        </div>
      </div>
    </div>
  )
}