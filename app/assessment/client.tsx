'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

type Props = {
  founderId: string
  language: string
  founderStage: string
  founderMarket: string
  founderIndustry: string
  founderIndustryOther: string
  founderBrandUrl: string
}

type UIState = 'intro' | 'question' | 'flash' | 'numbers' | 'submitting'

// ── Color palette ─────────────────────────────────────────────
const BG        = '#0F172A'
const BG_FLASH  = '#090E1A'
const BG_CARD   = 'rgba(255,255,255,0.05)'
const BG_SELECTED = 'rgba(59,130,246,0.15)'
const BORDER    = 'rgba(255,255,255,0.1)'
const BORDER_HOVER = 'rgba(255,255,255,0.25)'
const BORDER_SEL = '#3B82F6'
const ACCENT    = '#3B82F6'
const TEXT      = '#FFFFFF'
const TEXT_SUB  = '#AAAAAA'
const TEXT_MUTED = '#8899AA'
const TEXT_HINT = '#667788'
const NUM_BG    = 'rgba(255,255,255,0.08)'

// ── 4-page structure — original questions preserved ───────────
const PAGES = [
  {
    number: '01',
    title: 'Your Business Context',
    objective: 'Establish your structural baseline before diagnosing any problem.',
    indicators: 'Stage · Model · Investment · Team · Tech stack · Analytics maturity · Execution blocker',
    time: '2 min',
    questions: [
      { id: 'founder_stage',      section: 'Context',  label: 'Where is your business right now?',                                                              why: 'This determines which signals matter most for your stage.',                type: 'choice' as const, options: ['We have a product and customers', 'We are early stage or pre-product'] },
      { id: 'business_model',     section: 'Context',  label: 'What is your primary business model?',                                                           why: 'Revenue model shapes every diagnostic benchmark we use.',                 type: 'choice' as const, options: ['SaaS / Subscription', 'E-commerce', 'Marketplace', 'Services / Agency', 'D2C / Consumer brand', 'Other'] },
      { id: 'investment_status',  section: 'Context',  label: 'What is your investment situation?',                                                             why: 'Runway constraints change which problems are urgent vs important.',        type: 'choice' as const, options: ['Bootstrapped — self-funded', 'Pre-seed or angel funded', 'Seed funded', 'Series A or above', 'Actively fundraising right now', 'Not applicable — established SME'] },
      { id: 'team_size',          section: 'Context',  label: 'How many people work in your business full time?',                                               why: 'Team size determines realistic execution capacity for each fix.',          type: 'choice' as const, options: ['Just me', '2–5 people', '6–15 people', '16–50 people', '50+ people'] },
      { id: 'technical_capacity', section: 'Context',  label: 'Do you have technical or engineering capacity in-house?',                                        why: 'This shapes which solutions are immediately actionable.',                  type: 'choice' as const, options: ['Yes — strong technical team', 'Yes — limited technical capacity', 'No — we outsource development', 'No — non-technical business'] },
      { id: 'analytics_maturity', section: 'Context',  label: 'Do you use analytics tools to track performance?',                                               why: 'We use this to calculate your data infrastructure signal.',                type: 'choice' as const, options: ['Yes — I use tools actively and trust the data', 'Yes — I have tools but rarely look at them', 'Partially — some basic tracking', 'No — I run on gut feel', 'No — too early stage'] },
      { id: 'execution_blocker',  section: 'Context',  label: 'When you identify a problem, what usually stops you acting on it?',                             why: 'The execution gap is often more damaging than the problem itself.',        type: 'choice' as const, options: ['Not enough time', 'Team cannot execute', 'Not sure what the right solution is', 'Avoiding the decision', 'No budget or resources', 'Nothing — I act quickly'] },
    ],
  },
  {
    number: '02',
    title: 'Your Growth Blockers',
    objective: 'Expose demand constraints, pipeline leakage, and distribution friction.',
    indicators: 'Revenue trends · PMF signals · Pricing confidence · ICP clarity · Funnel drop-off',
    time: '3 min',
    questions: [
      { id: 'biggest_problem_now', section: 'Context',  label: 'What is the single biggest problem hurting your business right now?',                          why: 'We cross-reference this with your data signals for root cause analysis.',  type: 'text' as const },
      { id: 'runway',              section: 'Revenue',  label: 'How many months of runway do you have?',                                                        why: 'Runway determines urgency level across all recommendations.',               type: 'choice' as const, options: ['More than 18 months', '12–18 months', '6–12 months', '3–6 months', 'Less than 3 months', 'Not applicable — profitable'] },
      { id: 'win_reason',          section: 'Revenue',  label: 'When you win a new customer, what is the main reason they chose you?',                         why: 'Understanding your win reason reveals your true competitive moat.',          type: 'text' as const },
      { id: 'pricing_confidence',  section: 'Revenue',  label: 'How confident are you in your pricing?',                                                        why: 'We use this to calculate your pricing signal and benchmark you against peers.', type: 'scale' as const },
      { id: 'financial_concern',   section: 'Revenue',  label: 'What is your biggest financial concern right now?',                                             why: 'Financial pressure shapes which growth levers to pull first.',               type: 'text' as const },
      { id: 'pmf_reaction',        section: 'Product',  label: 'If your product disappeared tomorrow, how would customers react?',                             why: 'The single most predictive PMF signal we measure.',                         type: 'choice' as const, options: ['Devastated — no real alternative', 'Disappointed — but would find something else', 'Indifferent — would move on quickly', 'Not sure — have not asked them', 'No customers yet'] },
      { id: 'icp_alignment',       section: 'Product',  label: 'Who gets the most value from your product?',                                                   why: 'ICP clarity is the highest-leverage growth lever for most founders.',        type: 'text' as const },
      { id: 'icp_targeting',       section: 'Product',  label: 'Is that who you are currently targeting and acquiring?',                                       why: 'ICP drift is the silent killer of growth efficiency.',                       type: 'choice' as const, options: ['Yes — perfectly aligned', 'Mostly — some misalignment', 'No — we target a different segment', 'Not sure'] },
      { id: 'ideal_customer',      section: 'Marketing',label: 'Describe your ideal customer in one sentence — who they are and what pain you solve.',         why: 'Precision here predicts CAC efficiency and retention.',                      type: 'text' as const },
      { id: 'already_tried',       section: 'Context',  label: 'What have you already tried to fix your main problem?',                                        why: 'We exclude dead-end recommendations based on prior attempts.',               type: 'text' as const },
      { id: 'target_90_days',      section: 'Context',  label: 'What is the most important thing to achieve in the next 90 days — and what happens if you do not?', why: 'We weight your signal priorities against this 90-day horizon.',         type: 'text' as const },
    ],
  },
  {
    number: '03',
    title: 'Your Team & Strategy',
    objective: 'Measure execution velocity, internal alignment, and strategic clarity.',
    indicators: 'Team alignment · Bug process · Churn drivers · Referrals · Strategic vision · Process maturity',
    time: '3 min',
    questions: [
      { id: 'team_alignment',    section: 'Team',     label: 'How aligned are your tech and business teams on priorities?',                                     why: 'Misalignment is the #1 predictor of delivery velocity collapse.',            type: 'choice' as const, options: ['Fully aligned', 'Mostly aligned', 'Partly misaligned', 'Seriously misaligned — frequent conflict', 'Not applicable — solo or single team'] },
      { id: 'bug_process',       section: 'Team',     label: 'When bugs reach customers — how does your team find out and how fast do you fix them?',           why: 'Bug response time is a leading indicator of product health score.',          type: 'text' as const },
      { id: 'churn_reason',      section: 'Customer', label: 'When customers cancel or stop buying, what reason do they most commonly give?',                   why: 'Exit reasons reveal the gap between your promise and delivery.',              type: 'text' as const },
      { id: 'customer_complaint',section: 'Customer', label: 'What do your customers complain about most?',                                                     why: 'Complaint patterns predict your next churn spike before data shows it.',      type: 'text' as const },
      { id: 'referral_frequency',section: 'Customer', label: 'How often do customers refer others without being asked?',                                        why: 'Organic referral rate is your most honest NPS proxy.',                       type: 'choice' as const, options: ['Regularly', 'Occasionally', 'Rarely', 'Never', 'Too early to measure'] },
      { id: 'avoided_decision',  section: 'Strategy', label: 'What is the one decision you have been avoiding that would change the business if you made it?',  why: 'Avoided decisions are the most common source of strategic drift.',            type: 'text' as const },
      { id: 'team_focus',        section: 'Strategy', label: 'Is your team working on the right things — or busy but not moving the needle?',                   why: 'We use this to weight your delivery efficiency signal.',                      type: 'choice' as const, options: ['Working on the right things', 'Mostly right', 'Busy but unclear impact', 'Clearly off track'] },
      { id: 'success_12m',       section: 'Strategy', label: 'What does success look like in 12 months — be specific with a number?',                          why: 'A concrete number anchors every priority recommendation we make.',            type: 'text' as const },
      { id: 'process_maturity',  section: 'Strategy', label: 'Do you have documented processes — and does the team actually follow them?',                      why: 'Process gaps predict operational fragility as you scale.',                    type: 'choice' as const, options: ['Documented and followed', 'Partially documented', 'Documented but not followed', 'Not documented', 'Too early'] },
    ],
  },
]

const REAL_NUMBERS = [
  { id: 'num_mrr',        label: 'Monthly Recurring Revenue (MRR)', placeholder: 'e.g. £12,000',  group: 'Revenue' },
  { id: 'num_mrr_growth', label: 'MRR growth last month',           placeholder: 'e.g. +8% or -2%', group: 'Revenue' },
  { id: 'num_cac',        label: 'Customer Acquisition Cost (CAC)', placeholder: 'e.g. £450',      group: 'Revenue' },
  { id: 'num_ltv',        label: 'Customer Lifetime Value (LTV)',   placeholder: 'e.g. £2,200',    group: 'Revenue' },
  { id: 'num_churn',      label: 'Monthly churn rate',              placeholder: 'e.g. 4.5%',      group: 'Customer' },
  { id: 'num_nps',        label: 'NPS score (if measured)',         placeholder: 'e.g. 42',        group: 'Customer' },
]

// ── Dynamic insight engine ────────────────────────────────────
function getInsight(fromPage: number, answers: Record<string, string>): string {
  if (fromPage === 0) {
    const stage   = answers.founder_stage      ?? ''
    const blocker = answers.execution_blocker  ?? ''
    const data    = answers.analytics_maturity ?? ''
    if (stage.includes('early') && blocker.includes('Team'))
      return 'Baseline calculated. Your stage signals are consistent — but human capital velocity is the primary execution bottleneck. Next: isolating where your growth vectors are leaking.'
    if (blocker.includes('Not sure') || blocker.includes('Avoiding'))
      return 'Baseline calculated. Decision paralysis is your most expensive operating cost right now. Next: mapping the commercial signals behind your biggest blocker.'
    if (data.includes('gut feel') || data.includes('rarely'))
      return 'Baseline calculated. Scaling on incomplete data infrastructure is a high-risk pattern at every stage. Next: finding where that blind spot is costing you the most.'
    if (stage.includes('product and customers') && blocker.includes('Nothing'))
      return 'Baseline calculated. Strong execution foundation detected. Next: pressure-testing your growth architecture for hidden constraints.'
    return 'Baseline calculated. Context profiled. Next: mapping your commercial growth vectors and revenue signals.'
  }
  if (fromPage === 1) {
    const pmf    = answers.pmf_reaction  ?? ''
    const icp    = answers.icp_targeting ?? ''
    const runway = answers.runway        ?? ''
    if (pmf.includes('Indifferent') || pmf.includes('Not sure'))
      return 'Growth vectors mapped. Weak product-market fit signal detected — this is upstream of every other problem. Next: examining whether your team can course-correct before runway pressure forces the decision.'
    if (icp.includes('No — we target') || icp.includes('Not sure'))
      return 'Growth vectors mapped. ICP drift confirmed — you are acquiring the wrong customers at scale. Next: assessing whether your team has the alignment to fix this.'
    if (runway.includes('Less than 3') || runway.includes('3–6'))
      return 'Growth vectors mapped. Critical runway constraint detected. Every recommendation will be weighted for speed of impact, not long-term optimisation.'
    if (pmf.includes('Devastated'))
      return 'Growth vectors mapped. Strong PMF signal confirmed. Next: diagnosing whether your team and operational structure can scale what is working.'
    return 'Growth vectors mapped. Revenue architecture profiled. Next: assessing your execution capacity and strategic alignment.'
  }
  return 'Organisational vectors mapped. Team and strategy profiled. Final step: calibrating your score with hard quantitative data.'
}

// ── Progress bar ──────────────────────────────────────────────
function ProgressBar({ value }: { value: number }) {
  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, height: 2, background: '#1a1a1a', zIndex: 200 }}>
      <div style={{ height: '100%', background: ACCENT, width: `${value}%`, transition: 'width 0.5s ease' }} />
    </div>
  )
}

// ── Logo ──────────────────────────────────────────────────────
function Logo() {
  return (
    <div style={{ position: 'fixed', top: 20, left: 28, zIndex: 100 }}>
      <span style={{ fontSize: 18, fontWeight: 900, color: ACCENT, letterSpacing: '-0.5px' }}>Elvanis</span>
    </div>
  )
}

// ── INTRO STATE ───────────────────────────────────────────────
function IntroScreen({ page, pageIndex, onBegin, progress }: {
  page: typeof PAGES[0]; pageIndex: number; onBegin: () => void; progress: number
}) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onBegin() }
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onBegin])

  return (
    <div style={{ minHeight: '100vh', background: BG, fontFamily: 'Inter, -apple-system, sans-serif' }}>
      <ProgressBar value={progress} />
      <Logo />

      {/* Large faded chapter number */}
      <div style={{
        position: 'fixed', right: -10, top: '50%', transform: 'translateY(-50%)',
        fontSize: 280, fontWeight: 900, color: '#1c1c1c', lineHeight: 1,
        userSelect: 'none', pointerEvents: 'none', zIndex: 0,
      }}>
        {page.number}
      </div>

      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '80px 40px', position: 'relative', zIndex: 10,
      }}>
        <div style={{ maxWidth: 620, width: '100%' }}>

          {/* Phase meta */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 36 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: ACCENT, letterSpacing: '0.18em', textTransform: 'uppercase' }}>
              Phase {page.number}
            </span>
            <span style={{ width: 1, height: 14, background: '#2a2a2a' }} />
            <span style={{ fontSize: 12, color: TEXT_MUTED }}>{page.questions.length} questions</span>
            <span style={{ width: 1, height: 14, background: '#2a2a2a' }} />
            <span style={{ fontSize: 12, color: TEXT_MUTED }}>{page.time}</span>
          </div>

          {/* Title */}
          <h1 style={{ fontSize: 52, fontWeight: 900, color: TEXT, lineHeight: 1.1, marginBottom: 20, letterSpacing: '-1.5px', margin: '0 0 20px' }}>
            {page.title}
          </h1>

          {/* Objective */}
          <p style={{ fontSize: 17, color: TEXT_SUB, lineHeight: 1.7, marginBottom: 10, margin: '0 0 10px' }}>
            {page.objective}
          </p>

          {/* Indicators */}
          <p style={{ fontSize: 13, color: TEXT_HINT, letterSpacing: '0.02em', marginBottom: 52, margin: '0 0 52px' }}>
            {page.indicators}
          </p>

          {/* Begin button */}
          <button
            onClick={onBegin}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 14,
              padding: '14px 28px', background: 'transparent',
              border: '1px solid #333', borderRadius: 8,
              color: '#BBBBBB', fontSize: 14, fontWeight: 500,
              cursor: 'pointer', fontFamily: 'inherit',
              transition: 'all 0.2s',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = ACCENT; e.currentTarget.style.color = TEXT }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = '#333'; e.currentTarget.style.color = '#BBBBBB' }}
          >
            Initiate phase {page.number}
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <kbd style={{ fontSize: 11, color: '#777', background: '#1e1e1e', padding: '2px 8px', borderRadius: 4, border: '1px solid #2e2e2e' }}>Space</kbd>
              <span style={{ fontSize: 11, color: '#444' }}>or</span>
              <kbd style={{ fontSize: 11, color: '#777', background: '#1e1e1e', padding: '2px 8px', borderRadius: 4, border: '1px solid #2e2e2e' }}>Enter</kbd>
            </span>
          </button>

          {/* Page dots */}
          <div style={{ display: 'flex', gap: 6, marginTop: 48 }}>
            {PAGES.map((_, i) => (
              <div key={i} style={{
                width: i === pageIndex ? 22 : 6, height: 6, borderRadius: 3,
                background: i === pageIndex ? ACCENT : '#222',
                transition: 'all 0.3s',
              }} />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── FLASH STATE ───────────────────────────────────────────────
function FlashScreen({ insight, onDone, progress }: { insight: string; onDone: () => void; progress: number }) {
  const [phase, setPhase] = useState<'loading' | 'insight'>('loading')
  const [opacity, setOpacity] = useState(1)

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('insight'), 1300)
    const t2 = setTimeout(() => setOpacity(0), 3600)
    const t3 = setTimeout(onDone, 4000)
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3) }
  }, [onDone])

  return (
    <div style={{
      position: 'fixed', inset: 0, background: BG_FLASH,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: 60, zIndex: 300, opacity, transition: 'opacity 0.4s ease',
      fontFamily: 'Inter, -apple-system, sans-serif',
    }}>
      <ProgressBar value={progress} />

      {phase === 'loading' && (
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 220, height: 1, background: '#1a1a1a', margin: '0 auto 20px', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, background: ACCENT, animation: 'loadbar 1.1s ease-in-out forwards' }} />
          </div>
          <p style={{ fontSize: 10, fontWeight: 700, color: '#3a3a3a', letterSpacing: '0.28em', textTransform: 'uppercase', margin: 0 }}>
            RUNNING METRIC PROFILING
          </p>
        </div>
      )}

      {phase === 'insight' && (
        <div style={{ maxWidth: 580, textAlign: 'center', animation: 'fadeUp 0.5s ease forwards' }}>
          <p style={{ fontSize: 10, fontWeight: 700, color: ACCENT, letterSpacing: '0.28em', textTransform: 'uppercase', marginBottom: 28 }}>
            ⚡ ELVANIS INSIGHT
          </p>
          <p style={{ fontSize: 21, fontWeight: 400, color: TEXT, lineHeight: 1.8, margin: 0, fontStyle: 'italic' }}>
            "{insight}"
          </p>
        </div>
      )}

      <style>{`
        @keyframes loadbar { from { width: 0 } to { width: 100% } }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(18px) } to { opacity: 1; transform: translateY(0) } }
      `}</style>
    </div>
  )
}

// ── QUESTION STATE ────────────────────────────────────────────
function QuestionScreen({ page, pageIndex, qIndex, answers, onAnswer, onAdvance, onBack, progress }: {
  page: typeof PAGES[0]; pageIndex: number; qIndex: number
  answers: Record<string, string>
  onAnswer: (id: string, val: string) => void
  onAdvance: () => void; onBack: () => void; progress: number
}) {
  const q = page.questions[qIndex]
  if (!q) return null

  const answer  = answers[q.id] ?? ''
  const globalQ = PAGES.slice(0, pageIndex).reduce((s, p) => s + p.questions.length, 0) + qIndex + 1
  const totalQ  = PAGES.reduce((s, p) => s + p.questions.length, 0)
  const [visible, setVisible] = useState(true)

  function animAdvance() {
    if (!answer.trim()) return
    setVisible(false)
    setTimeout(() => { onAdvance(); setVisible(true) }, 240)
  }

  function animBack() {
    setVisible(false)
    setTimeout(() => { onBack(); setVisible(true) }, 240)
  }

  const handleKey = useCallback((e: KeyboardEvent) => {
    if (q.type === 'choice') {
      const n = parseInt(e.key)
      if (n >= 1 && n <= (q.options?.length ?? 0)) {
        onAnswer(q.id, q.options![n - 1])
        setTimeout(animAdvance, 300)
        return
      }
    }
    if (q.type === 'scale') {
      const n = parseInt(e.key)
      if (n >= 1 && n <= 5) {
        onAnswer(q.id, String(n))
        setTimeout(animAdvance, 300)
        return
      }
    }
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); animAdvance() }
    if (e.key === 'Backspace' && q.type !== 'text') { e.preventDefault(); animBack() }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, answer])

  useEffect(() => {
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [handleKey])

  return (
    <div style={{ minHeight: '100vh', background: BG, fontFamily: 'Inter, -apple-system, sans-serif' }}>
      <ProgressBar value={progress} />
      <Logo />

      {/* Top right counter */}
      <div style={{ position: 'fixed', top: 20, right: 28, zIndex: 100, display: 'flex', alignItems: 'center', gap: 16 }}>
        color: '#8899AA', fontSize: 13, cursor: 'pointer', padding: 0, fontFamily: 'inherit'
        <span style={{ fontSize: 13, fontWeight: 600, color: '#CCCCCC' }}>
          {globalQ}<span style={{ color: TEXT_HINT, fontWeight: 400 }}> / {totalQ}</span>
        </span>
      </div>

      {/* Large faded question number */}
      <div style={{
        position: 'fixed', right: -10, top: '50%', transform: 'translateY(-50%)',
        fontSize: 260, fontWeight: 900, color: '#1E3A5F', lineHeight: 1,
        userSelect: 'none', pointerEvents: 'none', zIndex: 0,
      }}>
        {String(qIndex + 1).padStart(2, '0')}
      </div>

      {/* Content */}
      <div style={{
        minHeight: '100vh', display: 'flex', flexDirection: 'column',
        alignItems: 'flex-start', justifyContent: 'center',
        maxWidth: 680, margin: '0 auto', padding: '80px 32px',
        position: 'relative', zIndex: 10,
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(-10px)',
        transition: 'opacity 0.24s ease, transform 0.24s ease',
      }}>

        {/* Phase label */}
        <p style={{ fontSize: 11, fontWeight: 700, color: ACCENT, letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 20 }}>
          Phase {page.number} · {q.section}
        </p>

        {/* Question */}
        <h1 style={{ fontSize: 36, fontWeight: 800, color: TEXT, lineHeight: 1.25, marginBottom: 8, maxWidth: 580 }}>
          {q.label}
        </h1>

        {/* Why */}
        <p style={{ fontSize: 13, color: TEXT_MUTED, marginBottom: 36, fontStyle: 'italic' }}>
          {q.why}
        </p>

        {/* ── Choice ── */}
        {q.type === 'choice' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%', maxWidth: 540 }}>
            {q.options?.map((opt, i) => (
              <button
                key={opt}
                onClick={() => {
                  onAnswer(q.id, opt)
                  setVisible(false)
                  setTimeout(() => { onAdvance(); setVisible(true) }, 300)
                }}
                style={{
                  padding: '15px 20px',
                  background: answer === opt ? BG_SELECTED : BG_CARD,
                  border: `1.5px solid ${answer === opt ? BORDER_SEL : BORDER}`,
                  borderRadius: 10, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 16,
                  transition: 'all 0.14s ease', fontFamily: 'inherit', textAlign: 'left',
                }}
                onMouseEnter={e => { if (answer !== opt) { e.currentTarget.style.borderColor = BORDER_HOVER; e.currentTarget.style.background = 'rgba(255,255,255,0.08)' } }}
                onMouseLeave={e => { if (answer !== opt) { e.currentTarget.style.borderColor = BORDER; e.currentTarget.style.background = BG_CARD } }}
              >
                <span style={{
                  minWidth: 28, height: 28, borderRadius: 7,
                  background: answer === opt ? ACCENT : NUM_BG,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 13, fontWeight: 700,
                  color: answer === opt ? '#fff' : '#999',
                  flexShrink: 0, transition: 'all 0.14s',
                }}>
                  {i + 1}
                </span>
                <span style={{ fontSize: 16, color: TEXT, fontWeight: answer === opt ? 600 : 400 }}>
                  {opt}
                </span>
              </button>
            ))}
            <p style={{ fontSize: 12, color: TEXT_HINT, marginTop: 6 }}>
              Press <strong style={{ color: TEXT_MUTED }}>1–{q.options?.length}</strong> to select · auto-advances
            </p>
          </div>
        )}

        {/* ── Text ── */}
        {q.type === 'text' && (
          <div style={{ width: '100%', maxWidth: 560 }}>
            <textarea
              value={answer}
              onChange={e => onAnswer(q.id, e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && e.shiftKey) { e.preventDefault(); animAdvance() } }}
              placeholder="Type your answer..."
              autoFocus
              rows={3}
              style={{
                width: '100%', background: 'transparent', border: 'none',
                borderBottom: `1px solid #2e2e2e`, color: TEXT, fontSize: 19,
                outline: 'none', resize: 'none', fontFamily: 'inherit',
                padding: '10px 0', lineHeight: 1.65, boxSizing: 'border-box' as const,
                transition: 'border-color 0.15s',
              }}
              onFocus={e => e.target.style.borderBottomColor = ACCENT}
              onBlur={e => e.target.style.borderBottomColor = '#2e2e2e'}
            />
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 20 }}>
              <button
                onClick={animAdvance}
                disabled={!answer.trim()}
                style={{
                  padding: '12px 28px',
                  background: answer.trim() ? ACCENT : '#1e1e1e',
                  color: answer.trim() ? '#fff' : '#444',
                  border: 'none', borderRadius: 8, fontSize: 15, fontWeight: 600,
                  cursor: answer.trim() ? 'pointer' : 'not-allowed',
                  transition: 'all 0.15s', fontFamily: 'inherit',
                }}
              >
                Continue →
              </button>
              <span style={{ fontSize: 12, color: TEXT_HINT }}>
                or{' '}
                <kbd style={{ background: '#1e1e1e', color: '#777', padding: '2px 7px', borderRadius: 4, border: '1px solid #2e2e2e', fontSize: 11 }}>
                  Shift + Enter
                </kbd>
              </span>
            </div>
          </div>
        )}

        {/* ── Scale ── */}
        {q.type === 'scale' && (
          <div>
            <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
              {[1, 2, 3, 4, 5].map(n => (
                <button
                  key={n}
                  onClick={() => {
                    onAnswer(q.id, String(n))
                    setVisible(false)
                    setTimeout(() => { onAdvance(); setVisible(true) }, 300)
                  }}
                  style={{
                    width: 60, height: 60, borderRadius: 12,
                    border: `1.5px solid ${answer === String(n) ? ACCENT : BORDER}`,
                    background: answer === String(n) ? ACCENT : BG_CARD,
                    color: answer === String(n) ? '#fff' : '#AAAAAA',
                    fontSize: 20, fontWeight: 700, cursor: 'pointer',
                    transition: 'all 0.14s', fontFamily: 'inherit',
                  }}
                >
                  {n}
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: TEXT_MUTED, marginBottom: 4, width: 310 }}>
              <span>Not confident</span><span>Fully confident</span>
            </div>
            <p style={{ fontSize: 12, color: TEXT_HINT, marginTop: 10 }}>
              Press <strong style={{ color: TEXT_MUTED }}>1–5</strong> to select · auto-advances
            </p>
          </div>
        )}

        {/* Back */}
        {(qIndex > 0 || pageIndex > 0) && (
          <button
            onClick={animBack}
            style={{ marginTop: 36, background: 'none', border: 'none', color: TEXT_MUTED, fontSize: 13, cursor: 'pointer', padding: 0, fontFamily: 'inherit' }}
          >
            ← Back
          </button>
        )}
      </div>
    </div>
  )
}

// ── NUMBERS STATE ─────────────────────────────────────────────
function NumbersScreen({ realNumbers, onChange, onSubmit, error }: {
  realNumbers: Record<string, string>
  onChange: (id: string, val: string) => void
  onSubmit: () => void
  error: string
}) {
  return (
    <div style={{ minHeight: '100vh', background: BG, fontFamily: 'Inter, -apple-system, sans-serif' }}>
      <ProgressBar value={100} />
      <Logo />

      {/* Faded 04 */}
      <div style={{ position: 'fixed', right: -10, top: '50%', transform: 'translateY(-50%)', fontSize: 260, fontWeight: 900, color: '#1E3A5F', lineHeight: 1, userSelect: 'none', pointerEvents: 'none' }}>
        04
      </div>

      <div style={{ maxWidth: 560, margin: '0 auto', padding: '100px 32px 80px', position: 'relative', zIndex: 10 }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: ACCENT, letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 20 }}>
          Phase 04 · Final Calibration
        </p>
        <h1 style={{ fontSize: 44, fontWeight: 900, color: TEXT, marginBottom: 12, letterSpacing: '-1px' }}>
          Your Real Numbers
        </h1>
        <p style={{ fontSize: 16, color: TEXT_SUB, marginBottom: 48, lineHeight: 1.7 }}>
          Optional but powerful. The more precise data you give us, the more accurate your health score.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 28, marginBottom: 48 }}>
          {REAL_NUMBERS.map(field => (
            <div key={field.id}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>
                {field.label}
              </label>
              <input
                type="text"
                value={realNumbers[field.id] ?? ''}
                onChange={e => onChange(field.id, e.target.value)}
                placeholder={field.placeholder}
                style={{
                  width: '100%', padding: '12px 0', background: 'transparent',
                  border: 'none', borderBottom: '1px solid #2e2e2e',
                  color: TEXT, fontSize: 18, outline: 'none',
                  boxSizing: 'border-box' as const, fontFamily: 'inherit',
                  transition: 'border-color 0.15s',
                }}
                onFocus={e => e.target.style.borderBottomColor = ACCENT}
                onBlur={e => e.target.style.borderBottomColor = '#2e2e2e'}
              />
            </div>
          ))}
        </div>

        {error && (
          <div style={{ background: '#1a0000', border: '1px solid #DC2626', borderRadius: 8, padding: '12px 16px', marginBottom: 20 }}>
            <p style={{ color: '#EF4444', fontSize: 14, margin: 0 }}>{error}</p>
          </div>
        )}

        <button
          onClick={onSubmit}
          style={{ width: '100%', padding: '16px', background: ACCENT, color: '#fff', border: 'none', borderRadius: 10, fontSize: 16, fontWeight: 700, cursor: 'pointer', marginBottom: 12, fontFamily: 'inherit' }}
        >
          Generate my health score →
        </button>
        <button
          onClick={onSubmit}
          style={{ width: '100%', padding: '14px', background: 'transparent', color: TEXT_MUTED, border: 'none', fontSize: 14, cursor: 'pointer', fontFamily: 'inherit' }}
        >
          Skip and generate score
        </button>
      </div>
    </div>
  )
}

// ── ROOT ──────────────────────────────────────────────────────
export default function AssessmentClient({ founderId, language }: Props) {
  const router = useRouter()

  const [uiState,     setUiState]     = useState<UIState>('intro')
  const [pageIndex,   setPageIndex]   = useState(0)
  const [qIndex,      setQIndex]      = useState(0)
  const [answers,     setAnswers]     = useState<Record<string, string>>({})
  const [realNumbers, setRealNumbers] = useState<Record<string, string>>({})
  const [insightText, setInsightText] = useState('')
  const [error,       setError]       = useState('')

  const totalQ   = PAGES.reduce((s, p) => s + p.questions.length, 0)
  const doneQ    = PAGES.slice(0, pageIndex).reduce((s, p) => s + p.questions.length, 0) + (uiState === 'question' ? qIndex : 0)
  const progress = uiState === 'numbers' || uiState === 'submitting' ? 100 : Math.round((doneQ / totalQ) * 95)

  function advance() {
    const page = PAGES[pageIndex]
    if (!page) return
    if (qIndex < page.questions.length - 1) {
      setQIndex(q => q + 1)
    } else if (pageIndex < PAGES.length - 1) {
      setInsightText(getInsight(pageIndex, answers))
      setUiState('flash')
      setQIndex(0)
    } else {
      setUiState('numbers')
    }
  }

  function goBack() {
    if (qIndex > 0) {
      setQIndex(q => q - 1)
    } else if (pageIndex > 0) {
      setPageIndex(p => p - 1)
      setQIndex(PAGES[pageIndex - 1].questions.length - 1)
      setUiState('question')
    } else {
      setUiState('intro')
    }
  }

  async function submit() {
    setUiState('submitting')
    setError('')
    const supabase = createClient()

    try {
      const assessmentData = {
        founder_id:           founderId,
        language,
        status:               'completed',
        founder_stage:        answers.founder_stage        ?? null,
        biggest_problem_now:  answers.biggest_problem_now  ?? null,
        business_model:       answers.business_model       ?? null,
        analytics_maturity:   answers.analytics_maturity   ?? null,
        investment_status:    answers.investment_status    ?? null,
        target_90_days:       answers.target_90_days       ?? null,
        execution_blocker:    answers.execution_blocker    ?? null,
        already_tried:        answers.already_tried        ?? null,
        team_size:            answers.team_size            ?? null,
        technical_capacity:   answers.technical_capacity   ?? null,
        runway:               answers.runway               ?? null,
        win_reason:           answers.win_reason           ?? null,
        pricing_confidence:   answers.pricing_confidence ? parseInt(answers.pricing_confidence) : null,
        financial_concern:    answers.financial_concern    ?? null,
        pmf_reaction:         answers.pmf_reaction         ?? null,
        icp_alignment:        answers.icp_alignment        ?? null,
        icp_targeting:        answers.icp_targeting        ?? null,
        team_alignment:       answers.team_alignment       ?? null,
        bug_process:          answers.bug_process          ?? null,
        churn_reason:         answers.churn_reason         ?? null,
        customer_complaint:   answers.customer_complaint   ?? null,
        referral_frequency:   answers.referral_frequency   ?? null,
        ideal_customer:       answers.ideal_customer       ?? null,
        avoided_decision:     answers.avoided_decision     ?? null,
        team_focus:           answers.team_focus           ?? null,
        success_12m:          answers.success_12m          ?? null,
        process_maturity:     answers.process_maturity     ?? null,
        real_numbers:         realNumbers,
        icp_targeting_saved:  answers.icp_targeting        ?? null,
      }

      const { data: assessment, error: aErr } = await supabase
        .from('assessments').insert({
          ...assessmentData,
          icp_targeting: answers.icp_targeting ?? null,
        }).select().single()

      if (aErr) throw new Error('Assessment save failed: ' + aErr.message)

      const res = await fetch('/api/score', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assessmentId: assessment.id,
          founderId,
          answers,
          realNumbers: realNumbers ?? {},
          language,
        }),
      })

      let data: { error?: string; success?: boolean } = {}
      try { data = await res.json() } catch { throw new Error('Server error — check logs') }
      if (!res.ok) throw new Error(data.error ?? 'Scoring failed')

      router.push('/assessment/result')
      router.refresh()
    } catch (err) {
      console.error('Submit error:', err)
      setError(String(err))
      setUiState('numbers')
    }
  }

  // Submitting
  if (uiState === 'submitting') return (
    <div style={{ position: 'fixed', inset: 0, background: BG, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter, sans-serif' }}>
      <div style={{ width: 36, height: 36, border: `2px solid #222`, borderTop: `2px solid ${ACCENT}`, borderRadius: '50%', animation: 'spin 0.8s linear infinite', marginBottom: 24 }} />
      <p style={{ fontSize: 12, fontWeight: 700, color: TEXT_MUTED, letterSpacing: '0.18em', textTransform: 'uppercase' }}>Generating your health score</p>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )

  // Flash
  if (uiState === 'flash') return (
    <FlashScreen
      insight={insightText}
      onDone={() => { setPageIndex(p => p + 1); setQIndex(0); setUiState('intro') }}
      progress={progress}
    />
  )

// Intro
const currentPage = PAGES[pageIndex]
if (uiState === 'intro') {
  if (!currentPage) { setPageIndex(0); return null }
  return (
    <IntroScreen
      page={currentPage}
      pageIndex={pageIndex}
      onBegin={() => setUiState('question')}
      progress={progress}
    />
  )
}

  // Numbers
  if (uiState === 'numbers') return (
    <NumbersScreen
      realNumbers={realNumbers}
      onChange={(id, v) => setRealNumbers(p => ({ ...p, [id]: v }))}
      onSubmit={submit}
      error={error}
    />
  )

  // Question
  if (!currentPage) return null
  return (
    <QuestionScreen
      page={currentPage}
      pageIndex={pageIndex}
      qIndex={qIndex}
      answers={answers}
      onAnswer={(id, v) => setAnswers(p => ({ ...p, [id]: v }))}
      onAdvance={advance}
      onBack={goBack}
      progress={progress}
    />
  )
}
