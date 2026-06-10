
'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { dismissGuide } from './actions'

const TOUR_STEPS = [
  { id: 'tour-header',       title: 'Your navigation',         body: 'Signals — live diagnosed issues. Connect — link your tools. Plan — AI action digest. Measure — track fixes. Health Tracker — score trends. Profile — account settings.' },
  { id: 'tour-health',       title: 'Business Health Score',   body: 'Your overall score from 0–100 across 6 dimensions. Below 40 means critical issues. Above 70 means healthy operating range. Updates every scan cycle.' },
  { id: 'tour-ai-readiness', title: 'AI Readiness Score',      body: 'How ready your business is for AI automation based on active signals and team capacity. Higher score = more hours AI could save you right now.' },
  { id: 'tour-signals',      title: 'Active Signals',          body: 'Total issues detected across your connected tools. Each signal has a root cause and a specific recommended fix. Critical = act now. Warning = plan this week.' },
  { id: 'tour-fix-first',    title: 'Fix This First',          body: 'Your top 3 signals ranked by impact and severity. Start here every time you open the dashboard. Each card shows the root cause and exact action to take.' },
  { id: 'tour-sources',      title: 'Connected Sources',       body: 'Every tool connected and when it was last scanned. Green = live. Add more sources to get more precise signals across more dimensions.' },
  { id: 'tour-impact',       title: 'Impact Tracking',         body: 'After fixing a signal and running another scan, Elvanis shows whether the metric improved, worsened, or stayed the same. Proof your fix worked.' },
  { id: 'tour-digest',       title: 'Action Digest',           body: 'Your monthly AI-generated 90-day action plan built from all your signals. Shows exactly what to prioritise and why. Navigator plan only.' },
  { id: 'tour-ai-opps',      title: 'AI Opportunities',        body: 'Where AI automation would save the most time or revenue based on your signals. Shows complexity, implementation time, and estimated saving.' },
  { id: 'tour-assessment',   title: 'Assessment Score',        body: 'Your scored diagnosis from the 26-question assessment across Revenue, PMF, Team, Customer, Marketing, and Strategy. Retake after major changes.' },
]

// ── Section tooltip ───────────────────────────────────────────
export function SectionTooltip({ text }: { text: string }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [open])

  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: 18, height: 18, borderRadius: '50%',
          background: open ? '#EFF6FF' : '#F1F5F9',
          border: `1px solid ${open ? '#BFDBFE' : '#E2E8F0'}`,
          color: open ? '#2563EB' : '#94A3B8',
          fontSize: 10, fontWeight: 700, cursor: 'pointer',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          padding: 0, transition: 'all 0.15s', fontFamily: 'Inter, sans-serif',
        }}
      >
        ?
      </button>
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 8px)', left: '50%',
          transform: 'translateX(-50%)',
          background: '#0F172A', color: '#E2E8F0',
          fontSize: 12, lineHeight: 1.65, padding: '10px 14px',
          borderRadius: 8, width: 220, zIndex: 300,
          boxShadow: '0 4px 16px rgba(0,0,0,0.25)', pointerEvents: 'none',
        }}>
          <div style={{ position: 'absolute', top: -5, left: '50%', transform: 'translateX(-50%)', width: 0, height: 0, borderLeft: '5px solid transparent', borderRight: '5px solid transparent', borderBottom: '5px solid #0F172A' }} />
          {text}
        </div>
      )}
    </div>
  )
}

// ── Main tour ─────────────────────────────────────────────────
export function DashboardTour({ guideDismissed }: { guideDismissed: boolean }) {
  const router = useRouter()
  const [step, setStep]       = useState(0)
  const [active, setActive]   = useState(false)
  const [rect, setRect]       = useState<DOMRect | null>(null)
  const [helpOpen, setHelpOpen] = useState(false)
  const [portalEl, setPortalEl] = useState<HTMLElement | null>(null)
  
  // Track welcome card layout overlay separate from active steps
  const [showWelcomeCard, setShowWelcomeCard] = useState(!guideDismissed)
  
  const hasDismissed = useRef(false)

  // Create portal container and attach to body
  useEffect(() => {
    const div = document.createElement('div')
    div.id = 'elvanis-tour-portal'
    div.style.cssText = 'position:fixed;top:0;left:0;width:0;height:0;z-index:10000;'
    document.body.appendChild(div)
    setPortalEl(div)
    return () => { document.body.removeChild(div) }
  }, [])

  // Measure element on step change
  const measure = useCallback(() => {
    const el = document.getElementById(TOUR_STEPS[step]?.id ?? '')
    if (!el) {
      setRect({
        top: window.innerHeight / 2 - 120,
        left: window.innerWidth / 2 - 150,
        right: window.innerWidth / 2 + 150,
        bottom: window.innerHeight / 2 + 120,
        width: 300, height: 240,
        x: window.innerWidth / 2 - 150,
        y: window.innerHeight / 2 - 120,
        toJSON: () => ({}),
      } as DOMRect)
      return
    }
    const position = getComputedStyle(el).position
    if (position === 'fixed' || position === 'sticky') {
      const r = el.getBoundingClientRect()
      setRect({ top: r.top, left: r.left, right: r.right, bottom: r.bottom, width: r.width, height: r.height, x: r.x, y: r.y, toJSON: r.toJSON } as DOMRect)
      return
    }
    el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    setTimeout(() => {
      const r = el.getBoundingClientRect()
      setRect({ top: r.top, left: r.left, right: r.right, bottom: r.bottom, width: r.width, height: r.height, x: r.x, y: r.y, toJSON: r.toJSON } as DOMRect)
    }, 450)
  }, [step])

  useEffect(() => {
    if (!active || !portalEl) return
    setRect(null)
    const t = setTimeout(measure, 100)
    return () => clearTimeout(t)
  }, [active, step, measure, portalEl])

  useEffect(() => {
    if (!active) return
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [active, measure])

  async function doSkip() {
    if (hasDismissed.current) return
    hasDismissed.current = true
    setActive(false)
    setShowWelcomeCard(false)
    if (!guideDismissed) {
      await dismissGuide()
      setTimeout(() => router.refresh(), 300)
    }
  }

  async function doNext() {
    if (step < TOUR_STEPS.length - 1) {
      setStep(s => s + 1)
    } else {
      await doSkip()
    }
  }

  function startInteractiveTour() {
    setShowWelcomeCard(false)
    setStep(0)
    setRect(null)
    setActive(true)
  }

  function doRestart() {
    hasDismissed.current = false
    setHelpOpen(false)
    startInteractiveTour()
  }

  if (!portalEl) return null

  const PAD    = 6
  const CARD_W = 300
  const isLast = step === TOUR_STEPS.length - 1

  let cardTop = 0, cardLeft = 0
  if (rect) {
    cardTop  = rect.bottom + PAD + 6
    cardLeft = rect.left + rect.width / 2 - CARD_W / 2
    cardLeft = Math.max(16, Math.min(cardLeft, window.innerWidth - CARD_W - 16))
    if (cardTop + 240 > window.innerHeight) cardTop = Math.max(8, rect.top - 240 - PAD)
    cardTop = Math.max(8, cardTop)
  }

  return (
    <>
      {/* ── Fixed Position Top Modal Overlay for Welcome Card ── */}
      {showWelcomeCard && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(2, 6, 23, 0.75)',
          backdropFilter: 'blur(4px)',
          zIndex: 10010,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
          animation: 'tourIn 0.2s ease-out'
        }}>
          <div style={{
            background: 'linear-gradient(180deg, #0F172A 0%, #020617 100%)',
            border: '1px solid #1E293B',
            borderRadius: 16,
            padding: '32px',
            maxWidth: '560px',
            width: '100%',
            fontFamily: 'Inter, -apple-system, sans-serif',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
            textAlign: 'center'
          }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: '#3B82F6', letterSpacing: '0.15em', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>
              System Initialized Successfully
            </span>
            <h2 style={{ fontSize: 22, fontWeight: 600, color: '#F1F5F9', margin: '0 0 12px', letterSpacing: '-0.025em' }}>
              Welcome to your Elvanis Workspace
            </h2>
            <p style={{ fontSize: 14, color: '#94A3B8', margin: '0 0 28px', lineHeight: 1.6 }}>
              Your workspace data profile has populated. To navigate your business metrics, active signals, and AI roadmap smoothly, take a brief platform overview.
            </p>

            <div style={{ display: 'flex', gap: '14px', justifyContent: 'center', alignItems: 'center' }}>
              <button
                type="button"
                onClick={doSkip}
                style={{ background: 'none', border: 'none', color: '#64748B', fontSize: 14, fontWeight: 500, cursor: 'pointer', padding: '10px 16px' }}
              >
                Skip Overview
              </button>
              <button
                type="button"
                onClick={startInteractiveTour}
                style={{
                  background: '#2563EB',
                  color: '#fff',
                  border: 'none',
                  padding: '12px 24px',
                  borderRadius: 10,
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(37,99,235,0.25)',
                  transition: 'background 0.15s'
                }}
                onMouseOver={(e) => e.currentTarget.style.background = '#1D4ED8'}
                onMouseOut={(e) => e.currentTarget.style.background = '#2563EB'}
              >
                Start Workspace Tour →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Step-by-Step Interactive Layout Engine Portal ── */}
      {createPortal(
        <>
          {active && (
            <>
              {/* Dark Layout Clip-Mask Overlay */}
              {rect ? (
                <>
                  <div style={{ position: 'fixed', top: 0,              left: 0,             right: 0,  height: Math.max(0, rect.top - PAD),                       background: 'rgba(2,6,23,0.55)', zIndex: 10001, pointerEvents: 'none' }} />
                  <div style={{ position: 'fixed', top: rect.bottom+PAD, left: 0,            right: 0,  bottom: 0,                                                  background: 'rgba(2,6,23,0.55)', zIndex: 10001, pointerEvents: 'none' }} />
                  <div style={{ position: 'fixed', top: Math.max(0,rect.top-PAD), left: 0,  width: Math.max(0, rect.left-PAD), height: rect.height+PAD*2,           background: 'rgba(2,6,23,0.55)', zIndex: 10001, pointerEvents: 'none' }} />
                  <div style={{ position: 'fixed', top: Math.max(0,rect.top-PAD), left: rect.right+PAD, right: 0, height: rect.height+PAD*2,                        background: 'rgba(2,6,23,0.55)', zIndex: 10001, pointerEvents: 'none' }} />
                  <div style={{ position: 'fixed', top: Math.max(0,rect.top-PAD), left: Math.max(0,rect.left-PAD), width: rect.width+PAD*2, height: rect.height+PAD*2, border: '2px solid #3B82F6', borderRadius: 14, boxShadow: '0 0 0 4px rgba(37,99,235,0.2)', outline: '9999px solid rgba(2,6,23,0.82)', zIndex: 10001, pointerEvents: 'none' }} />                </>
              ) : (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(2,6,23,0.55)', zIndex: 10001, pointerEvents: 'none' }} />
              )}

              {/* Step Card Element */}
              {rect && (
                <div
                  key={`card-${step}`}
                  style={{ position: 'fixed', top: cardTop, left: cardLeft, width: CARD_W, zIndex: 10002, background: '#0F172A', borderRadius: 14, border: '1px solid #334155', padding: '20px', boxShadow: '0 20px 60px rgba(0,0,0,0.8)', fontFamily: 'Inter, -apple-system, sans-serif', animation: 'tourIn 0.22s ease' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: '#3B82F6', letterSpacing: '0.12em', textTransform: 'uppercase' }}>{step + 1} / {TOUR_STEPS.length}</span>
                    <button onClick={doSkip} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#475569', fontSize: 16, padding: 0, lineHeight: 1 }}>✕</button>
                  </div>
                  <div style={{ height: 2, background: '#1E293B', borderRadius: 99, marginBottom: 14 }}>
                    <div style={{ height: 2, background: '#3B82F6', borderRadius: 99, width: `${((step+1)/TOUR_STEPS.length)*100}%`, transition: 'width 0.3s ease' }} />
                  </div>
                  <h3 style={{ fontSize: 15, fontWeight: 700, color: '#F1F5F9', margin: '0 0 8px' }}>{TOUR_STEPS[step].title}</h3>
                  <p  style={{ fontSize: 13, color: '#94A3B8', lineHeight: 1.65, margin: '0 0 18px' }}>{TOUR_STEPS[step].body}</p>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
<button onClick={doSkip} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: '#94A3B8', padding: 0, fontFamily: 'inherit' }}>Skip tour</button>
                    <button onClick={doNext} style={{ padding: '9px 20px', background: '#2563EB', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                      {isLast ? "Got it, let's go →" : 'Next →'}
                    </button>
                  </div>
                </div>
              )}
            </>
          )}

          {/* ── Persistent Floating Help Widget ── */}
          <div style={{ position: 'fixed', bottom: 28, right: 28, zIndex: 9999 }}>
            {helpOpen && (
              <div style={{ position: 'absolute', bottom: 56, right: 0, background: '#0F172A', borderRadius: 12, border: '1px solid #1E293B', padding: '18px', width: 220, boxShadow: '0 8px 32px rgba(0,0,0,0.4)', fontFamily: 'Inter, sans-serif' }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: '#F1F5F9', margin: '0 0 8px' }}>Need help?</p>
                <p style={{ fontSize: 12, color: '#94A3B8', margin: '0 0 14px', lineHeight: 1.65 }}>Restart the tour to see what each section does.</p>
                <button onClick={doRestart} style={{ width: '100%', padding: '9px', background: '#2563EB', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Restart tour →</button>
              </div>
            )}
            <button
              onClick={() => setHelpOpen(o => !o)}
              style={{ width: 44, height: 44, borderRadius: '50%', background: helpOpen ? '#1E293B' : '#0F172A', border: '2px solid #1E293B', color: helpOpen ? '#3B82F6' : '#94A3B8', fontSize: 20, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 16px rgba(0,0,0,0.3)', transition: 'all 0.15s' }}
              title="Help"
            >
              ?
            </button>
          </div>

          <style>{`
            @keyframes tourIn { from { opacity:0; transform:translateY(6px) } to { opacity:1; transform:translateY(0) } }
          `}</style>
        </>,
        portalEl
      )}
    </>
  )
}

