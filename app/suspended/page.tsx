import Link from 'next/link'

export default function SuspendedPage() {
  return (
    <main style={{ minHeight: '100vh', background: '#F9FAFB', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter, sans-serif', padding: 24 }}>
      <div style={{ maxWidth: 480, width: '100%', textAlign: 'center' }}>

        {/* Logo */}
        <Link href="/" style={{ textDecoration: 'none' }}>
          <span style={{ fontSize: 24, fontWeight: 900, color: '#2563EB', letterSpacing: '-0.5px' }}>Elvanis</span>
        </Link>

        <div style={{ background: '#fff', borderRadius: 20, border: '1px solid #E5E7EB', padding: '48px 40px', marginTop: 32 }}>
          <div style={{ fontSize: 52, marginBottom: 20 }}>🔒</div>

          <h1 style={{ fontSize: 24, fontWeight: 800, color: '#111827', marginBottom: 12 }}>
            Your account has been suspended
          </h1>

          <p style={{ fontSize: 15, color: '#6B7280', lineHeight: 1.7, marginBottom: 8 }}>
            Access to your Elvanis account has been temporarily suspended.
          </p>

          <p style={{ fontSize: 15, color: '#6B7280', lineHeight: 1.7, marginBottom: 32 }}>
            This may be due to a billing issue or a policy concern. Your data is safe and will be retained while your account is suspended.
          </p>

          {/* Actions */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <a
              href="mailto:support@elvanis.com"
              style={{
                display: 'block', padding: '14px',
                background: '#2563EB', color: '#fff',
                borderRadius: 12, fontSize: 15, fontWeight: 700,
                textDecoration: 'none', transition: 'opacity 0.15s',
              }}
            >
              Contact support →
            </a>

            <Link
              href="/login"
              style={{
                display: 'block', padding: '13px',
                background: '#F9FAFB', color: '#6B7280',
                border: '1px solid #E5E7EB',
                borderRadius: 12, fontSize: 14, fontWeight: 500,
                textDecoration: 'none',
              }}
            >
              Sign in with a different account
            </Link>
          </div>
        </div>

        <p style={{ fontSize: 13, color: '#9CA3AF', marginTop: 24 }}>
          © 2026 Elvanis ·{' '}
          <Link href="/terms" style={{ color: '#6B7280', textDecoration: 'none' }}>Terms</Link>
          {' '}·{' '}
          <Link href="/privacy" style={{ color: '#6B7280', textDecoration: 'none' }}>Privacy</Link>
        </p>
      </div>
    </main>
  )
}
