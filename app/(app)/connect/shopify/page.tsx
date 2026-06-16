'use client'

import { Suspense, useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { useT, useLang } from '@/app/context/LanguageContext'

function ConnectShopifyContent() {
  const t             = useT()
  const lang          = useLang()
  const isAr          = lang === 'ar'
  const [shop, setShop]       = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')
  const searchParams          = useSearchParams()
  const urlError              = searchParams.get('error')

  useEffect(() => { setLoading(false) }, [])

  useEffect(() => {
    const handlePageShow = (e: PageTransitionEvent) => {
      if (e.persisted) setLoading(false)
    }
    window.addEventListener('pageshow', handlePageShow)
    return () => window.removeEventListener('pageshow', handlePageShow)
  }, [])

  function validateAndConnect() {
    if (!shop.trim()) return
    setError('')
    let cleanShop = shop.trim().toLowerCase()

    if (cleanShop.includes('admin.shopify.com/store/')) {
      const match: RegExpMatchArray | null = cleanShop.match(/admin\.shopify\.com\/store\/([a-zA-Z0-9-]+)/)
      if (match && typeof match[1] === 'string') {
        cleanShop = match[1]
      } else {
        setError(t('connect.shopify_err_url'))
        return
      }
    } else {
      cleanShop = cleanShop
        .replace('https://', '')
        .replace('http://', '')
        .replace('.myshopify.com', '')
        .split('/')[0]
        .replace(/\s+/g, '')
    }

    if (!cleanShop || cleanShop.length < 2) {
      setError(t('connect.shopify_err_extract'))
      return
    }

    if (!/^[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]$/.test(cleanShop)) {
      setError(t('connect.shopify_err_format'))
      return
    }

    const appBaseUrl      = process.env.NEXT_PUBLIC_APP_URL || window.location.origin
    const clientId        = process.env.NEXT_PUBLIC_SHOPIFY_CLIENT_ID
    const redirectUri     = `${appBaseUrl}/api/auth/shopify/callback`
    const scopes          = 'read_orders,read_customers,read_products,read_inventory,read_analytics'
    const encodedRedirect = encodeURIComponent(redirectUri)

    setLoading(true)
    window.location.href = `https://${cleanShop}.myshopify.com/admin/oauth/authorize?client_id=${clientId}&scope=${scopes}&redirect_uri=${encodedRedirect}`
    setTimeout(() => setLoading(false), 4000)
  }

  const errorMessage = error || (
    urlError === 'invalid_url'    ? t('connect.shopify_err_invalid_url') :
    urlError === 'token_failed'   ? t('connect.shopify_err_token') :
    urlError === 'shopify_failed' ? t('connect.shopify_err_failed') :
    urlError                      ? t('connect.shopify_err_generic') :
    ''
  )

  return (
    <main dir={isAr ? 'rtl' : 'ltr'} style={{ minHeight: '100vh', background: '#F9FAFB', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter, sans-serif', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 480 }}>
        <a href="/connect" style={{ fontSize: 13, color: '#6B7280', textDecoration: 'none', display: 'block', marginBottom: 24 }}>
          {t('connect.back')}
        </a>
        <div style={{ background: '#fff', borderRadius: 20, border: '1px solid #E5E7EB', padding: '36px 32px' }}>
          <div style={{ width: 56, height: 56, borderRadius: 14, background: '#F3F9E8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, marginBottom: 20 }}>🛍️</div>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: '#111827', marginBottom: 8 }}>{t('connect.shopify_title')}</h2>
          <p style={{ fontSize: 14, color: '#6B7280', marginBottom: 28, lineHeight: 1.6 }}>{t('connect.shopify_sub')}</p>

          <div style={{ background: '#F3F9E8', border: '1px solid #D1FAE5', borderRadius: 12, padding: '14px 16px', marginBottom: 24 }}>
            <p style={{ fontSize: 13, color: '#065F46', margin: '0 0 6px', fontWeight: 600 }}>{t('connect.shopify_what_we_read')}</p>
            <ul style={{ fontSize: 13, color: '#059669', margin: 0, paddingInlineStart: 20, lineHeight: 1.8 }}>
              <li>{t('connect.shopify_bullet_1')}</li>
              <li>{t('connect.shopify_bullet_2')}</li>
              <li>{t('connect.shopify_bullet_3')}</li>
              <li>{t('connect.shopify_bullet_4')}</li>
              <li>{t('connect.shopify_bullet_5')}</li>
            </ul>
          </div>

          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
            {t('connect.shopify_store_label')}
          </label>

          <div style={{ display: 'flex', alignItems: 'center', border: `1.5px solid ${errorMessage ? '#FECACA' : '#E5E7EB'}`, borderRadius: 10, marginBottom: 8, overflow: 'hidden', background: '#fff' }}>
            <input
              type="text"
              value={shop}
              onChange={e => { setShop(e.target.value); setError('') }}
              placeholder="mystore"
              onKeyDown={e => e.key === 'Enter' && validateAndConnect()}
              style={{ flex: 1, padding: '12px 14px', border: 'none', fontSize: 15, outline: 'none', minWidth: 0, fontFamily: 'Inter, sans-serif' }}
            />
            <span style={{ padding: '12px 14px', background: '#F9FAFB', color: '#9CA3AF', fontSize: 13, borderLeft: '1px solid #E5E7EB', whiteSpace: 'nowrap' }}>
              .myshopify.com
            </span>
          </div>

          <p style={{ fontSize: 12, color: '#9CA3AF', marginBottom: errorMessage ? 8 : 24 }}>{t('connect.shopify_store_hint')}</p>

          {errorMessage && (
            <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 10, padding: '10px 14px', marginBottom: 20 }}>
              <p style={{ color: '#DC2626', fontSize: 13, margin: 0 }}>{errorMessage}</p>
            </div>
          )}

          <button
            onClick={validateAndConnect}
            disabled={loading || !shop.trim()}
            style={{ width: '100%', padding: '14px', background: loading || !shop.trim() ? '#E5E7EB' : '#96BF48', color: loading || !shop.trim() ? '#9CA3AF' : '#fff', border: 'none', borderRadius: 12, fontSize: 15, fontWeight: 700, cursor: loading || !shop.trim() ? 'not-allowed' : 'pointer', transition: 'background 0.15s' }}
          >
            {loading ? t('connect.shopify_redirecting') : t('connect.shopify_cta')}
          </button>

          <p style={{ fontSize: 12, color: '#9CA3AF', textAlign: 'center', marginTop: 16 }}>{t('connect.shopify_read_only')}</p>
        </div>
      </div>
    </main>
  )
}

export default function ConnectShopifyPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', background: '#F9FAFB', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6B7280' }}>Loading...</div>}>
      <ConnectShopifyContent />
    </Suspense>
  )
}
