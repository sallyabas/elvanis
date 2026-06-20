import { redirect } from 'next/navigation'
import { createServerComponentClient } from '@/lib/supabase-server'
import { getT } from '@/lib/translations'
import { SIGNAL_GOAL_MAP } from '@/lib/signal-goal-map'

export default async function PlanPage() {
  const supabase = await createServerComponentClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: founder } = await supabase
    .from('founders')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle()

  const t    = getT((founder?.language ?? 'en') as 'en' | 'ar')
  const lang = founder?.language ?? 'en'

  const isFreeTier = !founder || (founder.subscription_tier === 'free')
  const stripeLink = process.env.NEXT_PUBLIC_STRIPE_PAYMENT_LINK

  const { data: digest, error: digestError } = await supabase
    .from('action_digests')
    .select('*')
    .eq('founder_id', founder?.id ?? '')
    .eq('status', 'active')
    .maybeSingle()

  console.log('[plan] founder:', founder?.id, 'digest:', digest?.id ?? 'null', 'error:', digestError?.message ?? 'none')

  const digestEn        = (digest?.digest as Record<string, unknown>) ?? {}
  const digestAr         = (digest?.digest_ar as Record<string, unknown>) ?? {}
  const isAr             = lang === 'ar'
  const conflictsAr      = (digestAr?.conflicts_ar as Array<Record<string, unknown>>) ?? []

  // If founder's language is Arabic but the digest's Arabic translation hasn't
  // been saved yet, show a "preparing" state instead of falling through to English.
  const arabicTranslationPending = isAr && !!digest && !digest.digest_ar

  const actions         = digestEn?.actions as Array<Record<string, unknown>> ?? []
  const actionsAr       = (digestAr?.actions_ar as Array<Record<string, unknown>>) ?? []
  const conflicts       = digestEn?.conflicts_to_resolve as Array<Record<string, unknown>> ?? []
  const summary         = (isAr && digestAr?.summary_ar ? digestAr.summary_ar : digestEn?.summary) as string ?? ''
  const dataQualityNote = (isAr && digestAr?.data_quality_note_ar ? digestAr.data_quality_note_ar : digestEn?.data_quality_note) as string ?? ''
  const consultantHook  = (isAr && digestAr?.consultant_hook_ar ? digestAr.consultant_hook_ar : digestEn?.consultant_hook) as string ?? ''
  const generatedAt     = digest?.generated_at
    ? new Date(digest.generated_at).toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
    : null

  const signalCount = (digest?.data_quality as Record<string, unknown>)?.confirmed as number ?? digest?.based_on_scan_count ?? 0
  const sources     = (digest?.data_quality as Record<string, unknown>)?.sources as string[] ?? []

  const { data: currentSignals } = await supabase
    .from('diagnostic_signals')
    .select('id')
    .eq('founder_id', founder?.id ?? '')
    .in('status', ['new', 'acknowledged'])

  const currentSignalIds = new Set((currentSignals ?? []).map(s => s.id))
  const basedOnIds       = (digest?.based_on_signal_ids as string[]) ?? []
  const hasNewSignals    = (currentSignals?.length ?? 0) > basedOnIds.length
  const hasDrift         = hasNewSignals || basedOnIds.some(id => !currentSignalIds.has(id))

  const enrichedActions: Array<Record<string, unknown>> = actions.map((a, i) => ({
    ...a,
    _globalIndex: i,
    ...(isAr && actionsAr[i] ? {
      title: actionsAr[i].title_ar ?? a.title,
      why:   actionsAr[i].why_ar   ?? a.why,
      how:   actionsAr[i].how_ar   ?? a.how,
    } : {}),
  }))
    const name = founder?.full_name?.split(' ')[0] ?? ''
  const hour = new Date().getHours()
  const greeting = hour < 12 ? t('greeting.morning') : hour < 17 ? t('greeting.afternoon') : t('greeting.evening')

  // Helper functions — no logic change
  const effortColor = (e: string) => e === 'low' ? '#059669' : e === 'medium' ? '#D97706' : '#DC2626'
  const effortBg    = (e: string) => e === 'low' ? '#ECFDF5' : e === 'medium' ? '#FFFBEB' : '#FEF2F2'

  const impactIcon = (i: string) => {
    const key = i?.toLowerCase() ?? ''
    if (key.includes('revenue'))    return '💰'
    if (key.includes('customer'))   return '👥'
    if (key.includes('team'))       return '⚙️'
    if (key.includes('product'))    return '🎯'
    if (key.includes('marketing'))  return '📣'
    if (key.includes('strategy'))   return '🧭'
    if (key.includes('reputation')) return '⭐'
    if (key.includes('engagement')) return '📈'
    return '📊'
  }

  const confidenceConfig = (c: string) => ({
    confirmed:  { label: t('plan.conf_confirmed'),  color: '#059669', bg: '#ECFDF5' },
    unverified: { label: t('plan.conf_unverified'), color: '#D97706', bg: '#FFFBEB' },
    tentative:  { label: t('plan.conf_tentative'),  color: '#D97706', bg: '#FFFBEB' },
    conflicted: { label: t('plan.conf_conflicted'), color: '#DC2626', bg: '#FEF2F2' },
  }[c] ?? { label: c, color: '#6B7280', bg: '#F9FAFB' })

  function getPhase(action: Record<string, unknown>): 1 | 2 | 3 {
    if (action.phase === 1 || action.phase === 2 || action.phase === 3) return action.phase as 1 | 2 | 3
    const tf = String(action.timeframe ?? '').toLowerCase()
    if (tf.includes('week') && !tf.includes('9')) return 1
    if (tf.includes('month'))                      return 2
    if (tf.includes('9') || tf.includes('12'))     return 3
    if (String(action.effort ?? '').toLowerCase() === 'high') return 2
    return 1
  }

  const phaseConfig = {
    1: { label: t('plan.phase1_label'), title: t('plan.phase1_title'), sub: t('plan.phase1_sub'), bg: '#FEF2F2', border: '#FECACA', badge: '#DC2626', badgeBg: '#FEF2F2' },
    2: { label: t('plan.phase2_label'), title: t('plan.phase2_title'), sub: t('plan.phase2_sub'), bg: '#FFFBEB', border: '#FDE68A', badge: '#D97706', badgeBg: '#FFFBEB' },
    3: { label: t('plan.phase3_label'), title: t('plan.phase3_title'), sub: t('plan.phase3_sub'), bg: '#EFF6FF', border: '#BFDBFE', badge: '#2563EB', badgeBg: '#EFF6FF' },
  }

  function formatHowSteps(how: string): string[] {
    const steps = how.split(/(?=\d+\.\s)/).map(s => s.trim()).filter(Boolean)
    if (steps.length <= 1) return [how]
    return steps
  }

  const phase1Actions = enrichedActions.filter(a => getPhase(a) === 1)
  const phase2Actions = enrichedActions.filter(a => getPhase(a) === 2)
  const phase3Actions = enrichedActions.filter(a => getPhase(a) === 3)

  return (
    <main style={{ minHeight: '100vh', background: '#F9FAFB', fontFamily: 'Inter, sans-serif' }}>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '36px 24px' }}>
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: '#111827', margin: '0 0 4px' }}>
            {name ? `${greeting}, ${name}` : t('signals.your_command')}
          </h1>
          <p style={{ fontSize: 14, color: '#6B7280', margin: 0 }}>
            {new Date().toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>

        <div style={{ maxWidth: 960, margin: '0 auto', padding: '40px 24px' }} className="plan-inner">

          {/* Header */}
          <div style={{ marginBottom: 28 }}>
            <h1 style={{ fontSize: 26, fontWeight: 800, color: '#111827', margin: '0 0 4px' }}>{t('plan.title')}</h1>
            <p style={{ fontSize: 14, color: '#6B7280', margin: 0 }}>{t('plan.subtitle')}</p>
          </div>

          {/* Free tier gate */}
          {isFreeTier && (
            <div style={{ background: '#F5F3FF', borderRadius: 16, border: '1px solid #DDD6FE', padding: '40px 32px', marginBottom: 24, textAlign: 'center' }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>✨</div>
              <h2 style={{ fontSize: 22, fontWeight: 800, color: '#4C1D95', margin: '0 0 12px' }}>
                {t('plan.gate_title')}
              </h2>
              <p style={{ fontSize: 15, color: '#6D28D9', lineHeight: 1.7, margin: '0 0 8px', maxWidth: 500, marginLeft: 'auto', marginRight: 'auto' }}>
                {t('plan.gate_sub')}
              </p>
              <p style={{ fontSize: 13, color: '#A78BFA', margin: '0 0 28px' }}>
                {t('plan.gate_includes')}
              </p>
              <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
                {stripeLink ? (
                  <a href={stripeLink} target="_blank" rel="noopener noreferrer"
                    style={{ display: 'inline-block', padding: '13px 32px', background: '#7C3AED', color: '#fff', borderRadius: 12, fontSize: 14, fontWeight: 700, textDecoration: 'none' }}>
                    {t('plan.upgrade_cta')}
                  </a>
                ) : (
                  <a href="/advisory?type=upgrade"
                    style={{ display: 'inline-block', padding: '13px 32px', background: '#7C3AED', color: '#fff', borderRadius: 12, fontSize: 14, fontWeight: 700, textDecoration: 'none' }}>
                    {t('common.contact_upgrade')}
                  </a>
                )}
                <a href="/advisory"
                  style={{ display: 'inline-block', padding: '13px 24px', background: '#EDE9FE', color: '#7C3AED', borderRadius: 12, fontSize: 14, fontWeight: 600, textDecoration: 'none' }}>
                  {t('plan.talk_first')}
                </a>
              </div>
            </div>
          )}

          {/* No digest yet */}
          {!isFreeTier && !digest && (
            <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #E5E7EB', padding: '48px', textAlign: 'center' }}>
              <div style={{ fontSize: 40, marginBottom: 16 }}>📋</div>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: '#111827', margin: '0 0 10px' }}>{t('plan.no_digest_title')}</h2>
              <p style={{ fontSize: 14, color: '#6B7280', margin: '0 0 8px' }}>{t('plan.no_digest_sub')}</p>
              <p style={{ fontSize: 13, color: '#9CA3AF', margin: '0 0 24px' }}>{t('plan.no_digest_note')}</p>
              <a href="/connect"
                style={{ display: 'inline-block', padding: '11px 28px', background: '#2563EB', color: '#fff', borderRadius: 10, textDecoration: 'none', fontSize: 14, fontWeight: 600 }}>
                {t('common.connect_tools')}
              </a>
            </div>
          )}

          {/* Digest content */}
          {!isFreeTier && digest && (
            <>
              {/* Drift warning */}
              {hasDrift && (
                <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 12, padding: '14px 20px', marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontSize: 18 }}>⚠️</span>
                    <div>
                      <p style={{ fontSize: 14, fontWeight: 600, color: '#92400E', margin: '0 0 2px' }}>
                        {t('plan.drift_title')}
                      </p>
                      <p style={{ fontSize: 13, color: '#B45309', margin: 0 }}>
                        {t('plan.drift_sub')}{' '}
                        <a href="/advisory?type=early-sync" style={{ color: '#92400E', fontWeight: 600, textDecoration: 'underline' }}>
                          {t('plan.drift_cta')}
                        </a>
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Summary card */}
              <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #E5E7EB', padding: '28px', marginBottom: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
                  <p style={{ fontSize: 11, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.06em', margin: 0 }}>{t('plan.overview_label')}</p>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
                    {generatedAt && <span style={{ fontSize: 12, color: '#9CA3AF' }}>{t('plan.generated')} {generatedAt}</span>}
                    {signalCount > 0 && (
                      <span style={{ fontSize: 11, color: '#9CA3AF' }}>
                        {t('plan.signal_count').replace('{n}', String(signalCount)).replace('{s}', signalCount !== 1 ? 's' : '')}
                        {sources.length > 0 ? ` ${t('plan.from_sources')} ${sources.join(', ')}` : ''}
                      </span>
                    )}
                  </div>
                </div>
                <p style={{ fontSize: 15, color: '#374151', lineHeight: 1.7, margin: '0 0 14px' }}>{summary}</p>
                {dataQualityNote && (
                  <div style={{ background: '#F9FAFB', borderRadius: 10, padding: '12px 16px', borderLeft: '3px solid #E5E7EB' }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#6B7280' }}>{t('plan.data_quality')} </span>
                    <span style={{ fontSize: 13, color: '#6B7280' }}>{dataQualityNote}</span>
                  </div>
                )}
              </div>

              {/* Conflicts */}
              {conflicts.length > 0 && (
                <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 16, padding: '24px', marginBottom: 20 }}>
                  <p style={{ fontSize: 11, fontWeight: 700, color: '#D97706', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 14 }}>{t('plan.conflicts_title')}</p>
                  <p style={{ fontSize: 13, color: '#92400E', marginBottom: 14, lineHeight: 1.5 }}>{t('plan.conflicts_sub')}</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {conflicts.map((c, i) => (
                      <div key={i} style={{ background: '#fff', borderRadius: 10, padding: '14px 16px', border: '1px solid #FDE68A', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                          <span style={{ fontSize: 12, fontWeight: 700, color: '#D97706' }}>
                              {isAr
                                ? (SIGNAL_GOAL_MAP[String(c.signal_type ?? '')]?.label_ar ?? String(c.signal_type ?? '').replace(/_/g, ' '))
                                : (SIGNAL_GOAL_MAP[String(c.signal_type ?? '')]?.label ?? String(c.signal_type ?? '').replace(/_/g, ' '))
                              }
                            </span>
                            <span style={{ fontSize: 11, color: '#9CA3AF' }}>·</span>
                            <span style={{ fontSize: 11, color: '#9CA3AF' }}>{(c.sources as string[])?.join(' vs ')}</span>
                          </div>
                          <p style={{ fontSize: 13, color: '#374151', margin: 0 }}>{isAr && conflictsAr[i]?.note_ar ? String(conflictsAr[i].note_ar) : String(c.note ?? '')}</p>
                        </div>
                        <a href="/signals?filter=conflicts" style={{ fontSize: 12, color: '#D97706', fontWeight: 600, textDecoration: 'none', whiteSpace: 'nowrap', flexShrink: 0 }}>
                          {t('common.resolve')}
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Priority note */}
              {actions.length > 0 && (
                <p style={{ fontSize: 12, color: '#9CA3AF', marginBottom: 12, textAlign: 'right' }}>
                  {t('plan.priority_note')}
                </p>
              )}

              {/* Phase-grouped actions */}
              {([1, 2, 3] as const).map(phaseNum => {
                const phaseActions = phaseNum === 1 ? phase1Actions : phaseNum === 2 ? phase2Actions : phase3Actions
                const cfg = phaseConfig[phaseNum]

                if (phaseActions.length === 0 && phaseNum === 3) {
                  const hasOtherActions = phase1Actions.length > 0 || phase2Actions.length > 0
                  if (!hasOtherActions) return null
                  return (
                    <div key={phaseNum} style={{ background: cfg.bg, borderRadius: 14, border: `1px solid ${cfg.border}`, padding: '20px 24px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 14 }}>
                      <span style={{ fontSize: 24 }}>🚀</span>
                      <div>
                        <p style={{ fontSize: 14, fontWeight: 700, color: '#1D4ED8', margin: '0 0 4px' }}>{t('plan.phase3_bridge_title')}</p>
                        <p style={{ fontSize: 13, color: '#3B82F6', margin: 0 }}>{t('plan.phase3_bridge_sub')}</p>
                      </div>
                    </div>
                  )
                }

                if (phaseActions.length === 0) return null

                return (
                  <div key={phaseNum} style={{ marginBottom: 28 }}>
                    {/* Phase header */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, padding: '4px 12px', borderRadius: 20, background: cfg.badgeBg, color: cfg.badge, border: `1px solid ${cfg.border}` }}>
                        {cfg.label}
                      </span>
                      <div>
                        <span style={{ fontSize: 14, fontWeight: 700, color: '#111827' }}>{cfg.title}</span>
                        <span style={{ fontSize: 12, color: '#9CA3AF', margin: '0 8px' }}>{cfg.sub}</span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                      {phaseActions.map((action, index) => {
                        const conf      = confidenceConfig(String(action.confidence ?? 'confirmed'))
                        const howSteps  = formatHowSteps(String(action.how ?? ''))
                        const globalIndex = (action._globalIndex as number) ?? index
                        return (
                          <div key={index} style={{ background: '#fff', borderRadius: 16, border: '1px solid #E5E7EB', padding: '24px 28px' }}>
                            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14, gap: 16, flexWrap: 'wrap' as const }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#111827', color: '#fff', fontSize: 13, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                  {globalIndex + 1}
                                </div>
                                <h3 style={{ fontSize: 16, fontWeight: 700, color: '#111827', margin: 0 }}>{String(action.title ?? '')}</h3>
                              </div>
                              <div style={{ display: 'flex', gap: 6, flexShrink: 0, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                              {action.signal_type != null && (
                                  <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, background: '#F3F4F6', color: '#6B7280', fontWeight: 600, fontFamily: 'monospace' }}>
                                    {isAr
                                      ? (SIGNAL_GOAL_MAP[String(action.signal_type)]?.label_ar ?? String(action.signal_type).replace(/_/g, ' '))
                                      : (SIGNAL_GOAL_MAP[String(action.signal_type)]?.label ?? String(action.signal_type).replace(/_/g, ' '))
                                    }
                                  </span>
                                )}
                                <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 20, background: conf.bg, color: conf.color, fontWeight: 600 }}>{conf.label}</span>
                                <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 20, background: effortBg(String(action.effort ?? '')), color: effortColor(String(action.effort ?? '')), fontWeight: 600 }}>
                                  {t(`plan.effort_${String(action.effort ?? 'low')}` as Parameters<typeof t>[0])} {t('plan.effort')}
                                </span>
                                <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 20, background: '#F9FAFB', color: '#6B7280', fontWeight: 600 }}>
                                  {impactIcon(String(action.impact ?? ''))} {(() => {
                                    const imp = String(action.impact ?? '').toLowerCase()
                                    const IMPACT_MAP: Record<string, Parameters<typeof t>[0]> = {
                                      revenue:      'signals.cat_revenue',
                                      customer:     'signals.cat_customer',
                                      marketing:    'signals.cat_marketing',
                                      team:         'signals.cat_team',
                                      product:      'signals.cat_product',
                                      strategy:     'signals.cat_strategy',
                                      traffic:      'signals.cat_marketing',
                                      engagement:   'signals.cat_customer',
                                      reputation:   'signals.cat_customer',
                                      retention:    'signals.cat_customer',
                                      growth:       'signals.cat_revenue',
                                      operations:   'signals.cat_team',
                                      delivery:     'signals.cat_product',
                                    }
                                    const key = IMPACT_MAP[imp] ?? IMPACT_MAP[imp.split(' ')[0]]
                                    return key ? t(key) : String(action.impact ?? '')
                                  })()}
                                </span>

                              </div>
                            </div>

                            <div style={{ background: '#F9FAFB', borderRadius: 10, padding: '12px 16px', marginBottom: 12, borderLeft: '3px solid #E5E7EB' }}>
                              <span style={{ fontSize: 12, fontWeight: 700, color: '#6B7280' }}>{t('plan.why')} </span>
                              <span style={{ fontSize: 13, color: '#374151' }}>{String(action.why ?? '')}</span>
                            </div>

                            {String(action.how ?? '').trim().length > 0 && (
                              <div dir={isAr ? 'rtl' : 'ltr'} style={{ background: '#EFF6FF', borderRadius: 10, padding: '14px 16px' }}>
                                <span style={{ fontSize: 12, fontWeight: 700, color: '#2563EB', display: 'block', marginBottom: howSteps.length > 1 ? 10 : 0 }}>{t('plan.how')}</span>
                                {howSteps.length > 1 ? (
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                    {howSteps.map((step, si) => (
                                      <div key={si} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                                        <span style={{ fontSize: 11, fontWeight: 800, color: '#2563EB', background: '#DBEAFE', borderRadius: '50%', width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
                                          {si + 1}
                                        </span>
                                        <span style={{ fontSize: 13, color: '#1D4ED8', lineHeight: 1.6 }}>
                                          {step.replace(/^\d+\.\s*/, '')}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <span style={{ fontSize: 13, color: '#1D4ED8', lineHeight: 1.6 }}>{howSteps[0]}</span>
                                )}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}

              {/* Consultant hook */}
              {consultantHook && (
                <div className="stack-mobile" style={{ background: '#1E1B4B', borderRadius: 16, padding: '28px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 24, marginBottom: 20 }}>
                  <div>
                    <p style={{ fontSize: 15, fontWeight: 700, color: '#fff', margin: '0 0 6px' }}>{t('plan.hook_title')}</p>
                    <p style={{ fontSize: 14, color: '#A5B4FC', margin: 0 }}>{consultantHook}</p>
                  </div>
                  <a href="/advisory?type=cpo"
                    style={{ padding: '12px 22px', background: '#4F46E5', color: '#fff', borderRadius: 10, fontSize: 13, fontWeight: 700, textDecoration: 'none', whiteSpace: 'nowrap', flexShrink: 0 }}>
                    {t('plan.book_cpo')}
                  </a>
                </div>
              )}

              {/* Footer */}
              <p style={{ fontSize: 12, color: '#9CA3AF', textAlign: 'center' }}>
                {t('plan.footer_note')}
              </p>
            </>
          )}
        </div>
      </div>
    </main>
  )
}
