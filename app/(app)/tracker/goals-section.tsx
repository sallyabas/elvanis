'use client'

import { useState, useEffect, useRef } from 'react'
import { SIGNAL_GOAL_MAP, getGoalProgress } from '@/lib/signal-goal-map'
import { useT, useLang } from '@/app/context/LanguageContext'

type Goal = {
  id:            string
  signal_type:   string
  title:         string
  target_value:  string
  current_value: string | null
  start_value:   string | null
  unit:          string
  target_date:   string
  status:        string
  updated_at:    string
  created_at:    string
  at_risk_since: string | null
  severity:      string | null
  celebrated:    boolean
}

type ActiveSignal = {
  signal_type: string
  value:       number | null
  severity:    string
}

interface Props {
  founderId:        string
  activeSignals:    ActiveSignal[]
  subscriptionTier: string
}

export default function GoalsSection({ founderId, activeSignals, subscriptionTier }: Props) {
  const t    = useT()
  const lang = useLang()

  const [goals,            setGoals]            = useState<Goal[]>([])
  const [loading,          setLoading]          = useState(true)
  const [formOpen,         setFormOpen]         = useState(false)
  const [signalType,       setSignalType]       = useState('')
  const [targetValue,      setTargetValue]      = useState('')
  const [targetDate,       setTargetDate]       = useState('')
  const [saving,           setSaving]           = useState(false)
  const [formMsg,          setFormMsg]          = useState<{ text: string; type: 'error' | 'success' | 'warning' } | null>(null)
  const [deleting,         setDeleting]         = useState<string | null>(null)
  const [zeroDayWarn,      setZeroDayWarn]      = useState<{ current: number; unit: string } | null>(null)
  const [touched,          setTouched]          = useState({ signal: false, target: false, date: false })
  const [celebratingId,    setCelebratingId]    = useState<string | null>(null)
  const [slidingOutId,     setSlidingOutId]     = useState<string | null>(null)
  const [confirmDismissId, setConfirmDismissId] = useState<string | null>(null)

  const targetInputRef = useRef<HTMLInputElement>(null)
  const isNavigator    = subscriptionTier === 'navigator'

  async function loadGoals() {
    setLoading(true)
    const res     = await fetch('/api/goals')
    const data    = await res.json()
    const fetched: Goal[] = data.goals ?? []

    const newlyAchieved = fetched.find(g => g.status === 'achieved' && !g.celebrated)
    if (newlyAchieved) {
      setCelebratingId(newlyAchieved.id)
      setTimeout(async () => {
        setSlidingOutId(newlyAchieved.id)
        setTimeout(async () => {
          await fetch(`/api/goals/${newlyAchieved.id}`, {
            method:  'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ celebrated: true }),
          })
          setCelebratingId(null)
          setSlidingOutId(null)
          setGoals(fetched)
        }, 500)
      }, 2500)
    } else {
      setGoals(fetched)
    }
    setLoading(false)
  }

  useEffect(() => { loadGoals() }, [])

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

  const activeGoals   = goals.filter(g => g.status === 'active' || g.status === 'at_risk')
  const atCapacity    = activeGoals.length >= 3
  const achievedCount = goals.filter(g => g.status === 'achieved').length
  const missedCount   = goals.filter(g => g.status === 'missed').length

  const achievedGoals = goals
    .filter(g => g.status === 'achieved' && new Date(g.updated_at) > thirtyDaysAgo)
    .slice(0, 3)

  const missedGoals = goals
    .filter(g => g.status === 'missed' && new Date(g.updated_at) > thirtyDaysAgo)
    .slice(0, 3)

  const availableSignals = Array.from(
    new Map(
      activeSignals
        .filter(s =>
          SIGNAL_GOAL_MAP[s.signal_type] &&
          !activeGoals.some(g => g.signal_type === s.signal_type)
        )
        .map(s => [s.signal_type, s])
    ).values()
  )

  useEffect(() => {
    setZeroDayWarn(null)
    if (!signalType || !targetValue) return
    const meta   = SIGNAL_GOAL_MAP[signalType]
    if (!meta) return
    const signal = activeSignals.find(s => s.signal_type === signalType)
    if (!signal || signal.value === null) return
    const current    = signal.value
    const target     = Number(targetValue)
    if (isNaN(target)) return
    if (meta.unit === '%' && signal.value > 100) return
    const alreadyMet = meta.lowerBetter ? current <= target : current >= target
    if (alreadyMet) setZeroDayWarn({ current, unit: meta.unit })
  }, [signalType, targetValue, activeSignals])

  const fieldMissing = {
    signal: touched.signal && !signalType,
    target: touched.target && !targetValue,
    date:   touched.date   && !targetDate,
  }
  const allFilled    = !!signalType && !!targetValue && !!targetDate
  const selectedMeta = signalType ? SIGNAL_GOAL_MAP[signalType] : null
  const missingFields = [
    !signalType  && t('tracker.goals_signal_lbl'),
    !targetValue && t('tracker.goals_target_lbl'),
    !targetDate  && t('tracker.goals_date_lbl'),
  ].filter(Boolean)

  function isStalled(goal: Goal): boolean {
    const meta = SIGNAL_GOAL_MAP[goal.signal_type]
    if (!meta) return false
    const daysSince = (Date.now() - new Date(goal.updated_at).getTime()) / (24 * 60 * 60 * 1000)
    if (daysSince < 7) return false
    const start   = goal.start_value   !== null ? Number(goal.start_value)   : null
    const current = goal.current_value !== null ? Number(goal.current_value) : null
    const target  = Number(goal.target_value)
    return getGoalProgress(start, current, target, meta.lowerBetter) === 0
  }

  function isUpsellEligible(goal: Goal): boolean {
    const severity = goal.severity ?? 'watch'
    if (severity === 'watch') return false
    if (isStalled(goal))      return false
    const totalDays  = Math.ceil(
      (new Date(goal.target_date).getTime() - new Date(goal.created_at).getTime())
      / (24 * 60 * 60 * 1000)
    )
    const threshold  = Math.max(totalDays * 0.5, 3)
    const daysAtRisk = goal.at_risk_since
      ? Math.ceil((Date.now() - new Date(goal.at_risk_since).getTime()) / (24 * 60 * 60 * 1000))
      : 0
    if (severity === 'critical') return daysAtRisk > threshold * 0.5
    return daysAtRisk > threshold
  }

  function velocityRequired(goal: Goal, meta: typeof SIGNAL_GOAL_MAP[string]): string | null {
    const current = goal.current_value !== null ? Number(goal.current_value) : null
    if (current === null) return null
    const target    = Number(goal.target_value)
    const [y, m, d] = goal.target_date.split('-').map(Number)
    const targetDay = new Date(y, m - 1, d)
    const today     = new Date(); today.setHours(0, 0, 0, 0)
    const daysLeft  = Math.ceil((targetDay.getTime() - today.getTime()) / (24 * 60 * 60 * 1000))
    if (daysLeft <= 0) return null
    const weeksLeft = daysLeft / 7
    const gap       = meta.lowerBetter ? current - target : target - current
    if (gap <= 0) return null
    const perWeek   = gap / weeksLeft
    const rounded   = perWeek < 1 ? perWeek.toFixed(2) : Math.ceil(perWeek).toString()
    return t('tracker.goals_velocity').replace('{v}', rounded).replace('{unit}', meta.unit)
  }

  function momentumText(goal: Goal, meta: typeof SIGNAL_GOAL_MAP[string]): string | null {
    const start   = goal.start_value   !== null ? Number(goal.start_value)   : null
    const current = goal.current_value !== null ? Number(goal.current_value) : null
    const target  = Number(goal.target_value)
    if (start === null || current === null) return null
    const awayFrom  = meta.lowerBetter ? current - target  : target - current
    const madeSince = meta.lowerBetter ? start - current   : current - start
    if (awayFrom <= 0) return null
    const awayStr = t('tracker.goals_away').replace('{n}', Math.abs(awayFrom).toFixed(awayFrom % 1 === 0 ? 0 : 1)).replace('{unit}', meta.unit)
    const madeStr = madeSince > 0
      ? ' ' + t('tracker.goals_progress_made').replace('{n}', Math.abs(madeSince).toFixed(madeSince % 1 === 0 ? 0 : 1)).replace('{unit}', meta.unit)
      : ''
    return `${awayStr}${madeStr}`
  }

  function atRiskDuration(goal: Goal): string | null {
    if (!goal.at_risk_since) return null
    const days = Math.ceil((Date.now() - new Date(goal.at_risk_since).getTime()) / (24 * 60 * 60 * 1000))
    if (days < 1) return t('tracker.goals_at_risk_today')
    const s = days !== 1 ? (lang === 'ar' ? '' : 's') : ''
    return t('tracker.goals_at_risk_for').replace('{n}', String(days)).replace('{s}', s)
  }

  function navigatorServiceUrl(goal: Goal, meta: typeof SIGNAL_GOAL_MAP[string]): string {
    const params = new URLSearchParams({
      goal:    goal.signal_type,
      current: goal.current_value ?? '',
      target:  goal.target_value,
      unit:    meta.unit,
    })
    return `${meta.serviceUrl}&${params.toString()}`
  }

  function daysLeft(targetDate: string): number {
    const [y, m, d] = targetDate.split('-').map(Number)
    const target    = new Date(y, m - 1, d)
    const today     = new Date(); today.setHours(0, 0, 0, 0)
    return Math.ceil((target.getTime() - today.getTime()) / (24 * 60 * 60 * 1000))
  }

  function statusBadge(status: string) {
    if (status === 'achieved') return { bg: '#ECFDF5', color: '#059669', label: `✓ ${t('common.achieved')}` }
    if (status === 'missed')   return { bg: '#FEF2F2', color: '#DC2626', label: t('common.missed')     }
    if (status === 'at_risk')  return { bg: '#FEF2F2', color: '#DC2626', label: t('common.at_risk')    }
    return                            { bg: '#EFF6FF', color: '#2563EB', label: t('common.active')     }
  }

  function inputStyle(hasError: boolean) {
    return {
      width: '100%', padding: '10px 12px',
      border: `1.5px solid ${hasError ? '#FCA5A5' : '#E5E7EB'}`,
      borderRadius: 9, fontSize: 14, outline: 'none',
      boxSizing: 'border-box' as const,
      background: '#fff',
      transition: 'border-color 0.15s',
    }
  }

  function fmtDate(iso: string) {
    return new Date(iso).toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  async function handleCreate() {
    setTouched({ signal: true, target: true, date: true })
    if (!allFilled) return
    setSaving(true)
    setFormMsg(null)
    const res  = await fetch('/api/goals', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ signal_type: signalType, target_value: targetValue, target_date: targetDate }),
    })
    const data = await res.json()
    if (res.ok) {
      setSignalType(''); setTargetValue(''); setTargetDate('')
      setZeroDayWarn(null); setTouched({ signal: false, target: false, date: false })
      setFormOpen(false)
      setFormMsg({
        text: data.zeroDay ? t('tracker.goals_created_zero') : t('tracker.goals_created'),
        type: data.zeroDay ? 'warning' : 'success',
      })
      loadGoals()
    } else {
      setFormMsg({ text: data.error ?? t('tracker.goals_error'), type: 'error' })
    }
    setSaving(false)
  }

  async function handleDelete(goalId: string) {
    setDeleting(goalId)
    await fetch(`/api/goals/${goalId}`, { method: 'DELETE' })
    setConfirmDismissId(null)
    loadGoals()
    setDeleting(null)
  }

  if (loading) {
    return (
      <div style={{ padding: '20px', background: '#fff', borderRadius: 16, border: '1px solid #E5E7EB', marginBottom: 28 }}>
        <p style={{ fontSize: 14, color: '#9CA3AF', margin: 0 }}>{t('tracker.goals_loading')}</p>
      </div>
    )
  }

  return (
    <div style={{ marginBottom: 32 }}>
      <style>{`
        @keyframes celebratePulse {
          0%   { box-shadow: 0 0 0 0 rgba(5,150,105,0.4); }
          50%  { box-shadow: 0 0 0 14px rgba(5,150,105,0); }
          100% { box-shadow: 0 0 0 0 rgba(5,150,105,0); }
        }
        .goal-celebrating { animation: celebratePulse 0.9s ease-in-out 3; }
        @keyframes slideOut {
          from { opacity: 1; transform: translateY(0); max-height: 200px; }
          to   { opacity: 0; transform: translateY(-12px); max-height: 0; overflow: hidden; margin: 0; padding: 0; }
        }
        .goal-sliding-out { animation: slideOut 0.5s ease-in forwards; }
      `}</style>

      {/* ── Section header ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: '#111827', margin: '0 0 4px' }}>{t('tracker.goals_title')}</h2>
          <p style={{ fontSize: 13, color: '#6B7280', margin: 0 }}>
            {t('tracker.goals_sub')}{' '}
            <a href="/signals" style={{ color: '#2563EB', textDecoration: 'none', fontWeight: 600 }}>
              {t('tracker.goals_go_signals')}
            </a>
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          <span style={{ fontSize: 12, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: '#EFF6FF', color: '#2563EB' }}>
            🎯 {activeGoals.length}/3
          </span>
          {achievedCount > 0 && (
            <span style={{ fontSize: 12, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: '#ECFDF5', color: '#059669' }}>
              ✓ {achievedCount}
            </span>
          )}
          {missedCount > 0 && (
            <span style={{ fontSize: 12, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: '#FEF2F2', color: '#DC2626' }}>
              ✗ {missedCount}
            </span>
          )}
          {!atCapacity && availableSignals.length > 0 && (
            <button
              onClick={() => { setFormOpen(f => !f); setFormMsg(null) }}
              style={{
                padding: '4px 12px', fontSize: 12, fontWeight: 700,
                background: formOpen ? '#F3F4F6' : '#2563EB',
                color:      formOpen ? '#374151' : '#fff',
                border: 'none', borderRadius: 20, cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              {formOpen ? t('tracker.goals_cancel_btn') : t('tracker.goals_new_btn')}
            </button>
          )}
        </div>
      </div>

      {/* ── Active goal cards ── */}
      {activeGoals.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
          {activeGoals.map(goal => {
            const meta          = SIGNAL_GOAL_MAP[goal.signal_type]
            if (!meta) return null
            const current       = goal.current_value !== null ? Number(goal.current_value) : null
            const start         = goal.start_value   !== null ? Number(goal.start_value)   : null
            const target        = Number(goal.target_value)
            const status        = goal.status
            const progress      = getGoalProgress(start, current, target, meta.lowerBetter)
            const badge         = statusBadge(status)
            const stalled       = isStalled(goal)
            const isAtRisk      = status === 'at_risk'
            const upsellShow    = isAtRisk && isUpsellEligible(goal)
            const velocity      = velocityRequired(goal, meta)
            const momentum      = isAtRisk ? momentumText(goal, meta) : null
            const atRisk        = atRiskDuration(goal)
            const dl            = daysLeft(goal.target_date)
            const isCelebrating = celebratingId === goal.id
            const isSlidingOut  = slidingOutId  === goal.id
            const borderColor   = isCelebrating ? '#059669' : stalled ? '#FDE68A' : isAtRisk ? '#FECACA' : '#E5E7EB'
            const barColor      = stalled ? '#D97706' : isAtRisk ? '#DC2626' : '#059669'

            return (
              <div
                key={goal.id}
                className={isCelebrating ? 'goal-celebrating' : isSlidingOut ? 'goal-sliding-out' : ''}
                style={{
                  background: '#fff', borderRadius: 12,
                  border: `1.5px solid ${borderColor}`,
                  padding: '14px 16px',
                  transition: 'border-color 0.3s',
                  position: 'relative', overflow: 'hidden',
                }}
              >
                {isCelebrating && (
                  <div style={{
                    position: 'absolute', top: 0, left: 0, right: 0,
                    background: '#059669', color: '#fff',
                    padding: '8px 16px', fontSize: 13, fontWeight: 700,
                    textAlign: 'center', zIndex: 10,
                  }}>
                    {t('tracker.goals_celebrated')}
                  </div>
                )}

                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, marginTop: isCelebrating ? 32 : 0 }}>
                <p style={{ fontSize: 14, fontWeight: 700, color: '#111827', margin: 0, flex: 1 }}>{lang === 'ar' ? meta.label_ar : meta.label}</p>
                  <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: badge.bg, color: badge.color, whiteSpace: 'nowrap' as const }}>
                    {badge.label}
                  </span>
                  {atRisk && isAtRisk && (
                    <span style={{ fontSize: 11, color: '#D97706', whiteSpace: 'nowrap' as const }}>· {atRisk}</span>
                  )}
                  {stalled && (
                    <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 7px', borderRadius: 20, background: '#FFFBEB', color: '#D97706', whiteSpace: 'nowrap' as const }}>
                      {t('tracker.goals_stalled')}
                    </span>
                  )}
                  <button
                    onClick={() => setConfirmDismissId(goal.id)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#D1D5DB', fontSize: 14, padding: '0 2px', lineHeight: 1, flexShrink: 0 }}
                  >
                    ✕
                  </button>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                  <div style={{ flex: 1, height: 6, background: '#F3F4F6', borderRadius: 99 }}>
                    <div style={{
                      height: 6, borderRadius: 99,
                      background: barColor,
                      width: `${progress}%`,
                      transition: 'width 1s ease-in-out',
                    }} />
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 700, color: barColor, whiteSpace: 'nowrap' as const, flexShrink: 0 }}>
                    {current !== null ? `${current}${meta.unit === '%' ? '%' : ` ${meta.unit}`}` : '—'}
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' as const }}>
                  <span style={{ fontSize: 11, color: '#9CA3AF' }}>
                    {t('tracker.goals_target')} {goal.target_value}{meta.unit === '%' ? '%' : ` ${meta.unit}`}
                  </span>
                  <span style={{ fontSize: 11, color: '#9CA3AF' }}>·</span>
                  <span style={{ fontSize: 11, color: dl > 14 ? '#9CA3AF' : dl > 0 ? '#D97706' : '#6B7280', fontWeight: dl <= 14 && dl > 0 ? 600 : 400 }}>
                    {dl > 0
                      ? t('tracker.goals_days_left').replace('{n}', String(dl))
                      : dl === 0
                      ? t('common.due_today')
                      : t('tracker.goals_awaiting_scan')}
                  </span>
                  {velocity && !isAtRisk && !stalled && (
                    <>
                      <span style={{ fontSize: 11, color: '#9CA3AF' }}>·</span>
                      <span style={{ fontSize: 11, color: '#6B7280', fontStyle: 'italic' }}>📈 {velocity}</span>
                    </>
                  )}
                  {momentum && isAtRisk && (
                    <>
                      <span style={{ fontSize: 11, color: '#9CA3AF' }}>·</span>
                      <span style={{ fontSize: 11, color: '#92400E' }}>📊 {momentum}</span>
                    </>
                  )}
                </div>

                {stalled && (
                  <div style={{ marginTop: 10, padding: '8px 12px', background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                    <span style={{ fontSize: 12, color: '#92400E' }}>{t('tracker.goals_no_progress')}</span>
                    <a href={`/signals?highlight=${goal.signal_type}`} style={{ fontSize: 12, fontWeight: 700, color: '#D97706', textDecoration: 'none', whiteSpace: 'nowrap' as const }}>
                      {t('tracker.goals_review_sig')}
                    </a>
                  </div>
                )}

{confirmDismissId === goal.id && (
                  <div style={{ marginTop: 10, padding: '10px 12px', background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 8 }}>
                    <p style={{ fontSize: 12, color: '#92400E', margin: '0 0 8px', lineHeight: 1.5 }}>
                      {t('tracker.goals_dismiss_warn')}
                    </p>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        onClick={() => handleDelete(goal.id)}
                        disabled={deleting === goal.id}
                        style={{ padding: '6px 14px', background: '#DC2626', color: '#fff', border: 'none', borderRadius: 7, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
                      >
                        {deleting === goal.id ? t('tracker.goals_dismissing') : t('tracker.goals_confirm_dismiss')}
                      </button>
                      <button
                        onClick={() => setConfirmDismissId(null)}
                        style={{ padding: '6px 14px', background: '#F3F4F6', color: '#374151', border: 'none', borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                      >
                        {t('tracker.goals_keep')}
                      </button>
                    </div>
                  </div>
                )}
                {upsellShow && (                  <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' as const }}>
                    <span style={{ fontSize: 12, color: '#991B1B', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 6, padding: '4px 10px', flex: 1 }}>
                    {lang === 'ar' ? meta.upsellCopy_ar : meta.upsellCopy}
                    </span>
                    {isNavigator ? (
                      <a href={navigatorServiceUrl(goal, meta)} style={{ fontSize: 12, fontWeight: 700, color: '#2563EB', textDecoration: 'none', whiteSpace: 'nowrap' as const, flexShrink: 0 }}>
                        {t('tracker.goals_request_help')}
                      </a>
                    ) : (
                      <a href={meta.serviceUrl} style={{ fontSize: 12, fontWeight: 700, color: '#2563EB', textDecoration: 'none', whiteSpace: 'nowrap' as const, flexShrink: 0 }}>
                        {meta.servicePrice} →
                      </a>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* ── 3-goal cap note ── */}
      {atCapacity && !formOpen && (
        <div style={{ background: '#F9FAFB', borderRadius: 10, border: '1px solid #E5E7EB', padding: '10px 14px', marginBottom: 16 }}>
          <p style={{ fontSize: 13, color: '#6B7280', margin: 0 }}>{t('tracker.goals_cap')}</p>
        </div>
      )}

      {/* ── New goal form ── */}
      {formOpen && !atCapacity && availableSignals.length > 0 && (
        <div style={{ background: '#F9FAFB', borderRadius: 12, border: '1px solid #E5E7EB', padding: '16px 18px', marginBottom: 16 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: '#111827', marginBottom: 4 }}>{t('tracker.goals_form_title')}</p>
          <p style={{ fontSize: 11, color: '#9CA3AF', marginBottom: 12 }}>{t('tracker.goals_form_sub')}</p>

          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 10, marginBottom: 10 }}>
            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 700, color: '#6B7280', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                {t('tracker.goals_signal_lbl')} <span style={{ color: '#DC2626' }}>*</span>
              </label>
              <select
                value={signalType}
                onChange={e => { setSignalType(e.target.value); setTargetValue(''); setZeroDayWarn(null); setFormMsg(null); setTouched(t => ({ ...t, signal: true })) }}
                onBlur={() => setTouched(t => ({ ...t, signal: true }))}
                style={{ ...inputStyle(fieldMissing.signal), cursor: 'pointer', appearance: 'none' as const }}
              >
                <option value="">{t('tracker.goals_select_sig')}</option>
                {availableSignals.map(s => (
                  <option key={s.signal_type} value={s.signal_type}>
                    {(lang === 'ar' ? SIGNAL_GOAL_MAP[s.signal_type]?.label_ar : SIGNAL_GOAL_MAP[s.signal_type]?.label) ?? s.signal_type}
                  </option>
                ))}
              </select>
              {fieldMissing.signal && <p style={{ fontSize: 11, color: '#DC2626', margin: '3px 0 0' }}>{t('tracker.goals_required')}</p>}
            </div>

            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 700, color: '#6B7280', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                {t('tracker.goals_target_lbl')} {selectedMeta ? `(${selectedMeta.unit})` : ''} <span style={{ color: '#DC2626' }}>*</span>
              </label>
              <input
                ref={targetInputRef}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                autoComplete="off"
                value={targetValue}
                onChange={e => { setTargetValue(e.target.value.replace(/[^0-9.]/g, '')); setFormMsg(null); setTouched(t => ({ ...t, target: true })) }}
                onBlur={() => setTouched(t => ({ ...t, target: true }))}
                placeholder={selectedMeta ? (selectedMeta.lowerBetter ? t('tracker.goals_placeholder_low') : t('tracker.goals_placeholder_high')) : t('tracker.goals_target_lbl')}
                style={inputStyle(fieldMissing.target)}
              />
              {fieldMissing.target && <p style={{ fontSize: 11, color: '#DC2626', margin: '3px 0 0' }}>{t('tracker.goals_required')}</p>}
            </div>

            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 700, color: '#6B7280', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                {t('tracker.goals_date_lbl')} <span style={{ color: '#DC2626' }}>*</span>
              </label>
              <input
                type="date"
                autoComplete="off"
                value={targetDate}
                onChange={e => { setTargetDate(e.target.value); setFormMsg(null); setTouched(t => ({ ...t, date: true })) }}
                onBlur={() => setTouched(t => ({ ...t, date: true }))}
                min={new Date().toISOString().split('T')[0]}
                style={inputStyle(fieldMissing.date)}
              />
              {fieldMissing.date && <p style={{ fontSize: 11, color: '#DC2626', margin: '3px 0 0' }}>{t('tracker.goals_required')}</p>}
            </div>
          </div>

          {selectedMeta && targetValue && (
            <p style={{ fontSize: 11, color: '#6B7280', marginBottom: zeroDayWarn ? 8 : 12 }}>
              {lang === 'ar' ? selectedMeta.goalVerb_ar : selectedMeta.goalVerb} {targetValue}{selectedMeta.unit === '%' ? '%' : ` ${selectedMeta.unit}`}
              {' — '}{selectedMeta.lowerBetter ? t('tracker.goals_lower') : t('tracker.goals_higher')}
            </p>
          )}

          {zeroDayWarn && (
            <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 8, padding: '10px 12px', marginBottom: 12 }}>
              <p style={{ fontSize: 12, color: '#92400E', margin: '0 0 4px', fontWeight: 500 }}>
                {t('tracker.goals_zero_warn').replace('{current}', `${zeroDayWarn.current}${zeroDayWarn.unit === '%' ? '%' : ` ${zeroDayWarn.unit}`}`)}
              </p>
              <button
                onClick={() => { setTargetValue(''); setZeroDayWarn(null); targetInputRef.current?.focus() }}
                style={{ fontSize: 11, fontWeight: 700, color: '#D97706', background: 'none', border: 'none', cursor: 'pointer', padding: 0, textDecoration: 'underline' }}
              >
                {t('tracker.goals_raise')}
              </button>
            </div>
          )}

          {!allFilled && missingFields.length > 0 && (touched.signal || touched.target || touched.date) && (
            <p style={{ fontSize: 11, color: '#9CA3AF', marginBottom: 10 }}>
              {t('tracker.goals_still_need')} {missingFields.join(' · ')}
            </p>
          )}

          {formMsg && (
            <p style={{ fontSize: 12, marginBottom: 10, color: formMsg.type === 'success' ? '#059669' : formMsg.type === 'warning' ? '#D97706' : '#DC2626' }}>
              {formMsg.text}
            </p>
          )}

          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={handleCreate}
              disabled={saving}
              style={{
                padding: '9px 20px',
                background: saving ? '#E5E7EB' : '#2563EB',
                color:      saving ? '#9CA3AF' : '#fff',
                border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600,
                cursor: saving ? 'not-allowed' : 'pointer',
                opacity: saving ? 0.7 : 1,
              }}
            >
              {saving ? t('tracker.goals_saving') : zeroDayWarn ? t('tracker.goals_maintenance') : t('tracker.goals_set_btn')}
            </button>
            <button
              onClick={() => { setFormOpen(false); setFormMsg(null); setSignalType(''); setTargetValue(''); setTargetDate(''); setZeroDayWarn(null); setTouched({ signal: false, target: false, date: false }) }}
              style={{ padding: '9px 16px', background: '#F3F4F6', color: '#374151', border: 'none', borderRadius: 8, fontSize: 13, cursor: 'pointer' }}
            >
              {t('tracker.goals_cancel')}
            </button>
          </div>
        </div>
      )}

      {/* ── No signals available ── */}
      {!atCapacity && availableSignals.length === 0 && activeGoals.length === 0 && (
        <div style={{ background: '#F9FAFB', borderRadius: 10, border: '1px solid #E5E7EB', padding: '12px 16px', marginBottom: 16 }}>
          <p style={{ fontSize: 13, color: '#6B7280', margin: 0 }}>{t('tracker.goals_no_signals')}</p>
        </div>
      )}

      {/* ── Goal Wins ── */}
      {achievedGoals.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <h3 style={{ fontSize: 13, fontWeight: 700, color: '#059669', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {t('tracker.goals_wins')}
            </h3>
            <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: '#ECFDF5', color: '#059669' }}>
              {achievedGoals.length}
            </span>
            {achievedCount > 3 && (
              <span style={{ fontSize: 11, color: '#9CA3AF' }}>{t('tracker.goals_older').replace('{n}', String(achievedCount - achievedGoals.length))}</span>
            )}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {achievedGoals.map(goal => {
              const meta = SIGNAL_GOAL_MAP[goal.signal_type]
              return (
                <div key={goal.id} style={{ background: '#F0FDF4', borderRadius: 10, border: '1px solid #A7F3D0', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 18, flexShrink: 0 }}>🏆</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 13, fontWeight: 700, color: '#065F46', margin: '0 0 2px' }}>{(lang === 'ar' ? meta?.label_ar : meta?.label) ?? goal.signal_type}</p>
                    <p style={{ fontSize: 11, color: '#059669', margin: 0 }}>
                      {t('tracker.goals_target')} {goal.target_value}{meta?.unit === '%' ? '%' : ` ${meta?.unit}`}
                      {goal.current_value ? ` · ${t('tracker.goals_final')} ${goal.current_value}${meta?.unit === '%' ? '%' : ` ${meta?.unit}`}` : ''}
                      {' · '}{fmtDate(goal.updated_at)}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Missed goals ── */}
      {missedGoals.length > 0 && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <h3 style={{ fontSize: 13, fontWeight: 700, color: '#9CA3AF', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t('tracker.goals_missed')}</h3>
            {missedCount > 3 && (
              <span style={{ fontSize: 11, color: '#9CA3AF' }}>{t('tracker.goals_older').replace('{n}', String(missedCount - missedGoals.length))}</span>
            )}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {missedGoals.map(goal => {
              const meta       = SIGNAL_GOAL_MAP[goal.signal_type]
              const confirming = confirmDismissId === goal.id
              return (
                <div key={goal.id} style={{
                  background: confirming ? '#FFFBEB' : '#fff',
                  borderRadius: 10,
                  border: `1px solid ${confirming ? '#FDE68A' : '#E5E7EB'}`,
                  padding: '10px 14px',
                  transition: 'all 0.2s',
                }}>
                  {confirming ? (
                    <div>
                      <p style={{ fontSize: 12, color: '#92400E', margin: '0 0 10px', lineHeight: 1.5 }}>
                        {t('tracker.goals_dismiss_warn')}
                      </p>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button
                          onClick={() => handleDelete(goal.id)}
                          disabled={deleting === goal.id}
                          style={{ padding: '6px 14px', background: '#DC2626', color: '#fff', border: 'none', borderRadius: 7, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
                        >
                          {deleting === goal.id ? t('tracker.goals_dismissing') : t('tracker.goals_confirm_dismiss')}
                        </button>
                        <button
                          onClick={() => setConfirmDismissId(null)}
                          style={{ padding: '6px 14px', background: '#F3F4F6', color: '#374151', border: 'none', borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                        >
                          {t('tracker.goals_keep')}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                        <p style={{ fontSize: 13, fontWeight: 600, color: '#374151', margin: 0 }}>{(lang === 'ar' ? meta?.label_ar : meta?.label) ?? goal.signal_type}</p>
                          <span style={{ fontSize: 11, fontWeight: 700, padding: '1px 7px', borderRadius: 20, background: '#FEF2F2', color: '#DC2626' }}>{t('common.missed')}</span>
                        </div>
                        <p style={{ fontSize: 11, color: '#9CA3AF', margin: 0 }}>
                          {t('tracker.goals_target')} {goal.target_value}{meta?.unit === '%' ? '%' : ''}
                          {goal.current_value ? ` · ${t('tracker.goals_final')} ${goal.current_value}${meta?.unit === '%' ? '%' : ''}` : ''}
                        </p>
                      </div>
                      <button
                        onClick={() => setConfirmDismissId(goal.id)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#D1D5DB', fontSize: 13, flexShrink: 0 }}
                      >
                        ✕
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
