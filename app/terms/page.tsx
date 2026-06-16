'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { terms } from '@/content/legal/terms'

export default function TermsPage() {
  const [lang, setLang] = useState<'en' | 'ar'>('en')

  useEffect(() => {
    const saved = localStorage.getItem('preferred_lang')
    if (saved === 'ar' || saved === 'en') setLang(saved)
  }, [])

  const c    = terms[lang]
  const isAr = lang === 'ar'

  return (
    <main dir={isAr ? 'rtl' : 'ltr'} style={{ minHeight: '100vh', background: '#F9FAFB', fontFamily: 'Inter, sans-serif' }}>
      <nav style={{ background: '#fff', borderBottom: '1px solid #E5E7EB', padding: '0 32px' }}>
        <div style={{ maxWidth: 800, margin: '0 auto', height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Link href="/" style={{ fontSize: 20, fontWeight: 900, color: '#2563EB', textDecoration: 'none', letterSpacing: '-0.5px' }}>Elvanis</Link>
          <Link href="/signup" style={{ fontSize: 14, color: '#6B7280', textDecoration: 'none' }}>{c.back}</Link>
        </div>
      </nav>

      <div style={{ maxWidth: 800, margin: '0 auto', padding: '56px 32px' }}>
        <h1 style={{ fontSize: 36, fontWeight: 900, color: '#0F172A', marginBottom: 8, letterSpacing: '-1px' }}>{c.title}</h1>
        <p style={{ fontSize: 14, color: '#94A3B8', marginBottom: 48 }}>{c.updated}</p>

        {c.sections.map(section => (
          <div key={section.title} style={{ marginBottom: 36 }}>
            <h2 style={{ fontSize: 17, fontWeight: 700, color: '#0F172A', marginBottom: 10 }}>{section.title}</h2>
            <p style={{ fontSize: 15, color: '#475569', lineHeight: 1.8, margin: 0 }}>{section.body}</p>
          </div>
        ))}

        <div style={{ borderTop: '1px solid #E2E8F0', paddingTop: 32, marginTop: 16 }}>
          <p style={{ fontSize: 13, color: '#94A3B8' }}>
            {c.footer} ·{' '}
            <Link href="/privacy" style={{ color: '#2563EB', textDecoration: 'none' }}>{c.privacy_link}</Link>
          </p>
        </div>
      </div>
    </main>
  )
}
