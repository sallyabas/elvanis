import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import { recordScan } from '@/lib/scan-recorder'
import type { SignalUpsertResult } from '@/lib/scan-recorder'
import { resetStaleConflictPreferences } from '@/lib/conflict-reset'
import { calculateHealthScore, ScoringInput } from '@/lib/health-scoring'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)


function buildScanEmailHtml(params: {
  founderName: string
  founderEmail: string
  results: Array<{ source: string; signals: number; note?: string; error?: string }>
  totalSignals: number
  dashboardUrl: string
}): string {
  const { founderEmail, results, totalSignals, dashboardUrl } = params

  const sourceLabel: Record<string, string> = {
    ga4: '📊 Google Analytics',
    jira: '🔧 Jira',
    trustpilot: '⭐ Trustpilot',
    intercom: '💬 Intercom',
    shopify: '🛍️ Shopify',
    csv: '📁 CSV',
  }

  const successfulSources = results.filter(r => !r.error && !r.note && r.signals > 0)
  const noChangeSources   = results.filter(r => !r.error && !r.note && r.signals === 0)
  const skippedSources    = results.filter(r => r.note)
  const errorSources      = results.filter(r => r.error)
  const hasNewSignals     = totalSignals > 0

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F9FAFB;font-family:Inter,Arial,sans-serif">
<div style="max-width:600px;margin:0 auto;padding:32px 16px">
  <div style="text-align:center;margin-bottom:32px">
    <h1 style="font-size:28px;font-weight:800;color:#2563EB;margin:0">Elvanis</h1>
    <p style="color:#6B7280;font-size:14px;margin:4px 0 0">Your latest scan is ready</p>
  </div>
  <div style="background:#fff;border-radius:16px;border:1px solid #E5E7EB;padding:32px;margin-bottom:20px;text-align:center">
    <div style="font-size:64px;margin-bottom:16px">${hasNewSignals ? '🔍' : '✅'}</div>
    <h2 style="font-size:22px;font-weight:800;color:#111827;margin:0 0 8px">
      ${hasNewSignals ? `${totalSignals} signal${totalSignals !== 1 ? 's' : ''} detected` : 'Scan complete — no new signals'}
    </h2>
    <p style="color:#6B7280;font-size:15px;line-height:1.6;margin:0">
      ${hasNewSignals
        ? `Elvanis found ${totalSignals} signal${totalSignals !== 1 ? 's' : ''} across your connected sources.Review them now and take action on the highest priority issues.`
        : 'Your business looks stable. No new signals were detected in this scan. Keep monitoring — Elvanis will alert you when something changes.'}
    </p>
  </div>
  ${successfulSources.length > 0 || noChangeSources.length > 0 ? `
  <div style="background:#fff;border-radius:16px;border:1px solid #E5E7EB;padding:24px;margin-bottom:20px">
    <h3 style="font-size:15px;font-weight:700;color:#111827;margin:0 0 16px">Signals by source</h3>
    ${successfulSources.map(r => `
    <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid #F3F4F6">
      <span style="font-size:14px;color:#374151;font-weight:500">${sourceLabel[r.source] ?? r.source}</span>
      <span style="font-size:14px;font-weight:700;color:#DC2626;background:#FEF2F2;padding:2px 10px;border-radius:20px">${r.signals} signal${r.signals !== 1 ? 's' : ''}</span>
    </div>`).join('')}
    ${noChangeSources.map(r => `
    <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid #F3F4F6">
      <span style="font-size:14px;color:#9CA3AF">${sourceLabel[r.source] ?? r.source}</span>
      <span style="font-size:12px;color:#9CA3AF">No change</span>
    </div>`).join('')}
  </div>` : ''}
  <div style="text-align:center;margin-bottom:24px">
    <a href="${dashboardUrl}/signals" style="display:inline-block;padding:14px 36px;background:#2563EB;color:#fff;font-weight:700;border-radius:12px;text-decoration:none;font-size:16px">View signals →</a>
  </div>
  ${skippedSources.length > 0 || errorSources.length > 0 ? `
  <div style="background:#FFFBEB;border:1px solid #FDE68A;border-radius:12px;padding:16px;margin-bottom:20px">
    <p style="font-size:13px;font-weight:700;color:#D97706;margin:0 0 8px">Scan notes</p>
    ${skippedSources.map(r => `<p style="font-size:13px;color:#92400E;margin:4px 0">${sourceLabel[r.source] ?? r.source}: ${r.note}</p>`).join('')}
    ${errorSources.map(r => `<p style="font-size:13px;color:#DC2626;margin:4px 0">${sourceLabel[r.source] ?? r.source}: ${r.error}</p>`).join('')}
  </div>` : ''}
  <div style="text-align:center;border-top:1px solid #E5E7EB;padding-top:20px">
    <p style="color:#9CA3AF;font-size:12px;margin:0">Elvanis · Know what to fix before you scale</p>
    <p style="color:#9CA3AF;font-size:12px;margin:4px 0 0">${founderEmail}</p>
  </div>
</div>
</body>
</html>`
}

export async function POST(request: NextRequest) {
  let scanCompleted = false
  let masterScanId  = ''

  try {
    // F15: sendEmail default changed from true → false
    // Safer default — prevents accidental mass emails if caller omits the field
    const { founderId, sourceType, force, sendEmail = false, triggeredBy = 'manual' } = await request.json()
    if (!founderId) return NextResponse.json({ error: 'founderId required' }, { status: 400 })

    const supabase = createAdminClient()

    const { data: founder } = await supabase
      .from('founders')
      .select('id, email, full_name, subscription_tier')
      .eq('id', founderId)
      .maybeSingle()

    if (!founder) return NextResponse.json({ error: 'Founder not found' }, { status: 404 })

    // F13: Free tier guard — manual scans require Navigator plan
    // 403 = plan mismatch (not a rate limit — they have no permission)
    if (triggeredBy === 'manual' && founder.subscription_tier !== 'navigator') {
      return NextResponse.json(
        { error: 'Manual scans require Navigator plan. Upgrade to run on-demand scans.' },
        { status: 403 }
      )
    }

    // F14: Navigator weekly rolling limit — max 1 manual scan per 7 rolling days
    // 429 = rate limit (they have permission but have hit the usage ceiling)
    if (triggeredBy === 'manual' && founder.subscription_tier === 'navigator') {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
      const { count } = await supabase
        .from('scans')
        .select('id', { count: 'exact', head: true })
        .eq('founder_id', founderId)
        .eq('triggered_by', 'manual')
        .gte('created_at', sevenDaysAgo)

      if ((count ?? 0) >= 1) {
        // Calculate next available date from last manual scan
        const { data: lastScan } = await supabase
          .from('scans')
          .select('created_at')
          .eq('founder_id', founderId)
          .eq('triggered_by', 'manual')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        const nextAvailable = lastScan
          ? new Date(new Date(lastScan.created_at).getTime() + 7 * 24 * 60 * 60 * 1000)
              .toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
          : 'in 7 days'

        return NextResponse.json(
          { error: `Weekly scan limit reached. Next scan available ${nextAvailable}.` },
          { status: 429 }
        )
      }
    }

    let query = supabase
      .from('data_sources')
      .select('*')
      .eq('founder_id', founderId)
      .eq('status', 'active')

    if (sourceType) {
      query = query.eq('source_type', sourceType) as typeof query
    }

    const { data: sources } = await query

    if (!sources || sources.length === 0) {
      return NextResponse.json({ error: 'No connected sources found' }, { status: 400 })
    }

    const { data: masterRow, error: masterErr } = await supabase
      .from('scans')
      .insert({
        founder_id:      founderId,
        triggered_by:    triggeredBy,
        parent_scan_id:  null,
        status:          'processing',
        sources:         [],
        signals_new:     0,
        signals_updated: 0,
        scanned_at:      new Date().toISOString(),
      })
      .select('id')
      .single()

    if (masterErr || !masterRow) {
      console.error('[scan] master row insert failed:', masterErr?.message)
      return NextResponse.json({ error: 'Failed to initialise scan' }, { status: 500 })
    }

    masterScanId = masterRow.id
    console.log(`[scan] master row created: ${masterScanId} triggered_by=${triggeredBy}`)

    const results: Array<{
      source: string
      signals: number
      inserted: number
      updated: number
      note?: string
      error?: string
    }> = []

    const base = process.env.NEXT_PUBLIC_APP_URL!

    for (const source of sources) {
      try {
        const isOperational = ['jira', 'intercom'].includes(source.source_type)
        const frequencyDays = isOperational ? 7 : 30

        if (isOperational && founder.subscription_tier !== 'navigator') {
          results.push({
            source: source.source_type,
            signals: 0, inserted: 0, updated: 0,
            note: 'Weekly scans available on Navigator plan',
          })
          continue
        }

        if (!force && !sourceType && source.last_synced_at) {
          const daysSince = (Date.now() - new Date(source.last_synced_at).getTime()) / (24 * 60 * 60 * 1000)
          if (daysSince < frequencyDays) {
            results.push({
              source: source.source_type,
              signals: 0, inserted: 0, updated: 0,
              note: `Next scan in ${Math.ceil(frequencyDays - daysSince)} days`,
            })
            continue
          }
        }

        if (source.source_type === 'trustpilot') {
          const domain = source.config?.domain
          if (domain) {
            const res = await fetch(`${base}/api/scrape/trustpilot`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ domain, founderId, parentScanId: masterScanId, triggeredBy }),
            })
            const data = await res.json()
            results.push({ source: 'trustpilot', signals: data.signals ?? 0, inserted: data.inserted ?? 0, updated: data.updated ?? 0 })
          }
        }

        if (source.source_type === 'ga4') {
          const propertyId = source.config?.selected_property_id
          if (propertyId) {
            const res = await fetch(`${base}/api/scrape/ga4`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ founderId, parentScanId: masterScanId, triggeredBy }),
            })
            const data = await res.json()
            results.push({ source: 'ga4', signals: data.signals ?? 0, inserted: data.inserted ?? 0, updated: data.updated ?? 0 })
          } else {
            results.push({ source: 'ga4', signals: 0, inserted: 0, updated: 0, error: 'No property selected' })
          }
        }

        if (source.source_type === 'jira') {
          const projectKey = source.config?.project_key
          if (projectKey) {
            const res = await fetch(`${base}/api/scrape/jira`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ founderId, parentScanId: masterScanId, triggeredBy }),
            })
            const data = await res.json()
            results.push({ source: 'jira', signals: data.signals ?? 0, inserted: data.inserted ?? 0, updated: data.updated ?? 0 })
          } else {
            results.push({ source: 'jira', signals: 0, inserted: 0, updated: 0, error: 'No project selected' })
          }
        }

        if (source.source_type === 'csv') {
          results.push({ source: 'csv', signals: 0, inserted: 0, updated: 0, note: 'CSV is upload-only' })
        }

        if (source.source_type === 'shopify') {
          const res = await fetch(`${base}/api/scrape/shopify`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ founderId, parentScanId: masterScanId, triggeredBy }),
          })
          const data = await res.json()
          results.push({ source: 'shopify', signals: data.signals ?? 0, inserted: data.inserted ?? 0, updated: data.updated ?? 0 })
        }

        if (source.source_type === 'intercom') {
          const res = await fetch(`${base}/api/scrape/intercom`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ founderId, parentScanId: masterScanId, triggeredBy }),
          })
          const data = await res.json()
          results.push({ source: 'intercom', signals: data.signals ?? 0, inserted: data.inserted ?? 0, updated: data.updated ?? 0 })
        }

      } catch (err) {
        results.push({ source: source.source_type, signals: 0, inserted: 0, updated: 0, error: String(err) })
      }
    }

    const scannedSources  = results.filter(r => !r.note && !r.error).map(r => r.source)
    const erroredResults  = results.filter(r => r.error)
    const totalSignals    = results.reduce((s, r) => s + (r.signals  ?? 0), 0)
    const totalInserted   = results.reduce((s, r) => s + (r.inserted ?? 0), 0)
    const totalUpdated    = results.reduce((s, r) => s + (r.updated  ?? 0), 0)
    const actuallyRan     = scannedSources.length > 0
    const hasErrors       = erroredResults.length > 0
    const scanStatus      = hasErrors && actuallyRan ? 'partial_failure'
      : hasErrors && !actuallyRan ? 'partial_failure'
      : 'completed'
    const errorLog        = hasErrors
      ? erroredResults.map(r => `${r.source}: ${r.error}`).join(' | ')
      : null

    const { error: updateErr } = await supabase
      .from('scans')
      .update({
        status:          scanStatus,
        sources:         scannedSources,
        signals_new:     totalInserted,
        signals_updated: totalUpdated,
        error_log:       errorLog,
      })
      .eq('id', masterScanId)

    if (updateErr) console.error('[scan] master row update failed:', updateErr.message)

    if (erroredResults.length > 0) {
      const failedSources = erroredResults.map(r => r.source)
      await resetStaleConflictPreferences(founderId, failedSources)
    }

    if (actuallyRan) {
      const { data: activeSignals } = await supabase
        .from('diagnostic_signals')
        .select('severity, signal_type')
        .eq('founder_id', founderId)
        .in('status', ['new', 'acknowledged'])
        .neq('source', 'manual')

      const scoringInputs: ScoringInput[] = (activeSignals ?? []).map(s => ({
        signal_type: s.signal_type as string,
        severity:    s.severity    as string,
      }))
      const healthScore = calculateHealthScore(scoringInputs)

      if (healthScore !== -1) {
        const { error: healthErr } = await supabase
          .from('health_score_history')
          .insert({
            founder_id:   founderId,
            health_score: healthScore,
            signal_count: activeSignals?.length ?? 0,
            scanned_at:   new Date().toISOString(),
          })
        if (healthErr) console.error('[scan] health_score_history insert failed:', healthErr.message)
        else console.log(`[scan] health score saved: ${healthScore}`)
      }

      const { checkAndUpdateGoals } = await import('@/lib/goal-checker')
      await checkAndUpdateGoals(founderId, supabase)

      const { data: currentSignals } = await supabase
        .from('diagnostic_signals')
        .select('id, signal_type, source, dimension, severity, value, trend, insight_summary')
        .eq('founder_id', founderId)
        .in('status', ['new', 'acknowledged'])

      if (currentSignals && currentSignals.length > 0) {
        const snapshots = currentSignals.map(s => ({
          scan_id:         masterScanId,
          founder_id:      founderId,
          signal_id:       s.id,
          signal_type:     s.signal_type,
          source:          s.source,
          dimension:       s.dimension,
          severity:        s.severity,
          value:           s.value,
          trend:           s.trend,
          insight_summary: s.insight_summary,
          scanned_at:      new Date().toISOString(),
        }))
        try {
          const { error: snapErr } = await supabase.from('signal_snapshots').insert(snapshots)
          if (snapErr) throw snapErr
        } catch (snapErr) {
          const msg = snapErr instanceof Error ? snapErr.message : String(snapErr)
          console.error('[scan] signal_snapshots insert failed:', msg)
          await supabase.from('scans')
            .update({ data_quality_notes: `Master snapshot failure: ${msg}` })
            .eq('id', masterScanId)
        }
      }

      // Send scan completion email — manual scans only when sendEmail: true
      // F15: sendEmail defaults to false — caller must explicitly opt in
      if (founder.email && sendEmail) {
        try {
          const { error: emailError } = await resend.emails.send({
            from: process.env.RESEND_FROM_EMAIL ?? 'onboarding@resend.dev',
            to:   founder.email,
            subject: totalSignals > 0
              ? `Elvanis scan complete — ${totalSignals} signal${totalSignals !== 1 ? 's' : ''} detected`
              : 'Elvanis scan complete — no new signals',
            html: buildScanEmailHtml({
              founderName:  founder.full_name?.split(' ')[0] ?? 'there',
              founderEmail: founder.email,
              results,
              totalSignals,
              dashboardUrl: process.env.NEXT_PUBLIC_APP_URL!,
            }),
          })
          if (emailError) console.error('[scan] email error:', emailError)
          else console.log(`[scan] email sent to ${founder.email}`)
        } catch (emailErr) {
          console.error('[scan] email send failed:', emailErr)
        }
      }
    }

    console.log(`[scan] complete — master=${masterScanId} status=${scanStatus} new=${totalInserted} updated=${totalUpdated}`)
    scanCompleted = true
    return NextResponse.json({ success: true, results, masterScanId })

  } catch (err) {
    console.error('[scan] error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  } finally {
    if (!scanCompleted && masterScanId) {
      const admin = createAdminClient()
      await admin.from('scans')
        .update({ status: 'failed', error_log: 'Scan crashed mid-execution — check server logs' })
        .eq('id', masterScanId)
        .eq('status', 'processing')
    }
  }
}