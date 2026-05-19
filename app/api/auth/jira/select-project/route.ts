import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient, createServerComponentClient } from '@/lib/supabase-server'

export async function POST(request: NextRequest) {
  try {
    const { projectId, projectKey, projectName } = await request.json()
    if (!projectId) return NextResponse.json({ error: 'Project ID required' }, { status: 400 })

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
      .eq('source_type', 'jira')
      .maybeSingle()

    await admin
      .from('data_sources')
      .update({
        config: {
          ...(source?.config ?? {}),
          project_id: projectId,
          project_key: projectKey,
          project_name: projectName,
        },
        last_synced_at: null,
      })
      .eq('founder_id', founder.id)
      .eq('source_type', 'jira')

    // Trigger immediate scan
    const base = process.env.NEXT_PUBLIC_APP_URL!
     await fetch(`${base}/api/scrape/jira`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ founderId: founder.id }),
    }).catch(console.error)

    return NextResponse.json({ success: true })
    
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}