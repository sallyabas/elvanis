import { createAdminClient } from './supabase-server'

export async function getValidToken(
  founderId: string,
  sourceType: 'ga4' | 'jira' | 'shopify' | 'intercom'
): Promise<{ accessToken: string; source: Record<string, unknown> } | null> {
  const admin = createAdminClient()

  const { data: source } = await admin
    .from('data_sources')
    .select('*')
    .eq('founder_id', founderId)
    .eq('source_type', sourceType)
    .maybeSingle()

  if (!source?.access_token) return null

  const expiresAt = source.token_expires_at ? new Date(source.token_expires_at).getTime() : null
  const tenMinutes = 10 * 60 * 1000
  const needsRefresh = expiresAt && (expiresAt - Date.now()) < tenMinutes

  if (!needsRefresh) {
    return { accessToken: source.access_token, source }
  }

  console.log(`Refreshing ${sourceType} token for founder ${founderId}`)

  try {
    let newTokens: Record<string, unknown> | null = null

    if (sourceType === 'ga4') {
      const res = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: process.env.GOOGLE_CLIENT_ID!,
          client_secret: process.env.GOOGLE_CLIENT_SECRET!,
          refresh_token: source.refresh_token,
          grant_type: 'refresh_token',
        }),
      })
      newTokens = await res.json()
      console.log('GA4 refresh response:', JSON.stringify(newTokens).substring(0, 200))
    }

    if (sourceType === 'jira') {
      const res = await fetch('https://auth.atlassian.com/oauth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          grant_type: 'refresh_token',
          client_id: process.env.JIRA_CLIENT_ID,
          client_secret: process.env.JIRA_CLIENT_SECRET,
          refresh_token: source.refresh_token,
        }),
      })
      newTokens = await res.json()
      console.log('Jira refresh response:', JSON.stringify(newTokens).substring(0, 200))
    }

    if (!newTokens?.access_token) {
      console.error(`Token refresh failed for ${sourceType} — marking as expired`)
      await admin
        .from('data_sources')
        .update({ status: 'token_expired' })
        .eq('id', source.id)
      return null
    }

    const updatedSource = {
      access_token: newTokens.access_token as string,
      refresh_token: (newTokens.refresh_token as string) ?? source.refresh_token,
      token_expires_at: newTokens.expires_in
        ? new Date(Date.now() + (newTokens.expires_in as number) * 1000).toISOString()
        : null,
      status: 'active',
    }

    await admin
      .from('data_sources')
      .update(updatedSource)
      .eq('id', source.id)

    console.log(`${sourceType} token refreshed successfully`)
    return { accessToken: updatedSource.access_token, source: { ...source, ...updatedSource } }

  } catch (err) {
    console.error(`Token refresh error for ${sourceType}:`, err)
    return null
  }
}
