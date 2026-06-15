'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { getT } from '@/lib/translations'

function getStrength(pw: string): { score: number; labelKey: string; color: string } {
  if (pw.length === 0) return { score: 0, labelKey: '', color: '#E5E7EB' }
  let score = 0
  if (pw.length >= 8)                          score++
  if (pw.length >= 12)                         score++
  if (/[0-9]/.test(pw))                        score++
  if (/[^a-zA-Z0-9]/.test(pw))                score++
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw))   score++
  if (score <= 1) return { score, labelKey: 'auth.pw_weak',   color: '#EF4444' }
  if (score <= 2) return { score, labelKey: 'auth.pw_fair',   color: '#F59E0B' }
  if (score <= 3) return { score, labelKey: 'auth.pw_good',   color: '#3B82F6' }
  return              { score, labelKey: 'auth.pw_strong', color: '#10B981' }
}

export default function SignupPage() {
  const router = useRouter()
  const [lang, setLang]                 = useState<'en' | 'ar'>('en')
  const [email, setEmail]               = useState('')
  const [password, setPassword]         = useState('')
  const [fullName, setFullName]         = useState('')
  const [businessName, setBusinessName] = useState('')
  const [loading, setLoading]           = useState(false)
  const [error, setError]               = useState('')
  const [emailSent, setEmailSent]       = useState(false)
  const [isResend, setIsResend]         = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const t        = getT(lang)
  const strength = getStrength(password)
  const isAr     = lang === 'ar'

  useEffect(() => {
    const saved = localStorage.getItem('preferred_lang')
    if (saved === 'ar' || saved === 'en') setLang(saved as 'en' | 'ar')
    const savedEmail = localStorage.getItem('email_sent')
    if (savedEmail) {
      setEmail(savedEmail)
      setIsResend(localStorage.getItem('email_sent_resend') === 'true')
      setEmailSent(true)
    }
  }, [])

  function toggleLang() {
    const newLang = lang === 'en' ? 'ar' : 'en'
    setLang(newLang)
    localStorage.setItem('preferred_lang', newLang)
  }

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const trimmedEmail        = email.trim()
    const trimmedFullName     = fullName.trim()
    const trimmedBusinessName = businessName.trim()

    if (password.length < 8) {
      setError(t('auth.pw_error_short'))
      setLoading(false)
      return
    }

    if (strength.score < 2) {
      setError(t('auth.pw_error_weak'))
      setLoading(false)
      return
    }

    const supabase = createClient()

    const { data, error: signUpError } = await supabase.auth.signUp({
      email:    trimmedEmail,
      password,
      options: {
        data:            { full_name: trimmedFullName, business_name: trimmedBusinessName },
        emailRedirectTo: `${window.location.origin}/callback?lang=${lang}`,
      }
    })

    if (signUpError) {
      setError(signUpError.message)
      setLoading(false)
      return
    }

    if (!data.user) {
      setError(t('auth.error_generic'))
      setLoading(false)
      return
    }

    if (data.session) {
      const { error: founderError } = await supabase
        .from('founders')
        .insert({
          user_id:              data.user.id,
          email:                trimmedEmail,
          full_name:            trimmedFullName,
          business_name:        trimmedBusinessName,
          language:             lang,
          subscription_tier:    'free',
          subscription_status:  'active',
          account_status:       'active',
          onboarding_completed: false,
        })

      if (founderError) {
        console.error('Founder insert error:', founderError.message)
      }

      localStorage.removeItem('preferred_lang')
      router.push('/onboarding')
      setLoading(false)
      return
    }

    const isExistingUnconfirmed = data.user.created_at !== data.user.updated_at
    localStorage.setItem('email_sent', email.trim())
    localStorage.setItem('email_sent_resend', String(isExistingUnconfirmed))
    setIsResend(isExistingUnconfirmed)
    setEmailSent(true)
    setLoading(false)
  }

  const BENEFITS = [
    { icon: '🔍', title: t('auth.benefit_1_title'), desc: t('auth.benefit_1_desc') },
    { icon: '⚡', title: t('auth.benefit_2_title'), desc: t('auth.benefit_2_desc') },
    { icon: '📈', title: t('auth.benefit_3_title'), desc: t('auth.benefit_3_desc') },
    { icon: '✨', title: t('auth.benefit_4_title'), desc: t('auth.benefit_4_desc') },
  ]

  if (emailSent) {
    return (
      <div dir={isAr ? 'rtl' : 'ltr'} style={{ minHeight: '100vh', background: '#F9FAFB', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, fontFamily: 'Inter, sans-serif' }}>
        <div style={{ maxWidth: 480, width: '100%', textAlign: 'center' }}>
          <div style={{ background: '#fff', borderRadius: 20, border: '1px solid #E5E7EB', padding: '48px 40px' }}>
            <div style={{ fontSize: 56, marginBottom: 20 }}>📬</div>
            <h2 style={{ fontSize: 24, fontWeight: 800, color: '#111827', marginBottom: 12 }}>
              {isResend ? t('auth.confirmation_resent') : t('auth.check_inbox')}
            </h2>
            <p style={{ fontSize: 15, color: '#6B7280', lineHeight: 1.6, marginBottom: 8 }}>
              {isResend ? t('auth.resent_link_to') : t('auth.sent_link_to')}
            </p>
            <p style={{ fontSize: 15, fontWeight: 700, color: '#111827', marginBottom: 24 }}>{email.trim()}</p>
            <p style={{ fontSize: 14, color: '#9CA3AF', lineHeight: 1.6, marginBottom: 28 }}>
              {isResend ? t('auth.confirm_resent_note') : t('auth.confirm_click')}
            </p>
            <div style={{ background: '#F9FAFB', borderRadius: 12, padding: '16px 20px' }}>
              <p style={{ fontSize: 13, color: '#6B7280', margin: 0 }}>
                {t('auth.wrong_email')}{' '}
                <button
                      onClick={() => { setEmailSent(false); 
                    localStorage.removeItem('email_sent'); 
                    localStorage.removeItem('email_sent_resend') }}
                  style={{ color: '#2563EB', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, padding: 0 }}
                >
                  {t('auth.go_back_change')}
                </button>
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="auth-layout" dir={isAr ? 'rtl' : 'ltr'} style={{ background: '#F9FAFB' }}>

      {/* Left — brand panel */}
      <div className="auth-brand-panel">
        <div style={{ maxWidth: 460 }}>
          <a href="/" style={{ textDecoration: 'none' }}>
            <span style={{ fontSize: 28, fontWeight: 900, color: '#fff', letterSpacing: '-0.5px' }}>Elvanis</span>
          </a>
          <p style={{ fontSize: 13, color: '#A5B4FC', marginTop: 4, marginBottom: 48 }}>{t('auth.brand_tagline')}</p>

          <h1 style={{ fontSize: 36, fontWeight: 900, color: '#fff', lineHeight: 1.2, marginBottom: 16, letterSpacing: '-0.5px' }}>
            {t('auth.brand_headline_signup')}<br />
            <span style={{ color: '#818CF8' }}>{t('auth.brand_headline_sub')}</span>
          </h1>

          <p style={{ fontSize: 16, color: '#C7D2FE', lineHeight: 1.7, marginBottom: 48 }}>
            {t('auth.brand_sub_signup')}
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {BENEFITS.map(b => (
              <div key={b.title} style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                <span style={{ fontSize: 22, flexShrink: 0, marginTop: 2 }}>{b.icon}</span>
                <div>
                  <p style={{ fontSize: 15, fontWeight: 700, color: '#fff', margin: '0 0 3px' }}>{b.title}</p>
                  <p style={{ fontSize: 13, color: '#A5B4FC', margin: 0, lineHeight: 1.5 }}>{b.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 48, paddingTop: 32, borderTop: '1px solid #312E81' }} />
        </div>
      </div>

      {/* Right — form */}
      <div className="auth-form-panel">
        <div style={{ maxWidth: 380, width: '100%', margin: '0 auto' }}>

          {/* Language toggle */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 20 }}>
            <button
              onClick={toggleLang}
              style={{ fontSize: 13, fontWeight: 600, color: '#2563EB', background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 8, padding: '6px 14px', cursor: 'pointer', fontFamily: 'inherit' }}
            >
              {isAr ? t('auth.switch_to_en') : t('auth.switch_to_ar')}
            </button>
          </div>

          {/* Mobile logo */}
          <div className="auth-mobile-logo" style={{ display: 'none', marginBottom: 28 }}>
            <a href="/" style={{ textDecoration: 'none' }}>
              <span style={{ fontSize: 26, fontWeight: 900, color: '#2563EB', letterSpacing: '-0.5px' }}>Elvanis</span>
            </a>
          </div>

          <h2 style={{ fontSize: 24, fontWeight: 800, color: '#111827', marginBottom: 6 }}>
            {t('auth.get_free_score')}
          </h2>
          <p style={{ fontSize: 14, color: '#6B7280', marginBottom: 32 }}>
            {t('auth.no_credit_card')}
          </p>

          <form onSubmit={handleSignup} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t('auth.full_name')}</label>
              <input type="text" value={fullName} onChange={e => setFullName(e.target.value)} required placeholder="Sally Abbas"
                style={{ width: '100%', padding: '11px 14px', border: '1.5px solid #E5E7EB', borderRadius: 10, fontSize: 14, color: '#111827', outline: 'none', boxSizing: 'border-box' as const, transition: 'border-color 0.15s' }}
                onFocus={e => e.target.style.borderColor = '#2563EB'} onBlur={e => e.target.style.borderColor = '#E5E7EB'} />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t('auth.business_name')}</label>
              <input type="text" value={businessName} onChange={e => setBusinessName(e.target.value)} required placeholder="Acme Corp"
                style={{ width: '100%', padding: '11px 14px', border: '1.5px solid #E5E7EB', borderRadius: 10, fontSize: 14, color: '#111827', outline: 'none', boxSizing: 'border-box' as const, transition: 'border-color 0.15s' }}
                onFocus={e => e.target.style.borderColor = '#2563EB'} onBlur={e => e.target.style.borderColor = '#E5E7EB'} />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t('auth.work_email')}</label>
              <input type="email" value={email} onChange={e => { setEmail(e.target.value); setError('') }} required placeholder="you@company.com"
                style={{ width: '100%', padding: '11px 14px', border: '1.5px solid #E5E7EB', borderRadius: 10, fontSize: 14, color: '#111827', outline: 'none', boxSizing: 'border-box' as const, transition: 'border-color 0.15s' }}
                onFocus={e => e.target.style.borderColor = '#2563EB'} onBlur={e => e.target.style.borderColor = '#E5E7EB'} />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t('auth.password')}</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => { setPassword(e.target.value); setError('') }}
                  required
                  placeholder={t('auth.password_placeholder')}
                  style={{ width: '100%', padding: '11px 44px 11px 14px', border: `1.5px solid ${password.length > 0 ? strength.color : '#E5E7EB'}`, borderRadius: 10, fontSize: 14, color: '#111827', outline: 'none', boxSizing: 'border-box' as const, transition: 'border-color 0.15s' }}
                />
                <button type="button" onClick={() => setShowPassword(s => !s)}
                  style={{ position: 'absolute', [isAr ? 'left' : 'right']: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: '#9CA3AF', padding: 0, lineHeight: 1 }}>
                  {showPassword ? '🙈' : '👁'}
                </button>
              </div>
              {password.length > 0 && (
                <div style={{ marginTop: 8 }}>
                  <div style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
                    {[1, 2, 3, 4, 5].map(i => (
                      <div key={i} style={{ flex: 1, height: 3, borderRadius: 99, background: i <= strength.score ? strength.color : '#E5E7EB', transition: 'background 0.2s' }} />
                    ))}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <p style={{ fontSize: 11, color: strength.color, fontWeight: 600, margin: 0 }}>{strength.labelKey ? t(strength.labelKey as Parameters<typeof t>[0]) : ''}</p>
                    <p style={{ fontSize: 11, color: '#9CA3AF', margin: 0 }}>
                      {strength.score < 2 ? t('auth.pw_hint_add') : strength.score < 4 ? t('auth.pw_hint_variety') : t('auth.pw_hint_strong')}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {error && (
              <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 10, padding: '10px 14px' }}>
                <p style={{ color: '#DC2626', fontSize: 13, margin: 0 }}>{error}</p>
                {error.toLowerCase().includes('already') && (
                  <Link href="/login" style={{ color: '#2563EB', fontSize: 13, fontWeight: 600, textDecoration: 'none', display: 'block', marginTop: 6 }}>
                    {t('auth.sign_in_instead')}
                  </Link>
                )}
              </div>
            )}

            <button type="submit" disabled={loading}
              style={{ width: '100%', padding: '14px', background: '#2563EB', opacity: loading ? 0.7 : 1, color: '#fff', fontWeight: 700, borderRadius: 12, border: 'none', fontSize: 15, cursor: loading ? 'not-allowed' : 'pointer', marginTop: 4, transition: 'opacity 0.15s' }}>
              {loading ? t('auth.creating_account') : t('auth.get_score_cta')}
            </button>

            <p style={{ fontSize: 11, color: '#9CA3AF', textAlign: 'center', margin: 0, lineHeight: 1.5 }}>
              {t('auth.terms_agree')}{' '}
              <Link href="/terms" style={{ color: '#6B7280', textDecoration: 'underline' }}>{t('auth.terms')}</Link>
              {' '}{isAr ? 'و' : 'and'}{' '}
              <Link href="/privacy" style={{ color: '#6B7280', textDecoration: 'underline' }}>{t('auth.privacy')}</Link>
            </p>
          </form>

          <p style={{ textAlign: 'center', fontSize: 13, color: '#6B7280', marginTop: 28 }}>
            {t('auth.already_account')}{' '}
            <Link href="/login" style={{ color: '#2563EB', fontWeight: 700, textDecoration: 'none' }}>{t('auth.sign_in')}</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
