import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient, createServerComponentClient } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code')
  if (!code) return NextResponse.redirect(new URL('/connect?error=no_code', request.url))

  try {
    const tokenRes = await fetch('https://auth.atlassian.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        client_id: process.env.JIRA_CLIENT_ID,
        client_secret: process.env.JIRA_CLIENT_SECRET,
        code,
        redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/jira/callback`,
      }),
    })

    const tokens = await tokenRes.json()
    if (!tokens.access_token) {
      console.error('Jira token error:', tokens)
      return NextResponse.redirect(new URL('/connect?error=token_failed', request.url))
    }

    const resourcesRes = await fetch('https://api.atlassian.com/oauth/token/accessible-resources', {
      headers: { Authorization: `Bearer ${tokens.access_token}`, Accept: 'application/json' },
    })
    const resources = await resourcesRes.json()
    const site = resources[0]

    const supabase = await createServerComponentClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.redirect(new URL('/login', request.url))

    const { data: founder } = await supabase
      .from('founders').select('id').eq('user_id', user.id).maybeSingle()
    if (!founder) return NextResponse.redirect(new URL('/login', request.url))

    const admin = createAdminClient()
    const { data: existingSource } = await admin
      .from('data_sources')
      .select('id')
      .eq('founder_id', founder.id)
      .eq('source_type', 'jira')
      .maybeSingle()
    
    const sourcePayload = {
      founder_id: founder.id,
      source_type: 'jira',
      status: 'active',
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token ?? null,
      token_expires_at: tokens.expires_in
        ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
        : null,
      config: {
        cloud_id: site?.id,
        site_name: site?.name,
        site_url: site?.url,
        scopes: tokens.scope,
      },
      last_synced_at: new Date().toISOString(),
    }
    
    if (existingSource) {
      await admin.from('data_sources').update(sourcePayload).eq('id', existingSource.id)
    } else {
      await admin.from('data_sources').insert(sourcePayload)
    }

    // Redirect to project selection
    return NextResponse.redirect(new URL('/connect/jira/select', request.url))
  } catch (err) {
    console.error('Jira OAuth error:', err)
    return NextResponse.redirect(new URL('/connect?error=oauth_failed', request.url))
  }
}