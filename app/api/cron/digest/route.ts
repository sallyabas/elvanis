import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'

// ── Digest cron — runs daily at 7am ──
// On each Navigator founder's personal anniversary Day 2:
// Generates Action Digest using yesterday's fresh scan data
// Digest route handles sending the digest email
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }

  const admin = createAdminClient()
  const appUrl = process.env.NEXT_PUBLIC_APP_URL!
  const today = new Date()
  const todayDate = today.getDate()

  // Navigator founders only
  const { data: founders } = await admin
    .from('founders')
    .select('id, subscription_tier')
    .eq('subscription_tier', 'navigator')

  if (!founders?.length) return NextResponse.json({ digests: 0 })

  let digests = 0
  let skipped = 0

  for (const founder of founders) {
    try {
      // ── Check anniversary Day 2 ──
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

      // Day 2 — next day after anniversary
      // Handle month-end edge case: if anniversary is last day, Day 2 = 1st of next month
      const anniversaryDay2 = adjustedAnniversaryDate === daysInMonth
        ? 1
        : adjustedAnniversaryDate + 1

      if (todayDate !== anniversaryDay2) {
        console.log(`[digest] skipping ${founder.id} — digest day is ${anniversaryDay2}, today is ${todayDate}`)
        skipped++
        continue
      }

      console.log(`[digest] anniversary Day 2 for ${founder.id} — generating digest`)

      // ── Generate digest — uses yesterday's fresh scan data ──
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
        console.log(`[digest] generated for ${founder.id}`)
      } else {
        const err = await digestRes.json()
        console.error(`[digest] failed for ${founder.id}:`, err)
      }

    } catch (err) {
      console.error(`[digest] failed for ${founder.id}:`, err)
    }
  }

  console.log(`[digest] complete — digests=${digests}`)
  return NextResponse.json({ success: true, digests })
}