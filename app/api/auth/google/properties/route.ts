import { NextResponse } from 'next/server'
import { createAdminClient, createServerComponentClient } from '@/lib/supabase-server'

export async function GET() {
  try {
    const supabase = await createServerComponentClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    const { data: founder } = await supabase
      .from('founders').select('id').eq('user_id', user.id).maybeSingle()
    if (!founder) return NextResponse.json({ error: 'Founder not found' }, { status: 404 })

    const admin = createAdminClient()
    const { data: source } = await admin
      .from('data_sources')
      .select('access_token')
      .eq('founder_id', founder.id)
      .eq('source_type', 'ga4')
      .maybeSingle()

    if (!source?.access_token) {
      return NextResponse.json({ error: 'GA4 not connected' }, { status: 400 })
    }

    const res = await fetch(
      'https://analyticsadmin.googleapis.com/v1beta/accountSummaries',
      { headers: { Authorization: `Bearer ${source.access_token}` } }
    )
    const data = await res.json()

    if (!res.ok) {
      return NextResponse.json({ error: data.error?.message ?? 'Failed to fetch properties' }, { status: 500 })
    }

    const properties: Array<{
      property: string
      displayName: string
      account: string
      accountName: string
    }> = []

    for (const account of data.accountSummaries ?? []) {
      for (const prop of account.propertySummaries ?? []) {
        properties.push({
          property: prop.property,
          displayName: prop.displayName,
          account: account.name,
          accountName: account.displayName,
        })
      }
    }

    return NextResponse.json({ properties })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
