import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'

// ── Auto scan cron — runs daily at 7am ──
// Checks all founders' sources for weekly/monthly due scans
// Jira/Intercom: every 7 days
// GA4/Shopify/Trustpilot: every 30 days
// CSV: upload-only, never auto-scanned
// Skips anniversary Day 1 — monthly cron handles scan that day
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }

  const admin = createAdminClient()
  const appUrl = process.env.NEXT_PUBLIC_APP_URL!
  const today = new Date()
  const todayDate = today.getDate()

  const { data: founders } = await admin
    .from('founders')
    .select('id')

  if (!founders?.length) return NextResponse.json({ scanned: 0 })

  let scanned = 0
  let skipped = 0

  for (const founder of founders) {
    try {
      // ── Get active sources — includes created_at for anniversary check ──
      const { data: sources } = await admin
        .from('data_sources')
        .select('source_type, last_synced_at, created_at')
        .eq('founder_id', founder.id)
        .eq('status', 'active')

      if (!sources?.length) continue

      // ── Skip if today is anniversary Day 1 — monthly cron handles scan ──
      const firstSource = sources.reduce((earliest, s) =>
        new Date(s.created_at) < new Date(earliest.created_at) ? s : earliest
      )
      const firstConnectedDate = new Date(firstSource.created_at).getDate()
      const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate()
      const adjustedAnniversaryDate = Math.min(firstConnectedDate, daysInMonth)

      if (todayDate === adjustedAnniversaryDate) {
        console.log(`[auto-scan] skipping ${founder.id} — anniversary Day 1, monthly cron handles scan`)
        skipped++
        continue
      }

      // ── Check if any source is due for scan ──
      const hasDueSource = sources.some(s => {
        if (s.source_type === 'csv') return false
        if (!s.last_synced_at) return true
        const isOperational = ['jira', 'intercom'].includes(s.source_type)
        const frequencyDays = isOperational ? 7 : 30
        const daysSince = (Date.now() - new Date(s.last_synced_at).getTime()) / (24 * 60 * 60 * 1000)
        return daysSince >= frequencyDays
      })

      if (!hasDueSource) {
        skipped++
        continue
      }

      // ── Trigger scan ──
      // force:false — respects per-source frequency
      // sendEmail:false — no scan email from auto scan
      // triggeredBy:cron — recorded in scans table
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

      scanned++
      console.log(`[auto-scan] triggered for ${founder.id}`)

    } catch (err) {
      console.error(`[auto-scan] failed for ${founder.id}:`, err)
    }
  }

  console.log(`[auto-scan] complete — scanned=${scanned} skipped=${skipped}`)
  return NextResponse.json({ success: true, scanned, skipped })
}