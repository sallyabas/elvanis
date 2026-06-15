'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { useT } from '@/app/context/LanguageContext'
import { INDUSTRIES, MARKETS, TICKET_TYPES, FOCUS_OPTIONS } from '@/lib/profile-options'




const CURRENCY_SYMBOL: Record<string, string> = {
  gbp: '£', usd: '$', eur: '€', aed: 'AED ', sar: 'SAR ',
}

interface ServiceRequest {
  id: string; type: string; status: string; created_at: string; notes: string | null
}

interface Payment {
  id:             string
  amount:         number
  currency:       string
  status:         string
  payment_method: string | null
  reference:      string | null
  period_start:   string | null
  period_end:     string | null
  cancelled_at:   string | null
  created_at:     string
}

interface Props {
  founderId:             string
  initialEmail:          string
  initialFullName:       string
  initialBusinessName:   string
  initialLogoUrl:        string | null
  initialIndustry:       string
  initialIndustryOther:  string
  initialMarket:         string
  initialBrandUrl:       string
  initialFocusMetric:    string
  subscriptionTier:      string
  subscriptionStatus:    string
  subscriptionStartedAt: string | null
  subscriptionEndsAt:    string | null
  serviceRequests:       ServiceRequest[]
  payments:              Payment[]
  initialLanguage:       string
}

const inputStyle = {
  width: '100%', padding: '10px 12px', border: '1.5px solid #E5E7EB',
  borderRadius: 9, fontSize: 14, boxSizing: 'border-box' as const,
  outline: 'none', transition: 'border-color 0.15s',
}
const selectStyle = {
  width: '100%', padding: '10px 12px', border: '1.5px solid #E5E7EB',
  borderRadius: 9, fontSize: 14, boxSizing: 'border-box' as const,
  outline: 'none', background: '#fff', cursor: 'pointer',
  transition: 'border-color 0.15s', appearance: 'none' as const,
}
const labelStyle = {
  display: 'block', fontSize: 12, fontWeight: 600, color: '#6B7280',
  marginBottom: 5, textTransform: 'uppercase' as const, letterSpacing: '0.04em',
}
const sectionStyle = {
  background: '#fff', borderRadius: 16, border: '1px solid #E5E7EB',
  padding: '24px', marginBottom: 16,
}
const sectionTitle = { fontSize: 14, fontWeight: 700, color: '#111827', marginBottom: 20 }

function formatAmount(amount: number, currency: string): string {
  const symbol = CURRENCY_SYMBOL[currency.toLowerCase()] ?? currency.toUpperCase() + ' '
  return `${symbol}${amount.toFixed(2)}`
}

function daysLeft(iso: string | null): number | null {
  if (!iso) return null
  return Math.ceil((new Date(iso).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
}

function MsgBox({ msg, msgColor, msgBg }: { msg: string; msgColor: string; msgBg: string }) {
  if (!msg) return null
  return (
    <div style={{ background: msgBg, borderRadius: 8, padding: '8px 12px', marginBottom: 14 }}>
      <p style={{ fontSize: 13, color: msgColor, margin: 0 }}>{msg}</p>
    </div>
  )
}

export default function ProfileClient({
  founderId, initialEmail, initialFullName, initialBusinessName, initialLanguage,
  initialLogoUrl, initialIndustry, initialIndustryOther, initialMarket,
  initialBrandUrl, initialFocusMetric, subscriptionTier, subscriptionStatus,
  subscriptionStartedAt, subscriptionEndsAt, serviceRequests, payments,
}: Props) {
  const router  = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)
  const t       = useT()

  const lang       = initialLanguage
  const dateLocale = lang === 'ar' ? 'ar-EG' : 'en-GB'

  const formatDate = (iso: string | null): string => {
    if (!iso) return '—'
    return new Intl.DateTimeFormat(dateLocale, { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(iso))
  }

  const formatShortDate = (iso: string | null): string => {
    if (!iso) return '—'
    return new Intl.DateTimeFormat(dateLocale, { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(iso))
  }

  // ── Service / payment label maps using t() ──
  const SERVICE_TYPE_LABELS: Record<string, string> = {
    navigator: t('profile.svc_navigator'),
    roadmap:   t('profile.svc_roadmap'),
    cpo:       t('profile.svc_cpo'),
    conflict:  t('profile.svc_conflict'),
    upgrade:   t('profile.svc_upgrade'),
    cto:       t('profile.svc_cto'),
    billing:   t('profile.svc_billing'),
  }

  const SERVICE_STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
    pending:   { label: t('profile.req_pending'),   color: '#D97706', bg: '#FFFBEB' },
    active:    { label: t('profile.req_active'),    color: '#2563EB', bg: '#EFF6FF' },
    completed: { label: t('profile.req_completed'), color: '#059669', bg: '#ECFDF5' },
    cancelled: { label: t('profile.req_cancelled'), color: '#DC2626', bg: '#FEF2F2' },
  }

  const PAYMENT_STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: string }> = {
    paid:      { label: t('profile.pay_paid'),      color: '#059669', bg: '#ECFDF5', icon: '✓' },
    failed:    { label: t('profile.pay_failed'),    color: '#DC2626', bg: '#FEF2F2', icon: '✗' },
    refunded:  { label: t('profile.pay_refunded'),  color: '#D97706', bg: '#FFFBEB', icon: '↩' },
    cancelled: { label: t('profile.pay_cancelled'), color: '#6B7280', bg: '#F9FAFB', icon: '○' },
  }

  // ── Personal info ──
  const [fullName, setFullName]               = useState(initialFullName)
  const [businessName, setBusinessName]       = useState(initialBusinessName)
  const [savedFullName, setSavedFullName]     = useState(initialFullName)
  const [savedBizName, setSavedBizName]       = useState(initialBusinessName)
  const [saving, setSaving]                   = useState(false)
  const [personalMsg, setPersonalMsg]         = useState('')
  const [language, setLanguage]               = useState(initialLanguage)
  const [savedLanguage, setSavedLanguage]     = useState(initialLanguage)
  const hasPersonalChanges                    = fullName.trim() !== savedFullName || businessName.trim() !== savedBizName || language !== savedLanguage

  // ── Logo ──
  const [logoUrl, setLogoUrl]                 = useState<string | null>(initialLogoUrl)
  const [uploading, setUploading]             = useState(false)
  const [logoMsg, setLogoMsg]                 = useState('')

  // ── Business profile ──
  const [industry, setIndustry]               = useState(initialIndustry)
  const [industryOther, setIndustryOther]     = useState(initialIndustryOther)
  const [market, setMarket]                   = useState(initialMarket)
  const [brandUrl, setBrandUrl]               = useState(initialBrandUrl)
  const [focusMetric, setFocusMetric]         = useState(initialFocusMetric)
  const [savingBiz, setSavingBiz]             = useState(false)
  const [bizMsg, setBizMsg]                   = useState('')

  // ── Support ──
  const [ticketType, setTicketType]           = useState('')
  const [subject, setSubject]                 = useState('')
  const [supportMsg, setSupportMsg]           = useState('')
  const [sendingSupport, setSendingSupport]   = useState(false)
  const [supportResult, setSupportResult]     = useState('')

  // ── Danger zone ──
  const [showDelete, setShowDelete]           = useState(false)
  const [deactivating, setDeactivating]       = useState(false)
  const [showAllPayments, setShowAllPayments] = useState(false)

  // ── Helpers ──
  const isError  = (msg: string) => msg.toLowerCase().includes('fail')
  const getColor = (msg: string) => isError(msg) ? '#DC2626' : '#059669'
  const getBg    = (msg: string) => isError(msg) ? '#FEF2F2' : '#ECFDF5'

  // ── Handlers ──
  async function handleSavePersonal() {
    setSaving(true); setPersonalMsg('')
    const supabase = createClient()
    const { error } = await supabase.from('founders')
      .update({ full_name: fullName.trim(), business_name: businessName.trim(), language })
      .eq('id', founderId)
    if (!error) {
      setSavedFullName(fullName.trim())
      setSavedBizName(businessName.trim())
      setSavedLanguage(language)
      setPersonalMsg(t('profile.saved'))
      // Write language cookie so LanguageContext and DirProvider stay in sync after reload
      document.cookie = `lang=${language}; path=/; max-age=31536000; SameSite=Lax`
      setTimeout(() => window.location.reload(), 500)
    } else {
      setPersonalMsg(`${t('profile.save_failed')}: ${error.message}`)
    }
    setSaving(false)
  }

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) { setLogoMsg(t('profile.logo_size')); return }
    setUploading(true); setLogoMsg(''); setPersonalMsg('')
    setTimeout(() => setPersonalMsg(''), 4000)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setUploading(false); return }
    const ext  = file.name.split('.').pop()
    const path = `${user.id}/logo.${ext}`
    const { error: uploadError } = await supabase.storage.from('logos').upload(path, file, { upsert: true })
    if (uploadError) { setLogoMsg(`${t('profile.logo_failed')}: ${uploadError.message}`); setUploading(false); return }
    const { data: { publicUrl } } = supabase.storage.from('logos').getPublicUrl(path)
    await supabase.from('founders').update({ logo_url: publicUrl }).eq('id', founderId)
    setLogoUrl(`${publicUrl}?t=${Date.now()}`)
    setLogoMsg(t('profile.logo_saved'))
    setTimeout(() => setLogoMsg(''), 4000)
    setUploading(false)
  }

  function normaliseBrandUrl(raw: string): string {
    if (!raw.trim()) return ''
    const trimmed = raw.trim()
    return trimmed.startsWith('http://') || trimmed.startsWith('https://') ? trimmed : `https://${trimmed}`
  }

  async function handleSaveBusiness() {
    setSavingBiz(true); setBizMsg('')
    const supabase = createClient()
    const { error } = await supabase.from('founders').update({
      industry:       industry || null,
      industry_other: industry === 'Other' ? industryOther.trim() || null : null,
      market:         market || null,
      brand_url:      normaliseBrandUrl(brandUrl) || null,
      focus_metric:   focusMetric || null,
    }).eq('id', founderId)
    setBizMsg(error ? `${t('profile.save_failed')}: ${error.message}` : t('profile.biz_saved'))
    setTimeout(() => setBizMsg(''), 4000)
    setSavingBiz(false)
  }

  async function handleSendSupport() {
    if (!ticketType || !subject.trim() || !supportMsg.trim()) return
    setSendingSupport(true); setSupportResult('')
    const res = await fetch('/api/support', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ founderId, ticketType, subject: subject.trim(), message: supportMsg.trim() }),
    })
    if (res.ok) {
      setSupportResult(t('profile.support_sent'))
      setTimeout(() => setSupportResult(''), 6000)
      setTicketType(''); setSubject(''); setSupportMsg('')
    } else {
      setSupportResult(t('profile.support_failed'))
    }
    setSendingSupport(false)
  }

  async function handleDeactivate() {
    setDeactivating(true)
    const supabase = createClient()
    await supabase.from('founders').update({ subscription_tier: 'deactivated' }).eq('id', founderId)
    await supabase.auth.signOut()
    router.push('/')
  }

  const isNavigator = subscriptionTier === 'navigator'
  const isActive    = subscriptionStatus === 'active'
  const remaining   = daysLeft(subscriptionEndsAt)
  const tierLabel   = isNavigator ? t('profile.tier_navigator') : subscriptionTier === 'deactivated' ? t('profile.tier_deactivated') : t('profile.tier_free')
  const tierColor   = isNavigator ? '#7C3AED' : subscriptionTier === 'deactivated' ? '#DC2626' : '#6B7280'
  const tierBg      = isNavigator ? '#F5F3FF' : subscriptionTier === 'deactivated' ? '#FEF2F2' : '#F9FAFB'
  const visiblePayments = showAllPayments ? payments : payments.slice(0, 3)

  return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: '40px 24px' }}>
      <h1 style={{ fontSize: 24, fontWeight: 800, color: '#111827', marginBottom: 28 }}>{t('profile.title')}</h1>

      {/* ── Plan badge ── */}
      <div style={{ background: tierBg, borderRadius: 12, padding: '12px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 16 }}>{isNavigator ? '✨' : '🔒'}</span>
          <span style={{ fontSize: 14, fontWeight: 600, color: tierColor }}>{tierLabel} {t('profile.plan')}</span>
        </div>
        {!isNavigator && subscriptionTier !== 'deactivated' && (
          <a href="/advisory?type=navigator" style={{ fontSize: 13, fontWeight: 600, color: '#7C3AED', textDecoration: 'none' }}>
            {t('profile.upgrade_cta')}
          </a>
        )}
      </div>

      {/* ── Billing ── */}
      {(isNavigator || payments.length > 0) && (
        <div style={{ ...sectionStyle, border: '1px solid #DDD6FE', background: '#FAFAFF' }}>
          <p style={{ ...sectionTitle, color: '#7C3AED' }}>{t('profile.billing')}</p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 20 }}>
            <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #EDE9FE', padding: '14px 16px' }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: '#A78BFA', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>{t('profile.status')}</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: isActive ? '#10B981' : '#DC2626' }} />
                <span style={{ fontSize: 15, fontWeight: 700, color: isActive ? '#059669' : '#DC2626' }}>{isActive ? t('profile.active') : t('profile.inactive')}</span>
              </div>
            </div>
            <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #EDE9FE', padding: '14px 16px' }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: '#A78BFA', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>{t('profile.amount')}</p>
              <span style={{ fontSize: 15, fontWeight: 700, color: '#0F172A' }}>{t('profile.amount_value')}</span>
            </div>
            <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #EDE9FE', padding: '14px 16px' }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: '#A78BFA', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>{t('profile.started')}</p>
              <span style={{ fontSize: 14, fontWeight: 600, color: '#0F172A' }}>{formatDate(subscriptionStartedAt)}</span>
            </div>
            <div style={{ background: '#fff', borderRadius: 12, border: `1px solid ${remaining !== null && remaining <= 7 ? '#FECACA' : '#EDE9FE'}`, padding: '14px 16px' }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: '#A78BFA', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>{isActive ? t('profile.renews') : t('profile.ended')}</p>
              <span style={{ fontSize: 14, fontWeight: 600, color: remaining !== null && remaining <= 7 ? '#DC2626' : '#0F172A' }}>{formatDate(subscriptionEndsAt)}</span>
              {remaining !== null && remaining > 0 && (
                <p style={{ fontSize: 11, color: remaining <= 7 ? '#DC2626' : '#94A3B8', margin: '4px 0 0' }}>
                  {t('profile.days_remaining').replace('{n}', String(remaining)).replace('{s}', remaining !== 1 ? 's' : '')}
                </p>
              )}
              {remaining !== null && remaining <= 0 && <p style={{ fontSize: 11, color: '#DC2626', margin: '4px 0 0' }}>{t('profile.plan_expired')}</p>}
            </div>
          </div>

          {/* Payment history */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: '#4C1D95', margin: 0 }}>{t('profile.payment_history')}</p>
              {payments.length > 3 && (
                <button onClick={() => setShowAllPayments(s => !s)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: '#7C3AED', fontFamily: 'inherit' }}>
                  {showAllPayments ? t('profile.show_less') : t('profile.view_all').replace('{n}', String(payments.length))}
                </button>
              )}
            </div>
            {payments.length === 0 ? (
              <div style={{ background: '#F5F3FF', borderRadius: 10, padding: '14px 16px' }}>
                <p style={{ fontSize: 13, color: '#A78BFA', margin: 0 }}>{t('profile.no_payments')}</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {visiblePayments.map(payment => {
                  const ps = PAYMENT_STATUS_CONFIG[payment.status] ?? PAYMENT_STATUS_CONFIG.paid
                  return (
                    <div key={payment.id} style={{ background: '#fff', borderRadius: 10, border: '1px solid #EDE9FE', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 14 }}>
                      <div style={{ width: 32, height: 32, borderRadius: 8, background: ps.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: ps.color, flexShrink: 0 }}>{ps.icon}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                          <span style={{ fontSize: 14, fontWeight: 700, color: '#0F172A' }}>{formatAmount(payment.amount, payment.currency)}</span>
                          <span style={{ fontSize: 11, fontWeight: 700, color: ps.color, background: ps.bg, padding: '2px 7px', borderRadius: 20 }}>{ps.label}</span>
                          {payment.payment_method && <span style={{ fontSize: 11, color: '#94A3B8' }}>{payment.payment_method}</span>}
                        </div>
                        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                          <span style={{ fontSize: 12, color: '#6B7280' }}>{formatShortDate(payment.created_at)}</span>
                          {payment.period_start && payment.period_end && <span style={{ fontSize: 12, color: '#94A3B8' }}>{formatShortDate(payment.period_start)} → {formatShortDate(payment.period_end)}</span>}
                          {payment.reference && <span style={{ fontSize: 11, color: '#94A3B8', fontFamily: 'monospace' }}>{payment.reference}</span>}
                          {payment.cancelled_at && <span style={{ fontSize: 11, color: '#DC2626' }}>{t('profile.cancelled_on')} {formatShortDate(payment.cancelled_at)}</span>}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          <div style={{ background: '#EDE9FE', borderRadius: 10, padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <p style={{ fontSize: 13, color: '#6D28D9', margin: 0 }}>
              {remaining !== null && remaining <= 7 ? t('profile.expiring_soon') : t('profile.billing_contact')}
            </p>
            <a href="/advisory?type=billing" style={{ fontSize: 13, fontWeight: 600, color: '#7C3AED', textDecoration: 'none', whiteSpace: 'nowrap', marginLeft: 16 }}>{t('profile.contact_us')}</a>
          </div>
        </div>
      )}

      {/* ── Brand logo ── */}
      <div style={sectionStyle}>
        <p style={sectionTitle}>{t('profile.brand_logo')}</p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: logoMsg ? 14 : 0 }}>
          <div onClick={() => fileRef.current?.click()} style={{ width: 72, height: 72, borderRadius: 16, border: '2px dashed #E5E7EB', background: '#F9FAFB', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
            {logoUrl ? <img src={logoUrl} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: 28 }}>🏢</span>}
          </div>
          <div>
            <button onClick={() => fileRef.current?.click()} disabled={uploading}
              style={{ padding: '8px 16px', background: uploading ? '#E5E7EB' : '#F3F4F6', color: '#374151', border: '1px solid #E5E7EB', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: uploading ? 'not-allowed' : 'pointer', marginBottom: 4 }}>
              {uploading ? t('profile.uploading') : t('profile.upload_logo')}
            </button>
            <p style={{ fontSize: 11, color: '#9CA3AF', margin: 0 }}>{t('profile.logo_hint')}</p>
          </div>
          <input ref={fileRef} type="file" accept="image/*" onChange={handleLogoUpload} style={{ display: 'none' }} />
        </div>
        <MsgBox msg={logoMsg} msgColor={getColor(logoMsg)} msgBg={getBg(logoMsg)} />
      </div>

      {/* ── Personal information ── */}
      <div style={sectionStyle}>
        <p style={sectionTitle}>{t('profile.personal_info')}</p>
        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>{t('profile.full_name')}</label>
          <input value={fullName} onChange={e => setFullName(e.target.value)} style={inputStyle} onFocus={e => e.target.style.borderColor = '#2563EB'} onBlur={e => e.target.style.borderColor = '#E5E7EB'} />
        </div>
        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>{t('profile.business_name')}</label>
          <input value={businessName} onChange={e => setBusinessName(e.target.value)} style={inputStyle} onFocus={e => e.target.style.borderColor = '#2563EB'} onBlur={e => e.target.style.borderColor = '#E5E7EB'} />
        </div>
        <div style={{ marginBottom: 20 }}>
          <label style={labelStyle}>{t('profile.email')}</label>
          <input value={initialEmail} disabled style={{ ...inputStyle, background: '#F9FAFB', color: '#9CA3AF', cursor: 'default' }} />
          <p style={{ fontSize: 11, color: '#9CA3AF', marginTop: 4 }}>{t('profile.email_hint')}</p>
        </div>

        <div style={{ marginBottom: 20 }}>
        <label style={labelStyle}>{t('profile.language')}</label>
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              type="button"
              onClick={() => setLanguage('en')}
              style={{
                flex: 1, padding: '10px 16px', borderRadius: 9, fontSize: 14, fontWeight: 600,
                border: `2px solid ${language === 'en' ? '#2563EB' : '#E5E7EB'}`,
                background: language === 'en' ? '#EFF6FF' : '#fff',
                color: language === 'en' ? '#2563EB' : '#6B7280',
                cursor: 'pointer',
              }}
            >
              {t('profile.english')}
            </button>
            <button
              type="button"
              onClick={() => setLanguage('ar')}
              style={{
                flex: 1, padding: '10px 16px', borderRadius: 9, fontSize: 14, fontWeight: 600,
                border: `2px solid ${language === 'ar' ? '#2563EB' : '#E5E7EB'}`,
                background: language === 'ar' ? '#EFF6FF' : '#fff',
                color: language === 'ar' ? '#2563EB' : '#6B7280',
                cursor: 'pointer',
              }}
            >
              {t('profile.arabic')}
            </button>
          </div>
        </div>
        <MsgBox msg={personalMsg} msgColor={getColor(personalMsg)} msgBg={getBg(personalMsg)} />
        <button
          onClick={handleSavePersonal}
          disabled={saving || !hasPersonalChanges}
          style={{ padding: '10px 24px', background: (saving || !hasPersonalChanges) ? '#E5E7EB' : '#2563EB', color: (saving || !hasPersonalChanges) ? '#9CA3AF' : '#fff', border: 'none', borderRadius: 9, fontSize: 14, fontWeight: 600, cursor: (saving || !hasPersonalChanges) ? 'not-allowed' : 'pointer' }}>
          {saving ? t('profile.saving') : t('profile.save_changes')}
        </button>
      </div>

      {/* ── Business profile ── */}
      <div style={sectionStyle}>
        <p style={sectionTitle}>{t('profile.business_profile')}</p>
        <p style={{ fontSize: 13, color: '#6B7280', marginBottom: 20, marginTop: -12 }}>{t('profile.business_profile_sub')}</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
          <div>
            <label style={labelStyle}>{t('profile.industry')}</label>
            <select value={industry} onChange={e => { setIndustry(e.target.value); if (e.target.value !== 'Other') setIndustryOther('') }} style={selectStyle} onFocus={e => e.target.style.borderColor = '#2563EB'} onBlur={e => e.target.style.borderColor = '#E5E7EB'}>
              <option value="">{t('profile.select_industry')}</option>
              {INDUSTRIES.map(i => <option key={i.value} value={i.value}>{t(i.key)}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>{t('profile.market')}</label>
            <select value={market} onChange={e => setMarket(e.target.value)} style={selectStyle} onFocus={e => e.target.style.borderColor = '#2563EB'} onBlur={e => e.target.style.borderColor = '#E5E7EB'}>
              <option value="">{t('profile.select_market')}</option>
              {MARKETS.map(m => <option key={m.value} value={m.value}>{t(m.key)}</option>)}
            </select>
          </div>
        </div>
        {industry === 'Other' && (
          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>{t('profile.describe_industry')}</label>
            <input value={industryOther} onChange={e => setIndustryOther(e.target.value)} placeholder={t('profile.industry_placeholder')} style={inputStyle} onFocus={e => e.target.style.borderColor = '#2563EB'} onBlur={e => e.target.style.borderColor = '#E5E7EB'} />
          </div>
        )}
        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>{t('profile.website')} <span style={{ color: '#9CA3AF', fontWeight: 400, textTransform: 'none', fontSize: 11 }}>{t('profile.optional')}</span></label>
          <input value={brandUrl} onChange={e => setBrandUrl(e.target.value)} placeholder="yourcompany.com" style={inputStyle}
            onFocus={e => e.target.style.borderColor = '#2563EB'}
            onBlur={e => { e.target.style.borderColor = '#E5E7EB'; if (brandUrl.trim() && !brandUrl.startsWith('http')) setBrandUrl(`https://${brandUrl.trim()}`) }} />
        </div>
        <div style={{ marginBottom: 20 }}>
          <label style={labelStyle}>{t('profile.primary_focus')}</label>
          <p style={{ fontSize: 12, color: '#6B7280', marginBottom: 10, marginTop: 2 }}>{t('profile.focus_hint')}</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {FOCUS_OPTIONS.map(opt => (
              <button key={opt.id} onClick={() => setFocusMetric(opt.id)}
                style={{ padding: '10px 14px', border: `1.5px solid ${focusMetric === opt.id ? '#2563EB' : '#E5E7EB'}`, borderRadius: 10, background: focusMetric === opt.id ? '#EFF6FF' : '#fff', textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 18 }}>{opt.icon}</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: focusMetric === opt.id ? '#2563EB' : '#374151' }}>{t(opt.labelKey)}</span>
                {focusMetric === opt.id && <span style={{ marginLeft: 'auto', width: 18, height: 18, borderRadius: '50%', background: '#2563EB', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 10, flexShrink: 0 }}>✓</span>}
              </button>
            ))}
          </div>
        </div>
        <MsgBox msg={bizMsg} msgColor={getColor(bizMsg)} msgBg={getBg(bizMsg)} />
        <button onClick={handleSaveBusiness} disabled={savingBiz}
          style={{ padding: '10px 24px', background: savingBiz ? '#E5E7EB' : '#2563EB', color: savingBiz ? '#9CA3AF' : '#fff', border: 'none', borderRadius: 9, fontSize: 14, fontWeight: 600, cursor: savingBiz ? 'not-allowed' : 'pointer' }}>
          {savingBiz ? t('profile.saving') : t('profile.save_business')}
        </button>
      </div>

      {/* ── Service Requests ── */}
      <div style={sectionStyle}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <p style={sectionTitle}>{t('profile.service_requests')}</p>
          <a href="/advisory" style={{ fontSize: 13, fontWeight: 600, color: '#2563EB', textDecoration: 'none' }}>{t('profile.new_request')}</a>
        </div>
        {serviceRequests.length === 0 ? (
          <div style={{ background: '#F9FAFB', borderRadius: 12, padding: '24px', textAlign: 'center' }}>
            <p style={{ fontSize: 14, fontWeight: 600, color: '#374151', marginBottom: 6 }}>{t('profile.no_requests')}</p>
            <p style={{ fontSize: 13, color: '#6B7280', marginBottom: 16 }}>{t('profile.no_requests_sub')}</p>
            <a href="/advisory" style={{ display: 'inline-block', padding: '9px 20px', background: '#2563EB', color: '#fff', borderRadius: 9, fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>{t('profile.browse_services')}</a>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {serviceRequests.map(req => {
              const status = SERVICE_STATUS_CONFIG[req.status] ?? SERVICE_STATUS_CONFIG.pending
              return (
                <div key={req.id} style={{ background: '#F9FAFB', borderRadius: 12, border: '1px solid #E5E7EB', padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <p style={{ fontSize: 14, fontWeight: 600, color: '#111827', margin: 0 }}>{SERVICE_TYPE_LABELS[req.type] ?? req.type}</p>
                      <span style={{ fontSize: 11, fontWeight: 700, color: status.color, background: status.bg, padding: '2px 8px', borderRadius: 20 }}>{status.label}</span>
                    </div>
                    <p style={{ fontSize: 12, color: '#9CA3AF', margin: 0 }}>{formatDate(req.created_at)}{req.notes && ` · ${req.notes}`}</p>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Contact support ── */}
      <div style={sectionStyle}>
        <p style={sectionTitle}>{t('profile.contact_support')}</p>
        <p style={{ fontSize: 13, color: '#6B7280', marginBottom: 20, marginTop: -12 }}>{t('profile.support_sub')}</p>
        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>{t('profile.ticket_type')}</label>
          <select value={ticketType} onChange={e => setTicketType(e.target.value)} style={selectStyle} onFocus={e => e.target.style.borderColor = '#2563EB'} onBlur={e => e.target.style.borderColor = '#E5E7EB'}>
            <option value="">{t('profile.select_type')}</option>
            {TICKET_TYPES.map(tt => <option key={tt.value} value={tt.value}>{t(tt.key)}</option>)}
          </select>
        </div>
        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>{t('profile.subject')}</label>
          <input value={subject} onChange={e => setSubject(e.target.value)} placeholder={t('profile.subject_placeholder')} style={inputStyle} onFocus={e => e.target.style.borderColor = '#2563EB'} onBlur={e => e.target.style.borderColor = '#E5E7EB'} />
        </div>
        <div style={{ marginBottom: 20 }}>
          <label style={labelStyle}>{t('profile.message')}</label>
          <textarea value={supportMsg} onChange={e => setSupportMsg(e.target.value)} placeholder={t('profile.message_placeholder')} rows={4}
            style={{ ...inputStyle, resize: 'vertical' as const, fontFamily: 'Inter, sans-serif' }}
            onFocus={e => e.target.style.borderColor = '#2563EB'} onBlur={e => e.target.style.borderColor = '#E5E7EB'} />
        </div>
        <MsgBox msg={supportResult} msgColor={getColor(supportResult)} msgBg={getBg(supportResult)} />
        <button onClick={handleSendSupport} disabled={sendingSupport || !ticketType || !subject.trim() || !supportMsg.trim()}
          style={{ padding: '10px 24px', background: (!ticketType || !subject.trim() || !supportMsg.trim()) ? '#E5E7EB' : '#2563EB', color: (!ticketType || !subject.trim() || !supportMsg.trim()) ? '#9CA3AF' : '#fff', border: 'none', borderRadius: 9, fontSize: 14, fontWeight: 600, cursor: (!ticketType || !subject.trim() || !supportMsg.trim()) ? 'not-allowed' : 'pointer' }}>
          {sendingSupport ? t('profile.sending') : t('profile.send_message')}
        </button>
      </div>

      {/* ── Danger zone ── */}
      <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #FCA5A5', padding: '24px' }}>
        <p style={{ fontSize: 14, fontWeight: 700, color: '#DC2626', marginBottom: 6 }}>{t('profile.danger_zone')}</p>
        <p style={{ fontSize: 13, color: '#6B7280', marginBottom: 16, lineHeight: 1.6 }}>{t('profile.danger_sub')}</p>
        {!showDelete ? (
          <button onClick={() => setShowDelete(true)} style={{ padding: '9px 20px', background: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA', borderRadius: 9, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            {t('profile.deactivate')}
          </button>
        ) : (
          <div style={{ background: '#FEF2F2', borderRadius: 10, padding: '16px' }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: '#DC2626', marginBottom: 12 }}>{t('profile.deactivate_confirm')}</p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={handleDeactivate} disabled={deactivating}
                style={{ padding: '9px 20px', background: '#DC2626', color: '#fff', border: 'none', borderRadius: 9, fontSize: 13, fontWeight: 600, cursor: deactivating ? 'not-allowed' : 'pointer', opacity: deactivating ? 0.7 : 1 }}>
                {deactivating ? t('profile.deactivating') : t('profile.deactivate_yes')}
              </button>
              <button onClick={() => setShowDelete(false)} style={{ padding: '9px 20px', background: '#fff', color: '#6B7280', border: '1px solid #E5E7EB', borderRadius: 9, fontSize: 13, cursor: 'pointer' }}>
                {t('scan.cancel')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
