'use client'

import { usePathname } from 'next/navigation'
import { useRef } from 'react'
import HeaderUser from './header-user'
import { DashboardTour } from '@/app/dashboard/guide'
import { HelpPanel } from './HelpPanel'

type GlobalHeaderProps = {
  founder: {
    full_name:    string | null
    business_name: string | null
    logoUrl?:     string | null
    logo_url?:    string | null
    guide_dismissed?: boolean | null
  } | null
}

export default function GlobalHeader({ founder }: GlobalHeaderProps) {
  const pathname     = usePathname()
  const tourRef      = useRef<{ restart: () => void }>(null)

  const navLinks = [
    { href: '/dashboard',     label: 'Dashboard' },
    { href: '/signals',       label: 'Signals' },
    { href: '/health-tracker',label: 'Business Health Tracker' },
    { href: '/plan',          label: 'Action Digest' },
    { href: '/connect',       label: 'Connect' },
    { href: '/service-request',label: 'Request Service' },
  ]

  function openHelp() {
    document.dispatchEvent(new CustomEvent('elvanis:open-help'))
  }

  function restartTour() {
    document.dispatchEvent(new CustomEvent('elvanis:restart-tour'))
  }

  return (
    <>
      <header id="tour-header" style={{ background: '#fff', borderBottom: '1px solid #E5E7EB', padding: '0 24px', width: '100%' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          {/* Brand */}
          <span style={{ fontSize: 22, fontWeight: 800, color: '#2563EB', letterSpacing: '-0.025em' }}>Elvanis</span>

          {/* Nav + actions */}
          <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
            {navLinks.map(link => {
              const isActive = pathname === link.href
              return (
                <a
                  key={link.href}
                  href={link.href}
                  style={{ fontSize: 14, fontWeight: isActive ? 600 : 500, color: isActive ? '#2563EB' : '#6B7280', textDecoration: 'none', transition: 'color 0.15s ease' }}
                >
                  {link.label}
                </a>
              )
            })}

            {/* Help icon */}
            <button
              onClick={openHelp}
              title="Help & Support"
              style={{
                width: 30, height: 30, borderRadius: '50%',
                background: '#F8FAFC', border: '1px solid #E2E8F0',
                color: '#64748B', fontSize: 13, fontWeight: 700,
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.15s', flexShrink: 0,
                fontFamily: 'Inter, sans-serif',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = '#EFF6FF'; e.currentTarget.style.borderColor = '#BFDBFE'; e.currentTarget.style.color = '#2563EB' }}
              onMouseLeave={e => { e.currentTarget.style.background = '#F8FAFC'; e.currentTarget.style.borderColor = '#E2E8F0'; e.currentTarget.style.color = '#64748B' }}
            >
              ?
            </button>

            <HeaderUser
              name={founder?.full_name?.split(' ')[0] ?? ''}
              businessName={founder?.business_name ?? null}
              logoUrl={founder?.logo_url ?? founder?.logoUrl ?? null}
            />
          </div>
        </div>
      </header>

      {/* Help panel — listens for elvanis:open-help event */}
      <HelpPanel onRestartTour={restartTour} />

      {/* Tour — only on dashboard, listens for elvanis:restart-tour */}
      {pathname === '/dashboard' && (
        <TourWithRestart guideDismissed={founder?.guide_dismissed ?? false} />
      )}
    </>
  )
}

// ── Tour wrapper that listens for restart event ───────────────
function TourWithRestart({ guideDismissed }: { guideDismissed: boolean }) {
  const { useEffect, useState } = require('react')
  const [key, setKey] = useState(0)

  useEffect(() => {
    function handle() { setKey((k: number) => k + 1) }
    document.addEventListener('elvanis:restart-tour', handle)
    return () => document.removeEventListener('elvanis:restart-tour', handle)
  }, [])

  return <DashboardTour key={key} guideDismissed={guideDismissed} />
}
