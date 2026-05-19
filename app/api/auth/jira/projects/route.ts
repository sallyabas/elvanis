import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@/lib/supabase-server'
import { getValidToken } from '@/lib/token-refresh'

export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient(request)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    const { data: founder } = await supabase
      .from('founders')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle()
    if (!founder) return NextResponse.json({ error: 'Founder not found' }, { status: 404 })

    const tokenResult = await getValidToken(founder.id, 'jira')
    if (!tokenResult) {
      return NextResponse.json(
        { error: 'Jira not connected — complete OAuth from Connect tools first' },
        { status: 400 }
      )
    }

    const { accessToken, source } = tokenResult
    const config = source.config as Record<string, string> | undefined
    const cloudId = config?.cloud_id

    if (!cloudId) {
      return NextResponse.json(
        { error: 'Jira site not linked — disconnect and reconnect Jira' },
        { status: 400 }
      )
    }

    const res = await fetch(
      `https://api.atlassian.com/ex/jira/${cloudId}/rest/api/3/project/search?maxResults=50&orderBy=name`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/json',
        },
      }
    )

    const data = await res.json()

    if (!res.ok) {
      console.error('[jira/projects] API error:', res.status, data)
      return NextResponse.json(
        { error: data.errorMessages?.[0] ?? data.message ?? 'Failed to fetch Jira projects' },
        { status: 500 }
      )
    }

    return NextResponse.json({ projects: data.values ?? [] })
  } catch (err) {
    console.error('[jira/projects] Error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
