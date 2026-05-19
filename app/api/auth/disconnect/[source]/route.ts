import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import { createServerComponentClient } from '@/lib/supabase-server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ source: string }> }
) {
  const { source } = await params
  const supabase = await createServerComponentClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.redirect(new URL('/login', request.url))

  const { data: founder } = await supabase
    .from('founders')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle()

    if (founder) {
      const admin = createAdminClient()
      
      await admin
        .from('data_sources')
        .update({ status: 'disconnected', access_token: null, refresh_token: null })
        .eq('founder_id', founder.id)
        .eq('source_type', source)
    
      await admin
        .from('diagnostic_signals')
        .update({ scan_count: 1, previous_value: null, trend: 'new' })
        .eq('founder_id', founder.id)
        .eq('source', source)
    }
    
    return NextResponse.redirect(new URL('/connect', request.url))
}
