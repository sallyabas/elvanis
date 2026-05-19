import { NextResponse } from 'next/server'
import { createAdminClient, createServerComponentClient } from '@/lib/supabase-server'

export async function GET() {
  try {
    const supabase = await createServerComponentClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    const { data: founder } = await supabase
      .from('founders').select('id').eq('user_id', user.id).maybeSingle()
    if (!founder) return NextResponse.json({ error: 'Founder not found' }, { status: 404 })

    const admin = createAdminClient()
    const { data: source } = await admin
      .from('data_sources')
      .select('access_token, config')
      .eq('founder_id', founder.id)
      .eq('source_type', 'jira')
      .maybeSingle()

    if (!source?.access_token) {
      return NextResponse.json({ error: 'Jira not connected' }, { status: 400 })
    }

    const cloudId = source.config?.cloud_id
    if (!cloudId) {
      return NextResponse.json({ error: 'Jira cloud ID not found — reconnect Jira' }, { status: 400 })
    }

    const res = await fetch(
      `https://api.atlassian.com/ex/jira/${cloudId}/rest/api/3/project/search?maxResults=50&orderBy=name`,
      {
        headers: {
          Authorization: `Bearer ${source.access_token}`,
          Accept: 'application/json',
        },
      }
    )

    const data = await res.json()

    if (!res.ok) {
      return NextResponse.json({ error: data.message ?? 'Failed to fetch projects' }, { status: 500 })
    }

    return NextResponse.json({ projects: data.values ?? [] })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}