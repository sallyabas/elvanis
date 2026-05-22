'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

export default function LoginPage() {
  const router  = useRouter()
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  const [resendSent, setResendSent] = useState(false)
  const [resending, setResending]   = useState(false)

  const isUnconfirmed = error.toLowerCase().includes('email not confirmed')

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    setResendSent(false)

    const supabase = createClient()
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email:    email.trim(),
      password,
    })

    if (signInError) {
      setError(signInError.message)
      setLoading(false)
      return
    }

    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: founder } = await supabase
        .from('founders')
        .select('onboarding_completed')
        .eq('user_id', user.id)
        .maybeSingle()

      if (!founder) {
        const fullName     = (user.user_metadata?.full_name     as string | undefined)?.trim() ?? ''
        const businessName = (user.user_metadata?.business_name as string | undefined)?.trim() ?? ''
        await supabase.from('founders').insert({
          user_id:              user.id,
          email:                user.email ?? '',
          full_name:            fullName,
          business_name:        businessName,
          language:             'en',
          subscription_tier:    'free',
          subscription_status:  'inactive',
          onboarding_completed: false,
        })
        router.push('/onboarding')
        return
      }

      if (!founder.onboarding_completed) {
        router.push('/onboarding')
        return
      }
    }

    router.push('/dashboard')
    router.refresh()
  }

  async function handleResendConfirmation() {
    setResending(true)
    const supabase = createClient()
    await supabase.auth.resend({ type: 'signup', email: email.trim() })
    setResendSent(true)
    setResending(false)
  }

  return (
    <div className="auth-layout" style={{ background: '#F9FAFB' }}>

      {/* Left — brand panel (hidden on mobile) */}
      <div className="auth-brand-panel">
        <div style={{ maxWidth: 460 }}>
          <a href="/" style={{ textDecoration: 'none' }}>
            <span style={{ fontSize: 28, fontWeight: 900, color: '#fff', letterSpacing: '-0.5px' }}>Elvanis</span>
          </a>
          <p style={{ fontSize: 13, color: '#A5B4FC', marginTop: 4, marginBottom: 56 }}>Business Health Platform</p>

          <h2 style={{ fontSize: 32, fontWeight: 900, color: '#fff', lineHeight: 1.25, marginBottom: 16, letterSpacing: '-0.5px' }}>
            Your signals are waiting.<br />
            <span style={{ color: '#818CF8' }}>Let us show you what changed.</span>
          </h2>

          <p style={{ fontSize: 15, color: '#C7D2FE', lineHeight: 1.7, marginBottom: 48 }}>
            Sign in to see your latest business health score, active signals, and what to fix first.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {[
              { icon: '🔍', text: 'Real signals from your connected tools' },
              { icon: '⚡', text: 'Prioritised actions updated every scan' },
              { icon: '📈', text: 'Track whether your fixes are working' },
              { icon: '✨', text: 'AI opportunities specific to your business' },
            ].map(item => (
              <div key={item.text} style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
                <span style={{ fontSize: 20, flexShrink: 0 }}>{item.icon}</span>
                <p style={{ fontSize: 14, color: '#C7D2FE', margin: 0 }}>{item.text}</p>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 56, paddingTop: 28, borderTop: '1px solid #312E81' }}>
            <p style={{ fontSize: 13, color: '#818CF8', margin: 0 }}>
              New to Elvanis?{' '}
              <a href="/signup" style={{ color: '#A5B4FC', fontWeight: 700, textDecoration: 'none' }}>
                Get your free health score →
              </a>
            </p>
          </div>
        </div>
      </div>

      {/* Right — login form */}
      <div className="auth-form-panel">
        <div style={{ maxWidth: 380, width: '100%', margin: '0 auto' }}>

          {/* Mobile logo — only shows on mobile */}
          <div className="auth-mobile-logo" style={{ display: 'none', marginBottom: 28 }}>
            <a href="/" style={{ textDecoration: 'none' }}>
              <span style={{ fontSize: 26, fontWeight: 900, color: '#2563EB', letterSpacing: '-0.5px' }}>Elvanis</span>
            </a>
          </div>

          <h1 style={{ fontSize: 24, fontWeight: 800, color: '#111827', marginBottom: 6 }}>
            Welcome back
          </h1>
          <p style={{ fontSize: 14, color: '#6B7280', marginBottom: 36 }}>
            Sign in to your Elvanis account
          </p>

          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Email address
              </label>
              <input
                type="email"
                value={email}
                onChange={e => { setEmail(e.target.value); setError(''); setResendSent(false) }}
                required
                placeholder="you@company.com"
                style={{ width: '100%', padding: '11px 14px', border: '1.5px solid #E5E7EB', borderRadius: 10, fontSize: 14, color: '#111827', outline: 'none', boxSizing: 'border-box' as const, transition: 'border-color 0.15s' }}
                onFocus={e => e.target.style.borderColor = '#2563EB'}
                onBlur={e => e.target.style.borderColor = '#E5E7EB'}
              />
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Password
                </label>
                <a href="/forgot-password" style={{ fontSize: 12, color: '#6B7280', textDecoration: 'none', fontWeight: 500 }}>
                  Forgot password?
                </a>
              </div>
              <input
                type="password"
                value={password}
                onChange={e => { setPassword(e.target.value); setError('') }}
                required
                placeholder="Your password"
                style={{ width: '100%', padding: '11px 14px', border: '1.5px solid #E5E7EB', borderRadius: 10, fontSize: 14, color: '#111827', outline: 'none', boxSizing: 'border-box' as const, transition: 'border-color 0.15s' }}
                onFocus={e => e.target.style.borderColor = '#2563EB'}
                onBlur={e => e.target.style.borderColor = '#E5E7EB'}
              />
            </div>

            {error && (
              <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 10, padding: '12px 14px' }}>
                <p style={{ color: '#DC2626', fontSize: 13, margin: 0 }}>
                  {isUnconfirmed
                    ? 'Your email has not been confirmed yet. Please check your inbox or resend the confirmation.'
                    : error}
                </p>
                {isUnconfirmed && (
                  <button
                    type="button"
                    onClick={handleResendConfirmation}
                    disabled={resending || resendSent}
                    style={{ marginTop: 8, fontSize: 13, color: '#2563EB', fontWeight: 600, background: 'none', border: 'none', cursor: resending || resendSent ? 'default' : 'pointer', padding: 0 }}
                  >
                    {resendSent ? '✓ Confirmation email sent' : resending ? 'Sending...' : 'Resend confirmation email →'}
                  </button>
                )}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%', padding: '14px',
                background: '#2563EB',
                opacity: loading ? 0.7 : 1,
                color: '#fff', fontWeight: 700, borderRadius: 12, border: 'none',
                fontSize: 15, cursor: loading ? 'not-allowed' : 'pointer',
                marginTop: 4, transition: 'opacity 0.15s',
              }}
            >
              {loading ? 'Signing in...' : 'Sign in →'}
            </button>

          </form>

          <p style={{ textAlign: 'center', fontSize: 13, color: '#6B7280', marginTop: 28 }}>
            No account yet?{' '}
            <Link href="/signup" style={{ color: '#2563EB', fontWeight: 700, textDecoration: 'none' }}>
              Get your free health score
            </Link>
          </p>

        </div>
      </div>
    </div>
  )
}
