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

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('[jira/callback] SUPABASE_SERVICE_ROLE_KEY is not set')
    return NextResponse.redirect(new URL('/connect?error=jira_server_config', origin))
  }

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

    const { data: founderRow } = await admin
      .from('founders')
      .select('id')
      .eq('id', founderId)
      .maybeSingle()

    if (!founderRow) {
      console.error('[jira/callback] Founder not found for id:', founderId)
      return NextResponse.redirect(new URL('/connect?error=jira_founder_not_found', origin))
    }

    const config = {
      cloud_id: site.id,
      site_name: site.name,
      site_url: site.url,
    }

    const payloadVariants: Record<string, unknown>[] = [
      {
        founder_id: founderId,
        source_type: 'jira',
        status: 'active',
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token ?? null,
        token_expires_at: tokens.expires_in
          ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
          : null,
        config,
        last_synced_at: null,
      },
      // Fallback if DB has no refresh_token / token_expires_at columns
      {
        founder_id: founderId,
        source_type: 'jira',
        status: 'active',
        access_token: tokens.access_token,
        config,
        last_synced_at: null,
      },
    ]

    let saved: { id: string; access_token: string } | null = null
    let lastDbError: string | null = null

    for (const sourcePayload of payloadVariants) {
      const { data: updatedRows, error: updateError } = await admin
        .from('data_sources')
        .update(sourcePayload)
        .eq('founder_id', founderId)
        .eq('source_type', 'jira')
        .select('id, access_token')

      if (updateError) {
        lastDbError = updateError.message
        console.error('[jira/callback] DB update failed:', updateError.message, updateError.code)
        continue
      }

      if (updatedRows?.some(r => r.access_token)) {
        saved = updatedRows.find(r => r.access_token) ?? null
        break
      }

      const { data: inserted, error: insertError } = await admin
        .from('data_sources')
        .insert(sourcePayload)
        .select('id, access_token')
        .single()

      if (insertError) {
        lastDbError = insertError.message
        console.error('[jira/callback] DB insert failed:', insertError.message, insertError.code)
        continue
      }

      if (inserted?.access_token) {
        saved = inserted
        break
      }
    }

    if (!saved) {
      console.error('[jira/callback] All save attempts failed. Last error:', lastDbError)
      return NextResponse.redirect(new URL('/connect?error=jira_save_failed', origin))
    }

    if (!saved?.access_token) {
      console.error('[jira/callback] Token missing after save')
      return NextResponse.redirect(new URL('/connect?error=jira_save_failed', origin))
    }

    // Collapse duplicate jira rows — keep the row we just saved
    const { data: allJiraRows } = await admin
      .from('data_sources')
      .select('id')
      .eq('founder_id', founderId)
      .eq('source_type', 'jira')

    const duplicateIds = (allJiraRows ?? [])
      .map(r => r.id)
      .filter(id => id !== saved!.id)

    if (duplicateIds.length > 0) {
      await admin.from('data_sources').delete().in('id', duplicateIds)
    }

    return response
  } catch (err) {
    console.error('[jira/callback] OAuth error:', err)
    return NextResponse.redirect(new URL('/connect?error=oauth_failed', origin))
  }
}
