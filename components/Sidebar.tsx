'use client'

import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import { HelpPanel } from './HelpPanel'
import Link from 'next/link'
import { getT } from '@/lib/translations'


interface SidebarProps {
  founderName:       string | null
  businessName:      string | null
  subscriptionTier:  string | null
  logoUrl?:          string | null
  criticalCount?:    number
  language?:         string
}


export default function Sidebar({
  founderName,
  subscriptionTier,
  criticalCount = 0,
  language,

}: SidebarProps) {
  const t = getT((language ?? 'en') as 'en' | 'ar')

  const NAV_GROUPS = [
    {
      label: t('sidebar.intelligence'),
      items: [
        { href: '/',                  icon: '🏠', label: t('nav.home'),       badge: undefined },
        { href: '/overview',          icon: '📊', label: t('nav.overview'),   badge: undefined },
        { href: '/signals',           icon: '⚡', label: t('nav.signals'),    badge: 'signals' },
        { href: '/tracker',           icon: '📈', label: t('nav.tracker'),    badge: undefined },
        { href: '/assessment/result', icon: '🎯', label: t('nav.assessment'), badge: undefined },
      ],
    },
    {
      label: t('sidebar.execution'),
      items: [
        { href: '/plan',    icon: '🗂️', label: t('nav.plan'),    badge: undefined },
        { href: '/connect', icon: '🔌', label: t('nav.connect'), badge: undefined },
      ],
    },
  ]

  const STANDALONE = { href: '/advisory', icon: '🤝', label: t('nav.advisory') }
  const pathname                = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [isMobile,   setIsMobile]   = useState(false)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  // Close drawer on route change
  useEffect(() => { setMobileOpen(false) }, [pathname])

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(href + '/')

  const tierLabel = subscriptionTier === 'navigator' ? 'Navigator' : 'Free'
  const initials  = founderName?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() ?? '?'

  function openHelp() {
    document.dispatchEvent(new CustomEvent('elvanis:open-help'))
  }

  const sidebarContent = (
    <>
      {/* Brand */}
      <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid #1E1B33', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <span style={{ fontSize: 18, fontWeight: 800, color: '#fff', letterSpacing: '-0.03em', display: 'block' }}>
            Elvanis
          </span>
          <span style={{ fontSize: 10, color: '#4B5563', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            AI Business OS
          </span>
        </div>
        {isMobile && (
          <button onClick={() => setMobileOpen(false)} style={{ background: 'none', border: 'none', color: '#6B7280', fontSize: 20, cursor: 'pointer', padding: 4 }}>
            ✕
          </button>
        )}
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '12px', overflowY: 'auto' }}>
        {NAV_GROUPS.map((group, gi) => (
          <div key={group.label} style={{ marginTop: gi === 0 ? 0 : 16 }}>
            <p style={{
              fontSize:      10,
              fontWeight:    700,
              color:         '#4B5563',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              padding:       '0 8px',
              marginBottom:  4,
            }}>
              {group.label}
            </p>
            {group.items.map(item => {
              const active = isActive(item.href)
              const badge  = item.badge === 'signals' && criticalCount > 0 ? criticalCount : null
              return (
                <Link key={item.href} href={item.href} style={{
                  display:        'flex',
                  alignItems:     'center',
                  gap:            10,
                  padding:        '8px 10px',
                  borderRadius:   8,
                  textDecoration: 'none',
                  marginBottom:   1,
                  background:     active ? '#1E1B33' : 'transparent',
                  position:       'relative',
                  transition:     'background 0.15s',
                }}>
                  {active && (
                    <span style={{
                      position:     'absolute',
                      left:         0,
                      top:          6,
                      bottom:       6,
                      width:        3,
                      background:   '#4F46E5',
                      borderRadius: '0 2px 2px 0',
                    }} />
                  )}
                  <span style={{ fontSize: 15, width: 20, textAlign: 'center', opacity: active ? 1 : 0.6, flexShrink: 0 }}>
                    {item.icon}
                  </span>
                  <span style={{ fontSize: 13, color: active ? '#fff' : '#9CA3AF', fontWeight: active ? 600 : 500, flex: 1 }}>
                    {item.label}
                  </span>
                  {badge && (
                    <span style={{
                      fontSize:     10,
                      fontWeight:   700,
                      background:   '#DC2626',
                      color:        '#fff',
                      padding:      '1px 6px',
                      borderRadius: 20,
                      minWidth:     18,
                      textAlign:    'center',
                    }}>
                      {badge}
                    </span>
                  )}
                </Link>
              )
            })}
          </div>
        ))}

        {/* Divider + Advisory */}
        <div style={{ height: 1, background: '#1E1B33', margin: '12px 0' }} />
        {(() => {
          const active = isActive(STANDALONE.href)
          return (
            <Link href={STANDALONE.href} style={{
              display:        'flex',
              alignItems:     'center',
              gap:            10,
              padding:        '8px 10px',
              borderRadius:   8,
              textDecoration: 'none',
              background:     active ? '#1E1B33' : 'transparent',
              position:       'relative',
              transition:     'background 0.15s',
            }}>
              {active && (
                <span style={{
                  position:     'absolute',
                  left:         0,
                  top:          6,
                  bottom:       6,
                  width:        3,
                  background:   '#4F46E5',
                  borderRadius: '0 2px 2px 0',
                }} />
              )}
              <span style={{ fontSize: 15, width: 20, textAlign: 'center', opacity: active ? 1 : 0.6, flexShrink: 0 }}>
                {STANDALONE.icon}
              </span>
              <span style={{ fontSize: 13, color: active ? '#fff' : '#9CA3AF', fontWeight: active ? 600 : 500 }}>
                {STANDALONE.label}
              </span>
            </Link>
          )
        })()}
      </nav>

      {/* Bottom */}
      <div style={{ borderTop: '1px solid #1E1B33', padding: 12 }}>
        <button onClick={openHelp} style={{
          display:     'flex',
          alignItems:  'center',
          gap:         10,
          padding:     '8px 10px',
          borderRadius: 8,
          background:  'none',
          border:      'none',
          cursor:      'pointer',
          width:       '100%',
          marginBottom: 4,
        }}>
          <span style={{ fontSize: 15, width: 20, textAlign: 'center', opacity: 0.6 }}>❓</span>
          <span style={{ fontSize: 13, color: '#9CA3AF', fontWeight: 500 }}>{t('nav.help')}</span>
        </button>

        <Link href="/profile" style={{
          display:        'flex',
          alignItems:     'center',
          gap:            10,
          padding:        '8px 10px',
          borderRadius:   8,
          textDecoration: 'none',
          cursor:         'pointer',
        }}>
          <div style={{
            width:          30,
            height:         30,
            borderRadius:   '50%',
            background:     '#4F46E5',
            display:        'flex',
            alignItems:     'center',
            justifyContent: 'center',
            fontSize:       11,
            fontWeight:     700,
            color:          '#fff',
            flexShrink:     0,
          }}>
            {initials}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 12, fontWeight: 600, color: '#fff', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {founderName ?? 'Founder'}
            </p>
            <p style={{ fontSize: 10, color: '#6B7280', margin: 0 }}>{tierLabel}</p>
          </div>
          <span style={{ fontSize: 13, color: '#4B5563' }}>⚙️</span>
        </Link>

        <a href="/api/signout" title="Sign out" style={{
          display:     'flex',
          alignItems:  'center',
          gap:         8,
          padding:     '6px 10px',
          borderRadius: 8,
          textDecoration: 'none',
          marginTop:   4,
          width:       '100%',
          boxSizing:   'border-box' as const,
        }}>
          <span style={{ fontSize: 14, width: 20, textAlign: 'center', opacity: 0.5 }}>⏻</span>
          <span style={{ fontSize: 13, color: '#6B7280', fontWeight: 500 }}>{t('nav.signout')}</span>
        </a>
      </div>
      <HelpPanel onRestartTour={() => {}} />
    </>
  )

  // ── Mobile hamburger button ──
  const hamburger = (
    <button
      onClick={() => setMobileOpen(true)}
      style={{
        position:   'fixed',
        top:        12,
        left:       12,
        zIndex:     9998,
        background: '#0F0D1F',
        border:     '1px solid #1E1B33',
        borderRadius: 8,
        width:      40,
        height:     40,
        display:    'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap:        5,
        cursor:     'pointer',
      }}
    >
      <span style={{ width: 18, height: 2, background: '#9CA3AF', borderRadius: 2, display: 'block' }} />
      <span style={{ width: 18, height: 2, background: '#9CA3AF', borderRadius: 2, display: 'block' }} />
      <span style={{ width: 18, height: 2, background: '#9CA3AF', borderRadius: 2, display: 'block' }} />
      {criticalCount > 0 && (
        <span style={{
          position:   'absolute',
          top:        6,
          right:      6,
          width:      8,
          height:     8,
          background: '#DC2626',
          borderRadius: '50%',
        }} />
      )}
    </button>
  )

  if (isMobile) {
    return (
      <>
        {hamburger}

        {/* Backdrop */}
        {mobileOpen && (
          <div
            onClick={() => setMobileOpen(false)}
            style={{
              position:   'fixed',
              inset:      0,
              background: 'rgba(0,0,0,0.6)',
              zIndex:     9998,
              backdropFilter: 'blur(2px)',
            }}
          />
        )}

        {/* Drawer */}
        <aside id="tour-sidebar" style={{
          position:   'fixed',
          top:        0,
          left:       0,
          height:     '100vh',
          width:      260,
          background: '#0F0D1F',
          display:    'flex',
          flexDirection: 'column',
          borderRight: '1px solid #1E1B33',
          zIndex:     9999,
          transform:  mobileOpen ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 0.25s ease',
          overflow:   'hidden',
        }}>
          {sidebarContent}
        </aside>
      </>
    )
  }

  return (
    <>
    <div style={{ width: 220, minWidth: 220, flexShrink: 0 }} />
    <aside id="tour-sidebar" style={{
      width:          220,
      height:         '100vh',
      background:     '#0F0D1F',
      display:        'flex',
      flexDirection:  'column',
      borderRight:    '1px solid #1E1B33',
      position:       'fixed',
      top:            0,
      left:           0,
      overflow:       'hidden',
      zIndex:         100,
    }}>
      {sidebarContent}
    </aside>
     </>
  )
}