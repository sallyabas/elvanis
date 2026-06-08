// lib/dimension-status.ts
// Calculates the status of each dimension based on connected tools,
// scan history, and active signals. Single calculation, passed down as props.

import type { DimensionId } from './gravity-engine'
import { DIMENSIONS } from './gravity-engine'
import { DIMENSION_REQUIREMENTS, hasDimensionTool } from './dimension-requirements'
import { getDimensionScore } from './gravity-engine'

export type DimensionState = 'active' | 'locked' | 'pending' | 'healthy'

export interface DimensionStatus {
  id:           DimensionId
  state:        DimensionState
  score:        number
  trend:        'improving' | 'worsening' | 'unchanged' | null
  isUnlocked:   boolean
  missingTools: string[]
  ctaText:      string
  ctaHref:      string
  unlockText:   string
  pendingText:  string
  healthyText:  string
  label:        string
  shortLabel:   string
  icon:         string
  color:        string
  description:  string
}

export interface DimensionStatusResult {
  statuses:      Record<DimensionId, DimensionStatus>
  unlockedCount: number
  totalCount:    number
}

interface Signal {
  dimension:  string
  severity:   string
  status:     string
  source:     string
  signal_type:string
  trend:      string | null
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

  const activeSignals = signals.filter(
    s => (s.status === 'new' || s.status === 'acknowledged') && s.source !== 'manual'
  )

  const ids = Object.keys(DIMENSIONS) as DimensionId[]
  let unlockedCount = 0

  const statuses = Object.fromEntries(
    ids.map(id => {
      const req     = DIMENSION_REQUIREMENTS[id]
      const dim     = DIMENSIONS[id]
      const hasTools = hasDimensionTool(id, connectedSourceTypes, hasAssessment)

      // Missing tools for this dimension
      const missingTools = req.tools.filter(
        t => !connectedSourceTypes.includes(t)
      )

      // Signals for this dimension
      const dimSignals = activeSignals.filter(s => s.dimension === id)

      // Score
      const score = getDimensionScore(id, activeSignals)

      // Trend
      let trend: 'improving' | 'worsening' | 'unchanged' | null = null
      if (dimSignals.length > 0) {
        if (dimSignals.some(s => s.trend === 'worsening'))      trend = 'worsening'
        else if (dimSignals.some(s => s.trend === 'improving')) trend = 'improving'
        else                                                      trend = 'unchanged'
      }

      // State
      let state: DimensionState
      if (!hasTools) {
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

      const status: DimensionStatus = {
        id,
        state,
        score,
        trend,
        isUnlocked:   state === 'active' || state === 'healthy',
        missingTools,
        ctaText:      req.ctaText,
        ctaHref:      req.ctaHref,
        unlockText:   req.unlockText,
        pendingText:  req.pendingText,
        healthyText:  req.healthyText,
        label:        dim.label,
        shortLabel:   dim.shortLabel,
        icon:         dim.icon,
        color:        dim.color,
        description:  dim.description,
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