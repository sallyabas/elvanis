'use client'

import { useEffect, useRef, useState } from 'react'
import { useT, useLang } from '@/app/context/LanguageContext'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { STAGES, INDUSTRIES, MARKETS, FOCUS_OPTIONS } from '@/lib/profile-options'

type Step = 'welcome' | 'profile' | 'focus' | 'guidance'

function normaliseBrandUrl(raw: string): string {
  if (!raw.trim()) return ''
  const t = raw.trim()
  return t.startsWith('http://') || t.startsWith('https://') ? t : `https://${t}`
}

export default function OnboardingPage() {
  const router = useRouter()
  const lang = useLang()
  const isAr = lang === 'ar'
  const t = useT()

  const [step, setStep]                         = useState<Step>('welcome')
  const [selectedStage, setSelectedStage]       = useState<string | null>(null)
  const [selectedIndustry, setSelectedIndustry] = useState('')
  const [industryOther, setIndustryOther]       = useState('')
  const [selectedMarket, setSelectedMarket]     = useState('')
  const [brandUrl, setBrandUrl]                 = useState('')
  const [noWebsite, setNoWebsite]               = useState(false)
  const [industryOpen, setIndustryOpen]         = useState(false)
  const [marketOpen, setMarketOpen]             = useState(false)
  const [selectedFocus, setSelectedFocus]       = useState<string | null>(null)
  const [loading, setLoading]                   = useState(false)
  const [resuming, setResuming]                 = useState(true)

  const industryRef = useRef<HTMLDivElement>(null)
  const marketRef   = useRef<HTMLDivElement>(null)

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
      if (founder.founder_stage)   setSelectedStage(founder.founder_stage)
      if (founder.industry)        setSelectedIndustry(founder.industry)
      if (founder.industry_other)  setIndustryOther(founder.industry_other)
      if (founder.market)          setSelectedMarket(founder.market)
      if (founder.brand_url)       setBrandUrl(founder.brand_url)
      if (founder.focus_metric)    setSelectedFocus(founder.focus_metric)
      const savedStep = founder.onboarding_step ?? 0
      if (savedStep >= 2) setStep('guidance')
      else if (savedStep >= 1) setStep('focus')
      else if (savedStep >= 0 && founder.founder_stage) setStep('profile')
      setResuming(false)
    }
    resumeProgress()
  }, [])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (industryRef.current && !industryRef.current.contains(e.target as Node)) setIndustryOpen(false)
      if (marketRef.current  && !marketRef.current.contains(e.target as Node))  setMarketOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const stageHasData = STAGES.find(s => s.id === selectedStage)?.hasData ?? false
  const step1Valid = !!selectedStage && !!selectedIndustry && !!selectedMarket
    && (selectedIndustry !== 'Other' || industryOther.trim().length > 0)

  async function handleStep1Continue() {
    if (!step1Valid) return
    setLoading(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }
    await supabase.from('founders').update({
      founder_stage:   selectedStage ?? 'early_stage',
      industry:        selectedIndustry || null,
      industry_other:  selectedIndustry === 'Other' ? industryOther.trim() || null : null,
      market:          selectedMarket || null,
      brand_url:       noWebsite ? null : normaliseBrandUrl(brandUrl) || null,
      onboarding_step: 1,
    }).eq('user_id', user.id)
    setLoading(false)
    setStep('focus')
  }

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

  const dropdownItem = (selected: boolean) => ({
    width: '100%', padding: '10px 16px',
    background: selected ? '#F0F7FF' : 'transparent',
    border: 'none', cursor: 'pointer', fontSize: 14,
    color: selected ? '#2563EB' : '#111827',
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    fontFamily: 'inherit',
    textAlign: (isAr ? 'right' : 'left') as 'right' | 'left',
    fontWeight: selected ? 600 : 400,
  })

  const chevron = (open: boolean) => (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none"
      style={{ flexShrink: 0, marginLeft: 8, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', color: '#9CA3AF' }}>
      <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )

  const checkmark = (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ pointerEvents: 'none', flexShrink: 0 }}>
      <path d="M3 8l4 4 6-6" stroke="#2563EB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )

  const dropdownPanel = {
    position: 'absolute' as const, top: 'calc(100% + 6px)', left: 0, right: 0,
    background: '#fff', borderRadius: 14,
    boxShadow: '0 4px 24px rgba(0,0,0,0.10), 0 1px 4px rgba(0,0,0,0.06)',
    zIndex: 100, maxHeight: 260, overflowY: 'auto' as const, padding: '6px 0',
  }

  const triggerBtn = (open: boolean, hasValue: boolean) => ({
    width: '100%', padding: '12px 16px', border: '1.5px solid #E5E7EB', borderRadius: 12,
    fontSize: 14, color: hasValue ? '#111827' : '#9CA3AF', background: '#fff',
    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    fontFamily: 'inherit', boxSizing: 'border-box' as const,
    boxShadow: open ? '0 0 0 3px #DBEAFE' : 'none', transition: 'box-shadow 0.15s',
  })

  if (resuming) {
    return (
      <main dir={isAr ? 'rtl' : 'ltr'} style={{ minHeight: '100vh', background: '#F9FAFB', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter, sans-serif' }}>
        <p style={{ color: '#9CA3AF', fontSize: 14 }}>{t('onboarding.loading_progress')}</p>
      </main>
    )
  }

  // ── STEP 3A: Guidance — product + customers ───────────────────
  if (step === 'guidance' && stageHasData) {
    return (
      <main dir={isAr ? 'rtl' : 'ltr'} style={{ minHeight: '100vh', background: '#F9FAFB', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter, sans-serif', padding: 24 }}>
        <div style={{ maxWidth: 560, width: '100%' }}>
          <div style={{ background: '#fff', borderRadius: 20, border: '1px solid #E5E7EB', padding: '40px 36px', textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 20 }}>🔌</div>
            <h2 style={{ fontSize: 24, fontWeight: 800, color: '#111827', marginBottom: 8 }}>{t('onboarding.guidance_product_title')}</h2>
            <p style={{ fontSize: 15, color: '#6B7280', marginBottom: 28, lineHeight: 1.6 }}>{t('onboarding.guidance_product_sub')}</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
              {[
                { icon: '🛍️', labelKey: 'onboarding.tool_shopify' as const },
                { icon: '💬', labelKey: 'onboarding.tool_intercom' as const },
                { icon: '🔧', labelKey: 'onboarding.tool_jira' as const },
                { icon: '📊', labelKey: 'onboarding.tool_ga4' as const },
                { icon: '⭐', labelKey: 'onboarding.tool_trustpilot' as const },
                { icon: '📁', labelKey: 'onboarding.tool_csv' as const },
              ].map(item => (
                <div key={item.labelKey} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: '#F0F7FF', borderRadius: 10, textAlign: isAr ? 'right' : 'left', borderLeft: isAr ? 'none' : '3px solid #2563EB', borderRight: isAr ? '3px solid #2563EB' : 'none' }}>
                  <span style={{ fontSize: 18 }}>{item.icon}</span>
                  <span style={{ fontSize: 13, fontWeight: 500, color: '#374151' }}>{t(item.labelKey)}</span>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ position: 'relative', paddingTop: 16 }}>
                <span style={{ position: 'absolute', top: 0, right: isAr ? 'auto' : 12, left: isAr ? 12 : 'auto', background: '#2563EB', color: '#fff', fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20, letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>
                  ⭐ {t('onboarding.recommended')}
                </span>
                <button onClick={() => completeOnboarding('/connect')} disabled={loading} style={btnPrimary()}>{t('onboarding.connect_tools_cta')}</button>
              </div>
              <button onClick={() => completeOnboarding('/assessment')} disabled={loading} style={btnSecondary()}>{t('onboarding.take_assessment_first')}</button>
              <button onClick={() => completeOnboarding('/')}           disabled={loading} style={btnGhost()}>{t('onboarding.explore_dashboard')}</button>
            </div>
          </div>
        </div>
      </main>
    )
  }

  // ── STEP 3B: Guidance — early stage ──────────────────────────
  if (step === 'guidance' && !stageHasData) {
    return (
      <main dir={isAr ? 'rtl' : 'ltr'} style={{ minHeight: '100vh', background: '#F9FAFB', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter, sans-serif', padding: 24 }}>
        <div style={{ maxWidth: 560, width: '100%' }}>
          <div style={{ background: '#fff', borderRadius: 20, border: '1px solid #E5E7EB', padding: '40px 36px', textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 20 }}>🎯</div>
            <h2 style={{ fontSize: 24, fontWeight: 800, color: '#111827', marginBottom: 8 }}>{t('onboarding.guidance_assess_title')}</h2>
            <p style={{ fontSize: 15, color: '#6B7280', marginBottom: 28, lineHeight: 1.6 }}>{t('onboarding.guidance_assess_sub')}</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 32, textAlign: isAr ? 'right' : 'left' }}>
              {[
                { icon: '🔍', titleKey: 'onboarding.assess_item1_title' as const, descKey: 'onboarding.assess_item1_desc' as const },
                { icon: '⚡', titleKey: 'onboarding.assess_item2_title' as const, descKey: 'onboarding.assess_item2_desc' as const },
                { icon: '📈', titleKey: 'onboarding.assess_item3_title' as const, descKey: 'onboarding.assess_item3_desc' as const },
                { icon: '✨', titleKey: 'onboarding.assess_item4_title' as const, descKey: 'onboarding.assess_item4_desc' as const },
              ].map(item => (
                <div key={item.titleKey} style={{ display: 'flex', gap: 14, padding: '14px 16px', background: '#F0F7FF', borderRadius: 12, borderLeft: isAr ? 'none' : '3px solid #2563EB', borderRight: isAr ? '3px solid #2563EB' : 'none' }}>
                <span style={{ fontSize: 22, flexShrink: 0 }}>{item.icon}</span>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 700, color: '#111827', margin: '0 0 2px' }}>{t(item.titleKey)}</p>
                  <p style={{ fontSize: 13, color: '#6B7280', margin: 0 }}>{t(item.descKey)}</p>
                </div>
              </div>
              ))}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ position: 'relative', paddingTop: 16 }}>
                <span style={{ position: 'absolute', top: 0, right: isAr ? 'auto' : 12, left: isAr ? 12 : 'auto', background: '#2563EB', color: '#fff', fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20, letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>
                  ⭐ {t('onboarding.recommended')}
                </span>
                <button onClick={() => completeOnboarding('/assessment')} disabled={loading} style={btnPrimary()}>{t('onboarding.start_assessment_cta')}</button>
              </div>
              <button onClick={() => completeOnboarding('/')} disabled={loading} style={btnSecondary()}>{t('onboarding.explore_dashboard')}</button>
            </div>
          </div>
        </div>
      </main>
    )
  }

  // ── STEP 2: Focus metric ──────────────────────────────────────
  if (step === 'focus') {
    return (
      <main dir={isAr ? 'rtl' : 'ltr'} style={{ minHeight: '100vh', background: '#F9FAFB', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter, sans-serif', padding: 24 }}>
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
                  padding: '18px 22px',
                  border: `2px solid ${selectedFocus === option.id ? '#2563EB' : '#E5E7EB'}`,
                  borderRadius: 14, background: selectedFocus === option.id ? '#EFF6FF' : '#fff',
                  textAlign: isAr ? 'right' : 'left', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 16,
                }}
              >
                <span style={{ fontSize: 28, flexShrink: 0 }}>{option.icon}</span>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 15, fontWeight: 600, color: '#111827', margin: '0 0 2px' }}>{t(option.labelKey)}</p>
                  <p style={{ fontSize: 12, color: '#6B7280', margin: 0 }}>{t(option.descKey)}</p>
                </div>
                <span style={{
                  width: 22, height: 22, borderRadius: '50%',
                  background: selectedFocus === option.id ? '#2563EB' : '#fff',
                  border: selectedFocus === option.id ? 'none' : '2px solid #D1D5DB',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#fff', fontSize: 12, flexShrink: 0,
                }}>
                  {selectedFocus === option.id ? '✓' : ''}
                </span>
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
      <main dir={isAr ? 'rtl' : 'ltr'} style={{ minHeight: '100vh', background: '#F9FAFB', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter, sans-serif', padding: 24 }}>
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
                    padding: '16px 20px',
                    border: `2px solid ${selectedStage === stage.id ? '#2563EB' : '#E5E7EB'}`,
                    borderRadius: 14, background: selectedStage === stage.id ? '#EFF6FF' : '#fff',
                    textAlign: isAr ? 'right' : 'left', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: 14,
                  }}
                >
                  <span style={{ fontSize: 26, flexShrink: 0 }}>{stage.icon}</span>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 14, fontWeight: 600, color: '#111827', margin: '0 0 2px' }}>{t(stage.labelKey)}</p>
                    <p style={{ fontSize: 12, color: '#6B7280', margin: 0 }}>{t(stage.descKey)}</p>
                  </div>
                  <span style={{
                    width: 20, height: 20, borderRadius: '50%',
                    background: selectedStage === stage.id ? '#2563EB' : '#fff',
                    border: selectedStage === stage.id ? 'none' : '2px solid #D1D5DB',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#fff', fontSize: 11, flexShrink: 0,
                  }}>
                    {selectedStage === stage.id ? '✓' : ''}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Industry + Market */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 16 }}>

            {/* Industry */}
            <div ref={industryRef} style={{ position: 'relative' }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>{t('profile.industry')}</label>
              <button type="button" onClick={() => { setIndustryOpen(o => !o); setMarketOpen(false) }} style={triggerBtn(industryOpen, !!selectedIndustry)}>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {selectedIndustry ? t((INDUSTRIES.find(i => i.value === selectedIndustry)?.key ?? 'profile.select_industry') as Parameters<typeof t>[0]) : t('profile.select_industry')}
                </span>
                {chevron(industryOpen)}
              </button>
              {industryOpen && (
                <div style={dropdownPanel}>
                  {INDUSTRIES.map(i => (
                    <button
                      key={i.value}
                      type="button"
                      onClick={() => { setSelectedIndustry(i.value); if (i.value !== 'Other') setIndustryOther(''); setIndustryOpen(false) }}
                      style={dropdownItem(selectedIndustry === i.value)}
                      onMouseEnter={e => { if (selectedIndustry !== i.value) (e.currentTarget as HTMLButtonElement).style.background = '#F9FAFB' }}
                      onMouseLeave={e => { if (selectedIndustry !== i.value) (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
                    >
                      <span>{t(i.key)}</span>
                      {selectedIndustry === i.value && checkmark}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Market */}
            <div ref={marketRef} style={{ position: 'relative' }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>{t('profile.market')}</label>
              <button type="button" onClick={() => { setMarketOpen(o => !o); setIndustryOpen(false) }} style={triggerBtn(marketOpen, !!selectedMarket)}>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {selectedMarket ? t((MARKETS.find(m => m.value === selectedMarket)?.key ?? 'profile.select_market') as Parameters<typeof t>[0]) : t('profile.select_market')}
                </span>
                {chevron(marketOpen)}
              </button>
              {marketOpen && (
                <div style={dropdownPanel}>
                  {MARKETS.map(m => (
                    <button
                      key={m.value}
                      type="button"
                      onClick={() => { setSelectedMarket(m.value); setMarketOpen(false) }}
                      style={dropdownItem(selectedMarket === m.value)}
                      onMouseEnter={e => { if (selectedMarket !== m.value) (e.currentTarget as HTMLButtonElement).style.background = '#F9FAFB' }}
                      onMouseLeave={e => { if (selectedMarket !== m.value) (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
                    >
                      <span>{t(m.key)}</span>
                      {selectedMarket === m.value && checkmark}
                    </button>
                  ))}
                </div>
              )}
            </div>

          </div>

          {/* Industry Other */}
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
    <main dir={isAr ? 'rtl' : 'ltr'} style={{ minHeight: '100vh', background: '#F9FAFB', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter, sans-serif', padding: 24 }}>
      <div style={{ maxWidth: 560, width: '100%' }}>
        <div style={{ background: '#fff', borderRadius: 20, border: '1px solid #E5E7EB', padding: '48px 40px', textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 20 }}>📊</div>
          <h2 style={{ fontSize: 26, fontWeight: 900, color: '#111827', marginBottom: 12, letterSpacing: '-0.5px' }}>{t('onboarding.welcome_title')}</h2>
          <p style={{ fontSize: 16, color: '#6B7280', lineHeight: 1.7, marginBottom: 36 }}>{t('onboarding.welcome_sub')}</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 40, textAlign: isAr ? 'right' : 'left' }}>
          {[
              { icon: '🔍', titleKey: 'onboarding.feat1_title' as const, descKey: 'onboarding.feat1_desc' as const },
              { icon: '⚡', titleKey: 'onboarding.feat2_title' as const, descKey: 'onboarding.feat2_desc' as const },
              { icon: '📈', titleKey: 'onboarding.feat3_title' as const, descKey: 'onboarding.feat3_desc' as const },
              { icon: '✨', titleKey: 'onboarding.feat4_title' as const, descKey: 'onboarding.feat4_desc' as const },
            ].map(item => (
              <div key={item.titleKey} style={{ display: 'flex', gap: 14, padding: '14px 16px', background: '#F9FAFB', borderRadius: 12, borderLeft: isAr ? 'none' : '3px solid #10B981', borderRight: isAr ? '3px solid #10B981' : 'none' }}>
                <span style={{ fontSize: 22, flexShrink: 0 }}>{item.icon}</span>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 14, fontWeight: 700, color: '#111827', margin: '0 0 2px' }}>{t(item.titleKey)}</p>
                  <p style={{ fontSize: 13, color: '#6B7280', margin: 0 }}>{t(item.descKey)}</p>
                </div>
                <span style={{ fontSize: 14, color: '#10B981', fontWeight: 700, flexShrink: 0, alignSelf: 'center' }}>✓</span>
              </div>
            ))}
          </div>
          <button onClick={() => setStep('profile')}
            style={{ width: '100%', padding: '16px', background: '#2563EB', color: '#fff', border: 'none', borderRadius: 12, fontSize: 16, fontWeight: 700, cursor: 'pointer' }}>
            {t('onboarding.setup_profile_cta')}
          </button>
        </div>
      </div>
    </main>
  )
}
