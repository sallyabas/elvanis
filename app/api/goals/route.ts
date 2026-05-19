import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient, createServerComponentClient } from '@/lib/supabase-server'
import { SIGNAL_GOAL_MAP } from '@/lib/signal-goal-map'

export async function GET(request: NextRequest) {
  try {
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

    const { data: goals, error } = await admin
      .from('goals')
      .select('*')
      .eq('founder_id', founder.id)
      .in('status', ['active', 'at_risk', 'achieved', 'missed'])
      .order('created_at', { ascending: false })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ goals: goals ?? [] })

  } catch (err) {
    console.error('[goals GET] error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerComponentClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { signal_type, target_value, target_date } = await request.json()

    if (!signal_type || !SIGNAL_GOAL_MAP[signal_type]) {
      return NextResponse.json({ error: 'Invalid signal type' }, { status: 400 })
    }

    if (!target_value || !target_date) {
      return NextResponse.json({ error: 'target_value and target_date required' }, { status: 400 })
    }

    const targetNum = Number(target_value)
    if (isNaN(targetNum) || targetNum < 0) {
      return NextResponse.json({ error: 'target_value must be a positive number' }, { status: 400 })
    }

    const admin = createAdminClient()
    const { data: founder } = await admin
      .from('founders')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle()

    if (!founder) return NextResponse.json({ error: 'Founder not found' }, { status: 404 })

    // ── 3-goal limit ──
    const { count: activeCount } = await admin
      .from('goals')
      .select('id', { count: 'exact', head: true })
      .eq('founder_id', founder.id)
      .in('status', ['active', 'at_risk'])

    if ((activeCount ?? 0) >= 3) {
      return NextResponse.json({
        error: 'You have reached the maximum of 3 active goals. Achieve or dismiss an existing one to set a new target.',
        code:  'GOAL_LIMIT_REACHED',
      }, { status: 409 })
    }

    // ── Duplicate check ──
    const { data: existing } = await admin
      .from('goals')
      .select('id')
      .eq('founder_id', founder.id)
      .eq('signal_type', signal_type)
      .in('status', ['active', 'at_risk'])
      .maybeSingle()

    if (existing) {
      return NextResponse.json({
        error: 'You already have an active goal for this signal. Delete it before creating a new one.',
        code:  'DUPLICATE_GOAL',
      }, { status: 409 })
    }

    // ── Fetch current signal value AND severity ──
    const { data: signal } = await admin
      .from('diagnostic_signals')
      .select('value, severity')
      .eq('founder_id', founder.id)
      .eq('signal_type', signal_type)
      .in('status', ['new', 'acknowledged'])
      .maybeSingle()

    const currentNum     = signal?.value !== null && signal?.value !== undefined
      ? Number(signal.value)
      : null
    const currentSeverity = signal?.severity ?? 'watch'

    // ── Zero-day win detection ──
    const meta    = SIGNAL_GOAL_MAP[signal_type]
    let   zeroDay = false
    if (currentNum !== null) {
      zeroDay = meta.lowerBetter
        ? currentNum <= targetNum
        : currentNum >= targetNum
    }

    const currentValueStr = currentNum !== null ? String(currentNum) : null
    const title = `${meta.goalVerb} ${targetNum}${meta.unit === '%' ? '%' : meta.unit === '£' ? ` ${meta.unit}` : ` ${meta.unit}`}`

    const { data: goal, error } = await admin
      .from('goals')
      .insert({
        founder_id:    founder.id,
        signal_type,
        title,
        dimension:     signal_type,
        target_value:  String(targetNum),
        current_value: currentValueStr,
        start_value:   currentValueStr,   // written once, never updated
        unit:          meta.unit,
        target_date,
        status:        'active',
        severity:      currentSeverity,   // from signal at creation time
        celebrated:    false,
      })
      .select()
      .single()

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({
          error: 'You already have an active goal for this signal type.',
          code:  'DUPLICATE_GOAL',
        }, { status: 409 })
      }
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    console.log(`[goals POST] created goal=${goal.id} signal=${signal_type} founder=${founder.id} zeroDay=${zeroDay} severity=${currentSeverity}`)
    return NextResponse.json({ goal, zeroDay })

  } catch (err) {
    console.error('[goals POST] error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}