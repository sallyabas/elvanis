import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient, createServerComponentClient } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code')
  if (!code) {
    return NextResponse.redirect(new URL('/connect/intercom?error=no_code', request.url))
  }

  try {
    const tokenRes = await fetch('https://api.intercom.io/auth/eagle/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code,
        client_id: process.env.INTERCOM_CLIENT_ID,
        client_secret: process.env.INTERCOM_CLIENT_SECRET,
        redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/intercom/callback`,
        grant_type: 'authorization_code',
      }),
    })

    const tokenData = await tokenRes.json()
    console.log('Intercom token status:', tokenRes.status)
    console.log('Intercom token data:', JSON.stringify(tokenData).substring(0, 200))

    if (!tokenData.access_token) {
      console.error('Intercom token error:', tokenData)
      return NextResponse.redirect(new URL('/connect/intercom?error=token_failed', request.url))
    }

    const meRes = await fetch('https://api.intercom.io/me', {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
        Accept: 'application/json',
        'Intercom-Version': '2.11',
      },
    })
    const meData = await meRes.json()

    const supabase = await createServerComponentClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.redirect(new URL('/login', request.url))

    const { data: founder } = await supabase
      .from('founders')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle()
    if (!founder) return NextResponse.redirect(new URL('/login', request.url))

    const admin = createAdminClient()

    const { data: existingSource } = await admin
      .from('data_sources')
      .select('id')
      .eq('founder_id', founder.id)
      .eq('source_type', 'intercom')
      .maybeSingle()

    const sourcePayload = {
      founder_id: founder.id,
      source_type: 'intercom',
      status: 'active',
      access_token: tokenData.access_token,
      config: {
        app_id: meData.app?.id_code ?? null,
        app_name: meData.app?.name ?? null,
        workspace_id: meData.id ?? null,
        email: meData.email ?? null,
      },
      last_synced_at: null,
    }

    if (existingSource) {
      await admin.from('data_sources').update(sourcePayload).eq('id', existingSource.id)
    } else {
      await admin.from('data_sources').insert(sourcePayload)
    }

    // Confirm DB write completed before firing scan
    const { data: confirmedSource } = await admin
      .from('data_sources')
      .select('id')
      .eq('founder_id', founder.id)
      .eq('source_type', 'intercom')
      .eq('status', 'active')
      .maybeSingle()

    if (confirmedSource) {
      fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/scrape/intercom`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ founderId: founder.id }),
      }).catch(err => console.error('Intercom initial scan error:', err))
    }

    return NextResponse.redirect(new URL('/signals?connected=intercom', request.url))

  } catch (err) {
    console.error('Intercom OAuth error:', err)
    return NextResponse.redirect(new URL('/connect/intercom?error=oauth_failed', request.url))
  }
}
