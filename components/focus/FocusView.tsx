'use client'

import { useState, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  DimensionId,
  FounderStage,
  FocusMetric,
  getDimensionOrder,
  DIMENSIONS,
} from '@/lib/gravity-engine'
import { calculateDimensionStatuses } from '@/lib/dimension-status'
import OnboardingSurface from './OnboardingSurface'
import RevealAnimation from './RevealAnimation'
import HeroCard from './HeroCard'
import DimensionGrid from './DimensionGrid'
import FocusChanger from './FocusChanger'

type FocusMode = 'onboarding' | 'os'

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
  id:             string
  source_type:    string
  status:         string
  last_synced_at: string | null
}

interface FocusViewProps {
  founderId:            string
  founderName:          string
  founderStage:         FounderStage | null
  focusMetric:          FocusMetric  | null
  signals:              Signal[]
  dataSources:          DataSource[]
  hasAssessment:        boolean
  hasEverScanned:       boolean
  overallScore:         number
  connectedSourceTypes: string[]
  subscriptionTier:     string | null
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
  connectedSourceTypes,
  subscriptionTier,
}: FocusViewProps) {
  const router      = useRouter()
  const [showReveal, setShowReveal] = useState(false)
  const [focusChanging, setFocusChanging] = useState(false)
  useEffect(() => {
    setFocusChanging(false)
  }, [focusMetric])
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    const isDismissed = localStorage.getItem('elvanis_onboarding_dismissed')
    if (isDismissed) setDismissed(true)
  }, [])
  
  function handleDismiss() {
    localStorage.setItem('elvanis_onboarding_dismissed', 'true')
    setDismissed(true)
  }
  // ── Mode ────────────────────────────────────────────────────
  const activeSources  = dataSources.filter(s => s.status === 'active')
  const connectedCount = activeSources.length
  const mode: FocusMode = 'os'

  const onboardingStage =
    connectedCount === 0 ? 'no_sources' :
    !hasEverScanned      ? 'has_sources' :
                           'ready_to_scan'

  // ── Gravity order ───────────────────────────────────────────
  const orderedIds: DimensionId[] = getDimensionOrder(founderStage, focusMetric)

  // ── Dimension statuses (single calculation) ─────────────────
  const dimensionResult = calculateDimensionStatuses({
    signals,
    connectedSourceTypes,
    hasAssessment,
    hasEverScanned,
    founderStage,
  })
  const { statuses, unlockedCount, totalCount } = dimensionResult

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

  // ── Focus change ────────────────────────────────────────────
  async function handleFocusChange(metric: FocusMetric) {
    setFocusChanging(true)
    await fetch('/api/founder/update-focus', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ focusMetric: metric }),
    })
    router.refresh()
  }

  // ── Render ──────────────────────────────────────────────────
  return (
    <div style={{
      maxWidth:   900,
      margin:     '0 auto',
      padding:    '32px 24px',
      fontFamily: 'Inter, -apple-system, sans-serif',
    }}>

      {/* Reveal animation */}
      {showReveal && (
        <RevealAnimation onComplete={handleRevealComplete} />
      )}

      {/* Page header */}
      <div style={{
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'space-between',
        marginBottom:   28,
        gap:            16,
      }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: '#111827', margin: '0 0 4px' }}>
         {!hasEverScanned && !dismissed
          ? `Welcome, ${founderName.split(' ')[0]}`
          : 'Your Business Focus'}
          </h1>
          <p style={{ fontSize: 14, color: '#6B7280', margin: 0 }}>
          {!hasEverScanned && !dismissed
           ? "Let's calibrate your business engine"
           : `Overall health: ${overallScore === -1 ? '—' : overallScore}/100`}
          </p>
        </div>

        {mode === 'os' && (
          <FocusChanger
            focusMetric={focusMetric}
            onFocusChange={handleFocusChange}
          />
        )}
      </div>

{/* Main content — always show OS view */}
<div style={{ position: 'relative' }}>

  {/* Onboarding overlay */}
  {!hasEverScanned && !dismissed && (
    <OnboardingSurface
      stage={onboardingStage}
      connectedCount={connectedCount}
      hasAssessment={hasAssessment}
      founderId={founderId}
      founderName={founderName}
      founderStage={founderStage}
      focusMetric={focusMetric}
      subscriptionTier={subscriptionTier}
      onDismiss={handleDismiss}
    />
  )}

  {/* OS view always rendered */}
  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
    <HeroCard
      status={statuses[primaryId]}
      signals={primarySignals}
      allSignalTypes={allSignalTypes}
      founderStage={founderStage}
      focusMetric={focusMetric}
      isUpdating={focusChanging}
    />
    <DimensionGrid
      orderedIds={orderedIds.slice(1)}
      statuses={statuses}
      onDimensionClick={(id) => router.push(`/signals?dimension=${id}`)}
    />
  </div>

</div>

      {/* Gamification strip */}
      {mode === 'os' && unlockedCount < totalCount && (
        <div style={{
          marginTop:    24,
          padding:      '16px 20px',
          background:   '#F9FAFB',
          border:       '1px solid #E5E7EB',
          borderRadius: 12,
          display:      'flex',
          alignItems:   'center',
          justifyContent: 'space-between',
          gap:          16,
        }}>
          <div>
            <p style={{ fontSize: 13, fontWeight: 700, color: '#111827', margin: '0 0 2px' }}>
              {unlockedCount} of {totalCount} dimensions active
            </p>
            <p style={{ fontSize: 12, color: '#6B7280', margin: 0 }}>
              Connect more tools to unlock your full business picture
            </p>
          </div>
            <a
            href="/connect"
            style={{
              padding:        '8px 16px',
              background:     '#2563EB',
              color:          '#FFFFFF',
              borderRadius:   8,
              fontSize:       13,
              fontWeight:     600,
              textDecoration: 'none',
              flexShrink:     0,
            }}
          >
            Connect tools →
          </a>
        </div>
      )}

      {/* Quick nav */}
      {mode === 'os' && (
        <div style={{
          display:    'flex',
          gap:        12,
          marginTop:  24,
          paddingTop: 24,
          borderTop:  '1px solid #F3F4F6',
          flexWrap:   'wrap' as const,
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