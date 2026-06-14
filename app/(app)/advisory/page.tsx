'use client'

import { Suspense } from 'react'
import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { SIGNAL_GOAL_MAP } from '@/lib/signal-goal-map'
import { useT, useLang } from '@/app/context/LanguageContext'

// Static service config — colors, flows, stripe links only (no translatable strings)
const SERVICE_CONFIG = [
  {
    id: 'navigator',
    icon: '🧭',
    color: '#059669',
    bg: '#ECFDF5',
    border: '#A7F3D0',
    flow: 'stripe_direct' as const,
    stripeLink: process.env.NEXT_PUBLIC_STRIPE_PAYMENT_LINK,
    hasSuccessNote: false,
  },
  {
    id: 'roadmap',
    icon: '🗺️',
    color: '#2563EB',
    bg: '#EFF6FF',
    border: '#BFDBFE',
    flow: 'pay_first' as const,
    stripeLink: process.env.NEXT_PUBLIC_STRIPE_ROADMAP_LINK,
    hasSuccessNote: true,
  },
  {
    id: 'cpo',
    icon: '👩‍💼',
    color: '#7C3AED',
    bg: '#F5F3FF',
    border: '#DDD6FE',
    flow: 'calendly' as const,
    stripeLink: process.env.NEXT_PUBLIC_STRIPE_CPO_LINK,
    hasSuccessNote: true,
  },
  {
    id: 'training',
    icon: '🎓',
    color: '#0F766E',
    bg: '#ECFEFF',
    border: '#A5F3FC',
    flow: 'discovery' as const,
    stripeLink: process.env.NEXT_PUBLIC_STRIPE_WORKSHOP_LINK,
    hasSuccessNote: true,
  },
  {
    id: 'conflict',
    icon: '⚖️',
    color: '#D97706',
    bg: '#FFFBEB',
    border: '#FDE68A',
    flow: 'pay_first' as const,
    stripeLink: process.env.NEXT_PUBLIC_STRIPE_CONFLICT_LINK,
    hasSuccessNote: true,
  },
]

type ServiceConfig = typeof SERVICE_CONFIG[number]
type ServiceWithStrings = ServiceConfig & {
  title: string
  description: string
  price: string
  turnaround: string
  buttonLabel: string
  successNote: string | null
  resolvedStripeLink: string
}

function ServiceRequestPageContent() {
  const t            = useT()
  const lang         = useLang()
  const searchParams = useSearchParams()
  const defaultType  = searchParams.get('type') ?? ''
  const goalSignal   = searchParams.get('goal')    ?? ''
  const goalCurrent  = searchParams.get('current') ?? ''
  const goalTarget   = searchParams.get('target')  ?? ''
  const goalUnit     = searchParams.get('unit')    ?? ''
  const hasGoalContext = !!goalSignal
  const goalLabel    = goalSignal ? (SIGNAL_GOAL_MAP[goalSignal]?.label ?? goalSignal.replace(/_/g, ' ')) : ''

  const [selectedService, setSelectedService] = useState(defaultType)
  const [note, setNote]                       = useState('')
  const [submitted, setSubmitted]             = useState(false)
  const [submittedService, setSubmittedService] = useState<ServiceWithStrings | null>(null)
  const [loading, setLoading]                 = useState(false)
  const [submitError, setSubmitError]         = useState('')

  type FounderType = {
    id: string
    full_name: string | null
    business_name: string | null
    logo_url: string | null
    email: string | null
    subscription_tier: string | null
  }
  const [founder, setFounder] = useState<FounderType | null>(null)

  useEffect(() => {
    async function loadFounder() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase
        .from('founders')
        .select('id, full_name, business_name, logo_url, email, subscription_tier')
        .eq('user_id', user.id)
        .maybeSingle()
      setFounder(data)
    }
    loadFounder()
  }, [])

  // Build enriched services with translated strings at render time
  const SERVICES: ServiceWithStrings[] = SERVICE_CONFIG.map(cfg => ({
    ...cfg,
    title:               t(`advisory.svc_${cfg.id}_title`   as Parameters<typeof t>[0]),
    description:         t(`advisory.svc_${cfg.id}_desc`    as Parameters<typeof t>[0]),
    price:               t(`advisory.svc_${cfg.id}_price`   as Parameters<typeof t>[0]),
    turnaround:          t(`advisory.svc_${cfg.id}_turnaround` as Parameters<typeof t>[0]),
    buttonLabel:         t(`advisory.svc_${cfg.id}_btn`     as Parameters<typeof t>[0]),
    successNote:         cfg.hasSuccessNote ? t(`advisory.svc_${cfg.id}_note` as Parameters<typeof t>[0]) : null,
    resolvedStripeLink:  cfg.stripeLink ?? '/advisory',
  }))

  const selected = SERVICES.find(s => s.id === selectedService) ?? null

  function handleSelect(serviceId: string) {
    const service = SERVICES.find(s => s.id === serviceId)
    if (!service) return
    setSubmitError('')
    if (service.flow === 'stripe_direct') {
      const founderId = founder?.id ?? ''
      const baseLink  = service.resolvedStripeLink
      if (baseLink.startsWith('/')) {
        window.location.href = baseLink
        return
      }
      const separator = baseLink.includes('?') ? '&' : '?'
      window.location.href = `${baseLink}${separator}client_reference_id=${founderId}`
      return
    }
    setSelectedService(serviceId)
  }

  async function handleSubmit() {
    if (!selected || selected.flow === 'stripe_direct') return
    const contextNote = hasGoalContext
      ? `Goal: ${goalLabel} — Current: ${goalCurrent}${goalUnit}, Target: ${goalTarget}${goalUnit}\n\n${note}`
      : note
    setLoading(true)
    try {
      await fetch('/api/advisory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type:         selected.id,
          note:         contextNote,
          founderId:    founder?.id           ?? null,
          founderName:  founder?.full_name    ?? '',
          founderEmail: founder?.email        ?? '',
          businessName: founder?.business_name ?? '',
          flow:         selected.flow,
          language:     lang,
        }),
      })
      setSubmittedService(selected)
      setSubmitted(true)
    } catch (err) {
      console.error('Service request failed:', err)
      setSubmitError(t('advisory.error'))
    }
    setLoading(false)
  }

  // ── Success screen ──
  if (submitted && submittedService) {
    return (
      <main style={{ minHeight: '100vh', background: '#F9FAFB', fontFamily: 'Inter, sans-serif' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 'calc(100vh - 60px)' }}>
          <div style={{ textAlign: 'center', maxWidth: 520, padding: 24 }}>
            <div style={{ fontSize: 56, marginBottom: 20 }}>✅</div>
            <h2 style={{ fontSize: 24, fontWeight: 800, color: '#111827', marginBottom: 10 }}>{t('advisory.success_title')}</h2>
            <p style={{ fontSize: 15, color: '#6B7280', marginBottom: 16, lineHeight: 1.6 }}>
              {t('advisory.success_sub')}
            </p>

            {submittedService.successNote && (
              <div style={{ background: submittedService.bg, border: `1px solid ${submittedService.border}`, borderRadius: 12, padding: '16px 20px', marginBottom: 20, textAlign: lang === 'ar' ? 'right' : 'left' }}>
                <p style={{ fontSize: 14, color: submittedService.color, fontWeight: 600, margin: '0 0 4px' }}>
                  {submittedService.flow === 'pay_first'  ? t('advisory.next_payment')  :
                   submittedService.flow === 'calendly'   ? t('advisory.next_booking')  :
                                                            t('advisory.next_discovery')}
                </p>
                <p style={{ fontSize: 13, color: '#374151', margin: 0, lineHeight: 1.6 }}>
                  {submittedService.successNote}
                </p>
              </div>
            )}

            <p style={{ fontSize: 14, color: '#9CA3AF', marginBottom: 24 }}>
              {t('advisory.service_requested')} <strong style={{ color: '#374151' }}>{submittedService.title}</strong>
            </p>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
              {submittedService.flow === 'pay_first' && (
                <a
                  href={submittedService.resolvedStripeLink}
                  style={{ padding: '12px 24px', background: submittedService.color, color: '#fff', borderRadius: 10, textDecoration: 'none', fontWeight: 700, fontSize: 14 }}
                >
                  {t('advisory.complete_payment')}
                </a>
              )}
              <a
                href="/"
                style={{ padding: '12px 24px', background: '#F3F4F6', color: '#374151', borderRadius: 10, textDecoration: 'none', fontWeight: 600, fontSize: 14 }}
              >
                {t('advisory.back_dashboard')}
              </a>
            </div>
          </div>
        </div>
      </main>
    )
  }

  // ── Main page ──
  return (
    <main style={{ minHeight: '100vh', background: '#F9FAFB', fontFamily: 'Inter, sans-serif' }}>
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '40px 24px' }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, color: '#111827', marginBottom: 6 }}>{t('advisory.title')}</h1>
        <p style={{ fontSize: 15, color: '#6B7280', marginBottom: 32, lineHeight: 1.6 }}>
          {t('advisory.subtitle')}
        </p>

        {/* Service cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 32 }}>
          {SERVICES.map(service => {
            const isSelected = selectedService === service.id
            return (
              <div
                key={service.id}
                onClick={() => handleSelect(service.id)}
                style={{
                  background: isSelected ? service.bg : '#fff',
                  borderRadius: 14,
                  border: `2px solid ${isSelected ? service.color : '#E5E7EB'}`,
                  padding: '20px 22px',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, flex: 1 }}>
                    <div style={{ width: 44, height: 44, borderRadius: 10, background: service.bg, border: `1px solid ${service.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>
                      {service.icon}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4, flexWrap: 'wrap' }}>
                        <p style={{ fontSize: 15, fontWeight: 700, color: '#111827', margin: 0 }}>{service.title}</p>
                        {service.flow === 'stripe_direct' && (
                          <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: '#ECFDF5', color: '#059669', fontWeight: 700, border: '1px solid #A7F3D0' }}>
                            {t('advisory.instant_access')}
                          </span>
                        )}
                        {service.flow === 'pay_first' && (
                          <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: '#EFF6FF', color: '#2563EB', fontWeight: 700, border: '1px solid #BFDBFE' }}>
                            {t('advisory.pay_to_confirm')}
                          </span>
                        )}
                        {service.flow === 'calendly' && (
                          <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: '#F5F3FF', color: '#7C3AED', fontWeight: 700, border: '1px solid #DDD6FE' }}>
                            {t('advisory.booking_link_sent')}
                          </span>
                        )}
                        {service.flow === 'discovery' && (
                          <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: '#FFFBEB', color: '#D97706', fontWeight: 700, border: '1px solid #FDE68A' }}>
                            {t('advisory.discovery_call')}
                          </span>
                        )}
                      </div>
                      <p style={{ fontSize: 13, color: '#6B7280', margin: '0 0 8px', lineHeight: 1.5 }}>{service.description}</p>
                      <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: service.color }}>{service.price}</span>
                        <span style={{ fontSize: 13, color: '#9CA3AF' }}>· {service.turnaround}</span>
                      </div>
                    </div>
                  </div>
                  <div style={{ width: 22, height: 22, borderRadius: '50%', border: `2px solid ${isSelected ? service.color : '#D1D5DB'}`, background: isSelected ? service.color : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}>
                    {isSelected && <span style={{ color: '#fff', fontSize: 12 }}>✓</span>}
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Note field */}
        {selected && selected.flow !== 'stripe_direct' && (
          <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #E5E7EB', padding: '24px', marginBottom: 20 }}>
            {hasGoalContext && (
              <div style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 10, padding: '12px 16px', marginBottom: 14 }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: '#1D4ED8', margin: '0 0 4px' }}>
                  {t('advisory.goal_title').replace('{goal}', goalLabel)}
                </p>
                <p style={{ fontSize: 12, color: '#3B82F6', margin: 0 }}>
                  {t('advisory.goal_sub')
                    .replace('{current}', goalCurrent)
                    .replace('{target}',  goalTarget)
                    .replace(/\{unit\}/g, goalUnit)}
                </p>
              </div>
            )}
            <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
              {t('advisory.note_label')}
            </label>
            <textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder={
                selected.flow === 'calendly'  ? t('advisory.placeholder_calendly')  :
                selected.flow === 'discovery' ? t('advisory.placeholder_discovery') :
                                                t('advisory.placeholder_default')
              }
              rows={3}
              style={{ width: '100%', padding: '12px 14px', border: '1.5px solid #E5E7EB', borderRadius: 10, fontSize: 14, boxSizing: 'border-box' as const, resize: 'vertical', fontFamily: 'Inter, sans-serif', outline: 'none' }}
            />
          </div>
        )}

        {/* Submit / action button */}
        {submitError && (
          <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 10, padding: '10px 14px', marginBottom: 12 }}>
            <p style={{ color: '#DC2626', fontSize: 13, margin: 0 }}>{submitError}</p>
          </div>
        )}

        {selected && selected.flow !== 'stripe_direct' ? (
          <button
            onClick={handleSubmit}
            disabled={loading}
            style={{
              width: '100%', padding: '14px',
              background: loading ? '#E5E7EB' : selected.color,
              color: loading ? '#9CA3AF' : '#fff',
              border: 'none', borderRadius: 12, fontSize: 15, fontWeight: 700,
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? t('advisory.submitting') : selected.buttonLabel}
          </button>
        ) : !selected ? (
          <button
            disabled
            style={{ width: '100%', padding: '14px', background: '#E5E7EB', color: '#9CA3AF', border: 'none', borderRadius: 12, fontSize: 15, fontWeight: 700, cursor: 'not-allowed' }}
          >
            {t('advisory.select_service')}
          </button>
        ) : null}
      </div>
    </main>
  )
}

export default function ServiceRequestPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', background: '#F9FAFB', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6B7280' }}>{/* loading */}</div>}>
      <ServiceRequestPageContent />
    </Suspense>
  )
}
