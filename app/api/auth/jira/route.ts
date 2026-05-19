import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL
  if (!appUrl) {
    return NextResponse.json({ error: 'NEXT_PUBLIC_APP_URL is not configured' }, { status: 500 })
  }

  const supabase = createRouteHandlerClient(request)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.redirect(new URL('/login?next=/connect', appUrl))
  }

  const { data: founder } = await supabase
    .from('founders')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!founder) {
    return NextResponse.redirect(new URL('/onboarding', appUrl))
  }

  const clientId = process.env.JIRA_CLIENT_ID
  if (!clientId) {
    return NextResponse.redirect(new URL('/connect?error=jira_not_configured', appUrl))
  }

  const callbackUrl = `${appUrl}/api/auth/jira/callback`

  const params = new URLSearchParams({
    audience: 'api.atlassian.com',
    client_id: clientId,
    scope: 'read:jira-work write:jira-work read:jira-user offline_access',
    redirect_uri: callbackUrl,
    response_type: 'code',
    prompt: 'consent',
    // Survives OAuth redirect when session cookies are not sent back from Atlassian (common on Vercel)
    state: founder.id,
  })

  const authUrl = `https://auth.atlassian.com/authorize?${params.toString()}`
  return NextResponse.redirect(authUrl)
}
