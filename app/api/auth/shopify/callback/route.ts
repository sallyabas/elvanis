import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient, createServerComponentClient } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const code = searchParams.get('code')
  const shop = searchParams.get('shop')

  if (!code || !shop) {
    return NextResponse.redirect(new URL('/connect/shopify?error=shopify_failed', request.url))
  }

  try {
    // Exchange code for access token
    const tokenRes = await fetch(`https://${shop}/admin/oauth/access_token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: process.env.SHOPIFY_CLIENT_ID,
        client_secret: process.env.SHOPIFY_CLIENT_SECRET,
        code,
      }),
    })

    const tokenData = await tokenRes.json()
    console.log('Shopify token response:', tokenRes.status, JSON.stringify(tokenData).substring(0, 200))

    if (!tokenData.access_token) {
      console.error('Shopify token error:', tokenData)
      return NextResponse.redirect(new URL('/connect/shopify?error=token_failed', request.url))
    }

    // Get shop info
    const shopRes = await fetch(`https://${shop}/admin/api/2024-10/shop.json`, {
      headers: {
        'X-Shopify-Access-Token': tokenData.access_token,
        'Content-Type': 'application/json',
      },
    })
    const shopData = await shopRes.json()
    const shopInfo = shopData.shop
    console.log('Shopify shop info:', shopInfo?.name, shopInfo?.currency)

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

    const admin = createAdminClient()

    // Check-then-insert-or-update
    const { data: existingSource } = await admin
      .from('data_sources')
      .select('id')
      .eq('founder_id', founder.id)
      .eq('source_type', 'shopify')
      .maybeSingle()

    const sourcePayload = {
      founder_id: founder.id,
      source_type: 'shopify',
      status: 'active',
      access_token: tokenData.access_token,
      config: {
        shop,
        shop_name: shopInfo?.name ?? shop,
        shop_email: shopInfo?.email ?? null,
        currency: shopInfo?.currency ?? 'GBP',
        plan: shopInfo?.plan_name ?? null,
      },
      last_synced_at: null,
    }

    if (existingSource) {
      await admin.from('data_sources').update(sourcePayload).eq('id', existingSource.id)
    } else {
      await admin.from('data_sources').insert(sourcePayload)
    }

    // Confirm DB write then fire scan
    const { data: confirmedSource } = await admin
      .from('data_sources')
      .select('id')
      .eq('founder_id', founder.id)
      .eq('source_type', 'shopify')
      .eq('status', 'active')
      .maybeSingle()

    if (confirmedSource) {
      await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/scrape/shopify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ founderId: founder.id }),
      }).catch(err => console.error('Shopify scan error:', err))
    }

    return NextResponse.redirect(new URL('/signals?connected=shopify', request.url))

  } catch (err) {
    console.error('Shopify OAuth error:', err)
    return NextResponse.redirect(new URL('/connect/shopify?error=shopify_failed', request.url))
  }
}
