// lib/dimension-status.ts
// Calculates the status of each dimension based on connected tools,
// scan history, and active signals. Single calculation, passed down as props.

import type { DimensionId } from './gravity-engine'
import { DIMENSIONS } from './gravity-engine'
import { DIMENSION_REQUIREMENTS, hasDimensionTool } from './dimension-requirements'
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
  assessmentOnlyText: string
  reconnectText:      string
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
  dimension:   string
  severity:    string
  status:      string
  source:      string
  signal_type: string
  trend:       string | null
}

export function calculateDimensionStatuses(params: {
  signals:              Signal[]
  connectedSourceTypes: string[]
  hasAssessment:        boolean
  hasEverScanned:       boolean
  founderStage:         string | null
}): DimensionStatusResult {
  const {
    signals,
    connectedSourceTypes,
    hasAssessment,
    hasEverScanned,
  } = params

  // Live signals — from tools, not assessment
  const activeSignals = signals.filter(
    s => (s.status === 'new' || s.status === 'acknowledged') && s.source !== 'manual'
  )

  const ids = Object.keys(DIMENSIONS) as DimensionId[]
  let unlockedCount = 0

  const statuses = Object.fromEntries(
    ids.map(id => {
      const req = DIMENSION_REQUIREMENTS[id]
      const dim = DIMENSIONS[id]

      // Is this dimension's tool currently connected?
      const hasActiveSource = hasDimensionTool(id, connectedSourceTypes, false)

      // Has this dimension ever had tool signals (even if disconnected)?
      const hasToolSignals = signals.some(
        s => s.dimension === id && s.source !== 'manual'
      )

      // Current live signals for this dimension
      const dimSignals = activeSignals.filter(s => s.dimension === id)

      // Assessment signals for this dimension (latest only — DB ordered by created_at DESC)
      const manualSignals = signals.filter(
        s => s.dimension === id &&
             s.source === 'manual' &&
             (s.status === 'new' || s.status === 'acknowledged')
      )
      const hasManualSignals = manualSignals.length > 0

      // Missing tools
      const missingTools = req.tools.filter(
        t => !connectedSourceTypes.includes(t)
      )

      // Scores
      const liveScore       = getDimensionScore(id, activeSignals)
      const assessmentScore = getDimensionScore(id, manualSignals)

      // Trend — live signals only
      let trend: 'improving' | 'worsening' | 'unchanged' | null = null
      if (dimSignals.length > 0) {
        if (dimSignals.some(s => s.trend === 'worsening'))      trend = 'worsening'
        else if (dimSignals.some(s => s.trend === 'improving')) trend = 'improving'
        else                                                      trend = 'unchanged'
      }

      // ── State resolution ──────────────────────────────────
      let state: DimensionState

      if (hasActiveSource && dimSignals.length > 0) {
        // Tools connected + has live signals → active
        state = 'active'
        unlockedCount++
      } else if (hasActiveSource && hasEverScanned && dimSignals.length === 0) {
        // Tools connected + scanned + no signals → healthy
        state = 'healthy'
        unlockedCount++
      } else if (hasActiveSource && !hasEverScanned) {
        // Tools connected + never scanned → pending
        state = 'pending'
      } else if (!hasActiveSource && hasManualSignals && !hasToolSignals) {
        // No tools + assessment signals + never had tools → assessment_only
        state = 'assessment_only'
        unlockedCount++
      } else {
        // No active source → locked
        // isReconnect flag differentiates first-time vs reconnect
        state = 'locked'
      }

      // isReconnect: had tool signals before but now disconnected
      const isReconnect = state === 'locked' && hasToolSignals

      const status: DimensionStatus = {
        id,
        state,
        score:         state === 'assessment_only' ? assessmentScore : liveScore,
        trend,
        isUnlocked:    state === 'active' || state === 'healthy' || state === 'assessment_only',
        isProvisional: state === 'assessment_only',
        isReconnect,
        assessmentOnlyText: `This score is based on your assessment only. Connect ${req.ctaText.toLowerCase()} to validate with live data.`,
        reconnectText:      `Reconnect ${req.ctaText.replace('Connect ', '')} to sync your latest data.`,
        missingTools,
        ctaText:       req.ctaText,
        ctaHref:       req.ctaHref,
        unlockText:    req.unlockText,
        pendingText:   req.pendingText,
        healthyText:   req.healthyText,
        label:         dim.label,
        shortLabel:    dim.shortLabel,
        icon:          dim.icon,
        color:         dim.color,
        description:   dim.description,
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