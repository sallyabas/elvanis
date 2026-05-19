import { NextResponse } from 'next/server'
import { createAdminClient, createServerComponentClient } from '@/lib/supabase-server'

export async function GET() {
  try {
    const supabase = await createServerComponentClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ templates: [] })

    const { data: founder } = await supabase
      .from('founders').select('id').eq('user_id', user.id).maybeSingle()
    if (!founder) return NextResponse.json({ templates: [] })

    const admin = createAdminClient()
    const { data: sources } = await admin
      .from('data_sources')
      .select('config')
      .eq('founder_id', founder.id)
      .eq('source_type', 'csv')
      .eq('status', 'active')

    const templates = sources
      ?.map(s => (s.config as Record<string, string>)?.template_type)
      .filter(Boolean) ?? []

    return NextResponse.json({ templates })
  } catch {
    return NextResponse.json({ templates: [] })
  }
}