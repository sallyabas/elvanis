import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'

function checkAdminAuth(request: NextRequest): boolean {
  const password = request.headers.get('x-admin-password')
  return password === process.env.ADMIN_PASSWORD
}

export async function GET(request: NextRequest) {
  if (!checkAdminAuth(request)) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }

  const q = request.nextUrl.searchParams.get('q') ?? ''
  if (q.length < 2) return NextResponse.json({ founders: [] })

  const admin = createAdminClient()
  const { data: founders, error } = await admin
    .from('founders')
    .select('id, full_name, email, business_name, subscription_tier, subscription_status, language, founder_stage')
    .or(`email.ilike.%${q}%,full_name.ilike.%${q}%,business_name.ilike.%${q}%`)
    .limit(10)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ founders: founders ?? [] })
}