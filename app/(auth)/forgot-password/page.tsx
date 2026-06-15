'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { getT } from '@/lib/translations'

export default function ForgotPasswordPage() {
  const [lang, setLang]       = useState<'en' | 'ar'>('en')
  const [email, setEmail]     = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent]       = useState(false)
  const [error, setError]     = useState('')

  const t    = getT(lang)
  const isAr = lang === 'ar'

  useEffect(() => {
    const saved = localStorage.getItem('preferred_lang')
    if (saved === 'ar' || saved === 'en') setLang(saved as 'en' | 'ar')
  }, [])

  function toggleLang() {
    const newLang = lang === 'en' ? 'ar' : 'en'
    setLang(newLang)
    localStorage.setItem('preferred_lang', newLang)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const trimmedEmail = email.trim()
    const supabase = createClient()
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(trimmedEmail, {
      redirectTo: `${window.location.origin}/callback?next=/reset-password`,
    })
    if (resetError) {
      setError(resetError.message)
      setLoading(false)
      return
    }
    setSent(true)
    setLoading(false)
  }

  if (sent) {
    return (
      <div dir={isAr ? 'rtl' : 'ltr'} style={{ minHeight: '100vh', background: '#F9FAFB', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, fontFamily: 'Inter, sans-serif' }}>
        <div style={{ maxWidth: 480, width: '100%', textAlign: 'center' }}>
          <div style={{ background: '#fff', borderRadius: 20, border: '1px solid #E5E7EB', padding: '48px 40px' }}>
            <div style={{ fontSize: 56, marginBottom: 20 }}>📬</div>
            <h2 style={{ fontSize: 24, fontWeight: 800, color: '#111827', marginBottom: 12 }}>{t('auth.reset_sent_title')}</h2>
            <p style={{ fontSize: 15, color: '#6B7280', lineHeight: 1.6, marginBottom: 8 }}>{t('auth.reset_sent_sub')}</p>
            <p style={{ fontSize: 15, fontWeight: 700, color: '#111827', marginBottom: 24 }}>{email.trim()}</p>
            <p style={{ fontSize: 13, color: '#9CA3AF', lineHeight: 1.6, marginBottom: 28 }}>{t('auth.reset_click')}</p>
            <Link href="/login" style={{ fontSize: 14, color: '#2563EB', fontWeight: 600, textDecoration: 'none' }}>
              {t('auth.back_to_signin')}
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div dir={isAr ? 'rtl' : 'ltr'} style={{ minHeight: '100vh', background: '#F9FAFB', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, fontFamily: 'Inter, sans-serif' }}>
      <div style={{ maxWidth: 440, width: '100%' }}>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <a href="/" style={{ textDecoration: 'none' }}>
            <span style={{ fontSize: 28, fontWeight: 900, color: '#2563EB', letterSpacing: '-0.5px' }}>Elvanis</span>
          </a>
          <button onClick={toggleLang} style={{ fontSize: 13, fontWeight: 600, color: '#2563EB', background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 8, padding: '6px 14px', cursor: 'pointer', fontFamily: 'inherit' }}>
            {isAr ? t('auth.switch_to_en') : t('auth.switch_to_ar')}
          </button>
        </div>
        <p style={{ fontSize: 13, color: '#9CA3AF', marginBottom: 24, textAlign: isAr ? 'right' : 'left' }}>
          {t('auth.brand_tagline')}</p>

        <div style={{ background: '#fff', borderRadius: 20, border: '1px solid #E5E7EB', padding: '40px 36px', boxShadow: '0 4px 24px rgba(0,0,0,0.04)' }}>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: '#111827', marginBottom: 8 }}>{t('auth.reset_password')}</h2>
          <p style={{ color: '#6B7280', fontSize: 14, marginBottom: 28, lineHeight: 1.5 }}>{t('auth.reset_sub')}</p>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {t('auth.email_address')}
              </label>
              <input type="email" value={email} onChange={e => { setEmail(e.target.value); setError('') }} required placeholder="you@company.com"
                style={{ width: '100%', padding: '11px 14px', border: '1.5px solid #E5E7EB', borderRadius: 10, fontSize: 14, outline: 'none', boxSizing: 'border-box' as const, transition: 'border-color 0.15s' }}
                onFocus={e => e.target.style.borderColor = '#2563EB'} onBlur={e => e.target.style.borderColor = '#E5E7EB'} />
            </div>

            {error && (
              <div style={{ background: error === 'no_account' ? '#FFFBEB' : '#FEF2F2', border: `1px solid ${error === 'no_account' ? '#FDE68A' : '#FECACA'}`, borderRadius: 10, padding: '12px 14px' }}>
                {error === 'no_account' ? (
                  <>
                    <p style={{ color: '#92400E', fontSize: 13, margin: '0 0 6px', fontWeight: 600 }}>{t('auth.no_account_found')}</p>
                    <p style={{ color: '#92400E', fontSize: 13, margin: '0 0 8px' }}>{t('auth.no_account_detail')}</p>
                    <a href="/signup" style={{ fontSize: 13, color: '#2563EB', fontWeight: 600, textDecoration: 'none' }}>{t('auth.create_free_account')}</a>
                  </>
                ) : (
                  <p style={{ color: '#DC2626', fontSize: 13, margin: 0 }}>{error}</p>
                )}
              </div>
            )}

            <button type="submit" disabled={loading}
              style={{ width: '100%', padding: '13px', background: '#2563EB', opacity: loading ? 0.7 : 1, color: '#fff', fontWeight: 700, borderRadius: 12, border: 'none', fontSize: 15, cursor: loading ? 'not-allowed' : 'pointer', transition: 'opacity 0.15s' }}>
              {loading ? t('auth.sending_reset') : t('auth.send_reset_cta')}
            </button>
          </form>

          <p style={{ textAlign: 'center', fontSize: 13, color: '#6B7280', marginTop: 20 }}>
            {t('auth.remember_password')}{' '}
            <Link href="/login" style={{ color: '#2563EB', fontWeight: 600, textDecoration: 'none' }}>{t('auth.sign_in')}</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
