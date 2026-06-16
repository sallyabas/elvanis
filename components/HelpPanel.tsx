'use client'

import { useState, useEffect, useRef } from 'react'
import { useT, useLang } from '@/app/context/LanguageContext'
// ── FAQ DATA ──────────────────────────────────────────────────
// To add a new section: add a new object to this array
// To add a new article: add to the articles array inside any section
// No JSX changes needed — UI renders dynamically
// ─────────────────────────────────────────────────────────────
const FAQ = [
  {
    section: 'Getting Started',
    icon: '🚀',
    articles: [
      {
        q: 'What is Elvanis?',
        a: 'Elvanis is an AI business diagnostic platform. It connects to your operational tools — Jira, GA4, Shopify, Intercom, Trustpilot — reads your real data, and tells you exactly what is breaking your business, ranked by impact. It is not a dashboard. It is a diagnosis.',
      },
      {
        q: 'How do I take the assessment?',
        a: 'Go to the Assessment page from the header. Answer 26 questions about your business — it takes around 10 minutes. You will get a scored diagnosis across 6 dimensions immediately after. You can retake it after major business changes.',
      },
      {
        q: 'How is my health score calculated?',
        a: 'Your health score is calculated from active signals across 6 dimensions: Revenue, Customer, Marketing, Product, Team, and Strategy. Critical signals reduce your score more than warning signals. The score updates every time a scan runs. Connect more tools for a more accurate score.',
      },
      {
        q: 'How does the dashboard tour work?',
        a: 'The tour runs automatically on your first visit and walks you through every section of the dashboard. You can restart it anytime by clicking "Take the tour again" at the bottom of this panel.',
      },
    ],
  },
  {
    section: 'Signals',
    icon: '⚡',
    articles: [
      {
        q: 'What is a signal?',
        a: 'A signal is a diagnosed issue in your business detected from your connected tools. Every signal has a severity level, a root cause, and a specific recommended action. Signals are ranked by impact so you always know what to fix first.',
      },
      {
        q: 'What is the difference between Critical, Warning, and Watch?',
        a: 'Critical signals need immediate action — they are actively hurting your business right now. Warning signals need a plan this week — they are worsening. Watch signals are early indicators to monitor. Always start with Critical.',
      },
      {
        q: 'How do I resolve a conflict between tools?',
        a: 'When two tools show conflicting data for the same metric — for example GA4 shows traffic up but Shopify shows revenue down — Elvanis flags it as a conflict. Go to Signals, filter by Conflicts, and use the Trust buttons to tell Elvanis which source to prioritise. Navigator resolves conflicts automatically.',
      },
      {
        q: 'What does "Needs Strategy" mean?',
        a: 'Needs Strategy means you have acknowledged the signal and are working on it. Click "I\'m working on this" on any signal to move it to this status. When your fix is complete, mark it as resolved and Elvanis will verify on the next scan.',
      },
    ],
  },
  {
    section: 'Connecting Tools',
    icon: '🔌',
    articles: [
      {
        q: 'How do I connect Shopify?',
        a: 'Go to Connect in the header. Click Shopify. You will be redirected to authorise the connection in your Shopify Partner dashboard. Make sure your app URL is set to elvanis.vercel.app. Once connected, Elvanis will scan your orders, refunds, and customer data automatically.',
      },
      {
        q: 'How do I connect Jira?',
        a: 'Go to Connect and click Jira. You will be redirected to Atlassian to authorise. Once connected, Elvanis monitors your sprint velocity, bug backlog, and delivery cycle time. Free plan scans monthly. Navigator scans weekly.',
      },
      {
        q: 'How do I connect Google Analytics (GA4)?',
        a: 'Go to Connect and click GA4. Authorise with your Google account. Make sure the account has access to the correct GA4 property. Elvanis reads traffic sources, session data, conversion rates, and engagement metrics.',
      },
      {
        q: 'How do I connect Intercom?',
        a: 'Go to Connect and click Intercom. Authorise with your Intercom credentials. Elvanis reads ticket volume, response times, repeat complaint patterns, and CSAT data. Free plan scans monthly. Navigator scans weekly.',
      },
      {
        q: 'How do I upload a CSV?',
        a: 'Go to Connect and click CSV Upload. Choose a template type — Support, Orders, Velocity, or NPS/CSAT. Download the template, fill it with your data, and upload. Elvanis processes it immediately and generates signals. Unlimited uploads on all plans.',
      },
    ],
  },
  {
    section: 'Action Digest',
    icon: '📄',
    articles: [
      {
        q: 'What is the Action Digest?',
        a: 'The Action Digest is your monthly AI-generated 90-day action plan. Elvanis reads all your active signals, prioritises them by impact, and produces a clear prioritised plan showing what to fix, in what order, and why. Available on Navigator only.',
      },
      {
        q: 'When is my digest generated?',
        a: 'Your first digest is generated on your monthly anniversary date — one month after you joined. After that, it regenerates every month automatically. Your admin can also generate it manually.',
      },
      {
        q: 'How is Navigator different from Free?',
        a: 'Free gives you monthly scans, 3 tool connections, unlimited signals, and the health assessment. Navigator adds weekly scans for Jira and Intercom, unlimited tool connections, the monthly AI Action Digest, manual on-demand scans, conflict resolution, and impact tracking.',
      },
    ],
  },
  {
    section: 'AI Features',
    icon: '✨',
    articles: [
      {
        q: 'What is the AI Readiness Score?',
        a: 'The AI Readiness Score shows how ready your business is for AI automation, calculated from your active signals and team capacity. A higher score means more immediate opportunities to save time or revenue through AI. It updates every scan cycle.',
      },
      {
        q: 'What are AI Opportunities?',
        a: 'AI Opportunities are specific automation recommendations based on your active signals. For example, if your ticket volume is spiking, Elvanis suggests an AI Support Agent and estimates the time saving. Each opportunity shows complexity, time to implement, and estimated saving.',
      },
    ],
  },
]

// ── Help Panel ────────────────────────────────────────────────
export function HelpPanel({ onRestartTour }: { onRestartTour: () => void }) {
  const t    = useT()
  const lang = useLang()
  const isAr = lang === 'ar'
  const [open,       setOpen]       = useState(false)
  const [search,     setSearch]     = useState('')
  const [expanded,   setExpanded]   = useState<string | null>(null)
  const panelRef                    = useRef<HTMLDivElement>(null)

  // Listen for open event from header
  useEffect(() => {
    const handler = () => setOpen(true)
    document.addEventListener('elvanis:open-help', handler)
    return () => document.removeEventListener('elvanis:open-help', handler)
  }, [])

  // Close on outside click
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [open])

  // Close on Escape
  useEffect(() => {
    function handle(e: KeyboardEvent) { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('keydown', handle)
    return () => document.removeEventListener('keydown', handle)
  }, [])

  // Filter articles by search
  const filtered = FAQ.map(section => ({
    ...section,
    articles: section.articles.filter(
      a => !search || a.q.toLowerCase().includes(search.toLowerCase()) || a.a.toLowerCase().includes(search.toLowerCase())
    ),
  })).filter(s => s.articles.length > 0)

  function handleRestartTour() {
    setOpen(false)
    onRestartTour()
  }

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.3)', zIndex: 400, backdropFilter: 'blur(2px)' }}
          onClick={() => setOpen(false)}
        />
      )}

      {/* Slide-in panel */}
      <div
        ref={panelRef}
        style={{
          position: 'fixed', top: 0, [isAr ? 'left' : 'right']: 0, bottom: 0,
          width: 420, background: '#fff',
          boxShadow: isAr ? '8px 0 32px rgba(15,23,42,0.12)' : '-8px 0 32px rgba(15,23,42,0.12)',
          zIndex: 401,
          transform: open ? 'translateX(0)' : isAr ? 'translateX(-100%)' : 'translateX(100%)',
          transition: 'transform 0.28s cubic-bezier(0.4,0,0.2,1)',
          display: 'flex', flexDirection: 'column',
          fontFamily: 'Inter, -apple-system, sans-serif',
          direction: isAr ? 'rtl' : 'ltr',
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
                width: '100%', padding: isAr ? '10px 36px 10px 12px' : '10px 12px 10px 36px',
                border: '1.5px solid #E2E8F0', borderRadius: 10,
                fontSize: 14, color: '#0F172A', outline: 'none',
                boxSizing: 'border-box' as const,
                fontFamily: 'inherit',
                transition: 'border-color 0.15s',
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
              <div key={section.section} style={{ marginBottom: 24 }}>
                {/* Section header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <span style={{ fontSize: 16 }}>{section.icon}</span>
                  <h3 style={{ fontSize: 12, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.1em', margin: 0 }}>{section.section}</h3>
                </div>

                {/* Articles */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {section.articles.map(article => {
                    const key     = `${section.section}-${article.q}`
                    const isOpen  = expanded === key
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
                          <span style={{ fontSize: 14, fontWeight: 500, color: '#0F172A', lineHeight: 1.4 }}>{article.q}</span>
                          <span style={{ fontSize: 12, color: '#94A3B8', flexShrink: 0, transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>▾</span>
                        </button>
                        {isOpen && (
                          <div style={{ padding: '0 14px 14px' }}>
                            <p style={{ fontSize: 13, color: '#475569', lineHeight: 1.75, margin: 0 }}>{article.a}</p>
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
          {/* Restart tour */}
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

          {/* HubSpot chat */}
          <button
            onClick={() => {
              setOpen(false)
              // Open HubSpot chat widget
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
