import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

function buildMonthlyEmailHtml(params: {
  founderName: string
  founderEmail: string
  healthScore: number
  healthLabel: string
  healthColor: string
  topSignals: Array<{ insight_summary: string; severity: string; source: string }>
  isNavigator: boolean
  digestGenerated: boolean
  appUrl: string
  month: string
}): string {
  const { founderEmail, healthScore, healthLabel, topSignals, isNavigator, digestGenerated, appUrl, month } = params

  const scoreColor = healthScore >= 80 ? '#059669' : healthScore >= 60 ? '#D97706' : healthScore >= 40 ? '#DC2626' : '#991B1B'
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
    <div style="padding:12px 0;border-bottom:1px solid #F3F4F6;display:flex;align-items:flex-start;gap:12px">
      <span style="font-size:11px;font-weight:700;padding:2px 8px;border-radius:20px;background:${s.severity === 'critical' ? '#FEF2F2' : s.severity === 'warning' ? '#FFFBEB' : '#F9FAFB'};color:${severityColor(s.severity)};white-space:nowrap;flex-shrink:0">${s.severity.toUpperCase()}</span>
      <div>
        <p style="font-size:13px;font-weight:600;color:#111827;margin:0 0 2px">${s.insight_summary}</p>
        <p style="font-size:11px;color:#9CA3AF;margin:0">${sourceLabel[s.source] ?? s.source}</p>
      </div>
    </div>`).join('')}
  </div>` : ''}

  ${isNavigator && digestGenerated ? `
  <div style="background:#F5F3FF;border-radius:16px;border:1px solid #DDD6FE;padding:24px;margin-bottom:20px;text-align:center">
    <p style="font-size:16px;font-weight:700;color:#4C1D95;margin:0 0 8px">✨ Your Action Digest is ready</p>
    <p style="font-size:14px;color:#6D28D9;margin:0 0 20px;line-height:1.6">Your monthly Action Digest has been generated — prioritised actions based on your current signals.</p>
    <a href="${appUrl}/plan" style="display:inline-block;padding:13px 32px;background:#7C3AED;color:#fff;border-radius:12px;font-size:14px;font-weight:700;text-decoration:none">View Action Digest →</a>
  </div>` : !isNavigator ? `
  <div style="background:#F5F3FF;border-radius:16px;border:1px solid #DDD6FE;padding:24px;margin-bottom:20px;text-align:center">
    <p style="font-size:16px;font-weight:700;color:#4C1D95;margin:0 0 8px">✨ Your Action Digest is waiting</p>
    <p style="font-size:14px;color:#6D28D9;margin:0 0 20px;line-height:1.6">Upgrade to Navigator to get a monthly AI-generated Action Digest — prioritised steps based on your signals.</p>
    <a href="${appUrl}/service-request?type=navigator" style="display:inline-block;padding:13px 32px;background:#7C3AED;color:#fff;border-radius:12px;font-size:14px;font-weight:700;text-decoration:none">Upgrade to Navigator →</a>
  </div>` : ''}

  <div style="text-align:center;margin-bottom:16px">
    <a href="${appUrl}/measure" style="display:inline-block;padding:12px 28px;background:#2563EB;color:#fff;border-radius:10px;font-size:14px;font-weight:600;text-decoration:none;margin-bottom:10px">View impact tracking →</a>
  </div>
  <div style="text-align:center;margin-bottom:24px">
    <a href="${appUrl}/dashboard" style="display:inline-block;padding:12px 28px;background:#F9FAFB;color:#6B7280;border-radius:10px;font-size:14px;font-weight:600;text-decoration:none;border:1px solid #E5E7EB">View full dashboard →</a>
  </div>

  <div style="text-align:center;border-top:1px solid #E5E7EB;padding-top:20px">
    <p style="color:#9CA3AF;font-size:12px;margin:0">Elvanis · Know what to fix before you scale</p>
    <p style="color:#9CA3AF;font-size:12px;margin:4px 0 0">${founderEmail}</p>
  </div>

</div>
</body>
</html>`
}

// ── Main cron handler — runs daily at 7am ──
// 1. Auto scan: checks all founders' sources for weekly/monthly due scans
// 2. Anniversary Day 1: full scan → save health score → send monthly report
// 3. Anniversary Day 2: generate digest → send digest email
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }

  const admin = createAdminClient()
  const appUrl = process.env.NEXT_PUBLIC_APP_URL!
  const today = new Date()
  const todayDate = today.getDate()
  const month = today.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })

  const { data: founders } = await admin
    .from('founders')
    .select('id, full_name, email, subscription_tier, user_id')

  if (!founders?.length) return NextResponse.json({ sent: 0, digests: 0, autoScans: 0 })

  let sent = 0
  let digests = 0
  let autoScans = 0

  for (const founder of founders) {
    try {
      // ── Get founder email ──
      let founderEmail = founder.email
      if (!founderEmail && founder.user_id) {
        const { data: { user } } = await admin.auth.admin.getUserById(founder.user_id)
        founderEmail = user?.email ?? null
      }
      if (!founderEmail) {
        console.log(`[cron] skipping ${founder.id} — no email`)
        continue
      }

      // ── Get founder's connected sources ──
      const { data: sources } = await admin
        .from('data_sources')
        .select('source_type, last_synced_at, created_at')
        .eq('founder_id', founder.id)
        .eq('status', 'active')

      if (!sources?.length) {
        console.log(`[cron] skipping ${founder.id} — no tools connected`)
        continue
      }

      // ── Check personal monthly anniversary ──
      const firstSource = sources.reduce((earliest, s) =>
        new Date(s.created_at) < new Date(earliest.created_at) ? s : earliest
      )
      const firstConnectedDate = new Date(firstSource.created_at).getDate()
      const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate()
      const adjustedAnniversaryDate = Math.min(firstConnectedDate, daysInMonth)

      const isAnniversaryDay1 = todayDate === adjustedAnniversaryDate
      const isAnniversaryDay2 = todayDate === adjustedAnniversaryDate + 1 ||
        (adjustedAnniversaryDate === daysInMonth && todayDate === 1)

      const isNavigator = founder.subscription_tier === 'navigator'

      // ── AUTO SCAN — check sources due for weekly/monthly scan ──
      // Runs every day — skips sources not due based on frequency
      // Does NOT run on anniversary Day 1 (anniversary scan handles it)
      if (!isAnniversaryDay1) {
        const hasDueSource = sources.some(s => {
          if (s.source_type === 'csv') return false
          if (!s.last_synced_at) return true
          const isOperational = ['jira', 'intercom'].includes(s.source_type)
          const frequencyDays = isOperational ? 7 : 30
          const daysSince = (Date.now() - new Date(s.last_synced_at).getTime()) / (24 * 60 * 60 * 1000)
          return daysSince >= frequencyDays
        })

        if (hasDueSource) {
          console.log(`[cron] auto scan due for ${founder.id}`)
          try {
            await fetch(`${appUrl}/api/scan`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                founderId: founder.id,
                force: false,
                sendEmail: false,
                triggeredBy: 'cron',
              }),
            })
            autoScans++
            console.log(`[cron] auto scan triggered for ${founder.id}`)
          } catch (err) {
            console.error(`[cron] auto scan failed for ${founder.id}:`, err)
          }
        }
      }

      // ── ANNIVERSARY DAY 1 — full scan + monthly report email ──
      if (isAnniversaryDay1) {
        console.log(`[cron] anniversary Day 1 for ${founder.id} — running scan + report`)

        // Full scan first — force:false respects per-source frequency
        // sendEmail:false — cron sends its own report email
        try {
          await fetch(`${appUrl}/api/scan`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              founderId: founder.id,
              force: false,
              sendEmail: false,
              triggeredBy: 'cron',
            }),
          })
          console.log(`[cron] anniversary scan complete for ${founder.id}`)
        } catch (err) {
          console.error(`[cron] anniversary scan failed for ${founder.id}:`, err)
        }

        // Fetch signals for email — after scan
        const { data: signals } = await admin
          .from('diagnostic_signals')
          .select('insight_summary, severity, source')
          .eq('founder_id', founder.id)
          .in('status', ['new', 'acknowledged'])
          .neq('source', 'manual')
          .order('severity', { ascending: true })
          .limit(3)

        if (!signals?.length) {
          console.log(`[cron] skipping report email for ${founder.id} — no signals`)
          continue
        }

        // Calculate health score
        const { data: allSignals } = await admin
          .from('diagnostic_signals')
          .select('severity')
          .eq('founder_id', founder.id)
          .in('status', ['new', 'acknowledged'])
          .neq('source', 'manual')

        let healthScore = 100
        for (const s of (allSignals ?? [])) {
          if (s.severity === 'critical') healthScore -= 15
          else if (s.severity === 'warning') healthScore -= 7
          else if (s.severity === 'watch') healthScore -= 2
        }
        healthScore = Math.max(0, Math.min(100, healthScore))
        const healthLabel = healthScore >= 80 ? 'Healthy' : healthScore >= 60 ? 'Needs Attention' : healthScore >= 40 ? 'At Risk' : 'Critical'
        const healthColor = healthScore >= 80 ? '#059669' : healthScore >= 60 ? '#D97706' : healthScore >= 40 ? '#DC2626' : '#991B1B'

        const name = founder.full_name?.split(' ')[0] ?? 'Founder'

        // Send monthly report email — links to /measure
        const { error: emailError } = await resend.emails.send({
          from: process.env.RESEND_FROM_EMAIL ?? 'onboarding@resend.dev',
          to: founderEmail,
          subject: `Your Elvanis monthly report — ${healthScore}/100 health score`,
          html: buildMonthlyEmailHtml({
            founderName: name,
            founderEmail,
            healthScore,
            healthLabel,
            healthColor,
            topSignals: signals,
            isNavigator,
            digestGenerated: false,
            appUrl,
            month,
          }),
        })

        if (emailError) {
          console.error(`[cron] report email failed for ${founder.id}:`, emailError)
        } else {
          sent++
          console.log(`[cron] report sent to ${founderEmail}`)
        }
      }

      // ── ANNIVERSARY DAY 2 — generate digest + send digest email (Navigator only) ──
      if (isAnniversaryDay2 && isNavigator) {
        console.log(`[cron] anniversary Day 2 for ${founder.id} — generating digest`)

        try {
          const digestRes = await fetch(`${appUrl}/api/digest/generate`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${process.env.CRON_SECRET}`,
            },
            body: JSON.stringify({ founderId: founder.id }),
          })

          if (digestRes.ok) {
            digests++
            console.log(`[cron] digest generated for ${founder.id}`)
          } else {
            const err = await digestRes.json()
            console.error(`[cron] digest failed for ${founder.id}:`, err)
          }
        } catch (err) {
          console.error(`[cron] digest fetch failed for ${founder.id}:`, err)
        }
      }

    } catch (err) {
      console.error(`[cron] failed for founder ${founder.id}:`, err)
    }
  }

  console.log(`[cron] complete — reports=${sent}, digests=${digests}, autoScans=${autoScans}`)
  return NextResponse.json({ success: true, sent, digests, autoScans })
}