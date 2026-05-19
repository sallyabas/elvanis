import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import { createServerComponentClient } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code')
  if (!code) return NextResponse.redirect(new URL('/connect?error=no_code', request.url))

  try {
    // Exchange code for tokens
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/google/callback`,
        grant_type: 'authorization_code',
      }),
    })

    const tokens = await tokenRes.json()
    if (!tokens.access_token) {
      console.error('Google token error:', tokens)
      return NextResponse.redirect(new URL('/connect?error=token_failed', request.url))
    }

    // Get GA4 properties
    const propertiesRes = await fetch(
      'https://analyticsadmin.googleapis.com/v1beta/accountSummaries',
      { headers: { Authorization: `Bearer ${tokens.access_token}` } }
    )
    const propertiesData = await propertiesRes.json()
    const firstProperty = propertiesData.accountSummaries?.[0]?.propertySummaries?.[0]

    // Get current user
    const supabase = await createServerComponentClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.redirect(new URL('/login', request.url))

    const { data: founder } = await supabase
      .from('founders')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle()

    if (!founder) return NextResponse.redirect(new URL('/login', request.url))

    // Save to data_sources
    const admin = createAdminClient()
    const { data: existingSource } = await admin
    .from('data_sources')
    .select('id')
    .eq('founder_id', founder.id)
    .eq('source_type', 'ga4')
    .maybeSingle()
  
  const sourcePayload = {
    founder_id: founder.id,
    source_type: 'ga4',
    status: 'active',
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token ?? null,
    token_expires_at: tokens.expires_in
      ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
      : null,
    config: {
      property_id: firstProperty?.property,
      property_name: firstProperty?.displayName,
      account: propertiesData.accountSummaries?.[0]?.name,
    },
    last_synced_at: null,
  }
  
  if (existingSource) {
    await admin.from('data_sources').update(sourcePayload).eq('id', existingSource.id)
  } else {
    await admin.from('data_sources').insert(sourcePayload)
  }

    return NextResponse.redirect(new URL('/connect/ga/select', request.url)) 
} catch (err) {
    console.error('Google OAuth error:', err)
    return NextResponse.redirect(new URL('/connect?error=oauth_failed', request.url))
  }

}
