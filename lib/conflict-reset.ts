// lib/conflict-reset.ts
// Resets conflict preferences when EITHER trusted OR conflicting source values
// change beyond the doubling threshold (0.5x–2.0x).
// Called after every scan (manual, auto, connect/disconnect).

import { createAdminClient } from '@/lib/supabase-server'

/*const SIGNAL_DIRECTION: Record<string, 'lower_better' | 'higher_better'> = {
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
}*/

/**
 * Resets conflict preferences when EITHER the trusted OR conflicting source
 * value changes beyond the doubling threshold (0.5x–2.0x).
 *
 * Two rules:
 * Rule 1 — Trusted source scans and its value changed → reset immediately
 * Rule 2 — Conflicting source scans and its value changed → reset immediately
 *
 * For CSV — value read from DB (last uploaded). CSV never in scannedSources
 * but its current DB value is checked when the other source scans.
 *
 * @param founderId - the founder whose preferences to check
 * @param scannedSources - sources that ran in this scan (e.g. ['shopify'] or ['ga4', 'jira'])
 */
export async function resetStaleConflictPreferences(
  founderId: string,
  scannedSources: string[]
): Promise<void> {
  if (!founderId || scannedSources.length === 0) return

  const admin = createAdminClient()

  try {
    // ── Fetch preferences where EITHER trusted_source OR conflicting_source was scanned ──
    // This covers both Rule 1 and Rule 2
    const { data: trustedPrefs } = await admin
      .from('conflict_resolutions')
      .select('id, signal_type, trusted_source, trusted_value, conflicting_source, conflicting_value')
      .eq('founder_id', founderId)
      .in('trusted_source', scannedSources)

    const { data: conflictingPrefs } = await admin
      .from('conflict_resolutions')
      .select('id, signal_type, trusted_source, trusted_value, conflicting_source, conflicting_value')
      .eq('founder_id', founderId)
      .in('conflicting_source', scannedSources)

    // Merge and deduplicate by id
    type PrefRow = {
      id: string
      signal_type: string
      trusted_source: string
      trusted_value: number | null
      conflicting_source: string | null
      conflicting_value: number | null
    }
    const prefMap = new Map<string, PrefRow>()
    for (const p of [...(trustedPrefs ?? []), ...(conflictingPrefs ?? [])]) {
      prefMap.set(p.id, p as PrefRow)
    }
    const activePrefs = Array.from(prefMap.values())

    if (activePrefs.length === 0) return

    // ── Collect ALL sources involved — both trusted and conflicting ──
    // Fetch current values for both sides regardless of what was scanned
    // CSV value comes from last upload — still valid as current value
    const allSources = new Set<string>()
    for (const pref of activePrefs) {
      if (pref.trusted_source) allSources.add(pref.trusted_source)
      if (pref.conflicting_source) allSources.add(pref.conflicting_source)
    }

    const allSignalTypes = [...new Set(activePrefs.map(p => p.signal_type))]

    const { data: currentSignals } = await admin
      .from('diagnostic_signals')
      .select('signal_type, source, value')
      .eq('founder_id', founderId)
      .in('status', ['new', 'acknowledged'])
      .in('source', Array.from(allSources))
      .in('signal_type', allSignalTypes)

    if (!currentSignals || currentSignals.length === 0) return

    // Build map: signal_type:source → current value
    const signalMap = new Map<string, number | null>()
    for (const s of currentSignals) {
      const key = `${s.signal_type}:${s.source}`
      if (!signalMap.has(key)) {
        signalMap.set(key, s.value !== null && s.value !== undefined ? Number(s.value) : null)
      }
    }

    // ── Check each preference — BOTH sides ──
    const staleIds: string[] = []

    for (const pref of activePrefs) {

      // Rule 1 — Check trusted source
      const trustedCurrent = signalMap.get(`${pref.signal_type}:${pref.trusted_source}`)
      const trustedOld = pref.trusted_value !== null && pref.trusted_value !== undefined
        ? Number(pref.trusted_value) : null

      let trustedChanged = false
      if (trustedCurrent !== null && trustedCurrent !== undefined && trustedOld !== null && trustedOld !== 0) {
        const ratio = trustedCurrent / trustedOld
        trustedChanged = ratio < 0.5 || ratio > 2.0
      }

      // Rule 2 — Check conflicting source
      const conflictingCurrent = pref.conflicting_source
        ? signalMap.get(`${pref.signal_type}:${pref.conflicting_source}`)
        : null
      const conflictingOld = pref.conflicting_value !== null && pref.conflicting_value !== undefined
        ? Number(pref.conflicting_value) : null

      let conflictingChanged = false
      if (conflictingCurrent !== null && conflictingCurrent !== undefined && conflictingOld !== null && conflictingOld !== 0) {
        const ratio = conflictingCurrent / conflictingOld
        conflictingChanged = ratio < 0.5 || ratio > 2.0
      }

      // Reset if EITHER side changed beyond threshold
      if (trustedChanged || conflictingChanged) {
        staleIds.push(pref.id)

        const triggeredBy = trustedChanged && conflictingChanged
          ? 'both sides'
          : trustedChanged
            ? `trusted source (${pref.trusted_source})`
            : `conflicting source (${pref.conflicting_source})`

        console.log(
          `[conflict-reset] Reset preference: founder=${founderId} signal=${pref.signal_type} ` +
          `triggered_by=${triggeredBy} ` +
          `trusted=${pref.trusted_source} old=${trustedOld} new=${trustedCurrent} ` +
          `conflicting=${pref.conflicting_source} old=${conflictingOld} new=${conflictingCurrent}`
        )
      }
    }

    // ── Batch delete all stale preferences in one query ──
    if (staleIds.length > 0) {
      await admin
        .from('conflict_resolutions')
        .delete()
        .in('id', staleIds)
    }

  } catch (err) {
    // Non-fatal — never block scan or scrape response
    console.error('[conflict-reset] Error:', err)
  }
}