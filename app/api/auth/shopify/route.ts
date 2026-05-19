import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const shop = request.nextUrl.searchParams.get('shop')

  if (!shop) {
    return NextResponse.redirect(new URL('/connect/shopify', request.url))
  }

  const cleanShop = shop
    .replace('https://', '')
    .replace('http://', '')
    .replace(/\/$/, '')
    .replace(/\s+/g, '')

  if (!/^[a-zA-Z0-9][a-zA-Z0-9\-\.]*[a-zA-Z0-9]$/.test(cleanShop)) {
    return NextResponse.redirect(new URL('/connect/shopify?error=invalid_url', request.url))
  }

  const shopDomain = cleanShop.includes('.myshopify.com')
    ? cleanShop
    : `${cleanShop}.myshopify.com`

  try {
    const clientId = process.env.SHOPIFY_CLIENT_ID!
    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/shopify/callback`
    const scopes = 'read_orders,read_customers,read_products,read_inventory,read_analytics'
    const state = Buffer.from(JSON.stringify({ shop: shopDomain, ts: Date.now() })).toString('base64')

    const authUrl = new URL(`https://${shopDomain}/admin/oauth/authorize`)
    authUrl.searchParams.set('client_id', clientId)
    authUrl.searchParams.set('scope', scopes)
    authUrl.searchParams.set('redirect_uri', redirectUri)
    authUrl.searchParams.set('state', state)

    // Redirect with headers that prevent iframe embedding
    const response = NextResponse.redirect(authUrl.toString())
    response.headers.set('Content-Security-Policy', "frame-ancestors 'none'")
    response.headers.set('X-Frame-Options', 'DENY')
    return response
  } catch {
    return NextResponse.redirect(new URL('/connect/shopify?error=invalid_store', request.url))
  }
}
