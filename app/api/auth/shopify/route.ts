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
    
      const authUrl = `https://${shopDomain}/admin/oauth/authorize?client_id=${clientId}&scope=${scopes}&redirect_uri=${redirectUri}`
    
      return NextResponse.redirect(authUrl)
    } catch {
      return NextResponse.redirect(new URL('/connect/shopify?error=invalid_store', request.url))
    }
}
