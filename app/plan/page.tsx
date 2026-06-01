import { redirect } from 'next/navigation'
import { createServerComponentClient } from '@/lib/supabase-server'
import GlobalHeader from '@/components/GlobalHeader'


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
  confirmed:  { label: '✓ Confirmed',  color: '#059669', bg: '#ECFDF5' },
  unverified: { label: '~ Unverified', color: '#D97706', bg: '#FFFBEB' },
  tentative:  { label: '⚠ Tentative',  color: '#D97706', bg: '#FFFBEB' },
  conflicted: { label: '⚡ Conflicted', color: '#DC2626', bg: '#FEF2F2' },
}[c] ?? { label: c, color: '#6B7280', bg: '#F9FAFB' })

// Fix K: map timeframe string to phase number
function getPhase(action: Record<string, unknown>): 1 | 2 | 3 {
  // Use explicit phase field if Groq returned it
  if (action.phase === 1 || action.phase === 2 || action.phase === 3) return action.phase as 1 | 2 | 3
  // Fall back to timeframe mapping
  const tf = String(action.timeframe ?? '').toLowerCase()
  if (tf.includes('week') && !tf.includes('9')) return 1
  if (tf.includes('month'))                      return 2
  if (tf.includes('9') || tf.includes('12'))     return 3
  // effort=high forces Phase 2 minimum
  if (String(action.effort ?? '').toLowerCase() === 'high') return 2
  return 1
}

const phaseConfig = {
  1: { label: '⚡ Phase 1', title: 'Immediate Triage',       sub: 'Weeks 1–4 · Fix these first',             bg: '#FEF2F2', border: '#FECACA', badge: '#DC2626', badgeBg: '#FEF2F2' },
  2: { label: '🔧 Phase 2', title: 'System Stabilisation',   sub: 'Weeks 5–8 · Build defensive guardrails',  bg: '#FFFBEB', border: '#FDE68A', badge: '#D97706', badgeBg: '#FFFBEB' },
  3: { label: '🚀 Phase 3', title: 'High-Leverage Growth',   sub: 'Weeks 9–12 · Scale what is working',      bg: '#EFF6FF', border: '#BFDBFE', badge: '#2563EB', badgeBg: '#EFF6FF' },
}

function formatHowSteps(how: string): string[] {
  const steps = how.split(/(?=\d+\.\s)/).map(s => s.trim()).filter(Boolean)
  if (steps.length <= 1) return [how]
  return steps
}

export default async function PlanPage() {
  const supabase = await createServerComponentClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: founder } = await supabase
    .from('founders')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle()

  // Fix 1: isFreeTier  founders have full access
  const isFreeTier = !founder || (founder.subscription_tier === 'free')

  // Fix 11: Stripe env guard — if not set show contact us instead
  const stripeLink = process.env.NEXT_PUBLIC_STRIPE_PAYMENT_LINK

  const { data: digest, error: digestError } = await supabase
    .from('action_digests')
    .select('*')
    .eq('founder_id', founder?.id ?? '')
    .eq('status', 'active')
    .maybeSingle()

  console.log('[plan] founder:', founder?.id, 'digest:', digest?.id ?? 'null', 'error:', digestError?.message ?? 'none')

  const actions        = (digest?.digest as Record<string, unknown>)?.actions as Array<Record<string, unknown>> ?? []
  const conflicts      = (digest?.digest as Record<string, unknown>)?.conflicts_to_resolve as Array<Record<string, unknown>> ?? []
  const summary        = (digest?.digest as Record<string, unknown>)?.summary as string ?? ''
  const dataQualityNote = (digest?.digest as Record<string, unknown>)?.data_quality_note as string ?? ''
  const consultantHook = (digest?.digest as Record<string, unknown>)?.consultant_hook as string ?? ''
  const generatedAt    = digest?.generated_at
    ? new Date(digest.generated_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
    : null

  // Fix 6: signal count from digest data_quality
  const signalCount   = (digest?.data_quality as Record<string, unknown>)?.confirmed as number ?? digest?.based_on_scan_count ?? 0
  const sources       = (digest?.data_quality as Record<string, unknown>)?.sources as string[] ?? []

  // Drift detection
  const { data: currentSignals } = await supabase
    .from('diagnostic_signals')
    .select('id')
    .eq('founder_id', founder?.id ?? '')
    .in('status', ['new', 'acknowledged'])

  const currentSignalIds = new Set((currentSignals ?? []).map(s => s.id))
  const basedOnIds       = (digest?.based_on_signal_ids as string[]) ?? []
  const hasNewSignals    = (currentSignals?.length ?? 0) > basedOnIds.length
  const hasDrift         = hasNewSignals || basedOnIds.some(id => !currentSignalIds.has(id))

  // Pre-enrich actions with stable globalIndex before phase split
  // Avoids actions.indexOf(action) inside render loops — O(N) not O(N²)
  const enrichedActions: Array<Record<string, unknown>> = actions.map((a, i) => ({ ...a, _globalIndex: i }))
  const name= founder?.full_name?.split(' ')[0] ?? ''


  // Fix 4: group actions by phase
  const phase1Actions = enrichedActions.filter(a => getPhase(a) === 1)
  const phase2Actions = enrichedActions.filter(a => getPhase(a) === 2)
  const phase3Actions = enrichedActions.filter(a => getPhase(a) === 3)


  return (
    <main style={{ minHeight: '100vh', background: '#F9FAFB', fontFamily: 'Inter, sans-serif' }}>
      <GlobalHeader founder={founder} />

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '36px 24px' }}>
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: '#111827', margin: '0 0 4px' }}>
            {name ? `${new Date().getHours() < 12 ? 'Good morning' : new Date().getHours() < 17 ? 'Good afternoon' : 'Good evening'}, ${name}` : 'Your Command Centre'}
          </h1>
          <p style={{ fontSize: 14, color: '#6B7280', margin: 0 }}>
            {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>

      <div style={{ maxWidth: 960, margin: '0 auto', padding: '40px 24px' }}>

        {/* Fix 2+3: Header copy — Rolling 90-Day Action Plan */}
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: '#111827', margin: '0 0 4px' }}>Your 90-Day Action Plan</h1>
          <p style={{ fontSize: 14, color: '#6B7280', margin: 0 }}>
            Your priorities update each scan. Your 90-day destination stays constant.
          </p>
        </div>

        {/* Free tier gate */}
        {isFreeTier && (
          <div style={{ background: '#F5F3FF', borderRadius: 16, border: '1px solid #DDD6FE', padding: '40px 32px', marginBottom: 24, textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>✨</div>
            <h2 style={{ fontSize: 22, fontWeight: 800, color: '#4C1D95', margin: '0 0 12px' }}>
              Action Digest is a Navigator feature
            </h2>
            <p style={{ fontSize: 15, color: '#6D28D9', lineHeight: 1.7, margin: '0 0 8px', maxWidth: 500, marginLeft: 'auto', marginRight: 'auto' }}>
              Get a 90-day AI-generated action plan built from your signals, assessment data, and business context — updated each scan cycle.
            </p>
            {/* Fix 12: 'updated monthly' → 'updated each scan cycle' */}
            <p style={{ fontSize: 13, color: '#A78BFA', margin: '0 0 28px' }}>
              Includes: prioritised actions across 3 phases, conflict resolution, data quality audit, and consultant insights.
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
              {/* Fix 11: Stripe env guard */}
              {stripeLink ? (
                <a href={stripeLink} target="_blank" rel="noopener noreferrer"
                  style={{ display: 'inline-block', padding: '13px 32px', background: '#7C3AED', color: '#fff', borderRadius: 12, fontSize: 14, fontWeight: 700, textDecoration: 'none' }}>
                  Upgrade to Navigator — £29/month →
                </a>
              ) : (
                <a href="/service-request?type=upgrade"
                  style={{ display: 'inline-block', padding: '13px 32px', background: '#7C3AED', color: '#fff', borderRadius: 12, fontSize: 14, fontWeight: 700, textDecoration: 'none' }}>
                  Contact us to upgrade →
                </a>
              )}
              <a href="/service-request"
                style={{ display: 'inline-block', padding: '13px 24px', background: '#EDE9FE', color: '#7C3AED', borderRadius: 12, fontSize: 14, fontWeight: 600, textDecoration: 'none' }}>
                Talk to us first
              </a>
            </div>
          </div>
        )}

        {/* Fix 10: No digest yet — Navigator user with Connect CTA */}
        {!isFreeTier && !digest && (
          <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #E5E7EB', padding: '48px', textAlign: 'center' }}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>📋</div>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: '#111827', margin: '0 0 10px' }}>No action plan generated yet</h2>
            <p style={{ fontSize: 14, color: '#6B7280', margin: '0 0 8px' }}>
            Your first 90-Day Action Plan generates automatically on your first monthly review cycle.
            </p>
            <p style={{ fontSize: 13, color: '#9CA3AF', margin: '0 0 24px' }}>
            Usually within 30 days of connecting your first tool — no action needed from you.
            </p>
            <a href="/connect"
              style={{ display: 'inline-block', padding: '11px 28px', background: '#2563EB', color: '#fff', borderRadius: 10, textDecoration: 'none', fontSize: 14, fontWeight: 600 }}>
              Connect your tools →
            </a>
          </div>
        )}

        {/* Digest content */}
        {!isFreeTier && digest && (
          <>
            {/* Drift warning — admin-controlled regeneration only */}
            {hasDrift && (
              <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 12, padding: '14px 20px', marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: 18 }}>⚠️</span>
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 600, color: '#92400E', margin: '0 0 2px' }}>
                      New signals detected
                    </p>
                    <p style={{ fontSize: 13, color: '#B45309', margin: 0 }}>
                      Your 90-Day Action Plan updates automatically each scan cycle.{' '}
                      <a href="/service-request?type=early-sync" style={{ color: '#92400E', fontWeight: 600, textDecoration: 'underline' }}>
                        Message your consultant to request an early refresh →
                      </a>
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Summary card */}
            <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #E5E7EB', padding: '28px', marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.06em', margin: 0 }}>Business Overview</p>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
                  {generatedAt && <span style={{ fontSize: 12, color: '#9CA3AF' }}>Generated {generatedAt}</span>}
                  {/* Fix 6: signal count context */}
                  {signalCount > 0 && (
                    <span style={{ fontSize: 11, color: '#9CA3AF' }}>
                      Based on {signalCount} active signal{signalCount !== 1 ? 's' : ''}
                      {sources.length > 0 ? ` from ${sources.join(', ')}` : ''}
                    </span>
                  )}
                </div>
              </div>
              <p style={{ fontSize: 15, color: '#374151', lineHeight: 1.7, margin: '0 0 14px' }}>{summary}</p>
              {dataQualityNote && (
                <div style={{ background: '#F9FAFB', borderRadius: 10, padding: '12px 16px', borderLeft: '3px solid #E5E7EB' }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#6B7280' }}>Data quality: </span>
                  <span style={{ fontSize: 13, color: '#6B7280' }}>{dataQualityNote}</span>
                </div>
              )}
            </div>

            {/* Conflicts */}
            {conflicts.length > 0 && (
              <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 16, padding: '24px', marginBottom: 20 }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: '#D97706', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 14 }}>⚡ Resolve These Data Conflicts First</p>
                <p style={{ fontSize: 13, color: '#92400E', marginBottom: 14, lineHeight: 1.5 }}>
                  These signals conflict across sources. Verify the data before acting on related recommendations.
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {conflicts.map((c, i) => (
                    <div key={i} style={{ background: '#fff', borderRadius: 10, padding: '14px 16px', border: '1px solid #FDE68A', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                          <span style={{ fontSize: 12, fontWeight: 700, color: '#D97706' }}>{String(c.signal_type ?? '').replace(/_/g, ' ')}</span>
                          <span style={{ fontSize: 11, color: '#9CA3AF' }}>·</span>
                          <span style={{ fontSize: 11, color: '#9CA3AF' }}>{(c.sources as string[])?.join(' vs ')}</span>
                        </div>
                        <p style={{ fontSize: 13, color: '#374151', margin: 0 }}>{String(c.note ?? '')}</p>
                      </div>
                      <a href="/signals" style={{ fontSize: 12, color: '#D97706', fontWeight: 600, textDecoration: 'none', whiteSpace: 'nowrap', flexShrink: 0 }}>
                        Resolve →
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Fix 8: Priority explanation */}
            {actions.length > 0 && (
              <p style={{ fontSize: 12, color: '#9CA3AF', marginBottom: 12, textAlign: 'right' }}>
                Prioritised by signal severity and business impact
              </p>
            )}

            {/* Fix 4+5+13: Phase-grouped actions */}
            {([1, 2, 3] as const).map(phaseNum => {
              const phaseActions = phaseNum === 1 ? phase1Actions : phaseNum === 2 ? phase2Actions : phase3Actions
              const cfg = phaseConfig[phaseNum]

              if (phaseActions.length === 0 && phaseNum === 3) {
                // Fix 1: only show bridge if at least one other phase has actions
                // Prevents bridge showing alone with no Phase 1 or Phase 2 content
                const hasOtherActions = phase1Actions.length > 0 || phase2Actions.length > 0
                if (!hasOtherActions) return null
                return (
                  <div key={phaseNum} style={{ background: cfg.bg, borderRadius: 14, border: `1px solid ${cfg.border}`, padding: '20px 24px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 14 }}>
                    <span style={{ fontSize: 24 }}>🚀</span>
                    <div>
                      <p style={{ fontSize: 14, fontWeight: 700, color: '#1D4ED8', margin: '0 0 4px' }}>Phase 3 — High-Leverage Growth unlocks soon</p>
                      <p style={{ fontSize: 13, color: '#3B82F6', margin: 0 }}>
                        Resolve your critical signals first. Phase 3 growth plays activate once your operational foundation is stable.
                      </p>
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
                      <span style={{ fontSize: 12, color: '#9CA3AF', marginLeft: 8 }}>{cfg.sub}</span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    {phaseActions.map((action, index) => {
                      const conf = confidenceConfig(String(action.confidence ?? 'confirmed'))
                      const howSteps = formatHowSteps(String(action.how ?? ''))
                      const globalIndex = (action._globalIndex as number) ?? index
                      return (
                        <div key={index} style={{ background: '#fff', borderRadius: 16, border: '1px solid #E5E7EB', padding: '24px 28px' }}>
                          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14, gap: 16 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#111827', color: '#fff', fontSize: 13, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                {globalIndex + 1}
                              </div>
                              <h3 style={{ fontSize: 16, fontWeight: 700, color: '#111827', margin: 0 }}>{String(action.title ?? '')}</h3>
                            </div>
                            <div style={{ display: 'flex', gap: 6, flexShrink: 0, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                              {/* Fix 7: signal_type badge */}
                              {action.signal_type != null && (
                                <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, background: '#F3F4F6', color: '#6B7280', fontWeight: 600, fontFamily: 'monospace' }}>
                                  {String(action.signal_type).replace(/_/g, ' ')}
                                </span>
                              )}
                              <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 20, background: conf.bg, color: conf.color, fontWeight: 600 }}>{conf.label}</span>
                              <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 20, background: effortBg(String(action.effort ?? '')), color: effortColor(String(action.effort ?? '')), fontWeight: 600 }}>{String(action.effort ?? '')} effort</span>
                              <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 20, background: '#F9FAFB', color: '#6B7280', fontWeight: 600 }}>{impactIcon(String(action.impact ?? ''))} {String(action.impact ?? '')}</span>
                            </div>
                          </div>

                          <div style={{ background: '#F9FAFB', borderRadius: 10, padding: '12px 16px', marginBottom: 12, borderLeft: '3px solid #E5E7EB' }}>
                            <span style={{ fontSize: 12, fontWeight: 700, color: '#6B7280' }}>Why: </span>
                            <span style={{ fontSize: 13, color: '#374151' }}>{String(action.why ?? '')}</span>
                          </div>

                          {/* Fix 2: How block guard — skip if Groq omits how field */}
                          {String(action.how ?? '').trim().length > 0 && (
                          <div style={{ background: '#EFF6FF', borderRadius: 10, padding: '14px 16px' }}>
                            <span style={{ fontSize: 12, fontWeight: 700, color: '#2563EB', display: 'block', marginBottom: howSteps.length > 1 ? 10 : 0 }}>How:</span>
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
                  <p style={{ fontSize: 15, fontWeight: 700, color: '#fff', margin: '0 0 6px' }}>Want a human strategist to review this with you?</p>
                  <p style={{ fontSize: 14, color: '#A5B4FC', margin: 0 }}>{consultantHook}</p>
                </div>
                <a href="/service-request?type=cpo"
                  style={{ padding: '12px 22px', background: '#4F46E5', color: '#fff', borderRadius: 10, fontSize: 13, fontWeight: 700, textDecoration: 'none', whiteSpace: 'nowrap', flexShrink: 0 }}>
                  Book a CPO session →
                </a>
              </div>
            )}

            {/* Fix 9: Footer copy */}
            <p style={{ fontSize: 12, color: '#9CA3AF', textAlign: 'center' }}>
              Action Digest refreshes automatically as new signals are detected.
            </p>
          </>
        )}
      </div>
      </div>
    </main>
  )
}
