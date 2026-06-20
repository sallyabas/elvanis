import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'

function checkAdminAuth(request: NextRequest): boolean {
  const password = request.headers.get('x-admin-password')
  return password === process.env.ADMIN_PASSWORD
}

export async function POST(request: NextRequest) {
  if (!checkAdminAuth(request)) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }

  const { founderId } = await request.json()
  if (!founderId) return NextResponse.json({ error: 'founderId required' }, { status: 400 })

  const admin = createAdminClient()
  const now = new Date()
  const periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

  const { error: founderErr } = await admin
    .from('founders')
    .update({
      subscription_tier: 'navigator',
      subscription_status: 'active',
      subscription_started_at: now.toISOString(),
      subscription_ends_at: periodEnd.toISOString(),
    })
    .eq('id', founderId)

  if (founderErr) return NextResponse.json({ error: founderErr.message }, { status: 500 })

  const { error: paymentErr } = await admin.from('payments').insert({
    founder_id: founderId,
    amount: 49,
    currency: 'gbp',
    status: 'paid',
    payment_method: 'admin_grant',
    reference: `ADMIN-${Date.now()}`,
    period_start: now.toISOString(),
    period_end: periodEnd.toISOString(),
  })

  if (paymentErr) {
    console.error('[admin] payment row insert failed:', paymentErr.message)
  }

  return NextResponse.json({ success: true })
}