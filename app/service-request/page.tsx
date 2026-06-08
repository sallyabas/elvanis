'use client'

import { Suspense } from 'react'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import GlobalHeader from '@/components/GlobalHeader'
import { SIGNAL_GOAL_MAP } from '@/lib/signal-goal-map'

const SERVICES = [
  {
    id: 'navigator',
    icon: '🧭',
    title: 'Navigator — Monthly Plan',
    description: 'Weekly scans, impact tracking, AI Action Digest, and priority signals — everything you need to run your business like a data-driven founder.',
    price: '£29 / month',
    turnaround: 'Active immediately after payment',
    color: '#059669',
    bg: '#ECFDF5',
    border: '#A7F3D0',
    flow: 'stripe_direct' as const,
    stripeLink: process.env.NEXT_PUBLIC_STRIPE_PAYMENT_LINK ?? '/service-request',
    buttonLabel: 'Upgrade to Navigator →',
    successNote: null,
  },
  {
    id: 'roadmap',
    icon: '🗺️',
    title: 'AI Implementation Roadmap',
    description: 'A step-by-step 90-day plan for implementing AI across your highest-opportunity areas — generated from your diagnostic data and tailored to your team size and budget.',
    price: '£99 one-time',
    turnaround: 'Delivered within 24 hours',
    color: '#2563EB',
    bg: '#EFF6FF',
    border: '#BFDBFE',
    flow: 'pay_first' as const,
    stripeLink: process.env.NEXT_PUBLIC_STRIPE_ROADMAP_LINK ?? '/service-request',
    buttonLabel: 'Request & Pay £99 →',
    successNote: 'Complete your payment to confirm your order. Sally will deliver your roadmap within 24 hours.',
  },
  {
    id: 'cpo',
    icon: '👩‍💼',
    title: 'Fractional CPO Session',
    description: '1-on-1 strategy session with Sally to prioritise your biggest growth blocker, review your signal data, and build a 30-day action plan.',
    price: '£250 / session',
    turnaround: 'Scheduled within 48 hours',
    color: '#7C3AED',
    bg: '#F5F3FF',
    border: '#DDD6FE',
    flow: 'calendly' as const,
    stripeLink: process.env.NEXT_PUBLIC_STRIPE_CPO_LINK ?? '/service-request',
    buttonLabel: 'Request CPO Session →',
    successNote: 'Sally will send you a booking link within 24 hours to schedule your session and confirm payment.',
  },
  {
    id: 'training',
    icon: '🎓',
    title: 'Team AI Workshop',
    description: 'A half-day workshop for your team covering AI tools relevant to your specific bottlenecks — based on your Elvanis diagnostic data.',
    price: '£500 / session',
    turnaround: 'Scheduled within 1 week',
    color: '#0F766E',
    bg: '#ECFEFF',
    border: '#A5F3FC',
    flow: 'discovery' as const,
    stripeLink: process.env.NEXT_PUBLIC_STRIPE_WORKSHOP_LINK ?? '/service-request',
    buttonLabel: 'Request Workshop →',
    successNote: 'Sally will reach out within 24 hours to arrange a discovery call and understand your team\'s specific needs before confirming.',
  },
  {
    id: 'conflict',
    icon: '⚖️',
    title: 'Data Conflict Review',
    description: 'Expert review of your conflicting signals — Sally will analyse your data sources and advise which to trust and why, so your Action Digest is built on accurate data.',
    price: '£99 one-time',
    turnaround: 'Response within 24 hours',
    color: '#D97706',
    bg: '#FFFBEB',
    border: '#FDE68A',
    flow: 'pay_first' as const,
    stripeLink: process.env.NEXT_PUBLIC_STRIPE_CONFLICT_LINK ?? '/service-request',
    buttonLabel: 'Request & Pay £99 →',
    successNote: 'Complete your payment to confirm your review. Sally will analyse your signal data and respond within 24 hours.',
  },
]

type Service = typeof SERVICES[number]

function ServiceRequestPageContent() {
  const searchParams = useSearchParams()
  const defaultType = searchParams.get('type') ?? ''
  const goalSignal     = searchParams.get('goal')    ?? ''
  const goalCurrent    = searchParams.get('current') ?? ''
  const goalTarget     = searchParams.get('target')  ?? ''
  const goalUnit       = searchParams.get('unit')    ?? ''
  const hasGoalContext = !!goalSignal
  const goalLabel      = goalSignal ? (SIGNAL_GOAL_MAP[goalSignal]?.label ?? goalSignal.replace(/_/g, ' ')) : ''
  const [selectedService, setSelectedService] = useState(defaultType)
  const [note, setNote] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [submittedService, setSubmittedService] = useState<Service | null>(null)
  const [loading, setLoading]         = useState(false)
  const [submitError, setSubmitError]   = useState('')
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

  const selected = SERVICES.find(s => s.id === selectedService) ?? null

  function handleSelect(serviceId: string) {
    const service = SERVICES.find(s => s.id === serviceId)
    if (!service) return
    setSubmitError('')
    if (service.flow === 'stripe_direct') {
      // Navigator — redirect to Stripe with client_reference_id for webhook linking
      // Fix 5: append founder ID so webhook can identify who paid
      const founderId = founder?.id ?? ''
      const baseLink  = service.stripeLink
      // If env var not set, stripeLink is '/service-request' — route internally
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
      await fetch('/api/service-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type:         selected.id,
          note:         contextNote,
          founderId:    founder?.id        ?? null,
          founderName:  founder?.full_name ?? '',
          founderEmail: founder?.email     ?? '',
          businessName: founder?.business_name ?? '',
          flow:         selected.flow,
        }),
      })
      setSubmittedService(selected)
      setSubmitted(true)
    } catch (err) {
      console.error('Service request failed:', err)
      setSubmitError('Something went wrong — please try again.')
    }
    setLoading(false)
  }

  // ── Success screen ──
  if (submitted && submittedService) {
    return (
      <main style={{ minHeight: '100vh', background: '#F9FAFB', fontFamily: 'Inter, sans-serif' }}>
        <GlobalHeader founder={founder} />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 'calc(100vh - 60px)' }}>
          <div style={{ textAlign: 'center', maxWidth: 520, padding: 24 }}>
            <div style={{ fontSize: 56, marginBottom: 20 }}>✅</div>
            <h2 style={{ fontSize: 24, fontWeight: 800, color: '#111827', marginBottom: 10 }}>Request received</h2>
            <p style={{ fontSize: 15, color: '#6B7280', marginBottom: 16, lineHeight: 1.6 }}>
              Our team will be in touch within 24 hours at your registered email address.
            </p>

            {/* Service specific note */}
            {submittedService.successNote && (
              <div style={{ background: submittedService.bg, border: `1px solid ${submittedService.border}`, borderRadius: 12, padding: '16px 20px', marginBottom: 20, textAlign: 'left' }}>
                <p style={{ fontSize: 14, color: submittedService.color, fontWeight: 600, margin: '0 0 4px' }}>
                  {submittedService.flow === 'pay_first' ? '💳 Next step — complete payment' :
                   submittedService.flow === 'calendly' ? '📅 Next step — booking link coming' :
                   '📞 Next step — discovery call'}
                </p>
                <p style={{ fontSize: 13, color: '#374151', margin: 0, lineHeight: 1.6 }}>
                  {submittedService.successNote}
                </p>
              </div>
            )}

            <p style={{ fontSize: 14, color: '#9CA3AF', marginBottom: 24 }}>
              Service requested: <strong style={{ color: '#374151' }}>{submittedService.title}</strong>
            </p>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
              {/* Pay now button for pay_first services */}
              {submittedService.flow === 'pay_first' && (
                <a
                  href={submittedService.stripeLink}
                  style={{ padding: '12px 24px', background: submittedService.color, color: '#fff', borderRadius: 10, textDecoration: 'none', fontWeight: 700, fontSize: 14 }}
                >
                  Complete payment →
                </a>
              )}
              <a
                href="/focus"
                style={{ padding: '12px 24px', background: '#F3F4F6', color: '#374151', borderRadius: 10, textDecoration: 'none', fontWeight: 600, fontSize: 14 }}
              >
                Back to dashboard
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
      <GlobalHeader founder={founder} />

      <div style={{ maxWidth: 720, margin: '0 auto', padding: '40px 24px' }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, color: '#111827', marginBottom: 6 }}>Strategy & Services</h1>
        <p style={{ fontSize: 15, color: '#6B7280', marginBottom: 32, lineHeight: 1.6 }}>
          Choose a service below. Navigator upgrades instantly — all other services our team will follow up within 24 hours.
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
                            Instant access
                          </span>
                        )}
                        {service.flow === 'pay_first' && (
                          <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: '#EFF6FF', color: '#2563EB', fontWeight: 700, border: '1px solid #BFDBFE' }}>
                            Pay to confirm
                          </span>
                        )}
                        {service.flow === 'calendly' && (
                          <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: '#F5F3FF', color: '#7C3AED', fontWeight: 700, border: '1px solid #DDD6FE' }}>
                            Booking link sent
                          </span>
                        )}
                        {service.flow === 'discovery' && (
                          <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: '#FFFBEB', color: '#D97706', fontWeight: 700, border: '1px solid #FDE68A' }}>
                            Discovery call
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

        {/* Note field — only for non-stripe-direct services */}
        {selected && selected.flow !== 'stripe_direct' && (
          <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #E5E7EB', padding: '24px', marginBottom: 20 }}>
            {hasGoalContext && (
  <div style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 10, padding: '12px 16px', marginBottom: 14 }}>
    <p style={{ fontSize: 13, fontWeight: 700, color: '#1D4ED8', margin: '0 0 4px' }}>
      Requesting help for your {goalLabel} goal
    </p>
    <p style={{ fontSize: 12, color: '#3B82F6', margin: 0 }}>
      Current: {goalCurrent}{goalUnit} · Target: {goalTarget}{goalUnit}
    </p>
  </div>
)}
            <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
              Anything specific you want to focus on? (optional)
            </label>
            <textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder={
                selected.flow === 'calendly' ? 'e.g. We want to focus on reducing churn, our main challenge is retention after month 3' :
                selected.flow === 'discovery' ? 'e.g. Team of 8, mix of technical and non-technical, want to automate customer support first' :
                'e.g. We want to start with customer support automation, our main challenge is churn after 3 months'
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
            {loading ? 'Submitting...' : selected.buttonLabel}
          </button>
        ) : !selected ? (
          <button
            disabled
            style={{ width: '100%', padding: '14px', background: '#E5E7EB', color: '#9CA3AF', border: 'none', borderRadius: 12, fontSize: 15, fontWeight: 700, cursor: 'not-allowed' }}
          >
            Select a service above
          </button>
        ) : null}
      </div>
    </main>
  )
}


export default function ServiceRequestPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', background: '#F9FAFB', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6B7280' }}>Loading...</div>}>
      <ServiceRequestPageContent />
    </Suspense>
  )
}
