'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

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
  'United Kingdom', 'Netherlands', 'UAE', 'Saudi Arabia',
  'Bahrain', 'Kuwait', 'Qatar', 'Oman',
  'Other Gulf', 'Global / Remote-first', 'Other',
]

const FOCUS_OPTIONS = [
  { id: 'growth',    label: 'Accelerate Top-Line Growth',           icon: '🚀' },
  { id: 'retention', label: 'Maximize Customer Retention',          icon: '🔄' },
  { id: 'ops',       label: 'Optimize Operational / Support Costs', icon: '📥' },
  { id: 'delivery',  label: 'Boost Product / Engineering Delivery', icon: '⚡' },
]

const TICKET_TYPES = [
  'General question',
  'Bug report',
  'Billing issue',
  'Feature request',
  'Account issue',
]

interface Props {
  founderId:           string
  initialEmail:        string
  initialFullName:     string
  initialBusinessName: string
  initialLogoUrl:      string | null
  initialIndustry:     string
  initialIndustryOther:string
  initialMarket:       string
  initialBrandUrl:     string
  initialFocusMetric:  string
  subscriptionTier:    string
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
  display: 'block', fontSize: 12, fontWeight: 600,
  color: '#6B7280', marginBottom: 5,
  textTransform: 'uppercase' as const, letterSpacing: '0.04em',
}

const sectionStyle = {
  background: '#fff', borderRadius: 16, border: '1px solid #E5E7EB',
  padding: '24px', marginBottom: 16,
}

const sectionTitle = {
  fontSize: 14, fontWeight: 700, color: '#111827', marginBottom: 20,
}

export default function ProfileClient({
  founderId,
  initialEmail,
  initialFullName,
  initialBusinessName,
  initialLogoUrl,
  initialIndustry,
  initialIndustryOther,
  initialMarket,
  initialBrandUrl,
  initialFocusMetric,
  subscriptionTier,
}: Props) {
  const router  = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)

  // Personal info state
  const [fullName, setFullName]           = useState(initialFullName)
  const [businessName, setBusinessName]   = useState(initialBusinessName)
  const [logoUrl, setLogoUrl]             = useState<string | null>(initialLogoUrl)
  const [saving, setSaving]               = useState(false)
  const [uploading, setUploading]         = useState(false)
  const [personalMsg, setPersonalMsg]     = useState('')

  // Business profile state
  const [industry, setIndustry]           = useState(initialIndustry)
  const [industryOther, setIndustryOther] = useState(initialIndustryOther)
  const [market, setMarket]               = useState(initialMarket)
  const [brandUrl, setBrandUrl]           = useState(initialBrandUrl)
  const [focusMetric, setFocusMetric]     = useState(initialFocusMetric)
  const [savingBiz, setSavingBiz]         = useState(false)
  const [bizMsg, setBizMsg]               = useState('')

  // Contact support state
  const [ticketType, setTicketType]       = useState('')
  const [subject, setSubject]             = useState('')
  const [supportMsg, setSupportMsg]       = useState('')
  const [sendingSupport, setSendingSupport] = useState(false)
  const [supportResult, setSupportResult] = useState('')

  // Danger zone state
  const [showDelete, setShowDelete]       = useState(false)
  const [deactivating, setDeactivating]   = useState(false)

  // ── Personal info save ──
  async function handleSavePersonal() {
    setSaving(true)
    setPersonalMsg('')
    const supabase = createClient()
    const { error } = await supabase
      .from('founders')
      .update({
        full_name:     fullName.trim(),
        business_name: businessName.trim(),
      })
      .eq('id', founderId)

    setPersonalMsg(error ? `Save failed: ${error.message}` : 'Saved successfully')
    setSaving(false)
  }

  // ── Logo upload ──
  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) { setPersonalMsg('Logo must be under 2MB'); return }

    setUploading(true)
    setPersonalMsg('')
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const ext  = file.name.split('.').pop()
    const path = `${user.id}/logo.${ext}`

    const { error: uploadError } = await supabase.storage
      .from('logos').upload(path, file, { upsert: true })

    if (uploadError) { setPersonalMsg('Upload failed: ' + uploadError.message); setUploading(false); return }

    const { data: { publicUrl } } = supabase.storage.from('logos').getPublicUrl(path)
    await supabase.from('founders').update({ logo_url: publicUrl }).eq('id', founderId)
    setLogoUrl(publicUrl)
    setPersonalMsg('Logo updated')
    setUploading(false)
  }

  // ── Business profile save ──
  function normaliseBrandUrl(raw: string): string {
    if (!raw.trim()) return ''
    const t = raw.trim()
    return t.startsWith('http://') || t.startsWith('https://') ? t : `https://${t}`
  }

  async function handleSaveBusiness() {
    setSavingBiz(true)
    setBizMsg('')
    const supabase = createClient()
    const { error } = await supabase
      .from('founders')
      .update({
        industry:       industry || null,
        industry_other: industry === 'Other' ? industryOther.trim() || null : null,
        market:         market || null,
        brand_url:      normaliseBrandUrl(brandUrl) || null,
        focus_metric:   focusMetric || null,
      })
      .eq('id', founderId)

    setBizMsg(error ? `Save failed: ${error.message}` : 'Business profile updated')
    setSavingBiz(false)
  }

  // ── Contact support ──
  async function handleSendSupport() {
    if (!ticketType || !subject.trim() || !supportMsg.trim()) return
    setSendingSupport(true)
    setSupportResult('')

    const res = await fetch('/api/support', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        founderId,
        ticketType,
        subject:    subject.trim(),
        message:    supportMsg.trim(),
      }),
    })

    if (res.ok) {
      setSupportResult('Your message has been sent. We will get back to you within 1 business day.')
      setTicketType('')
      setSubject('')
      setSupportMsg('')
    } else {
      setSupportResult('Failed to send — please try again or email us directly.')
    }
    setSendingSupport(false)
  }

  // ── Deactivate ──
  async function handleDeactivate() {
    setDeactivating(true)
    const supabase = createClient()
    await supabase.from('founders').update({ subscription_tier: 'deactivated' }).eq('id', founderId)
    await supabase.auth.signOut()
    router.push('/')
  }

  const msgColor = (msg: string) =>
    msg.includes('fail') || msg.includes('Failed') ? '#DC2626' : '#059669'
  const msgBg = (msg: string) =>
    msg.includes('fail') || msg.includes('Failed') ? '#FEF2F2' : '#ECFDF5'

  const tierLabel = subscriptionTier === 'navigator' ? 'Navigator' : subscriptionTier === 'deactivated' ? 'Deactivated' : 'Free'
  const tierColor = subscriptionTier === 'navigator' ? '#7C3AED' : subscriptionTier === 'deactivated' ? '#DC2626' : '#6B7280'
  const tierBg    = subscriptionTier === 'navigator' ? '#F5F3FF' : subscriptionTier === 'deactivated' ? '#FEF2F2' : '#F9FAFB'

  return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: '40px 24px' }}>
      <a href="/dashboard" style={{ fontSize: 13, color: '#6B7280', textDecoration: 'none', display: 'block', marginBottom: 28 }}>← Back to dashboard</a>
      <h1 style={{ fontSize: 24, fontWeight: 800, color: '#111827', marginBottom: 28 }}>Your profile</h1>

      {/* ── Plan badge ── */}
      <div style={{ background: tierBg, borderRadius: 12, padding: '12px 16px', marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 16 }}>{subscriptionTier === 'navigator' ? '✨' : '🔒'}</span>
          <span style={{ fontSize: 14, fontWeight: 600, color: tierColor }}>
            {tierLabel} plan
          </span>
        </div>
        {subscriptionTier === 'free' && (
          <a href="/service-request?type=upgrade" style={{ fontSize: 13, fontWeight: 600, color: '#7C3AED', textDecoration: 'none' }}>
            Upgrade to Navigator →
          </a>
        )}
      </div>

      {/* ── Brand logo ── */}
      <div style={sectionStyle}>
        <p style={sectionTitle}>Brand logo</p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <div
            onClick={() => fileRef.current?.click()}
            style={{
              width: 72, height: 72, borderRadius: 16, border: '2px dashed #E5E7EB',
              background: '#F9FAFB', cursor: 'pointer', display: 'flex',
              alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0,
            }}
          >
            {logoUrl
              ? <img src={logoUrl} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <span style={{ fontSize: 28 }}>🏢</span>}
          </div>
          <div>
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              style={{ padding: '8px 16px', background: uploading ? '#E5E7EB' : '#F3F4F6', color: '#374151', border: '1px solid #E5E7EB', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: uploading ? 'not-allowed' : 'pointer', marginBottom: 4 }}
            >
              {uploading ? 'Uploading...' : 'Upload logo'}
            </button>
            <p style={{ fontSize: 11, color: '#9CA3AF', margin: 0 }}>PNG or JPG · Max 2MB</p>
          </div>
          <input ref={fileRef} type="file" accept="image/*" onChange={handleLogoUpload} style={{ display: 'none' }} />
        </div>
      </div>

      {/* ── Personal information ── */}
      <div style={sectionStyle}>
        <p style={sectionTitle}>Personal information</p>

        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>Full name</label>
          <input value={fullName} onChange={e => setFullName(e.target.value)} style={inputStyle}
            onFocus={e => e.target.style.borderColor = '#2563EB'}
            onBlur={e => e.target.style.borderColor = '#E5E7EB'} />
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>Business name</label>
          <input value={businessName} onChange={e => setBusinessName(e.target.value)} style={inputStyle}
            onFocus={e => e.target.style.borderColor = '#2563EB'}
            onBlur={e => e.target.style.borderColor = '#E5E7EB'} />
        </div>

        <div style={{ marginBottom: 20 }}>
          <label style={labelStyle}>Email</label>
          <input value={initialEmail} disabled
            style={{ ...inputStyle, background: '#F9FAFB', color: '#9CA3AF', cursor: 'default' }} />
          <p style={{ fontSize: 11, color: '#9CA3AF', marginTop: 4 }}>Email cannot be changed. Contact support if needed.</p>
        </div>

        {personalMsg && (
          <div style={{ background: msgBg(personalMsg), borderRadius: 8, padding: '8px 12px', marginBottom: 14 }}>
            <p style={{ fontSize: 13, color: msgColor(personalMsg), margin: 0 }}>{personalMsg}</p>
          </div>
        )}

        <button onClick={handleSavePersonal} disabled={saving}
          style={{ padding: '10px 24px', background: saving ? '#E5E7EB' : '#2563EB', color: saving ? '#9CA3AF' : '#fff', border: 'none', borderRadius: 9, fontSize: 14, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}>
          {saving ? 'Saving...' : 'Save changes'}
        </button>
      </div>

      {/* ── Business profile ── */}
      <div style={sectionStyle}>
        <p style={sectionTitle}>Business profile</p>
        <p style={{ fontSize: 13, color: '#6B7280', marginBottom: 20, marginTop: -12 }}>
          This information shapes your signals, digest and AI recommendations.
        </p>

        {/* Industry + Market */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
          <div>
            <label style={labelStyle}>Industry</label>
            <select value={industry} onChange={e => { setIndustry(e.target.value); if (e.target.value !== 'Other') setIndustryOther('') }} style={selectStyle}
              onFocus={e => e.target.style.borderColor = '#2563EB'}
              onBlur={e => e.target.style.borderColor = '#E5E7EB'}>
              <option value="">Select industry</option>
              {INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Market</label>
            <select value={market} onChange={e => setMarket(e.target.value)} style={selectStyle}
              onFocus={e => e.target.style.borderColor = '#2563EB'}
              onBlur={e => e.target.style.borderColor = '#E5E7EB'}>
              <option value="">Select market</option>
              {MARKETS.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
        </div>

        {/* Industry other */}
        {industry === 'Other' && (
          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>Describe your industry</label>
            <input value={industryOther} onChange={e => setIndustryOther(e.target.value)}
              placeholder="e.g. Proptech, CleanTech, Legal Tech..." style={inputStyle}
              onFocus={e => e.target.style.borderColor = '#2563EB'}
              onBlur={e => e.target.style.borderColor = '#E5E7EB'} />
          </div>
        )}

        {/* Brand URL */}
        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>Website <span style={{ color: '#9CA3AF', fontWeight: 400, textTransform: 'none', fontSize: 11 }}>optional</span></label>
          <input value={brandUrl} onChange={e => setBrandUrl(e.target.value)}
            placeholder="yourcompany.com" style={inputStyle}
            onFocus={e => e.target.style.borderColor = '#2563EB'}
            onBlur={e => {
              e.target.style.borderColor = '#E5E7EB'
              if (brandUrl.trim() && !brandUrl.startsWith('http')) setBrandUrl(`https://${brandUrl.trim()}`)
            }} />
        </div>

        {/* Focus metric */}
        <div style={{ marginBottom: 20 }}>
          <label style={labelStyle}>Primary focus</label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {FOCUS_OPTIONS.map(opt => (
              <button key={opt.id} onClick={() => setFocusMetric(opt.id)}
                style={{
                  padding: '10px 14px', border: `1.5px solid ${focusMetric === opt.id ? '#2563EB' : '#E5E7EB'}`,
                  borderRadius: 10, background: focusMetric === opt.id ? '#EFF6FF' : '#fff',
                  textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10,
                }}>
                <span style={{ fontSize: 18 }}>{opt.icon}</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: focusMetric === opt.id ? '#2563EB' : '#374151' }}>{opt.label}</span>
                {focusMetric === opt.id && (
                  <span style={{ marginLeft: 'auto', width: 18, height: 18, borderRadius: '50%', background: '#2563EB', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 10, flexShrink: 0 }}>✓</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {bizMsg && (
          <div style={{ background: msgBg(bizMsg), borderRadius: 8, padding: '8px 12px', marginBottom: 14 }}>
            <p style={{ fontSize: 13, color: msgColor(bizMsg), margin: 0 }}>{bizMsg}</p>
          </div>
        )}

        <button onClick={handleSaveBusiness} disabled={savingBiz}
          style={{ padding: '10px 24px', background: savingBiz ? '#E5E7EB' : '#2563EB', color: savingBiz ? '#9CA3AF' : '#fff', border: 'none', borderRadius: 9, fontSize: 14, fontWeight: 600, cursor: savingBiz ? 'not-allowed' : 'pointer', opacity: savingBiz ? 0.7 : 1 }}>
          {savingBiz ? 'Saving...' : 'Save business profile'}
        </button>
      </div>

      {/* ── Contact support ── */}
      <div style={sectionStyle}>
        <p style={sectionTitle}>Contact support</p>
        <p style={{ fontSize: 13, color: '#6B7280', marginBottom: 20, marginTop: -12 }}>
          We typically respond within 1 business day.
        </p>

        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>Ticket type</label>
          <select value={ticketType} onChange={e => setTicketType(e.target.value)} style={selectStyle}
            onFocus={e => e.target.style.borderColor = '#2563EB'}
            onBlur={e => e.target.style.borderColor = '#E5E7EB'}>
            <option value="">Select type</option>
            {TICKET_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>Subject</label>
          <input value={subject} onChange={e => setSubject(e.target.value)}
            placeholder="Brief summary of your issue" style={inputStyle}
            onFocus={e => e.target.style.borderColor = '#2563EB'}
            onBlur={e => e.target.style.borderColor = '#E5E7EB'} />
        </div>

        <div style={{ marginBottom: 20 }}>
          <label style={labelStyle}>Message</label>
          <textarea value={supportMsg} onChange={e => setSupportMsg(e.target.value)}
            placeholder="Describe your issue in detail..." rows={4}
            style={{ ...inputStyle, resize: 'vertical' as const, fontFamily: 'Inter, sans-serif' }}
            onFocus={e => e.target.style.borderColor = '#2563EB'}
            onBlur={e => e.target.style.borderColor = '#E5E7EB'} />
        </div>

        {supportResult && (
          <div style={{ background: msgBg(supportResult), borderRadius: 8, padding: '8px 12px', marginBottom: 14 }}>
            <p style={{ fontSize: 13, color: msgColor(supportResult), margin: 0 }}>{supportResult}</p>
          </div>
        )}

        <button
          onClick={handleSendSupport}
          disabled={sendingSupport || !ticketType || !subject.trim() || !supportMsg.trim()}
          style={{
            padding: '10px 24px',
            background: (sendingSupport || !ticketType || !subject.trim() || !supportMsg.trim()) ? '#E5E7EB' : '#2563EB',
            color: (sendingSupport || !ticketType || !subject.trim() || !supportMsg.trim()) ? '#9CA3AF' : '#fff',
            border: 'none', borderRadius: 9, fontSize: 14, fontWeight: 600,
            cursor: (sendingSupport || !ticketType || !subject.trim() || !supportMsg.trim()) ? 'not-allowed' : 'pointer',
            opacity: sendingSupport ? 0.7 : 1,
          }}>
          {sendingSupport ? 'Sending...' : 'Send message'}
        </button>
      </div>

      {/* ── Danger zone ── */}
      <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #FCA5A5', padding: '24px' }}>
        <p style={{ fontSize: 14, fontWeight: 700, color: '#DC2626', marginBottom: 6 }}>Danger zone</p>
        <p style={{ fontSize: 13, color: '#6B7280', marginBottom: 16, lineHeight: 1.6 }}>
          Deactivating your account will immediately sign you out and disable access. Your data will be retained for 30 days before permanent deletion.
        </p>
        {!showDelete ? (
          <button onClick={() => setShowDelete(true)}
            style={{ padding: '9px 20px', background: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA', borderRadius: 9, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            Deactivate account
          </button>
        ) : (
          <div style={{ background: '#FEF2F2', borderRadius: 10, padding: '16px' }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: '#DC2626', marginBottom: 12 }}>Are you sure? This cannot be undone.</p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={handleDeactivate} disabled={deactivating}
                style={{ padding: '9px 20px', background: '#DC2626', color: '#fff', border: 'none', borderRadius: 9, fontSize: 13, fontWeight: 600, cursor: deactivating ? 'not-allowed' : 'pointer', opacity: deactivating ? 0.7 : 1 }}>
                {deactivating ? 'Deactivating...' : 'Yes, deactivate'}
              </button>
              <button onClick={() => setShowDelete(false)}
                style={{ padding: '9px 20px', background: '#fff', color: '#6B7280', border: '1px solid #E5E7EB', borderRadius: 9, fontSize: 13, cursor: 'pointer' }}>
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
