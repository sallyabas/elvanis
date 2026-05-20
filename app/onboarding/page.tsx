'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'


type Step = 'welcome' | 'profile' | 'focus' | 'guidance'

const STAGES = [
  { id: 'product_customers', label: 'We have a product and customers', icon: '🚀', desc: 'Live product with paying or active users', hasData: true },
  { id: 'early_stage',       label: 'We are early stage or pre-product', icon: '🌱', desc: 'Building, validating, or pre-revenue', hasData: false },
]

const INDUSTRIES = [
  'B2B SaaS / Enterprise Software',
  'B2C Mobile Apps / Consumer Tech',
  'E-commerce / Retail',
  'Logistics / Supply Chain Tech',
  'Professional Services / Consulting / Agency',
  'Marketplace / Platform',
  'HealthTech / MedTech',
  'FinTech / Financial Services',
  'EdTech / Education / Training',
  'Other',
]

const MARKETS = [
  'United Kingdom',
  'Netherlands',
  'UAE',
  'Saudi Arabia',
  'Bahrain',
  'Kuwait',
  'Qatar',
  'Oman',
  'Other Gulf',
  'Global / Remote-first',
  'Other',
]

const FOCUS_OPTIONS = [
  { id: 'growth',    label: 'Accelerate Top-Line Growth',           icon: '🚀', desc: 'Revenue, conversion, new customers' },
  { id: 'retention', label: 'Maximize Customer Retention',          icon: '🔄', desc: 'Churn, NPS, satisfaction, LTV' },
  { id: 'ops',       label: 'Optimize Operational / Support Costs', icon: '📥', desc: 'Ticket volume, response time, efficiency' },
  { id: 'delivery',  label: 'Boost Product / Engineering Delivery', icon: '⚡', desc: 'Velocity, cycle time, bug backlog' },
]

const selectStyle = {
  width: '100%', padding: '11px 14px', border: '1.5px solid #E5E7EB',
  borderRadius: 10, fontSize: 14, color: '#111827', outline: 'none',
  background: '#fff', boxSizing: 'border-box' as const, cursor: 'pointer',
  appearance: 'none' as const, transition: 'border-color 0.15s',
}

export default function OnboardingPage() {
  const router = useRouter()

  const [step, setStep]                       = useState<Step>('welcome')
  const [selectedStage, setSelectedStage]     = useState<string | null>(null)
  const [selectedIndustry, setSelectedIndustry] = useState('')
  const [industryOther, setIndustryOther]     = useState('')
  const [selectedMarket, setSelectedMarket]   = useState('')
  const [brandUrl, setBrandUrl]               = useState('')
  const [noWebsite, setNoWebsite]             = useState(false)
  const [selectedFocus, setSelectedFocus]     = useState<string | null>(null)
  const [loading, setLoading]                 = useState(false)
  useEffect(() => {
    const supabase = createClient()
    supabase.from('founders')
      .select('onboarding_completed')
      .eq('user_id', (supabase.auth.getUser() as any))
      .maybeSingle()
  }, [])

  const stageHasData = STAGES.find(s => s.id === selectedStage)?.hasData ?? false

  // Step 1 validation — all required fields filled
  const step1Valid = !!selectedStage && !!selectedIndustry && !!selectedMarket
    && (selectedIndustry !== 'Other' || industryOther.trim().length > 0)

  // Normalise brand URL — prepend https:// if missing
  function normaliseBrandUrl(raw: string): string {
    if (!raw.trim()) return ''
    const trimmed = raw.trim()
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed
    return `https://${trimmed}`
  }

  // Single atomic DB update — fires once on final routing decision
  async function saveAndComplete(focus: string | null) {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const normUrl = noWebsite ? null : normaliseBrandUrl(brandUrl)

    await supabase
      .from('founders')
      .update({
        onboarding_completed: true,
        founder_stage:        selectedStage ?? 'early_stage',
        industry:             selectedIndustry || null,
        industry_other:       selectedIndustry === 'Other' ? industryOther.trim() || null : null,
        market:               selectedMarket || null,
        brand_url:            normUrl || null,
        ...(focus ? { focus_metric: focus } : {}),
      })
      .eq('user_id', user.id)
  }

  async function handleGoAssessment() {
    setLoading(true)
    await saveAndComplete(selectedFocus)
    router.push('/assessment')
  }

  async function handleGoConnect() {
    setLoading(true)
    await saveAndComplete(selectedFocus)
    router.push('/connect')
  }

  async function handleExploreDashboard() {
    setLoading(true)
    await saveAndComplete(selectedFocus)
    router.push('/dashboard')
  }

  const btnPrimary = (disabled = false) => ({
    width: '100%', padding: '14px', background: disabled ? '#E5E7EB' : '#2563EB',
    color: disabled ? '#9CA3AF' : '#fff', border: 'none', borderRadius: 12,
    fontSize: 15, fontWeight: 700, cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: loading ? 0.7 : 1, transition: 'opacity 0.15s',
  })

  const btnSecondary = () => ({
    width: '100%', padding: '14px', background: '#F3F4F6', color: '#374151',
    border: 'none', borderRadius: 12, fontSize: 15, fontWeight: 600,
    cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1,
  })

  const btnGhost = () => ({
    width: '100%', padding: '12px', background: 'transparent', color: '#9CA3AF',
    border: 'none', borderRadius: 12, fontSize: 14, fontWeight: 500,
    cursor: loading ? 'not-allowed' : 'pointer',
  })

  // ── STEP 3A: Connect guidance — product + customers ──
  if (step === 'guidance' && stageHasData) {
    return (
      <main style={{ minHeight: '100vh', background: '#F9FAFB', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter, sans-serif', padding: 24 }}>
        <div style={{ maxWidth: 560, width: '100%' }}>
          <div style={{ background: '#fff', borderRadius: 20, border: '1px solid #E5E7EB', padding: '40px 36px', textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 20 }}>🔌</div>
            <h2 style={{ fontSize: 24, fontWeight: 800, color: '#111827', marginBottom: 8 }}>
              You have live data — let us read it
            </h2>
            <p style={{ fontSize: 15, color: '#6B7280', marginBottom: 28, lineHeight: 1.6 }}>
              Since you already have a product and customers, connecting your tools gives you real signals immediately — no guesswork.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
              {[
                { icon: '🛍️', label: 'Shopify — orders, refunds, AOV' },
                { icon: '💬', label: 'Intercom — support load, response time' },
                { icon: '🔧', label: 'Jira — velocity, cycle time, bugs' },
                { icon: '📊', label: 'GA4 — traffic, engagement, conversions' },
                { icon: '⭐', label: 'Trustpilot — sentiment, NPS trends' },
                { icon: '📁', label: 'CSV — any data in our template format' },
              ].map(item => (
                <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: '#F9FAFB', borderRadius: 10, textAlign: 'left' }}>
                  <span style={{ fontSize: 18 }}>{item.icon}</span>
                  <span style={{ fontSize: 13, fontWeight: 500, color: '#374151' }}>{item.label}</span>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button onClick={handleGoConnect}       disabled={loading} style={btnPrimary()}>Connect your tools →</button>
              <button onClick={handleGoAssessment}    disabled={loading} style={btnSecondary()}>Take assessment first →</button>
              <button onClick={handleExploreDashboard}disabled={loading} style={btnGhost()}>Explore dashboard first</button>
            </div>
          </div>
        </div>
      </main>
    )
  }

  // ── STEP 3B: Assessment guidance — early stage ──
  if (step === 'guidance' && !stageHasData) {
    return (
      <main style={{ minHeight: '100vh', background: '#F9FAFB', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter, sans-serif', padding: 24 }}>
        <div style={{ maxWidth: 560, width: '100%' }}>
          <div style={{ background: '#fff', borderRadius: 20, border: '1px solid #E5E7EB', padding: '40px 36px', textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 20 }}>🎯</div>
            <h2 style={{ fontSize: 24, fontWeight: 800, color: '#111827', marginBottom: 8 }}>
              Start with your business assessment
            </h2>
            <p style={{ fontSize: 15, color: '#6B7280', marginBottom: 28, lineHeight: 1.6 }}>
              26 questions, 10 minutes. Elvanis will diagnose your biggest constraint and generate your first signals — even before you connect any tools.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 32, textAlign: 'left' }}>
              {[
                { icon: '🔍', title: 'Diagnose what is blocking growth',  desc: 'Across revenue, product, team, marketing and strategy' },
                { icon: '⚡', title: 'Get your first priority signals',    desc: 'Without needing any tool integrations yet' },
                { icon: '📈', title: 'Build your baseline score',          desc: 'Track improvement as you fix things over time' },
                { icon: '✨', title: 'Unlock AI opportunity detection',    desc: 'We map your answers to specific AI use cases' },
              ].map(item => (
                <div key={item.title} style={{ display: 'flex', gap: 14, padding: '14px 16px', background: '#F9FAFB', borderRadius: 12 }}>
                  <span style={{ fontSize: 22, flexShrink: 0 }}>{item.icon}</span>
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 700, color: '#111827', margin: '0 0 2px' }}>{item.title}</p>
                    <p style={{ fontSize: 13, color: '#6B7280', margin: 0 }}>{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button onClick={handleGoAssessment}    disabled={loading} style={btnPrimary()}>Start 10-min assessment →</button>
              <button onClick={handleExploreDashboard}disabled={loading} style={btnSecondary()}>Explore dashboard first</button>
            </div>
          </div>
        </div>
      </main>
    )
  }

  // ── STEP 2: Focus metric ──
  if (step === 'focus') {
    return (
      <main style={{ minHeight: '100vh', background: '#F9FAFB', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter, sans-serif', padding: 24 }}>
        <div style={{ maxWidth: 560, width: '100%' }}>
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <span style={{ fontSize: 26, fontWeight: 800, color: '#2563EB' }}>Elvanis</span>
            <h1 style={{ fontSize: 24, fontWeight: 800, color: '#111827', marginTop: 24, marginBottom: 8 }}>
              What is your primary focus right now?
            </h1>
            <p style={{ fontSize: 15, color: '#6B7280', margin: 0 }}>
              This shapes your signals, digest and AI recommendations
            </p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
            {FOCUS_OPTIONS.map(option => (
              <button
                key={option.id}
                onClick={() => setSelectedFocus(option.id)}
                style={{
                  padding: '18px 22px', border: `2px solid ${selectedFocus === option.id ? '#2563EB' : '#E5E7EB'}`,
                  borderRadius: 14, background: selectedFocus === option.id ? '#EFF6FF' : '#fff',
                  textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 16,
                }}
              >
                <span style={{ fontSize: 28, flexShrink: 0 }}>{option.icon}</span>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 15, fontWeight: 600, color: '#111827', margin: '0 0 2px' }}>{option.label}</p>
                  <p style={{ fontSize: 12, color: '#6B7280', margin: 0 }}>{option.desc}</p>
                </div>
                {selectedFocus === option.id && (
                  <span style={{ width: 22, height: 22, borderRadius: '50%', background: '#2563EB', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 12, flexShrink: 0 }}>✓</span>
                )}
              </button>
            ))}
          </div>
          <button
            onClick={() => { if (selectedFocus) setStep('guidance') }}
            disabled={!selectedFocus}
            style={btnPrimary(!selectedFocus)}
          >
            Continue →
          </button>
        </div>
      </main>
    )
  }

  // ── STEP 1: Profile ──
  if (step === 'profile') {
    return (
      <main style={{ minHeight: '100vh', background: '#F9FAFB', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter, sans-serif', padding: 24 }}>
        <div style={{ maxWidth: 600, width: '100%' }}>
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <span style={{ fontSize: 26, fontWeight: 800, color: '#2563EB' }}>Elvanis</span>
            <h1 style={{ fontSize: 24, fontWeight: 800, color: '#111827', marginTop: 24, marginBottom: 8 }}>
              Tell us about your business
            </h1>
            <p style={{ fontSize: 15, color: '#6B7280', margin: 0 }}>
              This shapes your entire diagnostic experience
            </p>
          </div>

          {/* Stage selection */}
          <div style={{ marginBottom: 24 }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>Where are you right now?</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {STAGES.map(stage => (
                <button
                  key={stage.id}
                  onClick={() => setSelectedStage(stage.id)}
                  style={{
                    padding: '16px 20px', border: `2px solid ${selectedStage === stage.id ? '#2563EB' : '#E5E7EB'}`,
                    borderRadius: 14, background: selectedStage === stage.id ? '#EFF6FF' : '#fff',
                    textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 14,
                  }}
                >
                  <span style={{ fontSize: 26, flexShrink: 0 }}>{stage.icon}</span>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 14, fontWeight: 600, color: '#111827', margin: '0 0 2px' }}>{stage.label}</p>
                    <p style={{ fontSize: 12, color: '#6B7280', margin: 0 }}>{stage.desc}</p>
                  </div>
                  {selectedStage === stage.id && (
                    <span style={{ width: 20, height: 20, borderRadius: '50%', background: '#2563EB', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 11, flexShrink: 0 }}>✓</span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Industry + Market side by side */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 16 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Industry</label>
              <select
                value={selectedIndustry}
                onChange={e => { setSelectedIndustry(e.target.value); if (e.target.value !== 'Other') setIndustryOther('') }}
                style={selectStyle}
                onFocus={e => e.target.style.borderColor = '#2563EB'}
                onBlur={e => e.target.style.borderColor = '#E5E7EB'}
              >
                <option value="">Select industry</option>
                {INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Market</label>
              <select
                value={selectedMarket}
                onChange={e => setSelectedMarket(e.target.value)}
                style={selectStyle}
                onFocus={e => e.target.style.borderColor = '#2563EB'}
                onBlur={e => e.target.style.borderColor = '#E5E7EB'}
              >
                <option value="">Select market</option>
                {MARKETS.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
          </div>

          {/* Industry other free text */}
          {selectedIndustry === 'Other' && (
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Describe your industry</label>
              <input
                type="text"
                value={industryOther}
                onChange={e => setIndustryOther(e.target.value)}
                placeholder="e.g. Proptech, CleanTech, Legal Tech..."
                style={{ width: '100%', padding: '11px 14px', border: '1.5px solid #E5E7EB', borderRadius: 10, fontSize: 14, outline: 'none', boxSizing: 'border-box' as const, transition: 'border-color 0.15s' }}
                onFocus={e => e.target.style.borderColor = '#2563EB'}
                onBlur={e => e.target.style.borderColor = '#E5E7EB'}
              />
            </div>
          )}

          {/* Brand URL */}
          <div style={{ marginBottom: 24 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
              Your website <span style={{ color: '#9CA3AF', fontWeight: 400, textTransform: 'none', fontSize: 11 }}>optional</span>
            </label>
            {!noWebsite && (
              <input
                type="text"
                value={brandUrl}
                onChange={e => setBrandUrl(e.target.value)}
                placeholder="yourcompany.com"
                style={{ width: '100%', padding: '11px 14px', border: '1.5px solid #E5E7EB', borderRadius: 10, fontSize: 14, outline: 'none', boxSizing: 'border-box' as const, marginBottom: 8, transition: 'border-color 0.15s' }}
                onFocus={e => e.target.style.borderColor = '#2563EB'}
                onBlur={e => {
                  e.target.style.borderColor = '#E5E7EB'
                  // Normalise URL on blur — prepend https:// if missing
                  if (brandUrl.trim() && !brandUrl.startsWith('http')) {
                    setBrandUrl(`https://${brandUrl.trim()}`)
                  }
                }}
              />
            )}
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={noWebsite}
                onChange={e => { setNoWebsite(e.target.checked); if (e.target.checked) setBrandUrl('') }}
                style={{ width: 16, height: 16, accentColor: '#2563EB', cursor: 'pointer' }}
              />
              <span style={{ fontSize: 13, color: '#6B7280' }}>I do not have a website yet</span>
            </label>
          </div>

          <button
            onClick={() => { if (step1Valid) setStep('focus') }}
            disabled={!step1Valid}
            style={btnPrimary(!step1Valid)}
          >
            Continue →
          </button>
        </div>
      </main>
    )
  }

  // ── STEP 0: Welcome ──
  return (
    <main style={{ minHeight: '100vh', background: '#F9FAFB', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter, sans-serif', padding: 24 }}>
      <div style={{ maxWidth: 560, width: '100%' }}>
        <div style={{ background: '#fff', borderRadius: 20, border: '1px solid #E5E7EB', padding: '48px 40px', textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 20 }}>📊</div>
          <h2 style={{ fontSize: 26, fontWeight: 900, color: '#111827', marginBottom: 12, letterSpacing: '-0.5px' }}>
            Welcome to Elvanis
          </h2>
          <p style={{ fontSize: 16, color: '#6B7280', lineHeight: 1.7, marginBottom: 36 }}>
            Your AI business health platform. We read your real data, tell you exactly what is breaking your growth, and show you what to fix first.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 40, textAlign: 'left' }}>
            {[
              { icon: '🔍', title: 'Diagnose what is breaking your growth', desc: 'From your real data — not guesswork' },
              { icon: '⚡', title: 'Know exactly what to fix first',         desc: 'Prioritised by impact and severity' },
              { icon: '📈', title: 'Track whether your fixes work',          desc: 'Every scan shows what improved or got worse' },
              { icon: '✨', title: 'Find where AI saves you 10+ hours',      desc: 'Specific to your business, not generic' },
            ].map(item => (
              <div key={item.title} style={{ display: 'flex', gap: 14, padding: '14px 16px', background: '#F9FAFB', borderRadius: 12 }}>
                <span style={{ fontSize: 22, flexShrink: 0 }}>{item.icon}</span>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 700, color: '#111827', margin: '0 0 2px' }}>{item.title}</p>
                  <p style={{ fontSize: 13, color: '#6B7280', margin: 0 }}>{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
          <button
            onClick={() => setStep('profile')}
            style={{ width: '100%', padding: '16px', background: '#2563EB', color: '#fff', border: 'none', borderRadius: 12, fontSize: 16, fontWeight: 700, cursor: 'pointer' }}
          >
            Let us set up your profile →
          </button>
        </div>
      </div>
    </main>
  )
}
