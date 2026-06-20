// Vercel max duration — cron processes all founders sequentially
// 300 seconds (5 min) covers ~50 founders with multi-source scans
// Increase to 600 if you see timeout errors in Vercel function logs
export const maxDuration = 300

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import { calculateHealthScore, ScoringInput } from '@/lib/health-scoring'
import { Resend } from 'resend'

export const dynamic = 'force-dynamic'



// ── Daily Orchestrator Cron — runs at 06:00 UTC every day ──
// F1: Replaces app/api/cron/monthly, app/api/cron/auto-scan, app/api/cron/digest
// Single source of truth for all scheduled system operations.
//
// Each day, for every founder:
// 1. Is it anniversary Day 1? → force full scan + monthly report email
// 2. Is it anniversary Day 2? → generate digest (Navigator only)
// 3. Neither?                 → check if any source is due for auto-scan
//
// F2:  cron_runs table — idempotency guard against Vercel retry collisions
// F7:  system_alerts table — observability for blocked digests and failures


function buildMonthlyEmailHtml(params: {
  founderName:     string
  founderEmail:    string
  healthScore:     number
  healthLabel:     string
  topSignals:      Array<{ insight_summary: string; severity: string; source: string }>
  isNavigator:     boolean
  appUrl:          string
  month:           string
}): string {
  const { founderEmail, healthScore, healthLabel, topSignals, isNavigator, appUrl, month } = params
  const scoreColor    = healthScore >= 80 ? '#059669' : healthScore >= 60 ? '#D97706' : healthScore >= 40 ? '#DC2626' : '#991B1B'
  const severityColor = (s: string) => s === 'critical' ? '#DC2626' : s === 'warning' ? '#D97706' : '#6B7280'
  const sourceLabel: Record<string, string> = {
    ga4: 'GA4', jira: 'Jira', trustpilot: 'Trustpilot',
    intercom: 'Intercom', shopify: 'Shopify', csv: 'CSV', manual: 'Assessment',
  }

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F9FAFB;font-family:Inter,Arial,sans-serif">
<div style="max-width:600px;margin:0 auto;padding:32px 16px">
  <div style="text-align:center;margin-bottom:32px">
    <h1 style="font-size:28px;font-weight:800;color:#2563EB;margin:0">Elvanis</h1>
    <p style="color:#6B7280;font-size:14px;margin:4px 0 0">Monthly Business Health Report — ${month}</p>
  </div>
  <div style="background:#fff;border-radius:16px;border:1px solid #E5E7EB;padding:32px;margin-bottom:20px;text-align:center">
    <p style="font-size:12px;font-weight:600;color:#6B7280;text-transform:uppercase;margin:0 0 8px">Business Health Score</p>
    <div style="font-size:72px;font-weight:800;color:${scoreColor};line-height:1">${healthScore}<span style="font-size:28px;color:#9CA3AF">/100</span></div>
    <p style="font-weight:600;color:${scoreColor};margin:12px 0 0">${healthLabel}</p>
  </div>
  ${topSignals.length > 0 ? `
  <div style="background:#fff;border-radius:16px;border:1px solid #E5E7EB;padding:24px;margin-bottom:20px">
    <h3 style="font-size:15px;font-weight:700;color:#111827;margin:0 0 16px">Active Signals This Month</h3>
    ${topSignals.slice(0, 3).map(s => `
    <div style="padding:12px 0;border-bottom:1px solid #F3F4F6">
      <span style="font-size:11px;font-weight:700;padding:2px 8px;border-radius:20px;background:${s.severity === 'critical' ? '#FEF2F2' : s.severity === 'warning' ? '#FFFBEB' : '#F9FAFB'};color:${severityColor(s.severity)}">${s.severity.toUpperCase()}</span>
      <p style="font-size:13px;font-weight:600;color:#111827;margin:6px 0 2px">${s.insight_summary}</p>
      <p style="font-size:11px;color:#9CA3AF;margin:0">${sourceLabel[s.source] ?? s.source}</p>
    </div>`).join('')}
  </div>` : ''}
  ${isNavigator ? `
  <div style="background:#F5F3FF;border-radius:16px;border:1px solid #DDD6FE;padding:24px;margin-bottom:20px;text-align:center">
    <p style="font-size:16px;font-weight:700;color:#4C1D95;margin:0 0 8px">✨ Your Action Digest is being prepared</p>
    <p style="font-size:14px;color:#6D28D9;margin:0 0 20px;line-height:1.6">Your monthly Action Digest will be ready shortly.</p>
    <a href="${appUrl}/plan" style="display:inline-block;padding:13px 32px;background:#7C3AED;color:#fff;border-radius:12px;font-size:14px;font-weight:700;text-decoration:none">View Plan →</a>
  </div>` : `
  <div style="background:#F5F3FF;border-radius:16px;border:1px solid #DDD6FE;padding:24px;margin-bottom:20px;text-align:center">
    <p style="font-size:16px;font-weight:700;color:#4C1D95;margin:0 0 8px">✨ Your Action Digest is waiting</p>
    <p style="font-size:14px;color:#6D28D9;margin:0 0 20px;line-height:1.6">Upgrade to Navigator to get a monthly AI-generated Action Digest.</p>
    <a href="${appUrl}/advisory?type=navigator" style="display:inline-block;padding:13px 32px;background:#7C3AED;color:#fff;border-radius:12px;font-size:14px;font-weight:700;text-decoration:none">Upgrade to Navigator →</a>
  </div>`}
  <div style="text-align:center;margin-bottom:24px">
    <a href="${appUrl}/" style="display:inline-block;padding:12px 28px;background:#2563EB;color:#fff;border-radius:10px;font-size:14px;font-weight:600;text-decoration:none">View dashboard →</a>
  </div>
  <div style="text-align:center;border-top:1px solid #E5E7EB;padding-top:20px">
    <p style="color:#9CA3AF;font-size:12px;margin:0">Elvanis · Know what to fix before you scale</p>
    <p style="color:#9CA3AF;font-size:12px;margin:4px 0 0">${founderEmail}</p>
  </div>
</div>
</body>
</html>`
}

// F7: Reusable system_alerts insert — non-fatal, never throws
async function insertAlert(
  admin:      ReturnType<typeof createAdminClient>,
  resend:     InstanceType<typeof Resend>,
  founderId:  string | null,
  alertType:  'stale_scan' | 'cron_failure' | 'data_error',
  message:    string
): Promise<void> {
  try {
    await admin.from('system_alerts').insert({
      founder_id: founderId,
      alert_type: alertType,
      message,
    })
  } catch (err) {
    console.error('[daily] system_alerts insert failed:', err)
  }

  // Admin email alert — non-fatal, never throws
  try {
    const adminEmail = process.env.ADMIN_EMAIL
    if (adminEmail) {
      await resend.emails.send({
        from:    process.env.RESEND_FROM_EMAIL ?? 'onboarding@resend.dev',
        to:      adminEmail,
        subject: `[Elvanis Alert] ${alertType} — ${new Date().toISOString().split('T')[0]}`,
        html: `
          <div style="font-family:Inter,Arial,sans-serif;max-width:600px;margin:0 auto;padding:32px 16px">
            <h2 style="color:#DC2626;margin:0 0 16px">⚠ Elvanis System Alert</h2>
            <table style="width:100%;border-collapse:collapse;margin-bottom:16px">
              <tr><td style="padding:8px;background:#F9FAFB;font-weight:600;width:120px">Type</td><td style="padding:8px;background:#F9FAFB">${alertType}</td></tr>
              <tr><td style="padding:8px;font-weight:600">Founder ID</td><td style="padding:8px">${founderId ?? 'system'}</td></tr>
              <tr><td style="padding:8px;background:#F9FAFB;font-weight:600">Time</td><td style="padding:8px;background:#F9FAFB">${new Date().toISOString()}</td></tr>
            </table>
            <div style="background:#FEF2F2;border:1px solid #FECACA;border-radius:8px;padding:16px;margin-bottom:16px">
              <p style="margin:0;font-size:14px;color:#111827;line-height:1.6">${message}</p>
            </div>
            <a href="https://supabase.com/dashboard/project/scisdpycunhyhxaotjuk/editor" 
               style="display:inline-block;padding:10px 20px;background:#2563EB;color:#fff;border-radius:8px;text-decoration:none;font-size:13px;font-weight:600">
              Open Supabase →
            </a>
          </div>
        `,
      })
    }
  } catch (emailErr) {
    console.error('[daily] admin alert email failed:', emailErr)
  }
}

export async function GET(request: NextRequest) {
  const resend = new Resend(process.env.RESEND_API_KEY)
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }

  const admin      = createAdminClient()
  const appUrl     = process.env.NEXT_PUBLIC_APP_URL!
  const today      = new Date()
  const todayDate  = today.getDate()
  const todayStr   = today.toISOString().split('T')[0] // YYYY-MM-DD for cron_runs
  const month      = today.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })

  // ── F2: Idempotency guard ──
  // If today's run already completed, return immediately.
  // Prevents Vercel retry from double-processing all founders.
  const { data: existingRun } = await admin
    .from('cron_runs')
    .select('id')
    .eq('cron_name', 'daily')
    .eq('run_date', todayStr)
    .eq('status', 'completed')
    .maybeSingle()

  if (existingRun) {
    console.log('[daily] already completed today — skipping')
    return NextResponse.json({ skipped: true, reason: 'already_run_today' }, { status: 200 })
  }

  // Mark run as started — upsert handles case where 'started' row exists from a previous attempt
  await admin.from('cron_runs').upsert(
    {
      cron_name:  'daily',
      run_date:   todayStr,
      status:     'started',
      started_at: new Date().toISOString(),
    },
    { onConflict: 'cron_name,run_date' }
  )

  // Gap 1: runCompleted flag — finally block uses this to detect mid-run crashes
  let runCompleted = false

  try {

  // F3: Fetch all founders with subscription_tier for Navigator checks
  const { data: founders } = await admin
    .from('founders')
    .select('id, full_name, email, subscription_tier, user_id')

  if (!founders?.length) {
    await admin.from('cron_runs')
      .update({ status: 'completed', completed_at: new Date().toISOString() })
      .eq('cron_name', 'daily').eq('run_date', todayStr)
    runCompleted = true
    return NextResponse.json({ sent: 0, digests: 0, scanned: 0, skipped: 0 })
  }

  let sent    = 0
  let digests = 0
  let scanned = 0
  let skipped = 0

  for (const founder of founders) {
    try {
      // ── Resolve email — some founders may have email only in auth.users ──
      let founderEmail = founder.email
      if (!founderEmail && founder.user_id) {
        const { data: { user } } = await admin.auth.admin.getUserById(founder.user_id)
        founderEmail = user?.email ?? null
      }
      if (!founderEmail) {
        console.log(`[daily] skipping ${founder.id} — no email`)
        skipped++
        continue
      }

      const isNavigator = founder.subscription_tier === 'navigator'

      // ── Get active sources with scan_frequency_days ──
      // F4: scan_frequency_days read from DB
      const { data: sources } = await admin
        .from('data_sources')
        .select('id, source_type, last_synced_at, created_at, scan_frequency_days')
        .eq('founder_id', founder.id)
        .eq('status', 'active')

      if (!sources?.length) {
        console.log(`[daily] skipping ${founder.id} — no connected sources`)
        skipped++
        continue
      }

      // ── Determine anniversary dates ──
      // Use earliest source created_at as the founder's personal anniversary date
      const firstSource = sources.reduce((earliest, s) =>
        new Date(s.created_at) < new Date(earliest.created_at) ? s : earliest
      )
      const firstConnectedDate = new Date(firstSource.created_at).getDate()

      // Pro-tip: daysInMonth via Date(year, month+1, 0) handles leap years correctly
      const daysInMonth             = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate()
      const adjustedAnniversaryDate = Math.min(firstConnectedDate, daysInMonth)
      const isAnniversaryDay1       = todayDate === adjustedAnniversaryDate

      // F11: Month-end edge case — if anniversary is last day, Day 2 = 1st of next month
      const anniversaryDay2   = adjustedAnniversaryDate >= daysInMonth ? 1 : adjustedAnniversaryDate + 1
      const isAnniversaryDay2 = todayDate === anniversaryDay2

      // ════════════════════════════════════════════════════
      // ANNIVERSARY DAY 1 — Force full scan + monthly report
      // ════════════════════════════════════════════════════
      if (isAnniversaryDay1) {
        console.log(`[daily] anniversary Day 1 for ${founder.id} (${founder.full_name ?? 'unknown'})`)

        // F5: force: true — anniversary must reflect true current state regardless of last sync
        // F8: sendEmail: false — orchestrator sends its own report email, not the scan route
        const scanRes = await fetch(`${appUrl}/api/scan`, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({
            founderId:   founder.id,
            force:       true,
            sendEmail:   false,
            triggeredBy: 'cron',
          }),
        })

        // F6: check scan result — log failure but don't stop the loop
        if (!scanRes.ok) {
          const errBody = await scanRes.json().catch(() => ({}))
          console.error(`[daily] anniversary scan failed for ${founder.id}:`, errBody)
          await insertAlert(admin, resend, founder.id, 'cron_failure',
            `Anniversary Day 1 scan failed for founder ${founder.id} (${founder.full_name ?? 'unknown'}, ${founderEmail}). ` +
            `Error: ${JSON.stringify(errBody)}. Manual intervention required.`
          )
          // Continue to send report with existing signals rather than skipping entirely
        }

        // Fetch signals for the report email
        const { data: reportSignals } = await admin
          .from('diagnostic_signals')
          .select('insight_summary, severity, source')
          .eq('founder_id', founder.id)
          .in('status', ['new', 'acknowledged'])
          .neq('source', 'manual')
          .order('severity', { ascending: true })
          .limit(3)

        if (!reportSignals?.length) {
          console.log(`[daily] no signals for report — skipping email for ${founder.id}`)
          skipped++
          continue
        }

        // F9: Health score via calculateHealthScore — no inline formula
        const { data: allSignals } = await admin
          .from('diagnostic_signals')
          .select('severity, signal_type')
          .eq('founder_id', founder.id)
          .in('status', ['new', 'acknowledged'])
          .neq('source', 'manual')

        const scoringInputs: ScoringInput[] = (allSignals ?? []).map(s => ({
          signal_type: s.signal_type as string,
          severity:    s.severity    as string,
        }))
        const rawScore    = calculateHealthScore(scoringInputs)
        const healthScore = rawScore === -1 ? 0 : rawScore
        const healthLabel = healthScore >= 80 ? 'Healthy'
          : healthScore >= 60 ? 'Needs Attention'
          : healthScore >= 40 ? 'At Risk'
          : 'Critical'

        const { error: emailErr } = await resend.emails.send({
          from:    process.env.RESEND_FROM_EMAIL ?? 'onboarding@resend.dev',
          to:      founderEmail,
          subject: `Your Elvanis monthly report — ${healthScore}/100 health score`,
          html:    buildMonthlyEmailHtml({
            founderName:     founder.full_name?.split(' ')[0] ?? 'Founder',
            founderEmail,
            healthScore,
            healthLabel,
            topSignals:      reportSignals,
            isNavigator,
            appUrl,
            month,
          }),
        })

        if (emailErr) {
          console.error(`[daily] report email failed for ${founder.id}:`, emailErr)
          await insertAlert(admin, resend, founder.id, 'cron_failure',
            `Monthly report email failed for founder ${founder.id} (${founderEmail}). Error: ${JSON.stringify(emailErr)}.`
          )
        } else {
          sent++
          console.log(`[daily] report email sent to ${founderEmail}`)
        }
        continue
      }

      // ════════════════════════════════════════════════════
      // ANNIVERSARY DAY 2 — Generate digest (Navigator only)
      // ════════════════════════════════════════════════════
      if (isAnniversaryDay2 && isNavigator) {
        console.log(`[daily] anniversary Day 2 for ${founder.id} (${founder.full_name ?? 'unknown'})`)

        // F10: Duplicate digest guard — don't generate if already generated today
        const { data: existingDigest } = await admin
          .from('action_digests')
          .select('id')
          .eq('founder_id', founder.id)
          .eq('status', 'active')
          .gte('generated_at', todayStr)
          .maybeSingle()

        if (existingDigest) {
          console.log(`[daily] digest already generated today for ${founder.id} — skipping`)
          skipped++
          continue
        }

        // F12: Scan recency check — block digest if scan data is stale
        // parent_scan_id IS NULL = master scans only (not child scrape rows)
        const { data: latestScan } = await admin
          .from('scans')
          .select('scanned_at')
          .eq('founder_id', founder.id)
          .is('parent_scan_id', null)
          .eq('status', 'completed')
          .order('scanned_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        const thirtyFiveDaysAgo = new Date(Date.now() - 35 * 24 * 60 * 60 * 1000)
        const scanIsStale       = !latestScan || new Date(latestScan.scanned_at) < thirtyFiveDaysAgo

        if (scanIsStale) {
          const lastScanDate = latestScan?.scanned_at ?? 'never'
          console.warn(`[daily] digest blocked for ${founder.id} — scan data too stale (last: ${lastScanDate})`)

          // F7: Actionable system_alert with full founder context
          await insertAlert(admin, resend, founder.id, 'stale_scan',
            `Digest blocked for founder ${founder.id} (${founder.full_name ?? 'unknown'}, ${founderEmail}). ` +
            `Last scan: ${lastScanDate}. ` +
            `Scan data is more than 35 days old. ` +
            `Manual intervention required — check why auto-scan cron failed for this account.`
          )
          skipped++
          continue
        }

        // Generate digest
        const digestRes = await fetch(`${appUrl}/api/digest/generate`, {
          method:  'POST',
          headers: {
            'Content-Type':  'application/json',
            'Authorization': `Bearer ${process.env.CRON_SECRET}`,
          },
          body: JSON.stringify({ founderId: founder.id }),
        })

        // F6: check result
        if (digestRes.ok) {
          digests++
          console.log(`[daily] digest generated for ${founder.id}`)
        } else {
          const errBody = await digestRes.json().catch(() => ({}))
          console.error(`[daily] digest failed for ${founder.id}:`, errBody)
          await insertAlert(admin, resend, founder.id, 'cron_failure',
            `Digest generation failed for founder ${founder.id} (${founder.full_name ?? 'unknown'}, ${founderEmail}). ` +
            `Error: ${JSON.stringify(errBody)}. Manual intervention required.`
          )
        }
        continue
      }

      // ════════════════════════════════════════════════════
      // AUTO SCAN — non-anniversary days
      // ════════════════════════════════════════════════════
      const hasDueSource = sources.some(s => {
        if (s.source_type === 'csv') return false   // CSV is upload-only, never auto-scanned
        if (!s.last_synced_at)       return true    // never scanned — always due

        const isOperational = ['jira', 'intercom'].includes(s.source_type)

        // F3: Navigator-only weekly scans
        // Free founders never get 7-day cadence — capped at 30 days
        // F4: Read scan_frequency_days from DB with fallback
        const frequencyDays: number = s.scan_frequency_days
          ?? (isOperational && isNavigator ? 7 : 30)

        const daysSince = (Date.now() - new Date(s.last_synced_at).getTime()) / (24 * 60 * 60 * 1000)
        return daysSince >= frequencyDays
      })

      if (!hasDueSource) {
        skipped++
        continue
      }

      // F8: sendEmail: false — auto scans never trigger scan completion email
      const scanRes = await fetch(`${appUrl}/api/scan`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          founderId:   founder.id,
          force:       false,
          sendEmail:   false,
          triggeredBy: 'cron',
        }),
      })

      // F6: check result — only count as scanned on success
      if (scanRes.ok) {
        scanned++
        console.log(`[daily] auto scan complete for ${founder.id}`)
      } else {
        const errBody = await scanRes.json().catch(() => ({}))
        console.error(`[daily] auto scan failed for ${founder.id}:`, errBody)
        await insertAlert(admin, resend, founder.id,'cron_failure',
          `Auto scan failed for founder ${founder.id} (${founder.full_name ?? 'unknown'}, ${founderEmail}). ` +
          `Error: ${JSON.stringify(errBody)}.`
        )
      }

    } catch (err) {
      console.error(`[daily] unhandled error for founder ${founder.id}:`, err)
      await insertAlert(admin, resend, founder.id, 'cron_failure',
        `Unhandled orchestrator error for founder ${founder.id}: ${String(err)}`
      )
    }
  }

  // Mark cron run as completed
  await admin.from('cron_runs')
    .update({ status: 'completed', completed_at: new Date().toISOString() })
    .eq('cron_name', 'daily')
    .eq('run_date', todayStr)

  runCompleted = true
  console.log(`[daily] complete — sent=${sent} digests=${digests} scanned=${scanned} skipped=${skipped}`)
  return NextResponse.json({ success: true, sent, digests, scanned, skipped })

  } catch (err) {
    // Unhandled top-level crash — log and let finally handle cron_runs status
    console.error('[daily] top-level crash:', err)
    await insertAlert(admin, resend, null, 'cron_failure',
      `Daily orchestrator crashed with unhandled error: ${String(err)}`
    )
    return NextResponse.json({ error: String(err) }, { status: 500 })

  } finally {
    // Gap 1: if run didn't complete cleanly, mark cron_runs as 'failed'
    // Prevents 'started' rows accumulating silently after crashes
    // .eq('status', 'started') guard ensures we never overwrite a 'completed' row
    if (!runCompleted) {
      const adminFinal = createAdminClient()
      await adminFinal.from('cron_runs')
        .update({ status: 'failed', completed_at: new Date().toISOString() })
        .eq('cron_name', 'daily')
        .eq('run_date', new Date().toISOString().split('T')[0])
        .eq('status', 'started')
      console.error('[daily] finally: cron run marked as failed — did not complete cleanly')
    }
  }
}