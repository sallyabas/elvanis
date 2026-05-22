'use client'

import { useEffect } from 'react'
import Link from 'next/link'

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[Elvanis] route error:', error)
  }, [error])

  return (
    <main style={{ minHeight: '100vh', background: '#F9FAFB', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter, sans-serif', padding: 24 }}>
      <div style={{ maxWidth: 480, width: '100%', textAlign: 'center' }}>

        <Link href="/" style={{ textDecoration: 'none' }}>
          <span style={{ fontSize: 24, fontWeight: 900, color: '#2563EB', letterSpacing: '-0.5px' }}>Elvanis</span>
        </Link>

        <div style={{ background: '#fff', borderRadius: 20, border: '1px solid #E5E7EB', padding: '48px 40px', marginTop: 32 }}>
          <div style={{ fontSize: 52, marginBottom: 20 }}>⚠️</div>

          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#111827', marginBottom: 12 }}>
            Something went wrong
          </h1>

          <p style={{ fontSize: 15, color: '#6B7280', lineHeight: 1.7, marginBottom: 32 }}>
            We hit an unexpected error. Your data is safe — this is a temporary issue on our end.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <button
              onClick={reset}
              style={{
                display: 'block', width: '100%', padding: '14px',
                background: '#2563EB', color: '#fff',
                border: 'none', borderRadius: 12, fontSize: 15, fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Try again →
            </button>

            <Link
              href="/dashboard"
              style={{
                display: 'block', padding: '13px',
                background: '#F9FAFB', color: '#374151',
                border: '1px solid #E5E7EB',
                borderRadius: 12, fontSize: 14, fontWeight: 500,
                textDecoration: 'none',
              }}
            >
              Go to dashboard
            </Link>

            <a
              href="mailto:support@elvanis.com"
              style={{
                display: 'block', padding: '12px',
                background: 'transparent', color: '#9CA3AF',
                border: 'none', borderRadius: 12, fontSize: 13,
                textDecoration: 'none',
              }}
            >
              Contact support
            </a>
          </div>

          {error.digest && (
            <p style={{ fontSize: 11, color: '#D1D5DB', marginTop: 24, fontFamily: 'monospace' }}>
              Error ID: {error.digest}
            </p>
          )}
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
