// lib/signal-dependency-map.ts
// Defines upstream/downstream relationships between signal types.
// Used to show dependency chains in hero card and sequence the action plan.

export type SignalType =
  | 'churn_spike'
  | 'ticket_volume_increase'
  | 'rating_decline'
  | 'velocity_drop'
  | 'conversion_fall'
  | 'engagement_drop'
  | 'refund_spike'
  | 'response_time_increase'
  | 'repeat_complaint_pattern'
  | 'bug_backlog_growth'
  | 'aov_decline'
  | 'repeat_purchase_drop'
  | 'activation_drop'
  | 'traffic_source_shift'
  | 'session_duration_drop'
  | 'cycle_time_increase'
  | 'blocked_tickets_spike'
  | 'nps_decline'
  | 'csat_decline'

export interface SignalDependency {
  upstream:        SignalType[]   // signals that cause this one
  downstream:      SignalType[]   // signals this one causes if unresolved
  horizonDays:     number         // days until downstream signals appear
  crossDimension:  boolean        // does this affect other dimensions?
}

export const SIGNAL_DEPENDENCY_MAP: Record<SignalType, SignalDependency> = {

  response_time_increase: {
    upstream:       ['ticket_volume_increase', 'velocity_drop'],
    downstream:     ['rating_decline', 'nps_decline', 'csat_decline', 'churn_spike'],
    horizonDays:    30,
    crossDimension: true,
  },

  ticket_volume_increase: {
    upstream:       ['activation_drop', 'repeat_complaint_pattern', 'bug_backlog_growth'],
    downstream:     ['response_time_increase', 'csat_decline'],
    horizonDays:    14,
    crossDimension: false,
  },

  repeat_complaint_pattern: {
    upstream:       ['response_time_increase', 'activation_drop'],
    downstream:     ['nps_decline', 'rating_decline', 'churn_spike'],
    horizonDays:    21,
    crossDimension: false,
  },

  csat_decline: {
    upstream:       ['response_time_increase', 'repeat_complaint_pattern'],
    downstream:     ['nps_decline', 'churn_spike'],
    horizonDays:    30,
    crossDimension: false,
  },

  nps_decline: {
    upstream:       ['csat_decline', 'repeat_complaint_pattern', 'response_time_increase'],
    downstream:     ['churn_spike', 'traffic_source_shift'],
    horizonDays:    45,
    crossDimension: true,
  },

  rating_decline: {
    upstream:       ['repeat_complaint_pattern', 'response_time_increase'],
    downstream:     ['traffic_source_shift', 'engagement_drop', 'conversion_fall'],
    horizonDays:    45,
    crossDimension: true,
  },

  churn_spike: {
    upstream:       ['nps_decline', 'csat_decline', 'rating_decline', 'response_time_increase'],
    downstream:     ['aov_decline', 'traffic_source_shift'],
    horizonDays:    60,
    crossDimension: true,
  },

  refund_spike: {
    upstream:       ['activation_drop', 'repeat_complaint_pattern'],
    downstream:     ['aov_decline', 'churn_spike', 'rating_decline'],
    horizonDays:    14,
    crossDimension: true,
  },

  aov_decline: {
    upstream:       ['conversion_fall', 'engagement_drop', 'churn_spike'],
    downstream:     ['churn_spike'],
    horizonDays:    45,
    crossDimension: false,
  },

  repeat_purchase_drop: {
    upstream:       ['csat_decline', 'nps_decline'],
    downstream:     ['churn_spike', 'aov_decline'],
    horizonDays:    45,
    crossDimension: false,
  },

  conversion_fall: {
    upstream:       ['engagement_drop', 'rating_decline', 'traffic_source_shift'],
    downstream:     ['aov_decline', 'churn_spike'],
    horizonDays:    30,
    crossDimension: true,
  },

  engagement_drop: {
    upstream:       ['activation_drop', 'session_duration_drop'],
    downstream:     ['conversion_fall', 'churn_spike'],
    horizonDays:    30,
    crossDimension: false,
  },

  activation_drop: {
    upstream:       ['velocity_drop', 'bug_backlog_growth'],
    downstream:     ['engagement_drop', 'ticket_volume_increase', 'churn_spike'],
    horizonDays:    21,
    crossDimension: true,
  },

  traffic_source_shift: {
    upstream:       ['rating_decline', 'nps_decline'],
    downstream:     ['conversion_fall', 'aov_decline'],
    horizonDays:    60,
    crossDimension: false,
  },

  session_duration_drop: {
    upstream:       ['activation_drop', 'engagement_drop'],
    downstream:     ['conversion_fall', 'engagement_drop'],
    horizonDays:    21,
    crossDimension: false,
  },

  velocity_drop: {
    upstream:       ['blocked_tickets_spike', 'bug_backlog_growth', 'cycle_time_increase'],
    downstream:     ['activation_drop', 'engagement_drop'],
    horizonDays:    60,
    crossDimension: true,
  },

  cycle_time_increase: {
    upstream:       ['blocked_tickets_spike', 'bug_backlog_growth'],
    downstream:     ['velocity_drop', 'activation_drop'],
    horizonDays:    21,
    crossDimension: false,
  },

  bug_backlog_growth: {
    upstream:       ['velocity_drop', 'blocked_tickets_spike'],
    downstream:     ['activation_drop', 'csat_decline', 'rating_decline'],
    horizonDays:    30,
    crossDimension: true,
  },

  blocked_tickets_spike: {
    upstream:       [],
    downstream:     ['cycle_time_increase', 'velocity_drop'],
    horizonDays:    14,
    crossDimension: false,
  },
}

// ── Helper: get downstream signals that cross dimensions ──────
export function getCrossDimensionImpact(
  signalType: SignalType,
): SignalType[] {
  const dep = SIGNAL_DEPENDENCY_MAP[signalType]
  if (!dep || !dep.crossDimension) return []
  return dep.downstream
}

// ── Helper: get the full downstream chain for a signal ────────
export function getDownstreamChain(
  signalType: SignalType,
  depth = 1,
): SignalType[] {
  const dep = SIGNAL_DEPENDENCY_MAP[signalType]
  if (!dep || depth === 0) return []

  const direct = dep.downstream
  if (depth === 1) return direct

  const deeper = direct.flatMap(s => getDownstreamChain(s, depth - 1))
  return [...new Set([...direct, ...deeper])]
}

// ── Helper: get dimension chain alert text ────────────────────
// Used in hero card to show what this signal is affecting
export function getDependencyAlertText(
  signalType: SignalType,
  activeSignalTypes: string[],
): string | null {
  const dep = SIGNAL_DEPENDENCY_MAP[signalType]
  if (!dep || dep.downstream.length === 0) return null

  const atRisk = dep.downstream.filter(
    s => !activeSignalTypes.includes(s)
  )

  if (atRisk.length === 0) return null

  const horizon = dep.horizonDays
  const names   = atRisk.slice(0, 2).map(s =>
    s.replace(/_/g, ' ')
  )

  return `At risk within ${horizon} days: ${names.join(', ')}`
}