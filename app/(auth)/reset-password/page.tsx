'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { getT } from '@/lib/translations'

export default function ResetPasswordPage() {
  const router = useRouter()
  const [lang, setLang]         = useState<'en' | 'ar'>('en')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm]   = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  const [done, setDone]         = useState(false)

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
    if (password !== confirm) { setError(t('auth.pw_mismatch')); return }
    if (password.length < 8)  { setError(t('auth.pw_error_short')); return }

    setLoading(true)
    setError('')

    const supabase = createClient()
    const { error: updateError } = await supabase.auth.updateUser({ password })

    if (updateError) {
      setError(updateError.message)
      setLoading(false)
      return
    }

    setDone(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: founder } = await supabase
        .from('founders')
        .select('onboarding_completed')
        .eq('user_id', user.id)
        .maybeSingle()

      const destination = (!founder || !founder.onboarding_completed) ? '/onboarding' : '/'
      setTimeout(() => router.push(destination), 2000)
      return
    }

    setTimeout(() => router.push('/'), 2000)
  }

  if (done) {
    return (
      <div dir={isAr ? 'rtl' : 'ltr'} style={{ minHeight: '100vh', background: '#F9FAFB', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, fontFamily: 'Inter, sans-serif' }}>
        <div style={{ maxWidth: 440, width: '100%', textAlign: 'center' }}>
          <div style={{ background: '#fff', borderRadius: 20, border: '1px solid #E5E7EB', padding: '48px 40px' }}>
            <div style={{ fontSize: 56, marginBottom: 20 }}>✅</div>
            <h2 style={{ fontSize: 22, fontWeight: 800, color: '#111827', marginBottom: 12 }}>{t('auth.password_updated')}</h2>
            <p style={{ fontSize: 14, color: '#6B7280' }}>{t('auth.redirecting')}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div dir={isAr ? 'rtl' : 'ltr'} style={{ minHeight: '100vh', background: '#F9FAFB', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, fontFamily: 'Inter, sans-serif' }}>
      <div style={{ maxWidth: 440, width: '100%' }}>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
          <a href="/" style={{ textDecoration: 'none' }}>
            <span style={{ fontSize: 28, fontWeight: 900, color: '#2563EB', letterSpacing: '-0.5px' }}>Elvanis</span>
          </a>
          <button onClick={toggleLang} style={{ fontSize: 13, fontWeight: 600, color: '#2563EB', background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 8, padding: '6px 14px', cursor: 'pointer', fontFamily: 'inherit' }}>
            {isAr ? t('auth.switch_to_en') : t('auth.switch_to_ar')}
          </button>
        </div>
        <p style={{ fontSize: 13, color: '#9CA3AF', marginBottom: 32 }}>{t('auth.brand_tagline')}</p>

        <div style={{ background: '#fff', borderRadius: 20, border: '1px solid #E5E7EB', padding: '40px 36px', boxShadow: '0 4px 24px rgba(0,0,0,0.04)' }}>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: '#111827', marginBottom: 8 }}>{t('auth.set_new_password')}</h2>
          <p style={{ color: '#6B7280', fontSize: 14, marginBottom: 28 }}>{t('auth.set_new_password_sub')}</p>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t('auth.new_password')}</label>
              <input type="password" value={password} onChange={e => { setPassword(e.target.value); setError('') }} required minLength={8}
                placeholder={t('auth.password_placeholder')}
                style={{ width: '100%', padding: '11px 14px', border: '1.5px solid #E5E7EB', borderRadius: 10, fontSize: 14, outline: 'none', boxSizing: 'border-box' as const, transition: 'border-color 0.15s' }}
                onFocus={e => e.target.style.borderColor = '#2563EB'} onBlur={e => e.target.style.borderColor = '#E5E7EB'} />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t('auth.confirm_password')}</label>
              <input type="password" value={confirm} onChange={e => { setConfirm(e.target.value); setError('') }} required
                placeholder={t('auth.confirm_placeholder')}
                style={{ width: '100%', padding: '11px 14px', border: '1.5px solid #E5E7EB', borderRadius: 10, fontSize: 14, outline: 'none', boxSizing: 'border-box' as const, transition: 'border-color 0.15s' }}
                onFocus={e => e.target.style.borderColor = '#2563EB'} onBlur={e => e.target.style.borderColor = '#E5E7EB'} />
            </div>

            {error && (
              <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 10, padding: '10px 14px' }}>
                <p style={{ color: '#DC2626', fontSize: 13, margin: 0 }}>{error}</p>
              </div>
            )}

            <button type="submit" disabled={loading}
              style={{ width: '100%', padding: '14px', background: '#2563EB', opacity: loading ? 0.7 : 1, color: '#fff', fontWeight: 700, borderRadius: 12, border: 'none', fontSize: 15, cursor: loading ? 'not-allowed' : 'pointer', transition: 'opacity 0.15s' }}>
              {loading ? t('auth.updating_password') : t('auth.set_password_cta')}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
