import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient, createRouteHandlerClient } from '@/lib/supabase-server'

function appOrigin(): string {
  return process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
}

export async function GET(request: NextRequest) {
  const origin = appOrigin()
  const code = request.nextUrl.searchParams.get('code')
  const stateFounderId = request.nextUrl.searchParams.get('state')
  const oauthError = request.nextUrl.searchParams.get('error')

  if (oauthError) {
    console.error('[jira/callback] Atlassian error:', oauthError)
    return NextResponse.redirect(new URL(`/connect?error=jira_${oauthError}`, origin))
  }

  if (!code) {
    return NextResponse.redirect(new URL('/connect?error=no_code', origin))
  }

  const redirectUri = `${origin}/api/auth/jira/callback`

  try {
    const tokenRes = await fetch('https://auth.atlassian.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        client_id: process.env.JIRA_CLIENT_ID,
        client_secret: process.env.JIRA_CLIENT_SECRET,
        code,
        redirect_uri: redirectUri,
      }),
    })

    const tokens = await tokenRes.json()
    if (!tokens.access_token) {
      console.error('[jira/callback] Token error:', tokens)
      return NextResponse.redirect(new URL('/connect?error=token_failed', origin))
    }

    const resourcesRes = await fetch('https://api.atlassian.com/oauth/token/accessible-resources', {
      headers: { Authorization: `Bearer ${tokens.access_token}`, Accept: 'application/json' },
    })
    const resources = await resourcesRes.json()
    if (!resourcesRes.ok || !Array.isArray(resources) || resources.length === 0) {
      console.error('[jira/callback] No accessible resources:', resources)
      return NextResponse.redirect(new URL('/connect?error=jira_no_site', origin))
    }
    const site = resources[0]

    // Resolve founder: session user first, then OAuth state (fallback for Vercel / cross-site redirect)
    let founderId: string | null = null
    const response = NextResponse.redirect(new URL('/connect/jira/select', origin))
    const supabase = createRouteHandlerClient(request, response)
    const { data: { user } } = await supabase.auth.getUser()

    if (user) {
      const { data: founder } = await supabase
        .from('founders')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle()
      founderId = founder?.id ?? null
    }

    if (stateFounderId) {
      if (!founderId) {
        founderId = stateFounderId
      } else if (founderId !== stateFounderId) {
        console.error('[jira/callback] State founder mismatch:', { session: founderId, state: stateFounderId })
        return NextResponse.redirect(new URL('/connect?error=jira_session_mismatch', origin))
      }
    }

    if (!founderId) {
      return NextResponse.redirect(new URL('/login?next=/connect', origin))
    }

    const admin = createAdminClient()
    const { data: existingSource } = await admin
      .from('data_sources')
      .select('id')
      .eq('founder_id', founderId)
      .eq('source_type', 'jira')
      .maybeSingle()

    const sourcePayload = {
      founder_id: founderId,
      source_type: 'jira' as const,
      status: 'active',
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token ?? null,
      token_expires_at: tokens.expires_in
        ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
        : null,
      config: {
        cloud_id: site.id,
        site_name: site.name,
        site_url: site.url,
        scopes: tokens.scope,
      },
      last_synced_at: null,
    }

    let dbError
    if (existingSource) {
      const { error } = await admin.from('data_sources').update(sourcePayload).eq('id', existingSource.id)
      dbError = error
    } else {
      const { error } = await admin.from('data_sources').insert(sourcePayload)
      dbError = error
    }

    if (dbError) {
      console.error('[jira/callback] DB save failed:', dbError.message)
      return NextResponse.redirect(new URL('/connect?error=jira_save_failed', origin))
    }

    // Confirm token persisted before sending user to project picker
    const { data: confirmed } = await admin
      .from('data_sources')
      .select('id, access_token, config')
      .eq('founder_id', founderId)
      .eq('source_type', 'jira')
      .eq('status', 'active')
      .maybeSingle()

    if (!confirmed?.access_token) {
      console.error('[jira/callback] Token not found after save')
      return NextResponse.redirect(new URL('/connect?error=jira_save_failed', origin))
    }

    return response
  } catch (err) {
    console.error('[jira/callback] OAuth error:', err)
    return NextResponse.redirect(new URL('/connect?error=oauth_failed', origin))
  }
}
