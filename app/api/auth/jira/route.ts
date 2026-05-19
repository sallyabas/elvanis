import { NextResponse } from 'next/server'

export async function GET() {
  const clientId = process.env.JIRA_CLIENT_ID!
  const callbackUrl = 'http://localhost:3000/api/auth/jira/callback'
  
  const params = new URLSearchParams({
    audience: 'api.atlassian.com',
    client_id: clientId,
    scope: 'read:jira-work write:jira-work read:jira-user offline_access',
    redirect_uri: callbackUrl,
    response_type: 'code',
    prompt: 'consent',
  })

  const authUrl = `https://auth.atlassian.com/authorize?${params.toString()}`
  return NextResponse.redirect(authUrl)
}
