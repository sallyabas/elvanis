import type { SupabaseClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import { getGoalStatus } from './signal-goal-map'

const resend = new Resend(process.env.RESEND_API_KEY)

// ── Types ──────────────────────────────────────────────────────────────────

type Goal = {
  id:            string
  founder_id:    string
  signal_type:   string
  title:         string
  target_value:  string
  current_value: string | null
  start_value:   string | null
  unit:          string
  target_date:   string
  status:        string
  at_risk_since: string | null
  severity:      string | null
  celebrated:    boolean
}

type Signal = {
  signal_type: string
  value:       number | null
  severity:    string
  status:      string   // 'new' | 'acknowledged' | 'resolved'
}

type Founder = {
  email:     string | null
  full_name: string | null
}

type GoalUpdate = {
  id:            string
  current_value: string | null
  status:        string
  at_risk_since: string | null
  severity:      string | null
  celebrated:    boolean
  updated_at:    string
}

// ── Main function ──────────────────────────────────────────────────────────

/**
 * Called by scan route after signals are saved.
 * Updates all active/at_risk goals for a founder in a single pass.
 * Uses Promise.all for parallel DB writes — no sequential bottleneck.
 * Non-fatal — scan route never fails due to goal checker errors.
 */
export async function checkAndUpdateGoals(
  founderId:     string,
  supabaseAdmin: SupabaseClient
): Promise<void> {
  try {

    // ── Pass 1: Fetch goals + signals + founder in parallel ──
    const [goalsResult, signalsResult, founderResult] = await Promise.all([
      supabaseAdmin
        .from('goals')
        .select('*')
        .eq('founder_id', founderId)
        .in('status', ['active', 'at_risk']),

      supabaseAdmin
        .from('diagnostic_signals')
        .select('signal_type, value, severity, status')
        .eq('founder_id', founderId),

      supabaseAdmin
        .from('founders')
        .select('email, full_name')
        .eq('id', founderId)
        .maybeSingle(),
    ])

    const goals:   Goal[]        = goalsResult.data   ?? []
    const signals: Signal[]      = signalsResult.data  ?? []
    const founder: Founder | null = founderResult.data ?? null

    if (goals.length === 0) return

    // ── Index signals by signal_type for O(1) lookup ──
    // If multiple signals exist for same type, prefer non-resolved
    const signalMap = new Map<string, Signal>()
    for (const signal of signals) {
      const existing = signalMap.get(signal.signal_type)
      if (!existing || signal.status !== 'resolved') {
        signalMap.set(signal.signal_type, signal)
      }
    }

    const now    = new Date()
    const nowISO = now.toISOString()
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''

    // ── Pass 2: Calculate new state for each goal ──
    const updates:       GoalUpdate[] = []
    const emailsToSend:  Array<{ goal: Goal; newStatus: string; currentNum: number | null }> = []

    for (const goal of goals) {
      const signal    = signalMap.get(goal.signal_type)
      const targetNum = Number(goal.target_value)
      const lowerBetter = isLowerBetter(goal.signal_type)

      // ── Determine current value ──
      let newCurrentValue: string | null = goal.current_value
      if (signal && signal.value !== null && signal.value !== undefined) {
        newCurrentValue = String(signal.value)
      }

      const currentNum = newCurrentValue !== null ? Number(newCurrentValue) : null

      // ── Derive new status ──
      let newStatus = getGoalStatus(currentNum, targetNum, lowerBetter, goal.target_date)

      // ── Auto-achieve: resolved signal + target met ──
      if (signal?.status === 'resolved' && currentNum !== null) {
        const targetMet = lowerBetter
          ? currentNum <= targetNum
          : currentNum >= targetNum
        if (targetMet) newStatus = 'achieved'
      }

      // ── Missed: past deadline, not achieved ──
      if (newStatus !== 'achieved' && new Date(goal.target_date) < now) {
        newStatus = 'missed'
      }

      // ── at_risk_since transitions ──
      let newAtRiskSince: string | null = goal.at_risk_since
      if (newStatus === 'at_risk') {
        // Set once on first entry — never overwrite while already at_risk
        if (!goal.at_risk_since) newAtRiskSince = nowISO
      } else {
        // Clear on any exit from at_risk
        newAtRiskSince = null
      }

      // ── Severity: update from signal if signal still active ──
      let newSeverity: string | null = goal.severity
      if (signal && signal.status !== 'resolved') {
        newSeverity = signal.severity
      }

      // ── celebrated: reset to false only when newly transitioning to achieved ──
      const wasAlreadyAchieved = goal.status === 'achieved'
      const newCelebrated = (newStatus === 'achieved' && !wasAlreadyAchieved)
        ? false           // newly achieved → Victory UI fires on next login
        : goal.celebrated

      // ── Queue email if status changed to achieved or missed ──
      const statusChanged = newStatus !== goal.status
      if (statusChanged && (newStatus === 'achieved' || newStatus === 'missed')) {
        emailsToSend.push({ goal, newStatus, currentNum })
      }

      // ── Skip DB write if nothing changed ──
      const unchanged =
        newCurrentValue === goal.current_value &&
        newStatus       === goal.status        &&
        newAtRiskSince  === goal.at_risk_since &&
        newSeverity     === goal.severity      &&
        newCelebrated   === goal.celebrated

      if (unchanged) continue

      updates.push({
        id:            goal.id,
        current_value: newCurrentValue,
        status:        newStatus,
        at_risk_since: newAtRiskSince,
        severity:      newSeverity,
        celebrated:    newCelebrated,
        updated_at:    nowISO,
      })
    }

    // ── Pass 3: Parallel DB writes ──
    if (updates.length > 0) {
      await Promise.all(
        updates.map(update =>
          supabaseAdmin
            .from('goals')
            .update({
              current_value: update.current_value,
              status:        update.status,
              at_risk_since: update.at_risk_since,
              severity:      update.severity,
              celebrated:    update.celebrated,
              updated_at:    update.updated_at,
            })
            .eq('id', update.id)
        )
      )
      console.log(`[goal-checker] updated ${updates.length} goal(s) for founder=${founderId}`)
    } else {
      console.log(`[goal-checker] no changes needed for founder=${founderId}`)
    }

    // ── Pass 4: Send goal achievement/missed emails ──
    // Runs after DB writes so status is committed before email fires
    // Non-fatal — email failure never affects goal state
    if (founder?.email && emailsToSend.length > 0) {
      await Promise.all(
        emailsToSend.map(({ goal, newStatus, currentNum }) => {
          const isAchieved = newStatus === 'achieved'
          return resend.emails.send({
            from:    process.env.RESEND_FROM_EMAIL ?? 'onboarding@resend.dev',
            to:      founder.email!,
            subject: isAchieved
              ? `🎉 Goal achieved — ${goal.title}`
              : `⚠️ Goal missed — ${goal.title}`,
            html: buildGoalEmail({
              isAchieved,
              goalTitle:    goal.title,
              targetValue:  goal.target_value,
              currentValue: currentNum,
              unit:         goal.unit,
              appUrl,
            }),
          }).catch(err => console.error(`[goal-checker] email failed for goal=${goal.id}:`, err))
        })
      )
      console.log(`[goal-checker] sent ${emailsToSend.length} goal email(s) for founder=${founderId}`)
    }

  } catch (err) {
    // Non-fatal — scan route must not fail due to goal checker errors
    console.error(`[goal-checker] error for founder=${founderId}:`, err)
  }
}

// ── Email builder ──────────────────────────────────────────────────────────

function buildGoalEmail(params: {
  isAchieved:   boolean
  goalTitle:    string
  targetValue:  string
  currentValue: number | null
  unit:         string
  appUrl:       string
}): string {
  const { isAchieved, goalTitle, targetValue, currentValue, unit, appUrl } = params
  const statusColor = isAchieved ? '#059669' : '#DC2626'
  const statusBg    = isAchieved ? '#ECFDF5' : '#FEF2F2'
  const icon        = isAchieved ? '🎉' : '⚠️'
  const headline    = isAchieved ? 'Goal achieved!' : 'Goal missed'

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F9FAFB;font-family:Inter,Arial,sans-serif">
<div style="max-width:600px;margin:0 auto;padding:32px 16px">
  <div style="text-align:center;margin-bottom:32px">
    <h1 style="font-size:26px;font-weight:800;color:#2563EB;margin:0 0 4px">Elvanis</h1>
    <p style="color:#6B7280;font-size:14px;margin:0">Goal update</p>
  </div>
  <div style="background:${statusBg};border-radius:16px;padding:28px;margin-bottom:24px;text-align:center">
    <div style="font-size:48px;margin-bottom:12px">${icon}</div>
    <h2 style="color:${statusColor};margin:0 0 8px;font-size:20px;font-weight:800">${headline}</h2>
    <p style="color:${statusColor};margin:0;font-size:14px;font-weight:600">${goalTitle}</p>
  </div>
  <div style="background:#fff;border-radius:12px;border:1px solid #E5E7EB;padding:20px;margin-bottom:24px">
    <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid #F3F4F6">
      <span style="font-size:13px;color:#6B7280">Target</span>
      <span style="font-size:13px;font-weight:700;color:#111827">${targetValue} ${unit}</span>
    </div>
    <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0">
      <span style="font-size:13px;color:#6B7280">Final value</span>
      <span style="font-size:13px;font-weight:700;color:${statusColor}">${currentValue !== null ? `${currentValue} ${unit}` : '—'}</span>
    </div>
  </div>
  <div style="text-align:center;margin-bottom:24px">
    <a href="${appUrl}/health-tracker" style="display:inline-block;padding:12px 28px;background:#2563EB;color:#fff;border-radius:10px;text-decoration:none;font-weight:700;font-size:14px">
      ${isAchieved ? 'View your wins →' : 'Set a new target →'}
    </a>
  </div>
  <div style="text-align:center;border-top:1px solid #E5E7EB;padding-top:20px">
    <p style="color:#9CA3AF;font-size:12px;margin:0">Elvanis · Know what to fix before you scale</p>
  </div>
</div>
</body>
</html>`
}

// ── Helper: lowerBetter lookup ─────────────────────────────────────────────
// Local Set — avoids circular import risk if signal-goal-map ever imports
// from goal-checker in future.

const LOWER_BETTER_SIGNALS = new Set([
  'churn_spike',
  'ticket_volume_increase',
  'response_time_increase',
  'repeat_complaint_pattern',
  'bug_backlog_growth',
  'cycle_time_increase',
  'blocked_tickets_spike',
  'refund_spike',
])

function isLowerBetter(signalType: string): boolean {
  return LOWER_BETTER_SIGNALS.has(signalType)
}