'use client'

import { usePathname } from 'next/navigation'
import { useState } from 'react'
import HeaderUser from './header-user'
import { DashboardTour } from '@/app/overview/guide'
import { HelpPanel } from './HelpPanel'
import styles from './GlobalHeader.module.css'

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
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)

  const navLinks = [
    { href: '/',         label: 'Home' },
    { href: '/overview', label: 'Overview' },
    { href: '/signals',  label: 'Signals' },
    { href: '/tracker',  label: 'Tracker' },
    { href: '/plan',     label: 'Plan' },
    { href: '/connect',  label: 'Connect' },
    { href: '/advisory', label: 'Advisory' },
  ]

  function openHelp() {
    document.dispatchEvent(new CustomEvent('elvanis:open-help'))
  }

  function restartTour() {
    document.dispatchEvent(new CustomEvent('elvanis:restart-tour'))
  }

  const helpBtn = (
    <button onClick={openHelp} title="Help"
      style={{ width: 30, height: 30, borderRadius: '50%', background: '#F8FAFC', border: '1px solid #E2E8F0', color: '#64748B', fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      ?
    </button>
  )

  return (
    <>
      <header id="tour-header" style={{ background: '#fff', borderBottom: '1px solid #E5E7EB', padding: '0 24px', width: '100%', position: 'relative', zIndex: 100 }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>

          {/* Brand */}
          <span style={{ fontSize: 22, fontWeight: 800, color: '#2563EB', letterSpacing: '-0.025em', flexShrink: 0 }}>Elvanis</span>

          {/* Desktop nav */}
          <div className={styles.nav}>
            {navLinks.map(link => {
              const isActive = link.href === '/' ? pathname === '/' : pathname === link.href || pathname.startsWith(link.href + '/')
              return (
                <a key={link.href} href={link.href}
                  style={{ fontSize: 14, fontWeight: isActive ? 600 : 500, color: isActive ? '#2563EB' : '#6B7280', textDecoration: 'none' }}>
                  {link.label}
                </a>
              )
            })}
            {helpBtn}
            <HeaderUser
              name={founder?.full_name?.split(' ')[0] ?? ''}
              businessName={founder?.business_name ?? null}
              logoUrl={founder?.logo_url ?? founder?.logoUrl ?? null}
            />
          </div>

          {/* Mobile controls */}
          <div className={styles.mobileControls}>
            {helpBtn}
            <button onClick={() => setMobileOpen(o => !o)} aria-label="Toggle menu"
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, color: '#374151', padding: 4, lineHeight: 1 }}>
              {mobileOpen ? '✕' : '☰'}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile dropdown */}
      <div className={`${styles.mobileMenu}${mobileOpen ? ` ${styles.mobileMenuOpen}` : ''}`}>
        {navLinks.map(link => {
          const isActive = link.href === '/' ? pathname === '/' : pathname === link.href || pathname.startsWith(link.href + '/')
          return (
            <a key={link.href} href={link.href} onClick={() => setMobileOpen(false)}
              style={{ padding: '10px 12px', borderRadius: 8, fontSize: 14, fontWeight: isActive ? 600 : 500, color: isActive ? '#2563EB' : '#374151', textDecoration: 'none', background: isActive ? '#EFF6FF' : 'transparent' }}>
              {link.label}
            </a>
          )
        })}
        <div style={{ borderTop: '1px solid #E5E7EB', marginTop: 8, paddingTop: 12 }}>
          <HeaderUser
            name={founder?.full_name?.split(' ')[0] ?? ''}
            businessName={founder?.business_name ?? null}
            logoUrl={founder?.logo_url ?? founder?.logoUrl ?? null}
          />
        </div>
      </div>

      {mobileOpen && (
        <div onClick={() => setMobileOpen(false)}
          style={{ position: 'fixed', inset: 0, zIndex: 98 }} />
      )}

      <HelpPanel onRestartTour={restartTour} />

    </>
  )
}

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
