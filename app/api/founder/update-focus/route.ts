import { NextRequest, NextResponse } from 'next/server'
import { createServerComponentClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const supabase = await createServerComponentClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { focusMetric } = await request.json()

  const validMetrics = ['growth', 'retention', 'ops', 'delivery']
  if (!validMetrics.includes(focusMetric)) {
    return NextResponse.json({ error: 'Invalid focus metric' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { error } = await admin
    .from('founders')
    .update({ focus_metric: focusMetric })
    .eq('user_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}