'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

const STRIPE_PAYMENT_LINK = process.env.NEXT_PUBLIC_STRIPE_PAYMENT_LINK ?? 'https://buy.stripe.com/test_00wdR9cnMfpubZkeWGdUY00'

// UI Cooldown: Prevents button spam while backend enforces real rate limits via 429
// This is NOT the system scan frequency — server enforces that independently

export default function ScanButton({
  founderId,
  lastScannedAt,
  hasConnectedSources,
  isFirstScan,
  isFreeTier,
  daysUntilNextScan,
  tooltipText,
  cooldownHours,
}: {
  founderId:           string
  lastScannedAt:       string | null
  hasConnectedSources: boolean
  isFirstScan:         boolean
  isFreeTier:          boolean
  daysUntilNextScan:   number | null
  tooltipText:         string
  cooldownHours:       number
}) {
  const router = useRouter()
  const [scanning,         setScanning]         = useState(false)
  const [result,           setResult]           = useState('')
  const [showUpgradeModal,  setShowUpgradeModal]  = useState(false)
  const [showConfirmModal,  setShowConfirmModal]  = useState(false)

  // UI cooldown only — server enforces the real 7-day rolling limit via 429
  const hoursSinceLastScan = lastScannedAt
    ? Math.floor((Date.now() - new Date(lastScannedAt).getTime()) / 3600000)
    : null

  const canScan = isFirstScan ||
    hoursSinceLastScan === null ||
    hoursSinceLastScan >= cooldownHours

    async function handleClick() {
      if (isFreeTier) {
        setShowUpgradeModal(true)
        return
      }
      if (!canScan) return
      setShowConfirmModal(true)
    }

  async function runScan() {
    setScanning(true)
    setResult('')
    try {
      const res = await fetch('/api/scan', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ founderId, force: true, sendEmail: true }),
      })

      const data = await res.json()

      // 403 = plan mismatch — show upgrade modal
      if (res.status === 403) {
        setShowUpgradeModal(true)
        setScanning(false)
        return
      }

      // 429 = weekly limit reached — show server message with next available date
      if (res.status === 429) {
        setResult(data.error ?? 'Weekly scan limit reached — try again next week')
        setScanning(false)
        return
      }

      if (data.success) {
        const total = data.results?.reduce(
          (sum: number, r: { signals: number }) => sum + (r.signals ?? 0), 0
        ) ?? 0
        const errors = data.results?.filter((r: { error?: string }) => r.error) ?? []
        const errorSources = errors.map((r: { source: string }) => r.source).join(', ')
        if (total > 0 && errors.length === 0) {
          setResult(`✓ ${total} new signals found`)
        } else if (total > 0 && errors.length > 0) {
          setResult(`✓ ${total} signals found · ${errorSources} had issues`)
        } else if (errors.length > 0) {
          setResult(`⚠ Scan completed with issues on ${errorSources} — check connections`)
        } else {
          setResult('✓ Scan complete — no new signals')
        }
        router.refresh()
      } else {
        setResult(data.error ?? 'Scan failed — try again')
      }
    } catch {
      setResult('Scan failed — check your internet connection and try again')
    }
    setScanning(false)
  }

if (!hasConnectedSources || isFreeTier) return null
  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
        {result && (
          <span style={{ fontSize: 13, color: result.startsWith('✓') ? '#059669' : '#DC2626' }}>
            {result}
          </span>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* tooltipText generated server-side from SOURCE_CONFIG — never hardcoded here */}
          <span
            title={tooltipText}
            style={{ fontSize: 15, color: '#9CA3AF', cursor: 'help', lineHeight: 1 }}
          >
            ⓘ
          </span>

          <button
            onClick={handleClick}
            disabled={scanning || (!isFreeTier && !canScan)}
            style={{
              padding: '10px 20px',
              background: scanning
                ? '#6B7280'
                : (!isFreeTier && !canScan)
                  ? '#E5E7EB'
                  : '#111827',
              color: (!isFreeTier && !canScan) ? '#9CA3AF' : '#fff',
              border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 600,
              cursor: (scanning || (!isFreeTier && !canScan)) ? 'not-allowed' : 'pointer',
            }}
          >
            {scanning ? '🔍 Scanning...' : '🔍 Run new scan'}
          </button>
        </div>
      </div>

      {showUpgradeModal && (
        <div
          onClick={() => setShowUpgradeModal(false)}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 1000, padding: 24,
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: '#fff', borderRadius: 20, padding: '36px 32px',
              maxWidth: 420, width: '100%', fontFamily: 'Inter, sans-serif',
            }}
          >
            <div style={{
              width: 52, height: 52, borderRadius: 14, background: '#F5F3FF',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 26, marginBottom: 20,
            }}>✨</div>

            <h2 style={{ fontSize: 20, fontWeight: 800, color: '#111827', margin: '0 0 10px' }}>
              Manual scans are a Navigator feature
            </h2>

            <p style={{ fontSize: 14, color: '#6B7280', lineHeight: 1.6, margin: '0 0 24px' }}>
              {daysUntilNextScan !== null && daysUntilNextScan > 0
                ? `Your next automatic scan runs in ${daysUntilNextScan} day${daysUntilNextScan !== 1 ? 's' : ''}. Upgrade to Navigator to scan now and verify your fixes worked immediately.`
                : 'Upgrade to Navigator to run manual scans anytime and verify your fixes worked immediately.'
              }
            </p>

            <div style={{ background: '#F5F3FF', borderRadius: 12, padding: '16px', marginBottom: 24 }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: '#7C3AED', margin: '0 0 10px' }}>
                Navigator includes:
              </p>
              {[
                'Manual refresh — verify fixes immediately',
                'Weekly auto-scans for Jira and Intercom',
                'Monthly auto-scans for GA4, Shopify and Trustpilot',
                'Monthly Action Digest — AI-prioritised action plan',
              ].map(item => (
                <div key={item} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <span style={{ color: '#7C3AED', fontSize: 14 }}>✓</span>
                  <span style={{ fontSize: 13, color: '#4C1D95' }}>{item}</span>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <a
                href={STRIPE_PAYMENT_LINK}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'block', textAlign: 'center',
                  padding: '13px', background: '#7C3AED', color: '#fff',
                  borderRadius: 12, fontSize: 14, fontWeight: 700,
                  textDecoration: 'none',
                }}
              >
                Upgrade to Navigator — £29/mo →
              </a>
              <button
                onClick={() => setShowUpgradeModal(false)}
                style={{
                  padding: '13px', background: '#F9FAFB', color: '#6B7280',
                  border: '1px solid #E5E7EB', borderRadius: 12,
                  fontSize: 14, fontWeight: 600, cursor: 'pointer',
                }}
              >
                Maybe later
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
  {showConfirmModal && (
    <div
      onClick={() => setShowConfirmModal(false)}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 1000, padding: 24,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: '#fff', borderRadius: 20, padding: '36px 32px',
          maxWidth: 420, width: '100%', fontFamily: 'Inter, sans-serif',
        }}
      >
        <div style={{
          width: 52, height: 52, borderRadius: 14, background: '#F9FAFB',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 26, marginBottom: 20, border: '1px solid #E5E7EB',
        }}>🔍</div>

        <h2 style={{ fontSize: 20, fontWeight: 800, color: '#111827', margin: '0 0 10px' }}>
          Confirm Manual Scan
        </h2>

        <p style={{ fontSize: 14, color: '#6B7280', lineHeight: 1.6, margin: '0 0 12px' }}>
          You have <strong style={{ color: '#111827' }}>1 manual scan</strong> available this week.
          This will refresh all connected sources and cannot be undone once started.
        </p>

        {lastScannedAt && (
          <div style={{ background: '#F9FAFB', borderRadius: 10, padding: '10px 14px', marginBottom: 20, fontSize: 13, color: '#6B7280' }}>
            Last scanned: <strong style={{ color: '#374151' }}>
            {Math.floor((Date.now() - new Date(lastScannedAt!).getTime()) / (1000 * 60 * 60 * 24))} days ago
            </strong>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button
            onClick={async () => {
              setShowConfirmModal(false)
              await runScan()
            }}
            style={{
              padding: '13px', background: '#111827', color: '#fff',
              border: 'none', borderRadius: 12,
              fontSize: 14, fontWeight: 700, cursor: 'pointer',
            }}
          >
            Proceed with Scan →
          </button>
          <button
            onClick={() => setShowConfirmModal(false)}
            style={{
              padding: '13px', background: '#F9FAFB', color: '#6B7280',
              border: '1px solid #E5E7EB', borderRadius: 12,
              fontSize: 14, fontWeight: 600, cursor: 'pointer',
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )}
}
