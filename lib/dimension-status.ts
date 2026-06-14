// lib/dimension-status.ts
// Calculates the status of each dimension based on connected tools,
// scan history, and active signals. Single calculation, passed down as props.

import type { DimensionId } from './gravity-engine'
import { DIMENSIONS } from './gravity-engine'
import { DIMENSION_REQUIREMENTS, hasDimensionTool, getSourceIcons } from './dimension-requirements'
import { getDimensionScore } from './gravity-engine'

export type DimensionState = 'active' | 'locked' | 'pending' | 'healthy' | 'assessment_only'

export interface DimensionStatus {
  id:                 DimensionId
  state:              DimensionState
  score:              number
  trend:              'improving' | 'worsening' | 'unchanged' | null
  isUnlocked:         boolean
  isProvisional:      boolean
  isReconnect:        boolean
  sourcesContributed: string[]
  hadSources:         string[]
  sourceIcons:        string[]
  hadSourceIcons:     string[]
  assessmentOnlyText: string
  reconnectText:      string
  topManualInsight:   string
  missingTools:       string[]
  ctaText:            string
  ctaHref:            string
  unlockText:         string
  pendingText:        string
  healthyText:        string
  label:              string
  shortLabel:         string
  icon:               string
  color:              string
  description:        string
}

export interface DimensionStatusResult {
  statuses:      Record<DimensionId, DimensionStatus>
  unlockedCount: number
  totalCount:    number
}

interface Signal {
  dimension:       string
  severity:        string
  status:          string
  source:          string
  signal_type:     string
  trend:           string | null
  insight_summary: string
  insight_summary_ar: string
  recommended_action: string
  recommended_action_ar: string
}

export function calculateDimensionStatuses(params: {
  signals:              Signal[]
  connectedSourceTypes: string[]
  hasAssessment:        boolean
  hasEverScanned:       boolean
  founderStage:         string | null
  lang?:                'en' | 'ar'
}): DimensionStatusResult {
  const {
    signals,
    connectedSourceTypes,
    hasAssessment,
    hasEverScanned,
    lang = 'en',
  } = params
  const isAr = lang === 'ar'

  const activeSignals = signals.filter(
    s => (s.status === 'new' || s.status === 'acknowledged') && s.source !== 'manual'
  )

  const ids = Object.keys(DIMENSIONS) as DimensionId[]
  let unlockedCount = 0

  const statuses = Object.fromEntries(
    ids.map(id => {
      const req      = DIMENSION_REQUIREMENTS[id]
      const dim      = DIMENSIONS[id]
      const hasTools = hasDimensionTool(id, connectedSourceTypes, hasAssessment)

      // Missing tools
      const missingTools = req.tools.filter(
        t => !connectedSourceTypes.includes(t)
      )

      // Live signals for this dimension
      const dimSignals = activeSignals.filter(s => s.dimension === id)

      // Manual/assessment signals
      const manualSignals = signals.filter(
        s => s.dimension === id &&
             s.source === 'manual' &&
             (s.status === 'new' || s.status === 'acknowledged')
      )
      const hasManualSignals = manualSignals.length > 0

      // Scores
      const liveScore       = getDimensionScore(id, activeSignals)
      const assessmentScore = getDimensionScore(id, manualSignals, true)

      // Trend
      let trend: 'improving' | 'worsening' | 'unchanged' | null = null
      if (dimSignals.length > 0) {
        if (dimSignals.some(s => s.trend === 'worsening'))      trend = 'worsening'
        else if (dimSignals.some(s => s.trend === 'improving')) trend = 'improving'
        else                                                      trend = 'unchanged'
      }

      // Sources currently contributing active signals
      const sourcesContributed = [...new Set(dimSignals.map(s => s.source))]

      // Sources that ever had signals (for reconnect)
      const hadSources = [...new Set(
        signals
          .filter(s => s.dimension === id && s.source !== 'manual')
          .map(s => s.source)
      )]

      // Source icons
      const sourceIcons    = getSourceIcons(sourcesContributed)
      const hadSourceIcons = getSourceIcons(hadSources)

      // Top manual insight for amber box
      const topManualSignal  = manualSignals[0]
      const topManualInsight = topManualSignal?.insight_summary ?? ''

      // ── State resolution ──────────────────────────────────
      let state: DimensionState

      if (hasManualSignals && !hasDimensionTool(id, connectedSourceTypes, false)) {
        state = 'assessment_only'
        unlockedCount++
      } else if (!hasTools) {
        state = 'locked'
      } else if (!hasEverScanned) {
        state = 'pending'
      } else if (dimSignals.length === 0) {
        state = 'healthy'
        unlockedCount++
      } else {
        state = 'active'
        unlockedCount++
      }

      // isReconnect: was previously connected but now disconnected
      const isReconnect = state === 'locked' && hadSources.length > 0

      const status: DimensionStatus = {
        id,
        state,
        score:              state === 'assessment_only' ? assessmentScore : liveScore,
        trend,
        isUnlocked:         state === 'active' || state === 'healthy' || state === 'assessment_only',
        isProvisional:      state === 'assessment_only',
        isReconnect,
        sourcesContributed,
        hadSources,
        sourceIcons,
        hadSourceIcons,
        assessmentOnlyText: isAr
          ? (topManualInsight ? `إشارات تقييمك: "${topManualInsight}"` : 'هذه النتيجة مبنية على تقييمك فقط.')
          : (topManualInsight ? `Your assessment signals: "${topManualInsight}"` : 'This score is based on your assessment only.'),
        reconnectText: isAr
          ? `أعد ربط ${req.ctaText_ar.replace('اربط ', '')} لمزامنة أحدث بياناتك.`
          : `Reconnect ${req.ctaText.replace('Connect ', '')} to sync your latest data.`,
        topManualInsight,
        missingTools,
        ctaText:            isAr ? req.ctaText_ar    : req.ctaText,
        ctaHref:            req.ctaHref,
        unlockText:         isAr ? req.unlockText_ar : req.unlockText,
        pendingText:        isAr ? req.pendingText_ar: req.pendingText,
        healthyText:        isAr ? req.healthyText_ar: req.healthyText,
        label:              dim.label,
        shortLabel:         dim.shortLabel,
        icon:               dim.icon,
        color:              dim.color,
        description:        dim.description,
      }

      return [id, status]
    })
  ) as Record<DimensionId, DimensionStatus>

  return {
    statuses,
    unlockedCount,
    totalCount: ids.length,
  }
}