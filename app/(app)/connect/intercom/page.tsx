'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { useT, useLang } from '@/app/context/LanguageContext'

function IntercomContent() {
  const t          = useT()
  const lang       = useLang()
  const isAr       = lang === 'ar'
  const searchParams = useSearchParams()
  const urlError   = searchParams.get('error')

  return (
    <main dir={isAr ? 'rtl' : 'ltr'} style={{ minHeight: '100vh', background: '#F9FAFB', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter, sans-serif', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 480 }}>
        <a href="/connect" style={{ fontSize: 13, color: '#6B7280', textDecoration: 'none', display: 'block', marginBottom: 24 }}>
          {t('connect.back')}
        </a>
        <div style={{ background: '#fff', borderRadius: 20, border: '1px solid #E5E7EB', padding: '36px 32px' }}>
          <div style={{ width: 56, height: 56, borderRadius: 14, background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, marginBottom: 20 }}>💬</div>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: '#111827', marginBottom: 8 }}>{t('connect.intercom_title')}</h2>
          <p style={{ fontSize: 14, color: '#6B7280', marginBottom: 24, lineHeight: 1.6 }}>{t('connect.intercom_sub')}</p>

          <div style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 12, padding: '14px 16px', marginBottom: 28 }}>
            <p style={{ fontSize: 13, color: '#1D4ED8', margin: '0 0 8px', fontWeight: 600 }}>{t('connect.intercom_what_we_read')}</p>
            <ul style={{ fontSize: 13, color: '#2563EB', margin: 0, paddingInlineStart: 20, lineHeight: 1.8 }}>
              <li>{t('connect.intercom_bullet_1')}</li>
              <li>{t('connect.intercom_bullet_2')}</li>
              <li>{t('connect.intercom_bullet_3')}</li>
              <li>{t('connect.intercom_bullet_4')}</li>
              <li>{t('connect.intercom_bullet_5')}</li>
              <li>{t('connect.intercom_bullet_6')}</li>
            </ul>
          </div>

          {urlError && (
            <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 10, padding: '10px 14px', marginBottom: 20 }}>
              <p style={{ color: '#DC2626', fontSize: 13, margin: 0 }}>
                {urlError === 'token_failed' ? t('connect.intercom_err_token') :
                 urlError === 'no_code'      ? t('connect.intercom_err_no_code') :
                 t('connect.intercom_err_generic')}
              </p>
            </div>
          )}

          <a href="/api/auth/intercom" style={{ display: 'block', padding: '14px', background: '#1F8EFF', color: '#fff', border: 'none', borderRadius: 12, fontSize: 15, fontWeight: 700, cursor: 'pointer', textDecoration: 'none', textAlign: 'center', boxSizing: 'border-box' as const }}>
            {t('connect.intercom_cta')}
          </a>
          <p style={{ fontSize: 12, color: '#9CA3AF', textAlign: 'center', marginTop: 16 }}>{t('connect.intercom_read_only')}</p>
        </div>
      </div>
    </main>
  )
}

export default function ConnectIntercomPage() {
  return (
   <Suspense fallback={<div style={{ minHeight: '100vh', background: '#F9FAFB', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6B7280' }}>Loading...</div>}>
      <IntercomContent />
    </Suspense>
  )
}
