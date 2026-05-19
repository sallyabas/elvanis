export const SIGNAL_DIRECTION: Record<string, 'lower_better' | 'higher_better'> = {
  churn_spike: 'lower_better',
  ticket_volume_increase: 'lower_better',
  rating_decline: 'higher_better',
  velocity_drop: 'higher_better',
  conversion_fall: 'higher_better',
  engagement_drop: 'higher_better',
  refund_spike: 'lower_better',
  response_time_increase: 'lower_better',
  repeat_complaint_pattern: 'lower_better',
  bug_backlog_growth: 'lower_better',
  aov_decline: 'higher_better',
  repeat_purchase_drop: 'higher_better',
  activation_drop: 'higher_better',
  traffic_source_shift: 'lower_better',
  session_duration_drop: 'higher_better',
  cycle_time_increase: 'lower_better',
  blocked_tickets_spike: 'lower_better',
  nps_decline: 'higher_better',
  csat_decline: 'higher_better',
}

// Which tool sources can confirm a CSV signal of each type
// CSV signals can only be confirmed by tools measuring the same underlying metric
const CSV_CONFIRMATION_SOURCES: Record<string, string[]> = {
  engagement_drop: [],
  session_duration_drop: ['ga4'],
  traffic_source_shift: [],
  conversion_fall: ['ga4', 'shopify'],
  activation_drop: ['ga4'],
  refund_spike: ['shopify'],
  aov_decline: ['shopify'],
  repeat_purchase_drop: ['shopify'],
  churn_spike: ['shopify'],
  repeat_complaint_pattern: ['intercom', 'trustpilot'],
  ticket_volume_increase: ['intercom'],
  response_time_increase: ['intercom'],
  csat_decline: ['intercom', 'trustpilot'],
  nps_decline: ['trustpilot', 'intercom'],
  rating_decline: ['trustpilot'],
  velocity_drop: ['jira'],
  bug_backlog_growth: ['jira'],
  cycle_time_increase: ['jira'],
  blocked_tickets_spike: ['jira'],
}

export type SignalFlag = {
  signalId: string
  type: 'confirmed' | 'conflict'
  bySource: string
  note: string
}

export type SignalWithFlags = {
  id: string
  signal_type: string
  severity: string
  status: string
  dimension: string
  source: string
  insight_summary: unknown
  recommended_action: unknown
  confidence_score: number
  founder_feedback: unknown
  created_at: string
  updated_at?: string
  previous_value?: unknown
  value?: unknown
  change_percent?: unknown
  trend?: unknown
  scan_count?: number
  raw_data?: Record<string, unknown> | null
  flags: SignalFlag[]
}

export function analyseSignalConflicts(signals: SignalWithFlags[]): SignalWithFlags[] {
  const active = signals.filter(s => s.status === 'new' || s.status === 'acknowledged')

  const byType = new Map<string, SignalWithFlags[]>()
  for (const signal of active) {
    const existing = byType.get(signal.signal_type) ?? []
    byType.set(signal.signal_type, [...existing, signal])
  }

  for (const [, group] of byType) {
    if (group.length < 2) continue

    const toolSignals = group.filter(s => s.source !== 'manual')
    const assessmentSignals = group.filter(s => s.source === 'manual')
    const csvSignals = group.filter(s => s.source === 'csv')

    // Assessment vs tool signals
    for (const assessment of assessmentSignals) {
      for (const tool of toolSignals) {
        const direction = SIGNAL_DIRECTION[assessment.signal_type]
        const aVal = assessment.value
        const tVal = tool.value

        if (aVal !== null && aVal !== undefined && tVal !== null && tVal !== undefined) {
          const aBad = direction === 'lower_better' ? Number(aVal) > 50 : Number(aVal) < 50
          const tBad = direction === 'lower_better' ? Number(tVal) > 50 : Number(tVal) < 50

          if (aBad === tBad) {
            assessment.flags.push({ signalId: tool.id, type: 'confirmed', bySource: tool.source, note: `Confirmed by ${tool.source} data` })
            tool.flags.push({ signalId: assessment.id, type: 'confirmed', bySource: 'manual', note: 'Confirmed by assessment answers' })
          } else {
            assessment.flags.push({ signalId: tool.id, type: 'conflict', bySource: tool.source, note: `Conflicts with ${tool.source} data — review which is accurate` })
            tool.flags.push({ signalId: assessment.id, type: 'conflict', bySource: 'manual', note: 'Conflicts with assessment answers — review which is accurate' })
          }
        }
      }
    }

    // CSV vs tool signals — only compare against compatible sources
    for (const csv of csvSignals) {
      const allowedSources = CSV_CONFIRMATION_SOURCES[csv.signal_type] ?? []

      for (const tool of toolSignals.filter(s => s.source !== 'csv')) {
        // Skip if this tool source doesn't measure the same metric as this CSV signal
        if (!allowedSources.includes(tool.source)) continue

        const direction = SIGNAL_DIRECTION[csv.signal_type]
        const cVal = csv.value
        const tVal = tool.value

        if (cVal !== null && cVal !== undefined && tVal !== null && tVal !== undefined) {
          const cBad = direction === 'lower_better' ? Number(cVal) > 50 : Number(cVal) < 50
          const tBad = direction === 'lower_better' ? Number(tVal) > 50 : Number(tVal) < 50

          if (cBad === tBad) {
            csv.flags.push({ signalId: tool.id, type: 'confirmed', bySource: tool.source, note: `Confirmed by ${tool.source} data` })
          } else {
            csv.flags.push({ signalId: tool.id, type: 'conflict', bySource: tool.source, note: `Conflicts with ${tool.source} — check if data is from same time period` })
            tool.flags.push({ signalId: csv.id, type: 'conflict', bySource: 'csv', note: 'Conflicts with CSV upload — check if data is from same time period' })
          }
        }
      }
    }
  }

  return signals
}

export const SIGNAL_CASCADES: Record<string, string[]> = {
  response_time_increase: ['ticket_volume_increase', 'repeat_complaint_pattern', 'csat_decline', 'churn_spike'],
  bug_backlog_growth: ['velocity_drop', 'cycle_time_increase', 'blocked_tickets_spike', 'churn_spike'],
  velocity_drop: ['bug_backlog_growth', 'blocked_tickets_spike', 'cycle_time_increase'],
  conversion_fall: ['engagement_drop', 'session_duration_drop', 'churn_spike', 'aov_decline'],
  activation_drop: ['churn_spike', 'ticket_volume_increase', 'repeat_complaint_pattern'],
  repeat_complaint_pattern: ['churn_spike', 'csat_decline', 'rating_decline', 'ticket_volume_increase'],
  traffic_source_shift: ['conversion_fall', 'engagement_drop'],
  engagement_drop: ['conversion_fall', 'session_duration_drop', 'churn_spike'],
  nps_decline: ['churn_spike', 'repeat_complaint_pattern', 'csat_decline'],
  csat_decline: ['churn_spike', 'repeat_complaint_pattern', 'ticket_volume_increase'],
  refund_spike: ['churn_spike', 'repeat_purchase_drop', 'aov_decline'],
  aov_decline: ['conversion_fall', 'churn_spike'],
}

export function calculatePriorityScore(
  signal: SignalWithFlags,
  allActiveSignals: SignalWithFlags[]
): number {
  const activeTypes = allActiveSignals.map(s => s.signal_type)
  const cascades = SIGNAL_CASCADES[signal.signal_type] ?? []
  const cascadeCount = cascades.filter(t => activeTypes.includes(t)).length
  const severityWeight = signal.severity === 'critical' ? 15 : signal.severity === 'warning' ? 7 : 2
  const confirmationBonus = signal.flags.some(f => f.type === 'confirmed') ? 5 : 0
  const conflictPenalty = signal.flags.some(f => f.type === 'conflict') ? 3 : 0
  return (cascadeCount * 3) + severityWeight + confirmationBonus - conflictPenalty
}