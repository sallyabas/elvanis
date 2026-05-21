import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// ── Service account client — bypasses RLS ─────────────────────
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: Request) {
  // Verify this is called by Vercel cron, not a random request
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const now = new Date().toISOString()

  // Find all Navigator founders whose subscription has expired
  const { data: expired, error: fetchError } = await supabase
    .from('founders')
    .select('id, email, full_name, subscription_ends_at')
    .eq('subscription_tier', 'navigator')
    .eq('subscription_status', 'active')
    .lt('subscription_ends_at', now)

  if (fetchError) {
    console.error('[check-subscriptions] fetch error:', fetchError.message)
    return NextResponse.json({ error: fetchError.message }, { status: 500 })
  }

  if (!expired || expired.length === 0) {
    return NextResponse.json({ message: 'No expired subscriptions', downgraded: 0 })
  }

  // Downgrade all expired founders to free
  const ids = expired.map(f => f.id)

  const { error: updateError } = await supabase
    .from('founders')
    .update({
      subscription_tier:   'free',
      subscription_status: 'inactive',
    })
    .in('id', ids)

  if (updateError) {
    console.error('[check-subscriptions] update error:', updateError.message)
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  console.log(`[check-subscriptions] Downgraded ${expired.length} founder(s) to free:`, ids)

  return NextResponse.json({
    message:    `Downgraded ${expired.length} subscription(s)`,
    downgraded: expired.length,
    ids,
  })
}