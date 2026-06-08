'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  DimensionId,
  FounderStage,
  FocusMetric,
  getDimensionOrder,
  getDimensionState,
  getAllDimensionScores,
  DIMENSIONS,
} from '@/lib/gravity-engine'
import { usePinnedDimension } from './GravityPin'
import OnboardingSurface from './OnboardingSurface'
import RevealAnimation from './RevealAnimation'
import HeroCard from './HeroCard'
import DimensionGrid from './DimensionGrid'
import GravityPin from './GravityPin'

type FocusMode = 'onboarding' | 'reveal' | 'os'

interface Signal {
  id:                 string
  signal_type:        string
  dimension:          string
  severity:           string
  status:             string
  source:             string
  insight_summary:    string
  recommended_action: string
  value:              number | null
  trend:              string | null
  scan_count:         number
}

interface DataSource {
  id:              string
  source_type:     string
  status:          string
  last_synced_at:  string | null
}

interface FocusViewProps {
  founderId:       string
  founderName:     string
  founderStage:    FounderStage | null
  focusMetric:     FocusMetric  | null
  signals:         Signal[]
  dataSources:     DataSource[]
  hasAssessment:   boolean
  hasEverScanned:  boolean
  overallScore:    number
}

export default function FocusView({
  founderId,
  founderName,
  founderStage,
  focusMetric,
  signals,
  dataSources,
  hasAssessment,
  hasEverScanned,
  overallScore,
}: FocusViewProps) {
  const router = useRouter()
  const { pinnedId, pinnedAt, daysLeft, pin, unpin } = usePinnedDimension()
  const [showReveal, setShowReveal] = useState(false)

  // ── Determine mode ──────────────────────────────────────────
  const activeSources   = dataSources.filter(s => s.status === 'active')
  const connectedCount  = activeSources.length
  const hasScanned      = hasEverScanned

  let mode: FocusMode = 'os'
  if (!hasScanned) {
    mode = connectedCount === 0 ? 'onboarding' : 'onboarding'
  }

  // ── Onboarding stage ────────────────────────────────────────
  const onboardingStage =
    connectedCount === 0
      ? 'no_sources'
      : !hasScanned
        ? 'has_sources'
        : 'ready_to_scan'

  // ── Gravity order ───────────────────────────────────────────
  const baseOrder    = getDimensionOrder(founderStage, focusMetric)
  const orderedIds: DimensionId[] = pinnedId
    ? [pinnedId, ...baseOrder.filter(id => id !== pinnedId)]
    : baseOrder

  // ── Dimension scores ────────────────────────────────────────
  const activeSignals = signals.filter(
    s => (s.status === 'new' || s.status === 'acknowledged') && s.source !== 'manual'
  )
  const scores = getAllDimensionScores(activeSignals)

  // ── Dimension states ────────────────────────────────────────
  const states = Object.fromEntries(
    (Object.keys(DIMENSIONS) as DimensionId[]).map(id => [
      id,
      getDimensionState(id, founderStage, activeSignals.some(s => s.dimension === id)),
    ])
  ) as Record<DimensionId, 'active' | 'secondary' | 'dormant'>

  // ── Dimension trends ────────────────────────────────────────
  // Simple: if any signal in dimension is worsening → worsening
  // If any improving and none worsening → improving
  // Otherwise unchanged
  function getDimensionTrend(id: DimensionId): 'improving' | 'worsening' | 'unchanged' | null {
    const dimSignals = activeSignals.filter(s => s.dimension === id)
    if (dimSignals.length === 0) return null
    if (dimSignals.some(s => s.trend === 'worsening'))  return 'worsening'
    if (dimSignals.some(s => s.trend === 'improving'))  return 'improving'
    return 'unchanged'
  }

  const trends = Object.fromEntries(
    (Object.keys(DIMENSIONS) as DimensionId[]).map(id => [id, getDimensionTrend(id)])
  ) as Record<DimensionId, 'improving' | 'worsening' | 'unchanged' | null>

  // ── Primary dimension ───────────────────────────────────────
  const primaryId      = orderedIds[0]
  const primarySignals = signals.filter(
    s => s.dimension === primaryId &&
         (s.status === 'new' || s.status === 'acknowledged')
  )
  const allSignalTypes = signals.map(s => s.signal_type)

  // ── Reveal complete ─────────────────────────────────────────
  const handleRevealComplete = useCallback(() => {
    setShowReveal(false)
    router.refresh()
  }, [router])

  // ── Render ──────────────────────────────────────────────────
  return (
    <div style={{
      maxWidth:  900,
      margin:    '0 auto',
      padding:   '32px 24px',
      fontFamily:'Inter, -apple-system, sans-serif',
    }}>

      {/* Reveal animation overlay */}
      {showReveal && (
        <RevealAnimation onComplete={handleRevealComplete} />
      )}

      {/* Page header */}
      <div style={{
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'space-between',
        marginBottom:   28,
      }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: '#111827', margin: '0 0 4px' }}>
            {mode === 'onboarding'
              ? `Welcome, ${founderName.split(' ')[0]}`
              : 'Your Business Focus'}
          </h1>
          <p style={{ fontSize: 14, color: '#6B7280', margin: 0 }}>
            {mode === 'onboarding'
              ? 'Let\'s calibrate your business engine'
              : `Overall health: ${overallScore === -1 ? '—' : overallScore}/100`}
          </p>
        </div>

        {/* Gravity pin control */}
        {mode === 'os' && (
          <GravityPin
            pinnedId={pinnedId}
            pinnedAt={pinnedAt}
            onPin={pin}
            onUnpin={unpin}
            orderedIds={orderedIds}
          />
        )}
      </div>

      {/* Main content */}
      {mode === 'onboarding' ? (
        <OnboardingSurface
          stage={onboardingStage}
          connectedCount={connectedCount}
          hasAssessment={hasAssessment}
          founderId={founderId}
          founderName={founderName}
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Hero card */}
          <HeroCard
            dimensionId={primaryId}
            score={scores[primaryId]}
            trend={trends[primaryId]}
            signals={primarySignals}
            allSignalTypes={allSignalTypes}
            isPinned={pinnedId === primaryId}
            pinDaysLeft={daysLeft}
            onPin={() => pin(primaryId)}
            onUnpin={unpin}
          />

          {/* Secondary dimension grid */}
          <DimensionGrid
            orderedIds={orderedIds}
            scores={scores}
            states={states}
            trends={trends}
            pinnedId={pinnedId}
            pinDaysLeft={daysLeft}
            onDimensionClick={(id) => router.push(`/signals?dimension=${id}`)}
            onPin={pin}
          />

        </div>
      )}

      {/* Quick nav */}
      {mode === 'os' && (
        <div style={{
          display:       'flex',
          gap:           12,
          marginTop:     32,
          paddingTop:    24,
          borderTop:     '1px solid #F3F4F6',
          flexWrap:      'wrap' as const,
        }}>
          {[
            { label: 'Health Overview', href: '/overview'       },
            { label: 'All Signals',     href: '/signals'        },
            { label: 'Action Plan',     href: '/plan'           },
            { label: 'Connect Tools',   href: '/connect'        },
            { label: 'Health Tracker',  href: '/health-tracker' },
          ].map(({ label, href }) => (
            <a
              key={href}
              href={href}
              style={{
                padding:        '8px 16px',
                background:     '#F9FAFB',
                border:         '1px solid #E5E7EB',
                borderRadius:   8,
                fontSize:       13,
                color:          '#374151',
                textDecoration: 'none',
                fontWeight:     500,
              }}
            >
              {label}
            </a>
          ))}
        </div>
      )}
    </div>
  )
}