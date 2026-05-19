import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const returnFilter = request.nextUrl.searchParams.get('return')
  const redirectUrl = returnFilter ? `/signals?filter=${returnFilter}` : '/signals'
  const supabase = createAdminClient()

  const { data: signal } = await supabase
    .from('diagnostic_signals')
    .select('founder_id, source')
    .eq('id', id)
    .maybeSingle()

  await supabase
    .from('diagnostic_signals')
    .update({ status: 'resolved', updated_at: new Date().toISOString() })
    .eq('id', id)

  // Trigger rescan of this source only to verify fix
  if (signal?.founder_id && signal?.source && signal.source !== 'csv') {
    fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/scan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ founderId: signal.founder_id, sourceType: signal.source }),
    }).catch(console.error)
  }

  return NextResponse.redirect(new URL(redirectUrl, request.url))
}
