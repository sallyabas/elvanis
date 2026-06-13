'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { useT } from '@/app/context/LanguageContext'
import { STAGES, INDUSTRIES, MARKETS, FOCUS_OPTIONS } from '@/lib/profile-options'

type Step = 'welcome' | 'profile' | 'focus' | 'guidance'

const selectStyle = {
  width: '100%', padding: '11px 14px', border: '1.5px solid #E5E7EB',
  borderRadius: 10, fontSize: 14, color: '#111827', outline: 'none',
  background: '#fff', boxSizing: 'border-box' as const, cursor: 'pointer',
  appearance: 'none' as const, transition: 'border-color 0.15s',
}

function normaliseBrandUrl(raw: string): string {
  if (!raw.trim()) return ''
  const t = raw.trim()
  return t.startsWith('http://') || t.startsWith('https://') ? t : `https://${t}`
}

export default function OnboardingPage() {
  const router = useRouter()
  const t = useT()

  const [step, setStep]                         = useState<Step>('welcome')
  const [selectedStage, setSelectedStage]       = useState<string | null>(null)
  const [selectedIndustry, setSelectedIndustry] = useState('')
  const [industryOther, setIndustryOther]       = useState('')
  const [selectedMarket, setSelectedMarket]     = useState('')
  const [brandUrl, setBrandUrl]                 = useState('')
  const [noWebsite, setNoWebsite]               = useState(false)
  const [selectedFocus, setSelectedFocus]       = useState<string | null>(null)
  const [loading, setLoading]                   = useState(false)
  const [resuming, setResuming]                 = useState(true)

  // ── Resume from last saved step on mount ─────────────────────
  useEffect(() => {
    async function resumeProgress() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setResuming(false); return }

      const { data: founder } = await supabase
        .from('founders')
        .select('onboarding_step, founder_stage, industry, industry_other, market, brand_url, focus_metric')
        .eq('user_id', user.id)
        .maybeSingle()

      if (!founder) { setResuming(false); return }

      // Restore saved values
      if (founder.founder_stage)   setSelectedStage(founder.founder_stage)
      if (founder.industry)        setSelectedIndustry(founder.industry)
      if (founder.industry_other)  setIndustryOther(founder.industry_other)
      if (founder.market)          setSelectedMarket(founder.market)
      if (founder.brand_url)       setBrandUrl(founder.brand_url)
      if (founder.focus_metric)    setSelectedFocus(founder.focus_metric)

      // Resume from correct step
      const savedStep = founder.onboarding_step ?? 0
      if (savedStep >= 2) setStep('guidance')
      else if (savedStep >= 1) setStep('focus')
      else if (savedStep >= 0 && founder.founder_stage) setStep('profile')
      // else stay on welcome

      setResuming(false)
    }
    resumeProgress()
  }, [])

  const stageHasData = STAGES.find(s => s.id === selectedStage)?.hasData ?? false

  const step1Valid = !!selectedStage && !!selectedIndustry && !!selectedMarket
    && (selectedIndustry !== 'Other' || industryOther.trim().length > 0)

  // ── Step 1: Save profile data and advance to focus ────────────
  async function handleStep1Continue() {
    if (!step1Valid) return
    setLoading(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }

    await supabase.from('founders').update({
      founder_stage:  selectedStage ?? 'early_stage',
      industry:       selectedIndustry || null,
      industry_other: selectedIndustry === 'Other' ? industryOther.trim() || null : null,
      market:         selectedMarket || null,
      brand_url:      noWebsite ? null : normaliseBrandUrl(brandUrl) || null,
      onboarding_step: 1,
    }).eq('user_id', user.id)

    setLoading(false)
    setStep('focus')
  }

  // ── Step 2: Save focus and advance to guidance ────────────────
  async function handleStep2Continue() {
    if (!selectedFocus) return
    setLoading(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }

    await supabase.from('founders').update({
      focus_metric:    selectedFocus,
      onboarding_step: 2,
    }).eq('user_id', user.id)

    setLoading(false)
    setStep('guidance')
  }

  // ── Step 3: Complete onboarding and route ─────────────────────
  async function completeOnboarding(destination: string) {
    setLoading(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }

    await supabase.from('founders').update({
      onboarding_completed: true,
      onboarding_step:      3,
    }).eq('user_id', user.id)

    router.push(destination)
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

  // Loading while resuming
  if (resuming) {
    return (
      <main style={{ minHeight: '100vh', background: '#F9FAFB', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter, sans-serif' }}>
        <p style={{ color: '#9CA3AF', fontSize: 14 }}>{t('onboarding.loading_progress')}</p>
      </main>
    )
  }

  // ── STEP 3A: Connect guidance — product + customers ───────────
  if (step === 'guidance' && stageHasData) {
    return (
      <main style={{ minHeight: '100vh', background: '#F9FAFB', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter, sans-serif', padding: 24 }}>
        <div style={{ maxWidth: 560, width: '100%' }}>
          <div style={{ background: '#fff', borderRadius: 20, border: '1px solid #E5E7EB', padding: '40px 36px', textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 20 }}>🔌</div>
            <h2 style={{ fontSize: 24, fontWeight: 800, color: '#111827', marginBottom: 8 }}>{t('onboarding.guidance_product_title')}</h2>
            <p style={{ fontSize: 15, color: '#6B7280', marginBottom: 28, lineHeight: 1.6 }}>
              {t('onboarding.guidance_product_sub')}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
              {[
                { icon: '🛍️', labelKey: 'onboarding.tool_shopify' as const },
                { icon: '💬', labelKey: 'onboarding.tool_intercom' as const },
                { icon: '🔧', labelKey: 'onboarding.tool_jira' as const },
                { icon: '📊', labelKey: 'onboarding.tool_ga4' as const },
                { icon: '⭐', labelKey: 'onboarding.tool_trustpilot' as const },
                { icon: '📁', labelKey: 'onboarding.tool_csv' as const },
              ].map(item => (
                <div key={item.labelKey} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: '#F9FAFB', borderRadius: 10, textAlign: 'left' }}>
                  <span style={{ fontSize: 18 }}>{item.icon}</span>
                  <span style={{ fontSize: 13, fontWeight: 500, color: '#374151' }}>{t(item.labelKey)}</span>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button onClick={() => completeOnboarding('/connect')}    disabled={loading} style={btnPrimary()}>{t('onboarding.connect_tools_cta')}</button>
              <button onClick={() => completeOnboarding('/assessment')} disabled={loading} style={btnSecondary()}>{t('onboarding.take_assessment_first')}</button>
              <button onClick={() => completeOnboarding('/focus')}  disabled={loading} style={btnGhost()}>{t('onboarding.explore_dashboard')}</button>
            </div>
          </div>
        </div>
      </main>
    )
  }

  // ── STEP 3B: Assessment guidance — early stage ────────────────
  if (step === 'guidance' && !stageHasData) {
    return (
      <main style={{ minHeight: '100vh', background: '#F9FAFB', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter, sans-serif', padding: 24 }}>
        <div style={{ maxWidth: 560, width: '100%' }}>
          <div style={{ background: '#fff', borderRadius: 20, border: '1px solid #E5E7EB', padding: '40px 36px', textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 20 }}>🎯</div>
            <h2 style={{ fontSize: 24, fontWeight: 800, color: '#111827', marginBottom: 8 }}>{t('onboarding.guidance_assess_title')}</h2>
            <p style={{ fontSize: 15, color: '#6B7280', marginBottom: 28, lineHeight: 1.6 }}>
              {t('onboarding.guidance_assess_sub')}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 32, textAlign: 'left' }}>
              {[
                { icon: '🔍', titleKey: 'onboarding.assess_item1_title' as const, descKey: 'onboarding.assess_item1_desc' as const },
                { icon: '⚡', titleKey: 'onboarding.assess_item2_title' as const, descKey: 'onboarding.assess_item2_desc' as const },
                { icon: '📈', titleKey: 'onboarding.assess_item3_title' as const, descKey: 'onboarding.assess_item3_desc' as const },
                { icon: '✨', titleKey: 'onboarding.assess_item4_title' as const, descKey: 'onboarding.assess_item4_desc' as const },
              ].map(item => (
                <div key={item.titleKey} style={{ display: 'flex', gap: 14, padding: '14px 16px', background: '#F9FAFB', borderRadius: 12 }}>
                  <span style={{ fontSize: 22, flexShrink: 0 }}>{item.icon}</span>
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 700, color: '#111827', margin: '0 0 2px' }}>{t(item.titleKey)}</p>
                    <p style={{ fontSize: 13, color: '#6B7280', margin: 0 }}>{t(item.descKey)}</p>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button onClick={() => completeOnboarding('/assessment')} disabled={loading} style={btnPrimary()}>{t('onboarding.start_assessment_cta')}</button>
              <button onClick={() => completeOnboarding('/focus')}  disabled={loading} style={btnSecondary()}>{t('onboarding.explore_dashboard')}</button>
            </div>
          </div>
        </div>
      </main>
    )
  }

  // ── STEP 2: Focus metric ──────────────────────────────────────
  if (step === 'focus') {
    return (
      <main style={{ minHeight: '100vh', background: '#F9FAFB', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter, sans-serif', padding: 24 }}>
        <div style={{ maxWidth: 560, width: '100%' }}>
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <span style={{ fontSize: 26, fontWeight: 800, color: '#2563EB' }}>Elvanis</span>
            <h1 style={{ fontSize: 24, fontWeight: 800, color: '#111827', marginTop: 24, marginBottom: 8 }}>{t('onboarding.focus_title')}</h1>
            <p style={{ fontSize: 15, color: '#6B7280', margin: 0 }}>{t('onboarding.focus_sub')}</p>
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
                  <p style={{ fontSize: 15, fontWeight: 600, color: '#111827', margin: '0 0 2px' }}>{t(option.labelKey)}</p>
                  <p style={{ fontSize: 12, color: '#6B7280', margin: 0 }}>{t(option.descKey)}</p>
                </div>
                {selectedFocus === option.id && (
                  <span style={{ width: 22, height: 22, borderRadius: '50%', background: '#2563EB', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 12, flexShrink: 0 }}>✓</span>
                )}
              </button>
            ))}
          </div>
          <button onClick={handleStep2Continue} disabled={!selectedFocus || loading} style={btnPrimary(!selectedFocus)}>
            {t('assessment.continue')}
          </button>
        </div>
      </main>
    )
  }

  // ── STEP 1: Profile ───────────────────────────────────────────
  if (step === 'profile') {
    return (
      <main style={{ minHeight: '100vh', background: '#F9FAFB', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter, sans-serif', padding: 24 }}>
        <div style={{ maxWidth: 600, width: '100%' }}>
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <span style={{ fontSize: 26, fontWeight: 800, color: '#2563EB' }}>Elvanis</span>
            <h1 style={{ fontSize: 24, fontWeight: 800, color: '#111827', marginTop: 24, marginBottom: 8 }}>{t('onboarding.profile_title')}</h1>
            <p style={{ fontSize: 15, color: '#6B7280', margin: 0 }}>{t('onboarding.profile_sub')}</p>
          </div>

          {/* Stage */}
          <div style={{ marginBottom: 24 }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>{t('onboarding.stage_question')}</p>
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
                    <p style={{ fontSize: 14, fontWeight: 600, color: '#111827', margin: '0 0 2px' }}>{t(stage.labelKey)}</p>
                    <p style={{ fontSize: 12, color: '#6B7280', margin: 0 }}>{t(stage.descKey)}</p>
                  </div>
                  {selectedStage === stage.id && (
                    <span style={{ width: 20, height: 20, borderRadius: '50%', background: '#2563EB', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 11, flexShrink: 0 }}>✓</span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Industry + Market */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 16 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>{t('profile.industry')}</label>
              <select value={selectedIndustry} onChange={e => { setSelectedIndustry(e.target.value); if (e.target.value !== 'Other') setIndustryOther('') }} style={selectStyle}
                onFocus={e => e.target.style.borderColor = '#2563EB'} onBlur={e => e.target.style.borderColor = '#E5E7EB'}>
                <option value="">{t('profile.select_industry')}</option>
                {INDUSTRIES.map(i => <option key={i.value} value={i.value}>{t(i.key)}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>{t('profile.market')}</label>
              <select value={selectedMarket} onChange={e => setSelectedMarket(e.target.value)} style={selectStyle}
                onFocus={e => e.target.style.borderColor = '#2563EB'} onBlur={e => e.target.style.borderColor = '#E5E7EB'}>
                <option value="">{t('profile.select_market')}</option>
                {MARKETS.map(m => <option key={m.value} value={m.value}>{t(m.key)}</option>)}
              </select>
            </div>
          </div>

          {selectedIndustry === 'Other' && (
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>{t('profile.describe_industry')}</label>
              <input type="text" value={industryOther} onChange={e => setIndustryOther(e.target.value)}
                placeholder={t('onboarding.industry_other_placeholder')}
                style={{ width: '100%', padding: '11px 14px', border: '1.5px solid #E5E7EB', borderRadius: 10, fontSize: 14, outline: 'none', boxSizing: 'border-box' as const, transition: 'border-color 0.15s' }}
                onFocus={e => e.target.style.borderColor = '#2563EB'} onBlur={e => e.target.style.borderColor = '#E5E7EB'} />
            </div>
          )}

          {/* Brand URL */}
          <div style={{ marginBottom: 24 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
              {t('profile.website')} <span style={{ color: '#9CA3AF', fontWeight: 400, textTransform: 'none', fontSize: 11 }}>{t('profile.optional')}</span>
            </label>
            {!noWebsite && (
              <input type="text" value={brandUrl} onChange={e => setBrandUrl(e.target.value)}
                placeholder="yourcompany.com"
                style={{ width: '100%', padding: '11px 14px', border: '1.5px solid #E5E7EB', borderRadius: 10, fontSize: 14, outline: 'none', boxSizing: 'border-box' as const, marginBottom: 8, transition: 'border-color 0.15s' }}
                onFocus={e => e.target.style.borderColor = '#2563EB'}
                onBlur={e => { e.target.style.borderColor = '#E5E7EB'; if (brandUrl.trim() && !brandUrl.startsWith('http')) setBrandUrl(`https://${brandUrl.trim()}`) }} />
            )}
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
              <input type="checkbox" checked={noWebsite} onChange={e => { setNoWebsite(e.target.checked); if (e.target.checked) setBrandUrl('') }}
                style={{ width: 16, height: 16, accentColor: '#2563EB', cursor: 'pointer' }} />
              <span style={{ fontSize: 13, color: '#6B7280' }}>{t('onboarding.no_website')}</span>
            </label>
          </div>

          <button onClick={handleStep1Continue} disabled={!step1Valid || loading} style={btnPrimary(!step1Valid)}>
            {t('assessment.continue')}
          </button>
        </div>
      </main>
    )
  }

  // ── STEP 0: Welcome ───────────────────────────────────────────
  return (
    <main style={{ minHeight: '100vh', background: '#F9FAFB', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter, sans-serif', padding: 24 }}>
      <div style={{ maxWidth: 560, width: '100%' }}>
        <div style={{ background: '#fff', borderRadius: 20, border: '1px solid #E5E7EB', padding: '48px 40px', textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 20 }}>📊</div>
          <h2 style={{ fontSize: 26, fontWeight: 900, color: '#111827', marginBottom: 12, letterSpacing: '-0.5px' }}>{t('onboarding.welcome_title')}</h2>
          <p style={{ fontSize: 16, color: '#6B7280', lineHeight: 1.7, marginBottom: 36 }}>
            {t('onboarding.welcome_sub')}
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 40, textAlign: 'left' }}>
            {[
              { icon: '🔍', titleKey: 'onboarding.feat1_title' as const, descKey: 'onboarding.feat1_desc' as const },
              { icon: '⚡', titleKey: 'onboarding.feat2_title' as const, descKey: 'onboarding.feat2_desc' as const },
              { icon: '📈', titleKey: 'onboarding.feat3_title' as const, descKey: 'onboarding.feat3_desc' as const },
              { icon: '✨', titleKey: 'onboarding.feat4_title' as const, descKey: 'onboarding.feat4_desc' as const },
            ].map(item => (
              <div key={item.titleKey} style={{ display: 'flex', gap: 14, padding: '14px 16px', background: '#F9FAFB', borderRadius: 12 }}>
                <span style={{ fontSize: 22, flexShrink: 0 }}>{item.icon}</span>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 700, color: '#111827', margin: '0 0 2px' }}>{t(item.titleKey)}</p>
                  <p style={{ fontSize: 13, color: '#6B7280', margin: 0 }}>{t(item.descKey)}</p>
                </div>
              </div>
            ))}
          </div>
          <button
            onClick={() => setStep('profile')}
            style={{ width: '100%', padding: '16px', background: '#2563EB', color: '#fff', border: 'none', borderRadius: 12, fontSize: 16, fontWeight: 700, cursor: 'pointer' }}
          >
            {t('onboarding.setup_profile_cta')}
          </button>
        </div>
      </div>
    </main>
  )
}
