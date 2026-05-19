import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient, createServerComponentClient } from '@/lib/supabase-server'

export async function POST(request: NextRequest) {
  try {
    const {
      signalType,
      signalInsight,
      conflictingSources,
      conflictingValues,
      trustedSource,
      trustedValue,
    } = await request.json()

    if (!signalType || !trustedSource || !conflictingSources) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const supabase = await createServerComponentClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    const { data: founder } = await supabase
      .from('founders')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle()

    if (!founder) return NextResponse.json({ error: 'Founder not found' }, { status: 404 })

    const admin = createAdminClient()

    // Check if there's already an unused preference for this signal type
    // If yes — update it (founder changed their mind before digest ran)
    const { data: existing } = await admin
      .from('conflict_resolutions')
      .select('id')
      .eq('founder_id', founder.id)
      .eq('signal_type', signalType)
      .is('used_in_digest_id', null)
      .maybeSingle()

    if (existing) {
      // Update existing unused preference
      await admin
        .from('conflict_resolutions')
        .update({
          trusted_source: trustedSource,
          trusted_value: trustedValue ?? null,
          conflicting_sources: conflictingSources,
          conflicting_values: conflictingValues ?? null,
          signal_insight: signalInsight ?? null,
          choice_type: 'manual',
          created_at: new Date().toISOString(), // refresh timestamp
        })
        .eq('id', existing.id)

      console.log(`[conflict] Updated preference: founder=${founder.id} signal=${signalType} trusted=${trustedSource}`)
    } else {
      // Insert new preference
      await admin
        .from('conflict_resolutions')
        .insert({
          founder_id: founder.id,
          signal_type: signalType,
          signal_insight: signalInsight ?? null,
          conflicting_sources: conflictingSources,
          conflicting_values: conflictingValues ?? null,
          trusted_source: trustedSource,
          trusted_value: trustedValue ?? null,
          choice_type: 'manual',
        })

      console.log(`[conflict] Saved preference: founder=${founder.id} signal=${signalType} trusted=${trustedSource}`)
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[conflict] Error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}