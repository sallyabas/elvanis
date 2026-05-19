import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function GET(request: NextRequest) {
  // Verify this is called by Vercel Cron
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }

  const admin = createAdminClient()

  // Get all founders
  const { data: founders } = await admin
    .from('founders')
    .select('id, full_name, user_id')

  if (!founders?.length) return NextResponse.json({ sent: 0 })

  let sent = 0

  for (const founder of founders) {
    try {
      // Get their user email
      const { data: { user } } = await admin.auth.admin.getUserById(founder.user_id)
      if (!user?.email) continue

      // Get active signals
      const { data: signals } = await admin
        .from('diagnostic_signals')
        .select('*')
        .eq('founder_id', founder.id)
        .in('status', ['new', 'acknowledged'])
        .order('severity', { ascending: true })

      if (!signals?.length) continue

      // Calculate health score
      let healthScore = 100
      for (const s of signals) {
        if (s.severity === 'critical') healthScore -= 15
        else if (s.severity === 'warning') healthScore -= 7
        else if (s.severity === 'watch') healthScore -= 2
      }
      healthScore = Math.max(0, Math.min(100, healthScore))

      const criticalSignals = signals.filter(s => s.severity === 'critical').slice(0, 3)
      const quickWin = signals.find(s => s.severity === 'warning') ?? signals[signals.length - 1]

      const criticalList = criticalSignals.length > 0
        ? criticalSignals.map(s => `• ${s.insight_summary}\n  → ${s.recommended_action}`).join('\n\n')
        : 'No critical signals this week — well done.'

      const name = founder.full_name?.split(' ')[0] ?? 'Founder'

      await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL ?? 'onboarding@resend.dev',
        to: user.email,
        subject: `Your weekly business health pulse — ${healthScore}/100`,
        text: `
Good morning ${name},

Here's your Elvanis weekly pulse for this week.

BUSINESS HEALTH SCORE
${healthScore}/100 — ${healthScore >= 80 ? 'Healthy' : healthScore >= 60 ? 'Needs Attention' : healthScore >= 40 ? 'At Risk' : 'Critical'}

TOP CRITICAL SIGNALS
${criticalList}

QUICK WIN THIS WEEK
${quickWin ? `${quickWin.insight_summary}\n→ ${quickWin.recommended_action}` : 'No quick wins identified — run a scan to get fresh signals.'}

View your full dashboard: ${process.env.NEXT_PUBLIC_APP_URL}/dashboard

—
Elvanis · Your AI Business Analyst
        `.trim(),
      })

      sent++
    } catch (err) {
      console.error(`Failed to send pulse to founder ${founder.id}:`, err)
    }
  }

  return NextResponse.json({ success: true, sent })
}
