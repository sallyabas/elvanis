'use client'

import { useState, useEffect, useRef } from 'react'
import { useT, useLang } from '@/app/context/LanguageContext'

export interface HelpArticle {
  id: string
  section_en: string
  section_ar: string
  section_icon: string
  q_en: string
  a_en: string
  q_ar: string
  a_ar: string
  sort_order: number
}

export function HelpPanel({ onRestartTour, articles = [] }: { onRestartTour: () => void; articles: HelpArticle[] }) {
  const t    = useT()
  const lang = useLang()
  const isAr = lang === 'ar'

  const [open,     setOpen]     = useState(false)
  const [search,   setSearch]   = useState('')
  const [expanded, setExpanded] = useState<string | null>(null)
  const panelRef                = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = () => setOpen(true)
    document.addEventListener('elvanis:open-help', handler)
    return () => document.removeEventListener('elvanis:open-help', handler)
  }, [])

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [open])

  useEffect(() => {
    function handle(e: KeyboardEvent) { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('keydown', handle)
    return () => document.removeEventListener('keydown', handle)
  }, [])

  // Group by section
  const sections = Array.from(new Set(articles.map(a => a.section_en))).map(sectionEn => {
    const sectionArticles = articles.filter(a => a.section_en === sectionEn)
    const first = sectionArticles[0]
    return {
      section_en: sectionEn,
      section_ar: first.section_ar,
      icon: first.section_icon,
      articles: sectionArticles,
    }
  })

  const filtered = sections.map(section => ({
    ...section,
    articles: section.articles.filter(a => {
      if (!search) return true
      const q   = isAr ? a.q_ar : a.q_en
      const ans = isAr ? a.a_ar : a.a_en
      return q.toLowerCase().includes(search.toLowerCase()) || ans.toLowerCase().includes(search.toLowerCase())
    }),
  })).filter(s => s.articles.length > 0)

  function handleRestartTour() {
    setOpen(false)
    onRestartTour()
  }

  return (
    <>
      {open && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.3)', zIndex: 400, backdropFilter: 'blur(2px)' }}
          onClick={() => setOpen(false)}
        />
      )}

      <div
        ref={panelRef}
        dir={isAr ? 'rtl' : 'ltr'}
        style={{
          position: 'fixed',
          top: 0,
          [isAr ? 'left' : 'right']: 0,
          bottom: 0,
          width: 420,
          background: '#fff',
          boxShadow: isAr ? '8px 0 32px rgba(15,23,42,0.12)' : '-8px 0 32px rgba(15,23,42,0.12)',
          zIndex: 401,
          transform: open ? 'translateX(0)' : isAr ? 'translateX(-100%)' : 'translateX(100%)',
          transition: 'transform 0.28s cubic-bezier(0.4,0,0.2,1)',
          display: 'flex',
          flexDirection: 'column',
          fontFamily: 'Inter, -apple-system, sans-serif',
          overflowY: 'auto',
        }}
      >
        {/* Header */}
        <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid #F1F5F9', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <div>
              <h2 style={{ fontSize: 17, fontWeight: 800, color: '#0F172A', margin: '0 0 2px' }}>{t('help.title')}</h2>
              <p style={{ fontSize: 12, color: '#94A3B8', margin: 0 }}>{t('help.subtitle')}</p>
            </div>
            <button
              onClick={() => setOpen(false)}
              style={{ width: 32, height: 32, borderRadius: 8, background: '#F8FAFC', border: '1px solid #E2E8F0', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748B', fontSize: 16 }}
            >
              ✕
            </button>
          </div>

          {/* Search */}
          <div style={{ position: 'relative' }}>
            <span style={{ position: 'absolute', [isAr ? 'right' : 'left']: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 14, color: '#94A3B8' }}>🔍</span>
            <input
              type="text"
              placeholder={t('help.search_placeholder')}
              value={search}
              onChange={e => { setSearch(e.target.value); setExpanded(null) }}
              style={{
                width: '100%',
                padding: isAr ? '10px 36px 10px 12px' : '10px 12px 10px 36px',
                border: '1.5px solid #E2E8F0', borderRadius: 10,
                fontSize: 14, color: '#0F172A', outline: 'none',
                boxSizing: 'border-box' as const,
                fontFamily: 'inherit',
                transition: 'border-color 0.15s',
                textAlign: isAr ? 'right' : 'left',
              }}
              onFocus={e => e.target.style.borderColor = '#2563EB'}
              onBlur={e => e.target.style.borderColor = '#E2E8F0'}
            />
          </div>
        </div>

        {/* Articles */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px' }}>
          {filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <p style={{ fontSize: 14, color: '#64748B', marginBottom: 8 }}>{t('help.no_results')} "{search}"</p>
              <button onClick={() => setSearch('')} style={{ fontSize: 13, color: '#2563EB', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>{t('help.clear_search')}</button>
            </div>
          ) : (
            filtered.map(section => (
              <div key={section.section_en} style={{ marginBottom: 24 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <span style={{ fontSize: 16 }}>{section.icon}</span>
                  <h3 style={{ fontSize: 12, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.1em', margin: 0 }}>
                    {isAr ? section.section_ar : section.section_en}
                  </h3>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {section.articles.map(article => {
                    const key    = `${section.section_en}-${article.id}`
                    const isOpen = expanded === key
                    return (
                      <div
                        key={key}
                        style={{ borderRadius: 10, border: `1px solid ${isOpen ? '#BFDBFE' : '#F1F5F9'}`, background: isOpen ? '#EFF6FF' : '#F8FAFC', overflow: 'hidden', transition: 'all 0.15s' }}
                      >
                        <button
                          onClick={() => setExpanded(isOpen ? null : key)}
                          style={{
                            width: '100%', padding: '12px 14px',
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
                            background: 'none', border: 'none', cursor: 'pointer',
                            fontFamily: 'inherit', textAlign: isAr ? 'right' : 'left',
                          }}
                        >
                          <span style={{ fontSize: 14, fontWeight: 500, color: '#0F172A', lineHeight: 1.4 }}>
                            {isAr ? article.q_ar : article.q_en}
                          </span>
                          <span style={{ fontSize: 12, color: '#94A3B8', flexShrink: 0, transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>▾</span>
                        </button>
                        {isOpen && (
                          <div style={{ padding: '0 14px 14px' }}>
                            <p style={{ fontSize: 13, color: '#475569', lineHeight: 1.75, margin: 0, textAlign: isAr ? 'right' : 'left' }}>
                              {isAr ? article.a_ar : article.a_en}
                            </p>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '16px 24px', borderTop: '1px solid #F1F5F9', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button
            onClick={handleRestartTour}
            style={{
              width: '100%', padding: '11px', background: '#F8FAFC',
              border: '1px solid #E2E8F0', borderRadius: 10,
              fontSize: 13, fontWeight: 600, color: '#0F172A',
              cursor: 'pointer', fontFamily: 'inherit',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              transition: 'all 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = '#EFF6FF'; e.currentTarget.style.borderColor = '#BFDBFE' }}
            onMouseLeave={e => { e.currentTarget.style.background = '#F8FAFC'; e.currentTarget.style.borderColor = '#E2E8F0' }}
          >
            🎯 {t('help.restart_tour')}
          </button>
          <button
            onClick={() => {
              setOpen(false)
              if (typeof window !== 'undefined' && (window as Window & { HubSpotConversations?: { widget?: { open?: () => void } } }).HubSpotConversations?.widget?.open) {
                (window as Window & { HubSpotConversations?: { widget?: { open?: () => void } } }).HubSpotConversations!.widget!.open!()
              }
            }}
            style={{
              width: '100%', padding: '11px', background: '#0F172A',
              border: 'none', borderRadius: 10,
              fontSize: 13, fontWeight: 600, color: '#fff',
              cursor: 'pointer', fontFamily: 'inherit',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}
          >
            💬 {t('help.chat')}
          </button>
        </div>
      </div>
    </>
  )
}
