import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import { calculateHealthScore, ScoringInput } from '@/lib/health-scoring'
import { Resend } from 'resend'

function checkAdminAuth(request: NextRequest): boolean {
  const password = request.headers.get('x-admin-password')
  return password === process.env.ADMIN_PASSWORD
}

function buildMonthlyEmailHtml(params: {
  founderName: string
  founderEmail: string
  healthScore: number
  healthLabel: string
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
    <div style="padding:12px 0;border-bottom:1px solid #F3F4F6">
      <span style="font-size:11px;font-weight:700;padding:2px 8px;border-radius:20px;background:${s.severity === 'critical' ? '#FEF2F2' : s.severity === 'warning' ? '#FFFBEB' : '#F9FAFB'};color:${severityColor(s.severity)}">${s.severity.toUpperCase()}</span>
      <p style="font-size:13px;font-weight:600;color:#111827;margin:6px 0 2px">${s.insight_summary}</p>
      <p style="font-size:11px;color:#9CA3AF;margin:0">${sourceLabel[s.source] ?? s.source}</p>
    </div>`).join('')}
  </div>` : ''}
  ${isNavigator ? `
  <div style="background:#F5F3FF;border-radius:16px;border:1px solid #DDD6FE;padding:24px;margin-bottom:20px;text-align:center">
    <p style="font-size:16px;font-weight:700;color:#4C1D95;margin:0 0 8px">✨ Your Action Digest is being prepared</p>
    <a href="${appUrl}/plan" style="display:inline-block;padding:13px 32px;background:#7C3AED;color:#fff;border-radius:12px;font-size:14px;font-weight:700;text-decoration:none">View Plan →</a>
  </div>` : `
  <div style="background:#F5F3FF;border-radius:16px;border:1px solid #DDD6FE;padding:24px;margin-bottom:20px;text-align:center">
    <p style="font-size:16px;font-weight:700;color:#4C1D95;margin:0 0 8px">✨ Your Action Digest is waiting</p>
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

export async function POST(request: NextRequest) {
  if (!checkAdminAuth(request)) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }

  const { founderId } = await request.json()
  if (!founderId) return NextResponse.json({ error: 'founderId required' }, { status: 400 })

  const admin = createAdminClient()
  const resend = new Resend(process.env.RESEND_API_KEY)
  const appUrl = process.env.NEXT_PUBLIC_APP_URL!
  const month = new Date().toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })

  const { data: founder } = await admin
    .from('founders')
    .select('id, full_name, email, subscription_tier, user_id')
    .eq('id', founderId)
    .maybeSingle()

  if (!founder) return NextResponse.json({ error: 'Founder not found' }, { status: 404 })

  let founderEmail = founder.email
  if (!founderEmail && founder.user_id) {
    const { data: { user } } = await admin.auth.admin.getUserById(founder.user_id)
    founderEmail = user?.email ?? null
  }
  if (!founderEmail) return NextResponse.json({ error: 'No email found for founder' }, { status: 400 })

  const { data: topSignals } = await admin
    .from('diagnostic_signals')
    .select('insight_summary, severity, source')
    .eq('founder_id', founderId)
    .in('status', ['new', 'acknowledged'])
    .neq('source', 'manual')
    .order('severity', { ascending: true })
    .limit(3)

  const { data: allSignals } = await admin
    .from('diagnostic_signals')
    .select('severity, signal_type')
    .eq('founder_id', founderId)
    .in('status', ['new', 'acknowledged'])
    .neq('source', 'manual')

  const scoringInputs: ScoringInput[] = (allSignals ?? []).map(s => ({
    signal_type: s.signal_type as string,
    severity: s.severity as string,
  }))
  const rawScore = calculateHealthScore(scoringInputs)
  const healthScore = rawScore === -1 ? 0 : rawScore
  const healthLabel = healthScore >= 80 ? 'Healthy' : healthScore >= 60 ? 'Needs Attention' : healthScore >= 40 ? 'At Risk' : 'Critical'

  const { error: emailErr } = await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL ?? 'onboarding@resend.dev',
    to: founderEmail,
    subject: `Your Elvanis monthly report — ${healthScore}/100 health score`,
    html: buildMonthlyEmailHtml({
      founderName: founder.full_name?.split(' ')[0] ?? 'Founder',
      founderEmail,
      healthScore,
      healthLabel,
      topSignals: topSignals ?? [],
      isNavigator: founder.subscription_tier === 'navigator',
      appUrl,
      month,
    }),
  })

  if (emailErr) return NextResponse.json({ error: String(emailErr) }, { status: 500 })
  return NextResponse.json({ success: true, healthScore })
}