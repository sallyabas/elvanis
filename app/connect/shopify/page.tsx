'use client'

import { Suspense, useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'

function ConnectShopifyContent() {
  const [shop, setShop]       = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')
  const searchParams          = useSearchParams()
  const urlError              = searchParams.get('error')

  // Reset loading on mount (initial visit / refresh)
  useEffect(() => {
    setLoading(false)
  }, [])

  // Reset loading when user navigates back via browser back button
  // pageshow with e.persisted = true fires specifically on back/forward cache restore
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

    // ── Step 1: Clean input ───────────────────────────────────
    let cleanShop = shop.trim().toLowerCase()

    if (cleanShop.includes('admin.shopify.com/store/')) {
      // Extract store handle from modern Shopify admin URL
      // e.g. https://admin.shopify.com/store/my-store/apps → my-store
      const match: RegExpMatchArray | null = cleanShop.match(/admin\.shopify\.com\/store\/([a-zA-Z0-9-]+)/)
      if (match && typeof match[1] === 'string') {
        cleanShop = match[1]
      } else {
        setError('Could not read your store name from that URL. Please type just your store name, e.g. "mystore"')
        return
      }
    } else {
      // Handles:
      // mystore                           → mystore
      // mystore.myshopify.com             → mystore
      // https://mystore.myshopify.com     → mystore
      // https://mystore.myshopify.com/admin/settings → mystore
      cleanShop = cleanShop
        .replace('https://', '')
        .replace('http://', '')
        .replace('.myshopify.com', '')
        .split('/')[0]        // drop trailing paths like /admin or /settings
        .replace(/\s+/g, '')  // remove any spaces
    }

    // ── Step 2: Guard empty result after cleaning ─────────────
    if (!cleanShop || cleanShop.length < 2) {
      setError('Could not extract a valid store name. Please type just your store name, e.g. "mystore"')
      return
    }

    // ── Step 3: Validate handle format ───────────────────────
    if (!/^[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]$/.test(cleanShop)) {
      setError('Invalid store name. Use only letters, numbers, and hyphens. Example: my-store')
      return
    }

    // ── Step 4: Build OAuth URL and redirect ──────────────────
    const appBaseUrl      = process.env.NEXT_PUBLIC_APP_URL || window.location.origin
    const clientId        = process.env.NEXT_PUBLIC_SHOPIFY_CLIENT_ID
    const redirectUri     = `${appBaseUrl}/api/auth/shopify/callback`
    const scopes          = 'read_orders,read_customers,read_products,read_inventory,read_analytics'
    const encodedRedirect = encodeURIComponent(redirectUri)

    setLoading(true)
    window.location.href = `https://${cleanShop}.myshopify.com/admin/oauth/authorize?client_id=${clientId}&scope=${scopes}&redirect_uri=${encodedRedirect}`

    // Emergency fallback — resets button if navigation stalls or fails
    // Placed here so it only runs once per connect attempt, not on every render
    setTimeout(() => setLoading(false), 4000)
  }

  // Determine error message to show
  const errorMessage = error || (
    urlError === 'invalid_url'    ? 'Invalid store URL. Please check and try again.' :
    urlError === 'token_failed'   ? 'Could not connect to Shopify. Please try again.' :
    urlError === 'shopify_failed' ? 'Shopify connection failed. Please try again.' :
    urlError                      ? 'Connection failed. Please try again.' :
    ''
  )

  return (
    <main style={{ minHeight: '100vh', background: '#F9FAFB', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter, sans-serif', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 480 }}>
        <a href="/connect" style={{ fontSize: 13, color: '#6B7280', textDecoration: 'none', display: 'block', marginBottom: 24 }}>
          ← Back to connections
        </a>

        <div style={{ background: '#fff', borderRadius: 20, border: '1px solid #E5E7EB', padding: '36px 32px' }}>
          {/* Icon */}
          <div style={{ width: 56, height: 56, borderRadius: 14, background: '#F3F9E8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, marginBottom: 20 }}>
            🛍️
          </div>

          <h2 style={{ fontSize: 22, fontWeight: 800, color: '#111827', marginBottom: 8 }}>Connect Shopify</h2>
          <p style={{ fontSize: 14, color: '#6B7280', marginBottom: 28, lineHeight: 1.6 }}>
            Enter your Shopify store name. Elvanis will monitor your revenue, refund rate, AOV, and customer retention automatically.
          </p>

          {/* What we read */}
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

          {/* Input */}
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
            Your Shopify store name
          </label>

          {/* Inline suffix input */}
          <div style={{
            display: 'flex', alignItems: 'center',
            border: `1.5px solid ${errorMessage ? '#FECACA' : '#E5E7EB'}`,
            borderRadius: 10, marginBottom: 8, overflow: 'hidden', background: '#fff',
          }}>
            <input
              type="text"
              value={shop}
              onChange={e => { setShop(e.target.value); setError('') }}
              placeholder="mystore"
              onKeyDown={e => e.key === 'Enter' && validateAndConnect()}
              style={{
                flex: 1, padding: '12px 14px', border: 'none',
                fontSize: 15, outline: 'none', minWidth: 0,
                fontFamily: 'Inter, sans-serif',
              }}
            />
            <span style={{
              padding: '12px 14px', background: '#F9FAFB',
              color: '#9CA3AF', fontSize: 13,
              borderLeft: '1px solid #E5E7EB', whiteSpace: 'nowrap',
            }}>
              .myshopify.com
            </span>
          </div>

          <p style={{ fontSize: 12, color: '#9CA3AF', marginBottom: errorMessage ? 8 : 24 }}>
            Enter your store name or paste your full Shopify URL
          </p>

          {/* Error */}
          {errorMessage && (
            <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 10, padding: '10px 14px', marginBottom: 20 }}>
              <p style={{ color: '#DC2626', fontSize: 13, margin: 0 }}>{errorMessage}</p>
            </div>
          )}

          {/* Connect button */}
          <button
            onClick={validateAndConnect}
            disabled={loading || !shop.trim()}
            style={{
              width: '100%', padding: '14px',
              background: loading || !shop.trim() ? '#E5E7EB' : '#96BF48',
              color: loading || !shop.trim() ? '#9CA3AF' : '#fff',
              border: 'none', borderRadius: 12, fontSize: 15, fontWeight: 700,
              cursor: loading || !shop.trim() ? 'not-allowed' : 'pointer',
              transition: 'background 0.15s',
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

export default function ConnectShopifyPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', background: '#F9FAFB', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6B7280' }}>
        Loading...
      </div>
    }>
      <ConnectShopifyContent />
    </Suspense>
  )
}
