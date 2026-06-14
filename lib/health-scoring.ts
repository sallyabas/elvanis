// lib/health-scoring.ts
// Pure math engine — no DB, no API, no filtering.
// Caller is responsible for pre-filtering to active, non-manual signals only.
// Used by: app/api/scan/route.ts, app/dashboard/page.tsx

export type ScoringInput = {
  signal_type: string
  severity:    string
}

// ── Dimension map — signal_type → dimension ──────────────────────────────
// One penalty per dimension regardless of signal count.
// Worst severity in a dimension wins — 5 warnings + 1 critical = critical.
// 'product' is the catch-all for any unrecognised signal type.

const SIGNAL_DIMENSION: Record<string, string> = {
  // Customer — retention and sentiment
  churn_spike:              'customer',
  nps_decline:              'customer',
  csat_decline:             'customer',
  repeat_complaint_pattern: 'customer',
  rating_decline:           'customer',

  // Revenue — financial health
  refund_spike:   'revenue',
  aov_decline:    'revenue',
  conversion_fall:'revenue',

  // Marketing — acquisition and funnel
  traffic_source_shift:  'marketing',
  session_duration_drop: 'marketing',
  engagement_drop:       'marketing',
  activation_drop:       'marketing',

  // Team — throughput and delivery
  velocity_drop:          'team',
  bug_backlog_growth:     'team',
  cycle_time_increase:    'team',
  blocked_tickets_spike:  'team',

  // Support — operational health
  ticket_volume_increase: 'support',
  response_time_increase: 'support',
}

// ── Severity → penalty ───────────────────────────────────────────────────
const SEVERITY_PENALTY: Record<string, number> = {
  critical: -15,
  warning:  -7,
  watch:    -2,
}

const SEVERITY_RANK: Record<string, number> = {
  critical: 3,
  warning:  2,
  watch:    1,
}

// ── Main function ────────────────────────────────────────────────────────

/**
 * Calculate business health score from pre-filtered signals.
 * Caller must filter to active (new/acknowledged), non-manual signals before calling.
 *
 * Returns -1 if no signals provided (no data state — caller renders '—').
 * Returns 0–100 otherwise.
 */
export function calculateHealthScore(signals: ScoringInput[]): number {
  if (signals.length === 0) return -1

  // Pass 1: determine worst severity per dimension
  const dimensionWorstSeverity = new Map<string, string>()

  for (const signal of signals) {
    const dimension = SIGNAL_DIMENSION[signal.signal_type] ?? 'product'
    const existing  = dimensionWorstSeverity.get(dimension)

    if (
      !existing ||
      (SEVERITY_RANK[signal.severity] ?? 0) > (SEVERITY_RANK[existing] ?? 0)
    ) {
      dimensionWorstSeverity.set(dimension, signal.severity)
    }
  }

  // Pass 2: sum one penalty per dimension
  let totalPenalty = 0
  for (const [, severity] of dimensionWorstSeverity) {
    totalPenalty += SEVERITY_PENALTY[severity] ?? 0
  }

  // Clamp to [0, 100]
  return Math.max(0, Math.min(100, 100 + totalPenalty))
}

// ── Health label ─────────────────────────────────────────────────────────
// Shared so dashboard and any future pages use the same thresholds.

export function getHealthLabel(score: number): { label: string; labelKey: string; color: string; bg: string } {
  if (score >= 80) return { label: 'Healthy',         labelKey: 'assessment.status_healthy',         color: '#059669', bg: '#ECFDF5' }
  if (score >= 60) return { label: 'Needs Attention', labelKey: 'assessment.status_needs_attention', color: '#D97706', bg: '#FFFBEB' }
  if (score >= 40) return { label: 'At Risk',         labelKey: 'assessment.status_at_risk',         color: '#DC2626', bg: '#FEF2F2' }
  return                   { label: 'Critical',       labelKey: 'assessment.status_critical',        color: '#991B1B', bg: '#FEF2F2' }
}