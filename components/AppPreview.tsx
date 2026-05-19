'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  DEMO_COPY,
  DEMO_SIGNALS,
  DEMO_HEALTH,
  type DemoSignal,
  type DemoPreviewCopy,
} from '@/lib/landing-demo-fixtures'

const SEV = {
  critical: { bg: '#FEF2F2', border: '#FECACA', color: '#DC2626', label: 'Critical' },
  warning:  { bg: '#FFFBEB', border: '#FDE68A', color: '#D97706', label: 'Warning'  },
  watch:    { bg: '#F9FAFB', border: '#E5E7EB', color: '#6B7280', label: 'Watch'    },
}

const SOURCE_LABEL: Record<string, string> = {
  shopify: 'Shopify',
  jira: 'Jira',
  ga4: 'GA4',
}

type Props = { lang: 'en' | 'ar' }

export default function AppPreview({ lang }: Props) {
  const copy = DEMO_COPY[lang]
  const signals = DEMO_SIGNALS[lang]
  const [selectedId, setSelectedId] = useState(signals[0]?.id ?? '')
  const [paused, setPaused] = useState(false)
  const [visible, setVisible] = useState(true)

  const selected = signals.find(s => s.id === selectedId) ?? signals[0]

  const selectSignal = (id: string) => {
    if (id === selectedId) return
    setVisible(false)
    setTimeout(() => {
      setSelectedId(id)
      setVisible(true)
    }, 220)
  }

  const cycleNext = useCallback(() => {
    setVisible(false)
    setTimeout(() => {
      setSelectedId(prev => {
        const i = signals.findIndex(s => s.id === prev)
        return signals[(i + 1) % signals.length]?.id ?? prev
      })
      setVisible(true)
    }, 220)
  }, [signals])

  useEffect(() => {
    if (paused || signals.length < 2) return
    const t = setInterval(cycleNext, 5500)
    return () => clearInterval(t)
  }, [paused, cycleNext, signals.length])

  return (
    <div
      style={{
        background: '#fff',
        borderRadius: 20,
        border: '1px solid #E2E8F0',
        overflow: 'hidden',
        boxShadow: '0 24px 80px rgba(15,23,42,0.12)',
      }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* Browser chrome */}
      <div style={{ background: '#0F172A', padding: '11px 16px', display: 'flex', alignItems: 'center', gap: 7 }}>
        <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#EF4444' }} />
        <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#F59E0B' }} />
        <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#10B981' }} />
        <span style={{ fontSize: 11, color: '#64748B', marginInlineStart: 10 }}>app.elvanis.com/signals</span>
      </div>

      {/* Product nav — matches GlobalHeader */}
      <div style={{
        borderBottom: '1px solid #E5E7EB',
        padding: '0 18px',
        height: 50,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <span style={{ fontSize: 17, fontWeight: 800, color: '#2563EB' }}>Elvanis</span>
        <div className="elvanis-preview-nav" style={{ display: 'flex', gap: 18, alignItems: 'center' }}>
          {[copy.nav.dashboard, copy.nav.signals, copy.nav.tracker, copy.nav.plan].map(label => (
            <span
              key={label}
              style={{
                fontSize: 12,
                fontWeight: label === copy.nav.signals ? 600 : 500,
                color: label === copy.nav.signals ? '#2563EB' : '#9CA3AF',
              }}
            >
              {label}
            </span>
          ))}
        </div>
      </div>

      <MetricsStrip copy={copy} />

      <div className="elvanis-preview-main" style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1.2fr)',
        minHeight: 400,
        background: '#F9FAFB',
      }}>
        <SignalSidebar copy={copy} signals={signals} selectedId={selectedId} onSelect={selectSignal} />
        <DetailPanel copy={copy} signal={selected} visible={visible} />
      </div>

      {!paused && (
        <div style={{ height: 3, background: '#F3F4F6' }}>
          <div
            key={selectedId}
            style={{
              height: '100%',
              background: '#2563EB',
              animation: 'elvanis-progress 5.5s linear forwards',
            }}
          />
        </div>
      )}

      <style>{`
        @keyframes elvanis-progress {
          from { width: 0%; }
          to { width: 100%; }
        }
        @media (max-width: 768px) {
          .elvanis-preview-metrics { grid-template-columns: repeat(2, 1fr) !important; }
          .elvanis-preview-main { grid-template-columns: 1fr !important; }
          .elvanis-preview-nav span:nth-child(n+3) { display: none; }
        }
      `}</style>
    </div>
  )
}

function MetricsStrip({ copy }: { copy: DemoPreviewCopy }) {
  return (
    <div className="elvanis-preview-metrics" style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(4, 1fr)',
      gap: 10,
      padding: '14px 16px',
      background: '#fff',
      borderBottom: '1px solid #E5E7EB',
    }}>
      <MetricCard
        label={copy.healthLabel}
        value={`${DEMO_HEALTH.score}`}
        suffix="/100"
        sub={copy.healthStatus}
        accent="#D97706"
        bg="#FFFBEB"
        border="#FDE68A"
      />
      <MetricCard
        label={copy.activeSignals}
        value="3"
        sub={`${DEMO_HEALTH.critical} critical · ${DEMO_HEALTH.warning} warning`}
      />
      <MetricCard label={copy.lastScan} value="Today" sub="Shopify · Jira · GA4" smallValue />
      <MetricCard label="Plan" value="Navigator" sub={copy.businessName} smallValue />
    </div>
  )
}

function MetricCard({
  label, value, suffix, sub, accent, bg, border, smallValue,
}: {
  label: string
  value: string
  suffix?: string
  sub: string
  accent?: string
  bg?: string
  border?: string
  smallValue?: boolean
}) {
  return (
    <div style={{
      background: bg ?? '#F9FAFB',
      borderRadius: 12,
      border: `1px solid ${border ?? '#E5E7EB'}`,
      padding: '12px 14px',
    }}>
      <p style={{ fontSize: 10, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 6px' }}>{label}</p>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, marginBottom: 4 }}>
        <span style={{ fontSize: smallValue ? 16 : 32, fontWeight: 900, color: accent ?? '#111827', lineHeight: 1 }}>{value}</span>
        {suffix && <span style={{ fontSize: 13, color: '#9CA3AF', marginBottom: 4 }}>{suffix}</span>}
      </div>
      <p style={{ fontSize: 11, fontWeight: 600, color: accent ?? '#6B7280', margin: 0 }}>{sub}</p>
    </div>
  )
}

function SignalSidebar({
  copy,
  signals,
  selectedId,
  onSelect,
}: {
  copy: DemoPreviewCopy
  signals: DemoSignal[]
  selectedId: string
  onSelect: (id: string) => void
}) {
  return (
    <div style={{ padding: 14, borderInlineEnd: '1px solid #E5E7EB', background: '#fff' }}>
      <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
        {[
          { key: 'all', label: copy.filters.all, count: 3 },
          { key: 'critical', label: copy.filters.critical, count: DEMO_HEALTH.critical },
          { key: 'warning', label: copy.filters.warning, count: DEMO_HEALTH.warning },
        ].map(f => (
          <span
            key={f.key}
            style={{
              fontSize: 10,
              fontWeight: 700,
              padding: '4px 9px',
              borderRadius: 8,
              background: f.key === 'all' ? '#111827' : '#F3F4F6',
              color: f.key === 'all' ? '#fff' : '#6B7280',
            }}
          >
            {f.label} ({f.count})
          </span>
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {signals.map(s => {
          const sev = SEV[s.severity]
          const active = s.id === selectedId
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => onSelect(s.id)}
              style={{
                textAlign: 'start',
                cursor: 'pointer',
                background: active ? sev.bg : '#fff',
                border: `1.5px solid ${active ? sev.border : '#E5E7EB'}`,
                borderInlineStart: `4px solid ${sev.color}`,
                borderRadius: 10,
                padding: '11px 13px',
                transition: 'all 0.2s ease',
                boxShadow: active ? `0 4px 14px ${sev.color}20` : 'none',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: sev.color, textTransform: 'uppercase' }}>{sev.label}</span>
                <span style={{ fontSize: 10, color: '#6B7280', background: '#F3F4F6', padding: '1px 6px', borderRadius: 6 }}>
                  {s.sourceIcon} {SOURCE_LABEL[s.source] ?? s.source}
                </span>
                {s.trend === 'worsening' && <span style={{ fontSize: 9, fontWeight: 700, color: '#DC2626' }}>↓</span>}
              </div>
              <p style={{
                fontSize: 12,
                fontWeight: 600,
                color: '#111827',
                margin: 0,
                lineHeight: 1.4,
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              } as React.CSSProperties}>
                {s.insight}
              </p>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function DetailPanel({
  copy,
  signal,
  visible,
}: {
  copy: DemoPreviewCopy
  signal: DemoSignal
  visible: boolean
}) {
  const sev = SEV[signal.severity]

  return (
    <div style={{
      padding: 18,
      opacity: visible ? 1 : 0,
      transform: visible ? 'translateX(0)' : 'translateX(10px)',
      transition: 'opacity 0.25s ease, transform 0.25s ease',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 18 }}>{signal.dimensionIcon}</span>
        <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 9px', borderRadius: 20, background: sev.bg, color: sev.color, textTransform: 'uppercase' }}>{sev.label}</span>
        <span style={{ fontSize: 10, color: '#9CA3AF', textTransform: 'uppercase' }}>{signal.dimension}</span>
        <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 8, background: '#F3F4F6', color: '#6B7280' }}>
          {signal.sourceIcon} {SOURCE_LABEL[signal.source]}
        </span>
        {signal.confirmedBy && (
          <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, background: '#ECFDF5', color: '#059669', fontWeight: 600 }}>
            ✓ {signal.confirmedBy}
          </span>
        )}
      </div>

      <p style={{ fontSize: 14, fontWeight: 700, color: '#111827', lineHeight: 1.55, margin: '0 0 16px' }}>
        {signal.insight}
      </p>

      <PanelBlock title={copy.panel.rootCause} accent="#7C3AED" bg="#F5F3FF" border="#DDD6FE">
        {signal.rootCause}
      </PanelBlock>

      <PanelBlock title={copy.panel.recommendedAction} accent="#2563EB" bg="#EFF6FF" border="#BFDBFE" style={{ marginTop: 10 }}>
        {signal.recommendedAction}
      </PanelBlock>

      {signal.evidence && (
        <p style={{ fontSize: 11, color: '#9CA3AF', marginTop: 12, fontStyle: 'italic', lineHeight: 1.5 }}>
          <strong style={{ color: '#6B7280', fontStyle: 'normal' }}>{copy.panel.evidence}: </strong>
          {signal.evidence}
        </p>
      )}

      <div style={{ marginTop: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 11, color: '#9CA3AF' }}>{copy.panel.priority}: <strong style={{ color: '#111827' }}>92</strong></span>
        <span style={{ fontSize: 12, fontWeight: 700, color: sev.color }}>{signal.label}: {signal.value}</span>
      </div>
    </div>
  )
}

function PanelBlock({
  title,
  children,
  accent,
  bg,
  border,
  style,
}: {
  title: string
  children: React.ReactNode
  accent: string
  bg: string
  border: string
  style?: React.CSSProperties
}) {
  return (
    <div style={{ background: bg, border: `1px solid ${border}`, borderRadius: 12, padding: '12px 14px', ...style }}>
      <p style={{ fontSize: 10, fontWeight: 800, color: accent, textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 6px' }}>{title}</p>
      <p style={{ fontSize: 12, color: '#374151', lineHeight: 1.6, margin: 0 }}>{children}</p>
    </div>
  )
}
