import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient, createServerComponentClient } from '@/lib/supabase-server'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const supabase = await createServerComponentClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const admin = createAdminClient()

    const { data: founder } = await admin
      .from('founders')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle()

    if (!founder) return NextResponse.json({ error: 'Founder not found' }, { status: 404 })

    const { data: goal } = await admin
      .from('goals')
      .select('id, founder_id')
      .eq('id', id)
      .maybeSingle()

    if (!goal) return NextResponse.json({ error: 'Goal not found' }, { status: 404 })

    if (goal.founder_id !== founder.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { error } = await admin
      .from('goals')
      .delete()
      .eq('id', id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    console.log(`[goals DELETE] goal=${id} founder=${founder.id}`)
    return NextResponse.json({ success: true })

  } catch (err) {
    console.error('[goals DELETE] error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

// ── PATCH — used only for marking celebrated = true after victory animation ──
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const supabase = await createServerComponentClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()

    // Only celebrated is patchable via this route — nothing else
    if (typeof body.celebrated !== 'boolean') {
      return NextResponse.json({ error: 'Only celebrated field is patchable' }, { status: 400 })
    }

    const admin = createAdminClient()

    const { data: founder } = await admin
      .from('founders')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle()

    if (!founder) return NextResponse.json({ error: 'Founder not found' }, { status: 404 })

    // Security: verify goal belongs to this founder
    const { data: goal } = await admin
      .from('goals')
      .select('id, founder_id')
      .eq('id', id)
      .maybeSingle()

    if (!goal)                        return NextResponse.json({ error: 'Goal not found' }, { status: 404 })
    if (goal.founder_id !== founder.id) return NextResponse.json({ error: 'Forbidden' },    { status: 403 })

    const { error } = await admin
      .from('goals')
      .update({ celebrated: body.celebrated })
      .eq('id', id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    console.log(`[goals PATCH] goal=${id} celebrated=${body.celebrated} founder=${founder.id}`)
    return NextResponse.json({ success: true })

  } catch (err) {
    console.error('[goals PATCH] error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}