'use client'

import { useState, useRef, useEffect } from 'react'

type Props = {
  name: string
  businessName: string | null
  logoUrl: string | null
}

export default function HeaderUser({ name, businessName, logoUrl }: Props) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const initials = (businessName ?? name ?? '?').charAt(0).toUpperCase()

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(!open)}
        style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: '1px solid #E5E7EB', borderRadius: 10, padding: '6px 12px', cursor: 'pointer' }}
      >
        {/* Avatar */}
        <div style={{ width: 28, height: 28, borderRadius: 8, overflow: 'hidden', background: '#2563EB', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          {logoUrl ? (
            <img src={logoUrl} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <span style={{ fontSize: 13, fontWeight: 800, color: '#fff' }}>{initials}</span>
          )}
        </div>
        {/* Name */}
        <span style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>
          {name || businessName || 'Account'}
        </span>
        {/* Arrow */}
        <span style={{ fontSize: 10, color: '#9CA3AF', transform: open ? 'rotate(180deg)' : 'none', display: 'inline-block', transition: 'transform 0.15s' }}>▾</span>
      </button>

      {open && (
        <div style={{ position: 'absolute', right: 0, top: 'calc(100% + 8px)', background: '#fff', border: '1px solid #E5E7EB', borderRadius: 12, boxShadow: '0 4px 20px rgba(0,0,0,0.08)', minWidth: 180, zIndex: 100, overflow: 'hidden' }}>
          {/* Business name header */}
          {businessName && (
            <div style={{ padding: '12px 16px', borderBottom: '1px solid #F3F4F6' }}>
              <p style={{ fontSize: 12, color: '#9CA3AF', margin: '0 0 2px' }}>Signed in as</p>
              <p style={{ fontSize: 13, fontWeight: 700, color: '#111827', margin: 0 }}>{businessName}</p>
            </div>
          )}
            <a
            href="/profile"
            style={{ display: 'block', padding: '12px 16px', fontSize: 14, color: '#374151', textDecoration: 'none', fontWeight: 500 }}
            onMouseEnter={e => (e.currentTarget.style.background = '#F9FAFB')}
            onMouseLeave={e => (e.currentTarget.style.background = 'none')}
          >
            👤 View profile
          </a>
          
            <a
            href="/api/signout"
            style={{ display: 'block', padding: '12px 16px', fontSize: 14, color: '#DC2626', textDecoration: 'none', fontWeight: 500, borderTop: '1px solid #F3F4F6' }}
            onMouseEnter={e => (e.currentTarget.style.background = '#FEF2F2')}
            onMouseLeave={e => (e.currentTarget.style.background = 'none')}
          >
            → Sign out
          </a>
        </div>
      )}
    </div>
  )
}
