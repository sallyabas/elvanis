export const dynamic = 'force-dynamic'

'use client'

import { useState } from 'react'
import { useSearchParams } from 'next/navigation'

export default function ConnectShopifyPage() {
  const [shop, setShop] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const searchParams = useSearchParams()
  const urlError = searchParams.get('error')

  function validateAndConnect() {
    if (!shop.trim()) return

    setError('')

    // Remove protocol, trailing slashes, spaces
    const cleaned = shop.trim()
      .replace('https://', '')
      .replace('http://', '')
      .replace(/\/$/, '')
      .replace(/\s+/g, '') // remove all spaces

    // Validate — only alphanumeric, hyphens, dots
    if (!/^[a-zA-Z0-9][a-zA-Z0-9\-\.]*[a-zA-Z0-9]$/.test(cleaned)) {
      setError('Invalid store URL. Use only letters, numbers, and hyphens. Example: mystore.myshopify.com')
      return
    }

    const shopDomain = cleaned.includes('.myshopify.com')
      ? cleaned
      : `${cleaned}.myshopify.com`

    // Validate final domain format
    if (!shopDomain.endsWith('.myshopify.com')) {
      setError('Store URL must end with .myshopify.com')
      return
    }

    setLoading(true)
    window.location.href = `/api/auth/shopify?shop=${encodeURIComponent(shopDomain)}`
  }

  return (
    <main style={{ minHeight: '100vh', background: '#F9FAFB', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter, sans-serif', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 480 }}>
        <a href="/connect" style={{ fontSize: 13, color: '#6B7280', textDecoration: 'none', display: 'block', marginBottom: 24 }}>
          ← Back to connections
        </a>
        <div style={{ background: '#fff', borderRadius: 20, border: '1px solid #E5E7EB', padding: '36px 32px' }}>
          <div style={{ width: 56, height: 56, borderRadius: 14, background: '#F3F9E8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, marginBottom: 20 }}>
            🛍️
          </div>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: '#111827', marginBottom: 8 }}>Connect Shopify</h2>
          <p style={{ fontSize: 14, color: '#6B7280', marginBottom: 28, lineHeight: 1.6 }}>
            Enter your Shopify store URL. Elvanis will monitor your revenue, refund rate, AOV, and customer retention automatically.
          </p>

          <div style={{ background: '#F3F9E8', border: '1px solid #D1FAE5', borderRadius: 12, padding: '14px 16px', marginBottom: 24 }}>
            <p style={{ fontSize: 13, color: '#065F46', margin: '0 0 6px', fontWeight: 600 }}>What we read from Shopify:</p>
            <ul style={{ fontSize: 13, color: '#059669', margin: 0, paddingLeft: 20, lineHeight: 1.8 }}>
              <li>Order volume and revenue trends</li>
              <li>Refund rate and refund patterns</li>
              <li>Average order value over time</li>
              <li>Repeat purchase rate and customer retention</li>
              <li>New vs returning customer ratio</li>
            </ul>
          </div>

          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
            Your Shopify store URL
          </label>
          <input
            type="text"
            value={shop}
            onChange={e => { setShop(e.target.value); setError('') }}
            placeholder="mystore.myshopify.com"
            onKeyDown={e => e.key === 'Enter' && validateAndConnect()}
            style={{ width: '100%', padding: '12px 14px', border: `1.5px solid ${error ? '#FECACA' : '#E5E7EB'}`, borderRadius: 10, fontSize: 15, marginBottom: 8, boxSizing: 'border-box' as const, outline: 'none' }}
          />
          <p style={{ fontSize: 12, color: '#9CA3AF', marginBottom: error ? 8 : 24 }}>
            e.g. mystore.myshopify.com — no spaces or special characters
          </p>

{(error || urlError) && (
  <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 10, padding: '10px 14px', marginBottom: 20 }}>
    <p style={{ color: '#DC2626', fontSize: 13, margin: 0 }}>
      {error || (urlError === 'invalid_url' ? 'Invalid store URL. Please check and try again.' : 'Connection failed. Please try again.')}
    </p>
  </div>
)}


          <button
            onClick={validateAndConnect}
            disabled={loading || !shop.trim()}
            style={{
              width: '100%', padding: '14px',
              background: loading || !shop.trim() ? '#E5E7EB' : '#96BF48',
              color: loading || !shop.trim() ? '#9CA3AF' : '#fff',
              border: 'none', borderRadius: 12, fontSize: 15, fontWeight: 700,
              cursor: loading || !shop.trim() ? 'not-allowed' : 'pointer'
            }}
          >
            {loading ? 'Redirecting to Shopify...' : 'Connect Shopify →'}
          </button>

          <p style={{ fontSize: 12, color: '#9CA3AF', textAlign: 'center', marginTop: 16 }}>
            You will be redirected to Shopify to approve the connection. We only request read access.
          </p>
        </div>
      </div>
    </main>
  )
}
