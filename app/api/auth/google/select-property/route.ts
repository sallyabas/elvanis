import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient, createServerComponentClient } from '@/lib/supabase-server'

export async function POST(request: NextRequest) {
  try {
    const { propertyId } = await request.json()
    if (!propertyId) return NextResponse.json({ error: 'Property ID required' }, { status: 400 })

    const supabase = await createServerComponentClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    const { data: founder } = await supabase
      .from('founders').select('id').eq('user_id', user.id).maybeSingle()
    if (!founder) return NextResponse.json({ error: 'Founder not found' }, { status: 404 })

    const admin = createAdminClient()

    const { data: source } = await admin
      .from('data_sources')
      .select('config')
      .eq('founder_id', founder.id)
      .eq('source_type', 'ga4')
      .maybeSingle()

    await admin
      .from('data_sources')
      .update({
        config: {
          ...(source?.config ?? {}),
          selected_property_id: propertyId,
          first_connected: true,
        },
        last_synced_at: null, // reset so scan runs immediately
      })
      .eq('founder_id', founder.id)
      .eq('source_type', 'ga4')

    // Trigger immediate scan
    const base = process.env.NEXT_PUBLIC_APP_URL!
     await fetch(`${base}/api/scrape/ga4`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ founderId: founder.id }),
    }).catch(console.error)

    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
