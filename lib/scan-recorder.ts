// lib/scan-recorder.ts
// Called at the end of every scrape route after all signal upserts.
// Creates one scan row + one snapshot per signal touched.
//
// ⚠️  CONTRACT: scan_count MUST be incremented in each scrape route's update block.
// recordScan does NOT increment scan_count — it only handles scan row + snapshots.
// If you add a new scraper, you are responsible for incrementing scan_count yourself.

import { createAdminClient } from '@/lib/supabase-server'

// Inline — avoids any circular import with signal-analysis.ts
const SIGNAL_DIRECTION: Record<string, 'lower_better' | 'higher_better'> = {
  churn_spike:              'lower_better',
  ticket_volume_increase:   'lower_better',
  rating_decline:           'higher_better',
  velocity_drop:            'higher_better',
  conversion_fall:          'higher_better',
  engagement_drop:          'higher_better',
  refund_spike:             'lower_better',
  response_time_increase:   'lower_better',
  repeat_complaint_pattern: 'lower_better',
  bug_backlog_growth:       'lower_better',
  aov_decline:              'higher_better',
  repeat_purchase_drop:     'higher_better',
  activation_drop:          'higher_better',
  traffic_source_shift:     'lower_better',
  session_duration_drop:    'higher_better',
  cycle_time_increase:      'lower_better',
  blocked_tickets_spike:    'lower_better',
  nps_decline:              'higher_better',
  csat_decline:             'higher_better',
}

export type SignalUpsertResult = {
  id:              string
  signal_type:     string
  source:          string
  severity:        string
  dimension:       string
  value:           number | null
  change_percent:  number | null
  trend:           string          // 'new' | 'improving' | 'worsening' | 'unchanged'
  insight_summary: string
  previous_value:  number | null
  scan_count:      number
}

type AdminClient = ReturnType<typeof createAdminClient>

/**
 * Determines trend direction based on signal type semantics.
 * Use in scrape routes that do not already compute trend inline (GA4 already does).
 *
 * ⚠️  If signalType is not in SIGNAL_DIRECTION, falls back to lower=improving.
 *     A warning is logged — add the new type to SIGNAL_DIRECTION to fix.
 */
export function determineTrend(
  signalType: string,
  previousValue: number | null | undefined,
  currentValue:  number | null | undefined
): 'new' | 'improving' | 'worsening' | 'unchanged' {
  if (previousValue === null || previousValue === undefined) return 'new'
  if (currentValue  === null || currentValue  === undefined) return 'unchanged'

  const direction = SIGNAL_DIRECTION[signalType]

  if (!direction) {
    // Fix 1: warn when signal type has no direction mapping
    // Add the signal type to SIGNAL_DIRECTION above to resolve this
    console.warn(`[scan-recorder] Unknown signal direction for: "${signalType}" — defaulting to lower_better. Add to SIGNAL_DIRECTION.`)
    if (currentValue < previousValue) return 'improving'
    if (currentValue > previousValue) return 'worsening'
    return 'unchanged'
  }

  if (direction === 'lower_better') {
    if (currentValue < previousValue) return 'improving'
    if (currentValue > previousValue) return 'worsening'
    return 'unchanged'
  } else {
    if (currentValue > previousValue) return 'improving'
    if (currentValue < previousValue) return 'worsening'
    return 'unchanged'
  }
}

/**
 * Fix 5: Private helper — best-effort snapshot recorder.
 * Isolated from main flow. Fails silently to the caller but:
 * - logs the error to console
 * - tags the scan row with data_quality_notes for admin visibility
 *
 * Query degraded scans: SELECT * FROM scans WHERE data_quality_notes IS NOT NULL
 */
async function recordSnapshots(
  admin:     AdminClient,
  scanId:    string,
  snapshots: Record<string, unknown>[]
): Promise<void> {
  try {
    const { error } = await admin.from('signal_snapshots').insert(snapshots)
    if (error) throw error
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error(`[scan-recorder] Snapshot failure for scan=${scanId}:`, msg)
    // Tag the scan row as degraded — visible in admin without breaking main flow
    await admin
      .from('scans')
      .update({ data_quality_notes: `Snapshot failure: ${msg}` })
      .eq('id', scanId)
  }
}

/**
 * Records a completed scan run:
 * 1. Creates a row in public.scans (child when parentScanId provided, standalone when null)
 * 2. Inserts a snapshot row per signal via recordSnapshots helper
 *
 * Call AFTER all signal upserts are done in the scrape route.
 *
 * @param founderId    - founder UUID
 * @param sourceType   - e.g. 'shopify', 'intercom', 'ga4'
 * @param signals      - upserted signals from this scan run (can be empty)
 * @param parentScanId - master scan id if this is a child scan, null for standalone
 * @param triggeredBy  - REQUIRED: 'manual' | 'cron' | 'connect' — must be explicit, no default
 *
 * ⚠️  scan_count must be incremented by the scrape route, not here.
 */
export async function recordScan(
  founderId:    string,
  sourceType:   string,
  signals:      SignalUpsertResult[],
  parentScanId: string | null,
  triggeredBy:  'manual' | 'cron' | 'connect'
): Promise<{ scanId: string }> {
  // Fix 2: only return early if founderId missing — not on empty signals
  // Empty signals still create a scan row to track that the scan ran
  if (!founderId) return { scanId: '' }

  const admin        = createAdminClient()
  const newCount     = signals.filter(s => s.trend === 'new').length
  const updatedCount = signals.filter(s => s.trend !== 'new').length

  // 1 — Scan row
  const { data: scan, error: scanErr } = await admin
    .from('scans')
    .insert({
      founder_id:      founderId,
      sources:         [sourceType],
      signals_new:     newCount,
      signals_updated: updatedCount,
      parent_scan_id:  parentScanId,
      triggered_by:    triggeredBy,
      status:          'completed',
    })
    .select('id')
    .single()

  if (scanErr || !scan) {
    console.error('[scan-recorder] Failed to create scan row:', scanErr?.message)
    return { scanId: '' }
  }

  // 2 — Snapshots via isolated helper
  // Fix 6: awaited — serverless functions terminate on response, fire-and-forget is unsafe
  // Fix 5: helper handles its own errors, tags scan row as degraded if snapshot fails
  if (signals.length > 0) {
    const snapshots = signals.map(s => ({
      scan_id:         scan.id,
      signal_id:       s.id,
      founder_id:      founderId,
      signal_type:     s.signal_type,
      source:          s.source,
      severity:        s.severity,
      dimension:       s.dimension,
      value:           s.value,
      change_percent:  s.change_percent,
      trend:           s.trend,
      insight_summary: s.insight_summary,
    }))
    await recordSnapshots(admin, scan.id, snapshots)
  }

  // scan_count is already incremented in each scrape route's update block
  // recordScan only handles scan row + snapshots — no double increment here

  console.log(`[scan-recorder] scan=${scan.id} source=${sourceType} new=${newCount} updated=${updatedCount}`)
  return { scanId: scan.id }
}