import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const clientId = process.env.INTERCOM_CLIENT_ID!
  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/intercom/callback`
  const state = Buffer.from(JSON.stringify({ ts: Date.now() })).toString('base64')

  const authUrl = new URL('https://app.intercom.com/oauth')
  authUrl.searchParams.set('client_id', clientId)
  authUrl.searchParams.set('redirect_uri', redirectUri)
  authUrl.searchParams.set('state', state)

  return NextResponse.redirect(authUrl.toString())
}
