import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import { Resend } from 'resend'

export const dynamic = 'force-dynamic'



function buildMonthlyEmailHtml(params: {
  founderName: string
  founderEmail: string
  healthScore: number
  healthLabel: string
  healthColor: string
  topSignals: Array<{ insight_summary: string; severity: string; source: string }>
  isNavigator: boolean
  appUrl: string
  month: string
}): string {
  const { founderEmail, healthScore, healthLabel, topSignals, isNavigator, appUrl, month } = params

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

  ${isNavigator ? `
  <div style="background:#F5F3FF;border-radius:16px;border:1px solid #DDD6FE;padding:24px;margin-bottom:20px;text-align:center">
    <p style="font-size:16px;font-weight:700;color:#4C1D95;margin:0 0 8px">✨ Your Action Digest is coming tomorrow</p>
    <p style="font-size:14px;color:#6D28D9;margin:0;line-height:1.6">Your monthly Action Digest will be generated tomorrow — prioritised actions based on today's fresh signals.</p>
  </div>` : `
  <div style="background:#F5F3FF;border-radius:16px;border:1px solid #DDD6FE;padding:24px;margin-bottom:20px;text-align:center">
    <p style="font-size:16px;font-weight:700;color:#4C1D95;margin:0 0 8px">✨ Your Action Digest is waiting</p>
    <p style="font-size:14px;color:#6D28D9;margin:0 0 20px;line-height:1.6">Upgrade to Navigator to get a monthly AI-generated Action Digest — prioritised steps based on your signals.</p>
    <a href="${appUrl}/advisory?type=navigator" style="display:inline-block;padding:13px 32px;background:#7C3AED;color:#fff;border-radius:12px;font-size:14px;font-weight:700;text-decoration:none">Upgrade to Navigator →</a>
  </div>`}

  <div style="text-align:center;margin-bottom:12px">
    <a href="${appUrl}/measure" style="display:inline-block;padding:12px 28px;background:#2563EB;color:#fff;border-radius:10px;font-size:14px;font-weight:600;text-decoration:none">View impact tracking →</a>
  </div>
  <div style="text-align:center;margin-bottom:24px">
    <a href="${appUrl}/" style="display:inline-block;padding:12px 28px;background:#F9FAFB;color:#6B7280;border-radius:10px;font-size:14px;font-weight:600;text-decoration:none;border:1px solid #E5E7EB">View dashboard →</a>
  </div>

  <div style="text-align:center;border-top:1px solid #E5E7EB;padding-top:20px">
    <p style="color:#9CA3AF;font-size:12px;margin:0">Elvanis · Know what to fix before you scale</p>
    <p style="color:#9CA3AF;font-size:12px;margin:4px 0 0">${founderEmail}</p>
  </div>

</div>
</body>
</html>`
}

// ── Monthly report cron — runs daily at 7am ──
// On each founder's personal anniversary Day 1:
// 1. Trigger full scan (force:false — respects per-source frequency)
// 2. Send monthly report email linking to /measure
export async function GET(request: NextRequest) {
  const resend = new Resend(process.env.RESEND_API_KEY)
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

  if (!founders?.length) return NextResponse.json({ sent: 0 })

  let sent = 0
  let skipped = 0

  for (const founder of founders) {
    try {
      // ── Get founder email ──
      let founderEmail = founder.email
      if (!founderEmail && founder.user_id) {
        const { data: { user } } = await admin.auth.admin.getUserById(founder.user_id)
        founderEmail = user?.email ?? null
      }
      if (!founderEmail) continue

      // ── Check anniversary Day 1 ──
      const { data: firstSource } = await admin
        .from('data_sources')
        .select('created_at')
        .eq('founder_id', founder.id)
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle()

      if (!firstSource) continue

      const firstConnectedDate = new Date(firstSource.created_at).getDate()
      const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate()
      const adjustedAnniversaryDate = Math.min(firstConnectedDate, daysInMonth)

      if (todayDate !== adjustedAnniversaryDate) {
        console.log(`[monthly] skipping ${founder.id} — anniversary is ${adjustedAnniversaryDate}, today is ${todayDate}`)
        skipped++
        continue
      }

      console.log(`[monthly] anniversary Day 1 for ${founder.id} — running scan + report`)

      // ── Trigger full scan first — sendEmail:false, cron sends report email ──
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
        console.log(`[monthly] scan complete for ${founder.id}`)
      } catch (err) {
        console.error(`[monthly] scan failed for ${founder.id}:`, err)
        // Continue — still send report with existing data
      }

      // ── Fetch signals for email — after scan ──
      const { data: signals } = await admin
        .from('diagnostic_signals')
        .select('insight_summary, severity, source')
        .eq('founder_id', founder.id)
        .in('status', ['new', 'acknowledged'])
        .neq('source', 'manual')
        .order('severity', { ascending: true })
        .limit(3)

      if (!signals?.length) {
        console.log(`[monthly] skipping report for ${founder.id} — no signals`)
        continue
      }

      // ── Calculate health score ──
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
      const isNavigator = founder.subscription_tier === 'navigator'
      const name = founder.full_name?.split(' ')[0] ?? 'Founder'

      // ── Send monthly report email ──
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
          appUrl,
          month,
        }),
      })

      if (emailError) {
        console.error(`[monthly] email failed for ${founder.id}:`, emailError)
      } else {
        sent++
        console.log(`[monthly] report sent to ${founderEmail}`)
      }

    } catch (err) {
      console.error(`[monthly] failed for ${founder.id}:`, err)
    }
  }

  console.log(`[monthly] complete — sent=${sent}`)
  return NextResponse.json({ success: true, sent })
}