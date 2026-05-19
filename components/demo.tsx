'use client'

import { useState, useEffect, useCallback } from 'react'
import { DEMO_SIGNALS, DEMO_COPY, DEMO_HEALTH, type DemoSignal } from '@/lib/landing-demo-fixtures'

// ── Severity config ───────────────────────────────────────────
const SEV = {
  critical: { bg: '#FEF2F2', border: '#FECACA', left: '#DC2626', dot: '#DC2626', label: 'Critical', labelColor: '#DC2626' },
  warning:  { bg: '#FFFBEB', border: '#FDE68A', left: '#D97706', dot: '#D97706', label: 'Warning',  labelColor: '#D97706' },
  watch:    { bg: '#F9FAFB', border: '#E5E7EB', left: '#6B7280', dot: '#6B7280', label: 'Watch',    labelColor: '#6B7280' },
}

const TREND_ICON: Record<string, string> = {
  worsening: '↓',
  improving:  '↑',
  unchanged:  '→',
}

const TREND_COLOR: Record<string, string> = {
  worsening: '#DC2626',
  improving:  '#059669',
  unchanged:  '#D97706',
}

// ── Score counter hook ────────────────────────────────────────
function useCountUp(target: number, duration: number, trigger: boolean) {
  const [value, setValue] = useState(0)
  useEffect(() => {
    if (!trigger) { setValue(0); return }
    const start    = performance.now()
    let rafId: number
    const tick = (now: number) => {
      const progress = Math.min((now - start) / duration, 1)
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3)
      setValue(Math.round(eased * target))
      if (progress < 1) rafId = requestAnimationFrame(tick)
    }
    rafId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafId)
  }, [target, duration, trigger])
  return value
}

// ── Main component ────────────────────────────────────────────
export default function AppPreview({ lang = 'en' }: { lang: 'en' | 'ar' }) {
  const signals  = DEMO_SIGNALS[lang]
  const copy     = DEMO_COPY[lang]
  const dir      = lang === 'ar' ? 'rtl' : 'ltr'

  const [phase,       setPhase]       = useState<'idle' | 'scanning' | 'done'>('idle')
  const [visibleCount, setVisibleCount] = useState(0)
  const [selected,    setSelected]    = useState<DemoSignal | null>(null)
  const [activeFilter, setActiveFilter] = useState<'all' | 'critical' | 'warning'>('all')
  const [scanSource,  setScanSource]  = useState(0) // which source is currently "scanning"

  const running = phase === 'scanning'
  const done    = phase === 'done'

  const score = useCountUp(DEMO_HEALTH.score, 1400, done)

  const SOURCE_SCAN_ORDER = ['shopify', 'jira', 'ga4']

  // ── Run the scan animation sequence ──────────────────────────
  const runScan = useCallback(() => {
    setPhase('scanning')
    setVisibleCount(0)
    setSelected(null)
    setScanSource(0)

    // Pulse through sources
    const s1 = setTimeout(() => setScanSource(1), 600)
    const s2 = setTimeout(() => setScanSource(2), 1200)
    const s3 = setTimeout(() => setScanSource(3), 1800)

    // Mark done — score starts counting up
    const done1 = setTimeout(() => {
      setPhase('done')
      setScanSource(-1)
    }, 2000)

    // Stagger signal cards in
    const c1 = setTimeout(() => setVisibleCount(1), 2300)
    const c2 = setTimeout(() => setVisibleCount(2), 2700)
    const c3 = setTimeout(() => setVisibleCount(3), 3100)

    // Auto-select first signal
    const sel = setTimeout(() => setSelected(signals[0]), 3500)

    return () => [s1, s2, s3, done1, c1, c2, c3, sel].forEach(clearTimeout)
  }, [signals])

  // Auto-start on mount
  useEffect(() => {
    const t = setTimeout(runScan, 600)
    return () => clearTimeout(t)
  }, [runScan])

  const filteredSignals = signals.filter((s: DemoSignal) => {
    if (activeFilter === 'all')      return true
    if (activeFilter === 'critical') return s.severity === 'critical'
    if (activeFilter === 'warning')  return s.severity === 'warning'
    return true
  })

  const scoreColor = score >= 80 ? '#059669' : score >= 60 ? '#D97706' : score >= 40 ? '#DC2626' : '#991B1B'

  return (
    <div dir={dir} style={{
      background: '#fff',
      borderRadius: 20,
      border: '1px solid #E2E8F0',
      overflow: 'hidden',
      boxShadow: '0 24px 64px rgba(15,23,42,0.10)',
      fontFamily: "'DM Sans', Inter, sans-serif",
      userSelect: 'none',
    }}>

      {/* ── Fake browser chrome ── */}
      <div style={{ background: '#0F172A', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ display: 'flex', gap: 6 }}>
          <div style={{ width: 11, height: 11, borderRadius: '50%', background: '#EF4444' }} />
          <div style={{ width: 11, height: 11, borderRadius: '50%', background: '#F59E0B' }} />
          <div style={{ width: 11, height: 11, borderRadius: '50%', background: '#10B981' }} />
        </div>
        <div style={{ flex: 1, background: '#1E293B', borderRadius: 6, padding: '4px 12px', fontSize: 11, color: '#64748B', textAlign: 'center' }}>
          app.elvanis.com/signals
        </div>
      </div>

      {/* ── Fake nav ── */}
      <div style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', padding: '0 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 44 }}>
        <div style={{ display: 'flex', gap: 20 }}>
          {(Object.entries(copy.nav) as [string, string][]).map(([key, label]) => (
            <span key={key} style={{ fontSize: 12, color: key === 'signals' ? '#0F172A' : '#94A3B8', fontWeight: key === 'signals' ? 700 : 400, borderBottom: key === 'signals' ? '2px solid #4F46E5' : 'none', paddingBottom: 2 }}>
              {label}
            </span>
          ))}
        </div>
        <span style={{ fontSize: 11, color: '#94A3B8' }}>{copy.businessName}</span>
      </div>

      {/* ── Main content ── */}
      <div style={{ display: 'grid', gridTemplateColumns: selected ? '1fr 1fr' : '1fr', minHeight: 420, transition: 'all 0.3s ease' }}>

        {/* Left — signal list */}
        <div style={{ padding: '16px 20px', borderRight: selected ? '1px solid #E2E8F0' : 'none' }}>

          {/* Stats strip */}
          <div style={{ display: 'flex', gap: 16, marginBottom: 16, flexWrap: 'wrap' }}>
            {/* Health score */}
            <div style={{ background: '#F8FAFC', borderRadius: 10, padding: '10px 16px', border: '1px solid #E2E8F0', minWidth: 100 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>{copy.healthLabel}</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 2 }}>
                <span style={{ fontSize: 28, fontWeight: 900, color: scoreColor, lineHeight: 1, transition: 'color 0.5s' }}>
                  {done ? score : running ? '—' : '—'}
                </span>
                {done && <span style={{ fontSize: 12, color: '#94A3B8' }}>/100</span>}
              </div>
              {done && <div style={{ fontSize: 10, color: scoreColor, fontWeight: 600 }}>{copy.healthStatus}</div>}
            </div>

            {/* Active signals */}
            <div style={{ background: '#F8FAFC', borderRadius: 10, padding: '10px 16px', border: '1px solid #E2E8F0' }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>{copy.activeSignals}</div>
              <div style={{ fontSize: 28, fontWeight: 900, color: '#0F172A', lineHeight: 1 }}>
                {done ? visibleCount : '—'}
              </div>
            </div>

            {/* Source scan indicators */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, justifyContent: 'flex-end' }}>
              {SOURCE_SCAN_ORDER.map((src: string, i: number) => {
                const isScanning = running && scanSource === i
                const isScanned  = done || (running && scanSource > i)
                const icons: Record<string, string> = { shopify: '🛍️', jira: '🔧', ga4: '📊' }
                return (
                  <div key={src} style={{
                    width: 32, height: 32, borderRadius: 8,
                    background: isScanned ? '#ECFDF5' : isScanning ? '#EFF6FF' : '#F1F5F9',
                    border: `1.5px solid ${isScanned ? '#A7F3D0' : isScanning ? '#BFDBFE' : '#E2E8F0'}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 16,
                    transition: 'all 0.3s ease',
                    position: 'relative',
                  }}>
                    {icons[src]}
                    {isScanning && (
                      <div style={{
                        position: 'absolute', inset: -3,
                        borderRadius: 10,
                        border: '2px solid #3B82F6',
                        animation: 'pulse-ring 0.8s ease-in-out infinite',
                      }} />
                    )}
                    {isScanned && (
                      <div style={{ position: 'absolute', top: -4, right: -4, width: 12, height: 12, borderRadius: '50%', background: '#10B981', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 7, color: '#fff', fontWeight: 900 }}>✓</div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Scanning state */}
          {running && (
            <div style={{ textAlign: 'center', padding: '32px 0', color: '#94A3B8', fontSize: 13 }}>
              <div style={{ fontSize: 24, marginBottom: 8, animation: 'spin 1s linear infinite', display: 'inline-block' }}>🔍</div>
              <div>{lang === 'en' ? 'Scanning your data...' : 'جارٍ فحص بياناتك...'}</div>
            </div>
          )}

          {/* Filter tabs */}
          {done && visibleCount > 0 && (
            <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
              {(['all', 'critical', 'warning'] as const).map(f => (
                <button key={f} onClick={() => setActiveFilter(f)} style={{
                  padding: '4px 12px', borderRadius: 16, fontSize: 11, fontWeight: 600, cursor: 'pointer', border: 'none',
                  background: activeFilter === f ? '#0F172A' : '#F1F5F9',
                  color: activeFilter === f ? '#fff' : '#64748B',
                  transition: 'all 0.2s',
                }}>
                  {copy.filters[f]}
                </button>
              ))}
            </div>
          )}

          {/* Signal cards */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {filteredSignals.map((signal: DemoSignal, i: number) => {
              const sev     = SEV[signal.severity as keyof typeof SEV]
              const visible = done && i < visibleCount
              const isSelected = selected?.id === signal.id
              return (
                <div
                  key={signal.id}
                  onClick={() => done && setSelected(isSelected ? null : signal)}
                  style={{
                    background: isSelected ? sev.border : sev.bg,
                    border: `1px solid ${sev.border}`,
                    borderLeft: `4px solid ${sev.left}`,
                    borderRadius: 10,
                    padding: '12px 14px',
                    cursor: done ? 'pointer' : 'default',
                    opacity: visible ? 1 : 0,
                    transform: visible ? 'translateY(0)' : 'translateY(8px)',
                    transition: `opacity 0.4s ease ${i * 0.1}s, transform 0.4s ease ${i * 0.1}s, background 0.2s`,
                    boxShadow: isSelected ? `0 0 0 2px ${sev.left}40` : 'none',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: sev.labelColor, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{sev.label}</span>
                    <span style={{ fontSize: 10, color: '#94A3B8' }}>·</span>
                    <span style={{ fontSize: 11 }}>{signal.sourceIcon}</span>
                    <span style={{ fontSize: 10, color: '#64748B' }}>{signal.source.toUpperCase()}</span>
                    <span style={{ fontSize: 10, color: '#94A3B8' }}>·</span>
                    <span style={{ fontSize: 10, color: '#94A3B8' }}>{Math.round(signal.confidence * 100)}% confidence</span>
                    <span style={{ marginLeft: 'auto', fontSize: 11, color: TREND_COLOR[signal.trend], fontWeight: 700 }}>
                      {TREND_ICON[signal.trend]} {signal.value}
                    </span>
                  </div>
                  <p style={{ fontSize: 13, color: '#1E293B', fontWeight: 600, margin: 0, lineHeight: 1.5 }}>
                    {signal.insight}
                  </p>
                </div>
              )
            })}
          </div>

          {/* Replay button */}
          {done && (
            <button
              onClick={runScan}
              style={{
                marginTop: 12, width: '100%', padding: '9px',
                background: '#F8FAFC', border: '1px solid #E2E8F0',
                borderRadius: 10, fontSize: 12, fontWeight: 600,
                color: '#64748B', cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = '#F1F5F9')}
              onMouseLeave={e => (e.currentTarget.style.background = '#F8FAFC')}
            >
              {lang === 'en' ? '🔍 Replay scan' : '🔍 إعادة الفحص'}
            </button>
          )}
        </div>

        {/* Right — signal detail panel */}
        {selected && (
          <div style={{ padding: '16px 20px', background: '#FAFBFC', overflowY: 'auto', maxHeight: 480 }}>
            {/* Panel header */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <span style={{ fontSize: 14 }}>{selected.dimensionIcon}</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: SEV[selected.severity as keyof typeof SEV].labelColor, textTransform: 'uppercase' }}>{SEV[selected.severity as keyof typeof SEV].label}</span>
                  {selected.confirmedBy && (
                    <span style={{ fontSize: 10, padding: '1px 7px', borderRadius: 20, background: '#ECFDF5', color: '#059669', fontWeight: 600 }}>
                      ✓ {lang === 'en' ? `Confirmed by ${selected.confirmedBy}` : `مؤكد من ${selected.confirmedBy}`}
                    </span>
                  )}
                </div>
                <p style={{ fontSize: 14, fontWeight: 700, color: '#0F172A', margin: 0, lineHeight: 1.5 }}>{selected.insight}</p>
              </div>
              <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', fontSize: 16, padding: '0 4px', flexShrink: 0 }}>✕</button>
            </div>

            {/* Root cause */}
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>{copy.panel.rootCause}</div>
              <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, padding: '10px 12px', fontSize: 12, color: '#7F1D1D', lineHeight: 1.6 }}>
                {selected.rootCause}
              </div>
            </div>

            {/* Recommended action */}
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>{copy.panel.recommendedAction}</div>
              <div style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 8, padding: '10px 12px', fontSize: 12, color: '#1E3A8A', lineHeight: 1.6 }}>
                {selected.recommendedAction}
              </div>
            </div>

            {/* Evidence */}
            {selected.evidence && (
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>{copy.panel.evidence}</div>
                <p style={{ fontSize: 11, color: '#64748B', fontStyle: 'italic', margin: 0, lineHeight: 1.5 }}>{selected.evidence}</p>
              </div>
            )}

            {/* Action button */}
            <a href="/signup" style={{ display: 'block', padding: '11px', background: '#0F172A', color: '#fff', borderRadius: 10, fontSize: 13, fontWeight: 700, textDecoration: 'none', textAlign: 'center', marginTop: 16 }}>
              {lang === 'en' ? 'See your signals →' : 'شاهد إشاراتك →'}
            </a>
          </div>
        )}
      </div>

      {/* ── CSS animations ── */}
      <style>{`
        @keyframes pulse-ring {
          0%   { opacity: 1; transform: scale(1); }
          100% { opacity: 0; transform: scale(1.5); }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
