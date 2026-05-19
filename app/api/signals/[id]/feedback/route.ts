import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const type = request.nextUrl.searchParams.get('type')
  const returnFilter = request.nextUrl.searchParams.get('return')
  const redirectUrl = returnFilter ? `/signals?filter=${returnFilter}` : '/signals'
  const feedback = type === 'accurate' ? 'accurate' : 'missed_the_mark'
  const supabase = createAdminClient()

  await supabase
    .from('diagnostic_signals')
    .update({ founder_feedback: feedback, feedback_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('id', id)

  const { data: signal } = await supabase
    .from('diagnostic_signals')
    .select('founder_id, signal_type, dimension, source, confidence_score')
    .eq('id', id)
    .maybeSingle()

  if (signal) {
    await supabase.from('signal_feedback_log').insert({
      signal_id: id,
      founder_id: signal.founder_id,
      feedback,
      signal_type: signal.signal_type,
      dimension: signal.dimension,
      source: signal.source,
      confidence_score: signal.confidence_score,
    })
  }

  return NextResponse.redirect(new URL(redirectUrl, request.url))
}
