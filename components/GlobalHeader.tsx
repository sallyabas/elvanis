'use client'

import { usePathname } from 'next/navigation'
import HeaderUser from './header-user'

type GlobalHeaderProps = {
  founder: {
    full_name: string | null
    business_name: string | null
    logoUrl?: string | null // Maps to your logoUrl if present
    logo_url?: string | null // Safety mapping for backend snake_case
  } | null
}

export default function GlobalHeader({ founder }: GlobalHeaderProps) {
  const pathname = usePathname()

  // Navigation schema incorporating the premium rebrand
  const navLinks = [
    { href: '/dashboard', label: 'Dashboard' },
    { href: '/signals', label: 'Signals' },
    { href: '/health-tracker', label: 'Business Health Tracker' }, // Locked rebrand
    { href: '/plan', label: 'Action Digest' },
    { href: '/connect', label: 'Connect' },
    { href: '/service-request', label: 'Request Service' },
  ]

  return (
    <header style={{ background: '#fff', borderBottom: '1px solid #E5E7EB', padding: '0 24px', width: '100%' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        {/* Brand Identity */}
        <span style={{ fontSize: 22, fontWeight: 800, color: '#2563EB', letterSpacing: '-0.025em' }}>Elvanis</span>
        
        {/* Navigation Actions */}
        <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
          {navLinks.map((link) => {
            const isActive = pathname === link.href
            return (
              <a
                key={link.href}
                href={link.href}
                style={{
                  fontSize: 14,
                  fontWeight: isActive ? 600 : 500,
                  color: isActive ? '#2563EB' : '#6B7280',
                  textDecoration: 'none',
                  transition: 'color 0.15s ease'
                }}
              >
                {link.label}
              </a>
            )
          })}
          
          {/* Consolidated Dropdown Trigger */}
          <HeaderUser
            name={founder?.full_name?.split(' ')[0] ?? ''}
            businessName={founder?.business_name ?? null}
            logoUrl={founder?.logo_url ?? founder?.logoUrl ?? null}
          />
        </div>
      </div>
    </header>
  )
}