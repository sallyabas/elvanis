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
  await supabase
    .from('diagnostic_signals')
    .update({ status: 'acknowledged', updated_at: new Date().toISOString() })
    .eq('id', id)
  return NextResponse.redirect(new URL(redirectUrl, request.url))
}
