import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient, createRouteHandlerClient } from '@/lib/supabase-server'

export async function POST(request: NextRequest) {
  try {
    const { projectId, projectKey, projectName } = await request.json()
    if (!projectId) return NextResponse.json({ error: 'Project ID required' }, { status: 400 })

    const supabase = createRouteHandlerClient(request)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    const { data: founder } = await supabase
      .from('founders')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle()
    if (!founder) return NextResponse.json({ error: 'Founder not found' }, { status: 404 })

    const admin = createAdminClient()
    const { data: source } = await admin
      .from('data_sources')
      .select('config')
      .eq('founder_id', founder.id)
      .eq('source_type', 'jira')
      .eq('status', 'active')
      .maybeSingle()

    if (!source) {
      return NextResponse.json({ error: 'Jira not connected' }, { status: 400 })
    }

    const { error: updateError } = await admin
      .from('data_sources')
      .update({
        config: {
          ...(source.config as Record<string, unknown> ?? {}),
          project_id: projectId,
          project_key: projectKey,
          project_name: projectName,
        },
        last_synced_at: null,
      })
      .eq('founder_id', founder.id)
      .eq('source_type', 'jira')

    if (updateError) {
      console.error('[jira/select-project] Update failed:', updateError.message)
      return NextResponse.json({ error: 'Failed to save project' }, { status: 500 })
    }

    const base = process.env.NEXT_PUBLIC_APP_URL
    if (base) {
      await fetch(`${base}/api/scan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ founderId: founder.id, sourceType: 'jira', triggeredBy: 'connect' }),
      }).catch(err => console.error('[jira/select-project] Scan error:', err))
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[jira/select-project] Error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
