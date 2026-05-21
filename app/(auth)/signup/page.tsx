'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

const BENEFITS = [
  { icon: '🔍', title: 'Diagnose what is breaking your growth', desc: 'From your real data — not guesswork or gut feel' },
  { icon: '⚡', title: 'Know exactly what to fix first', desc: 'Prioritised by impact, severity and business context' },
  { icon: '📈', title: 'Track if your fixes are working', desc: 'Every scan shows whether things improved or got worse' },
  { icon: '✨', title: 'Find where AI can save you 10+ hours a week', desc: 'Specific to your business — not generic suggestions' },
]

// ── Password strength ─────────────────────────────────────────
function getStrength(pw: string): { score: number; label: string; color: string } {
  if (pw.length === 0) return { score: 0, label: '', color: '#E5E7EB' }
  let score = 0
  if (pw.length >= 8)                          score++
  if (pw.length >= 12)                         score++
  if (/[0-9]/.test(pw))                        score++
  if (/[^a-zA-Z0-9]/.test(pw))                score++ // special char or space counts
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw))   score++

  if (score <= 1) return { score, label: 'Weak',   color: '#EF4444' }
  if (score <= 2) return { score, label: 'Fair',   color: '#F59E0B' }
  if (score <= 3) return { score, label: 'Good',   color: '#3B82F6' }
  return              { score, label: 'Strong', color: '#10B981' }
}

export default function SignupPage() {
  const router = useRouter()
  const [email, setEmail]               = useState('')
  const [password, setPassword]         = useState('')
  const [fullName, setFullName]         = useState('')
  const [businessName, setBusinessName] = useState('')
  const [loading, setLoading]           = useState(false)
  const [error, setError]               = useState('')
  const [emailSent, setEmailSent]       = useState(false)
  const [isResend, setIsResend]         = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const strength = getStrength(password)

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const trimmedEmail        = email.trim()
    const trimmedFullName     = fullName.trim()
    const trimmedBusinessName = businessName.trim()

    // Password: no trim — spaces are valid characters
    // Minimum strength check
    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      setLoading(false)
      return
    }

    if (strength.score < 2) {
      setError('Password is too weak. Add numbers, symbols, or make it longer.')
      setLoading(false)
      return
    }

    const supabase = createClient()

    const { data, error: signUpError } = await supabase.auth.signUp({
      email:    trimmedEmail,
      password, // no trim — preserve spaces as valid special characters
      options: {
        data:            { full_name: trimmedFullName, business_name: trimmedBusinessName },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      }
    })

    if (signUpError) {
      setError(signUpError.message)
      setLoading(false)
      return
    }

    if (!data.user) {
      setError('Something went wrong. Please try again.')
      setLoading(false)
      return
    }

    if (data.session) {
      // Email confirmation DISABLED — session exists immediately (local dev)
      const { error: founderError } = await supabase
        .from('founders')
        .insert({
          user_id:              data.user.id,
          email:                trimmedEmail,
          full_name:            trimmedFullName,
          business_name:        trimmedBusinessName,
          language:             'en',
          subscription_tier:    'free',
          subscription_status:  'active',
          account_status:       'active',
          onboarding_completed: false,
        })

      if (founderError) {
        console.error('Founder insert error:', founderError.message)
        // Not blocking — user still continues
      }

      router.push('/onboarding')
      setLoading(false)
      return
    }

    // Email confirmation ENABLED — no session yet (production)
    // Founder row created in /auth/callback after confirmation
    const isExistingUnconfirmed = data.user.created_at !== data.user.updated_at
    setIsResend(isExistingUnconfirmed)
    setEmailSent(true)
    setLoading(false)
  }

  // ── Email sent state ──
  if (emailSent) {
    return (
      <div style={{ minHeight: '100vh', background: '#F9FAFB', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, fontFamily: 'Inter, sans-serif' }}>
        <div style={{ maxWidth: 480, width: '100%', textAlign: 'center' }}>
          <div style={{ background: '#fff', borderRadius: 20, border: '1px solid #E5E7EB', padding: '48px 40px' }}>
            <div style={{ fontSize: 56, marginBottom: 20 }}>📬</div>
            <h2 style={{ fontSize: 24, fontWeight: 800, color: '#111827', marginBottom: 12 }}>
              {isResend ? 'Confirmation email resent' : 'Check your inbox'}
            </h2>
            <p style={{ fontSize: 15, color: '#6B7280', lineHeight: 1.6, marginBottom: 8 }}>
              {isResend ? 'We resent your confirmation link to' : 'We sent a confirmation link to'}
            </p>
            <p style={{ fontSize: 15, fontWeight: 700, color: '#111827', marginBottom: 24 }}>{email.trim()}</p>
            <p style={{ fontSize: 14, color: '#9CA3AF', lineHeight: 1.6, marginBottom: 28 }}>
              {isResend
                ? 'Your account details have been updated. Click the link to confirm your email and activate your account.'
                : 'Click the link in the email to activate your account and get your free business health score. Check your spam folder if you do not see it within 2 minutes.'}
            </p>
            <div style={{ background: '#F9FAFB', borderRadius: 12, padding: '16px 20px' }}>
              <p style={{ fontSize: 13, color: '#6B7280', margin: 0 }}>
                Wrong email?{' '}
                <button
                  onClick={() => setEmailSent(false)}
                  style={{ color: '#2563EB', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, padding: 0 }}
                >
                  Go back and change it
                </button>
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ── Signup form ──
  return (
    <div style={{ minHeight: '100vh', background: '#F9FAFB', display: 'flex', fontFamily: 'Inter, sans-serif' }}>

      {/* Left — value proposition */}
      <div style={{ flex: 1, background: '#1E1B4B', padding: '48px 56px', display: 'flex', flexDirection: 'column', justifyContent: 'center', minHeight: '100vh' }}>
        <div style={{ maxWidth: 460 }}>
          <a href="/" style={{ textDecoration: 'none' }}>
            <span style={{ fontSize: 28, fontWeight: 900, color: '#fff', letterSpacing: '-0.5px' }}>Elvanis</span>
          </a>
          <p style={{ fontSize: 13, color: '#A5B4FC', marginTop: 4, marginBottom: 48 }}>Business Health Platform</p>

          <h1 style={{ fontSize: 36, fontWeight: 900, color: '#fff', lineHeight: 1.2, marginBottom: 16, letterSpacing: '-0.5px' }}>
            Your business is telling you something.<br />
            <span style={{ color: '#818CF8' }}>Are you listening?</span>
          </h1>

          <p style={{ fontSize: 16, color: '#C7D2FE', lineHeight: 1.7, marginBottom: 48 }}>
            Elvanis reads your real operational data and tells you exactly what is breaking your growth — and what to fix first.
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

          <div style={{ marginTop: 48, paddingTop: 32, borderTop: '1px solid #312E81' }}>
            <p style={{ fontSize: 13, color: '#818CF8', margin: 0 }}>
              Built for founder-led startups in the <strong style={{ color: '#A5B4FC' }}>UK</strong> and <strong style={{ color: '#A5B4FC' }}>Gulf</strong> — B2B SaaS, e-commerce, and service businesses.
            </p>
          </div>
        </div>
      </div>

      {/* Right — form */}
      <div style={{ width: 480, flexShrink: 0, background: '#fff', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '48px 48px', overflowY: 'auto' }}>
        <div style={{ maxWidth: 380, width: '100%', margin: '0 auto' }}>
          <h2 style={{ fontSize: 24, fontWeight: 800, color: '#111827', marginBottom: 6 }}>
            Get your free health score
          </h2>
          <p style={{ fontSize: 14, color: '#6B7280', marginBottom: 32 }}>
            No credit card required · Takes 10 minutes
          </p>

          <form onSubmit={handleSignup} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Full name</label>
              <input
                type="text" value={fullName} onChange={e => setFullName(e.target.value)}
                required placeholder="Sally Abbas"
                style={{ width: '100%', padding: '11px 14px', border: '1.5px solid #E5E7EB', borderRadius: 10, fontSize: 14, color: '#111827', outline: 'none', boxSizing: 'border-box' as const, transition: 'border-color 0.15s' }}
                onFocus={e => e.target.style.borderColor = '#2563EB'}
                onBlur={e => e.target.style.borderColor = '#E5E7EB'}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Business name</label>
              <input
                type="text" value={businessName} onChange={e => setBusinessName(e.target.value)}
                required placeholder="Acme Corp"
                style={{ width: '100%', padding: '11px 14px', border: '1.5px solid #E5E7EB', borderRadius: 10, fontSize: 14, color: '#111827', outline: 'none', boxSizing: 'border-box' as const, transition: 'border-color 0.15s' }}
                onFocus={e => e.target.style.borderColor = '#2563EB'}
                onBlur={e => e.target.style.borderColor = '#E5E7EB'}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Work email</label>
              <input
                type="email" value={email} onChange={e => { setEmail(e.target.value); setError('') }}
                required placeholder="you@company.com"
                style={{ width: '100%', padding: '11px 14px', border: '1.5px solid #E5E7EB', borderRadius: 10, fontSize: 14, color: '#111827', outline: 'none', boxSizing: 'border-box' as const, transition: 'border-color 0.15s' }}
                onFocus={e => e.target.style.borderColor = '#2563EB'}
                onBlur={e => e.target.style.borderColor = '#E5E7EB'}
              />
            </div>

            {/* Password with strength indicator */}
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => { setPassword(e.target.value); setError('') }}
                  required
                  placeholder="At least 8 characters"
                  style={{ width: '100%', padding: '11px 44px 11px 14px', border: `1.5px solid ${password.length > 0 ? strength.color : '#E5E7EB'}`, borderRadius: 10, fontSize: 14, color: '#111827', outline: 'none', boxSizing: 'border-box' as const, transition: 'border-color 0.15s' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(s => !s)}
                  style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: '#9CA3AF', padding: 0, lineHeight: 1 }}
                >
                  {showPassword ? '🙈' : '👁'}
                </button>
              </div>

              {/* Strength bar */}
              {password.length > 0 && (
                <div style={{ marginTop: 8 }}>
                  <div style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
                    {[1, 2, 3, 4, 5].map(i => (
                      <div key={i} style={{
                        flex: 1, height: 3, borderRadius: 99,
                        background: i <= strength.score ? strength.color : '#E5E7EB',
                        transition: 'background 0.2s',
                      }} />
                    ))}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <p style={{ fontSize: 11, color: strength.color, fontWeight: 600, margin: 0 }}>{strength.label}</p>
                    <p style={{ fontSize: 11, color: '#9CA3AF', margin: 0 }}>
                      {strength.score < 2 ? 'Add numbers or symbols' :
                       strength.score < 4 ? 'Good — add more variety' :
                       'Strong password'}
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
                    Sign in instead →
                  </Link>
                )}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%', padding: '14px',
                background: '#2563EB', opacity: loading ? 0.7 : 1,
                color: '#fff', fontWeight: 700, borderRadius: 12, border: 'none',
                fontSize: 15, cursor: loading ? 'not-allowed' : 'pointer',
                marginTop: 4, transition: 'opacity 0.15s',
              }}
            >
              {loading ? 'Creating your account...' : 'Get my free health score →'}
            </button>

            <p style={{ fontSize: 11, color: '#9CA3AF', textAlign: 'center', margin: 0, lineHeight: 1.5 }}>
              By signing up you agree to our{' '}
              <Link href="/terms" style={{ color: '#6B7280', textDecoration: 'underline' }}>Terms of Service</Link>
              {' '}and{' '}
              <Link href="/privacy" style={{ color: '#6B7280', textDecoration: 'underline' }}>Privacy Policy</Link>
            </p>
          </form>

          <p style={{ textAlign: 'center', fontSize: 13, color: '#6B7280', marginTop: 28 }}>
            Already have an account?{' '}
            <Link href="/login" style={{ color: '#2563EB', fontWeight: 700, textDecoration: 'none' }}>Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
