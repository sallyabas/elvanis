'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { useT } from '@/app/context/LanguageContext'
import { OPTION_MAP } from '@/lib/assessment-answer-map'
import {
  FOUNDER_STAGE, EXECUTION_BLOCKER, ANALYTICS_MATURITY,
  PMF, ICP_TARGETING, RUNWAY,
} from '@/lib/assessment-ids'

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
const BG          = '#0F172A'
const BG_FLASH    = '#090E1A'
const BG_CARD     = 'rgba(255,255,255,0.05)'
const BG_SELECTED = 'rgba(59,130,246,0.15)'
const BORDER      = 'rgba(255,255,255,0.1)'
const BORDER_HOVER = 'rgba(255,255,255,0.25)'
const BORDER_SEL  = '#3B82F6'
const ACCENT      = '#3B82F6'
const TEXT        = '#FFFFFF'
const TEXT_SUB    = '#AAAAAA'
const TEXT_MUTED  = '#8899AA'
const TEXT_HINT   = '#667788'
const NUM_BG      = 'rgba(255,255,255,0.08)'

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
function IntroScreen({ page, pageIndex, totalPages, onBegin, progress, t }: {
  page: { number: string; title: string; objective: string; indicators: string; time: string; questions: unknown[] }
  pageIndex: number; totalPages: number; onBegin: () => void; progress: number
  t: ReturnType<typeof useT>
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

      <div style={{ position: 'fixed', right: -10, top: '50%', transform: 'translateY(-50%)', fontSize: 280, fontWeight: 900, color: '#1c1c1c', lineHeight: 1, userSelect: 'none', pointerEvents: 'none', zIndex: 0 }}>
        {page.number}
      </div>

      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '80px 40px', position: 'relative', zIndex: 10 }}>
        <div style={{ maxWidth: 620, width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 36 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: ACCENT, letterSpacing: '0.18em', textTransform: 'uppercase' }}>
              {t('assessment.phase_label')} {page.number}
            </span>
            <span style={{ width: 1, height: 14, background: '#2a2a2a' }} />
            <span style={{ fontSize: 12, color: TEXT_MUTED }}>{page.questions.length} {t('assessment.questions_count')}</span>
            <span style={{ width: 1, height: 14, background: '#2a2a2a' }} />
            <span style={{ fontSize: 12, color: TEXT_MUTED }}>{page.time}</span>
          </div>

          <h1 style={{ fontSize: 52, fontWeight: 900, color: TEXT, lineHeight: 1.1, marginBottom: 20, letterSpacing: '-1.5px', margin: '0 0 20px' }}>
            {page.title}
          </h1>
          <p style={{ fontSize: 17, color: TEXT_SUB, lineHeight: 1.7, marginBottom: 10, margin: '0 0 10px' }}>
            {page.objective}
          </p>
          <p style={{ fontSize: 13, color: TEXT_HINT, letterSpacing: '0.02em', marginBottom: 52, margin: '0 0 52px' }}>
            {page.indicators}
          </p>

          <button
            onClick={onBegin}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 14, padding: '14px 28px', background: 'transparent', border: '1px solid #333', borderRadius: 8, color: '#BBBBBB', fontSize: 14, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.2s' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = ACCENT; e.currentTarget.style.color = TEXT }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = '#333'; e.currentTarget.style.color = '#BBBBBB' }}
          >
            {t('assessment.initiate_phase')} {page.number}
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <kbd style={{ fontSize: 11, color: '#777', background: '#1e1e1e', padding: '2px 8px', borderRadius: 4, border: '1px solid #2e2e2e' }}>{t('assessment.key_space')}</kbd>
              <span style={{ fontSize: 11, color: '#444' }}>{t('assessment.key_or')}</span>
              <kbd style={{ fontSize: 11, color: '#777', background: '#1e1e1e', padding: '2px 8px', borderRadius: 4, border: '1px solid #2e2e2e' }}>{t('assessment.key_enter')}</kbd>
            </span>
          </button>

          <div style={{ display: 'flex', gap: 6, marginTop: 48 }}>
            {Array.from({ length: totalPages }).map((_, i) => (
              <div key={i} style={{ width: i === pageIndex ? 22 : 6, height: 6, borderRadius: 3, background: i === pageIndex ? ACCENT : '#222', transition: 'all 0.3s' }} />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── FLASH STATE ───────────────────────────────────────────────
function FlashScreen({ insight, onDone, progress, t }: {
  insight: string; onDone: () => void; progress: number
  t: ReturnType<typeof useT>
}) {
  const [phase, setPhase] = useState<'loading' | 'insight'>('loading')
  const [opacity, setOpacity] = useState(1)

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('insight'), 1300)
    const t2 = setTimeout(() => setOpacity(0), 3600)
    const t3 = setTimeout(onDone, 4000)
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3) }
  }, [onDone])

  return (
    <div style={{ position: 'fixed', inset: 0, background: BG_FLASH, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 60, zIndex: 300, opacity, transition: 'opacity 0.4s ease', fontFamily: 'Inter, -apple-system, sans-serif' }}>
      <ProgressBar value={progress} />
      {phase === 'loading' && (
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 220, height: 1, background: '#1a1a1a', margin: '0 auto 20px', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, background: ACCENT, animation: 'loadbar 1.1s ease-in-out forwards' }} />
          </div>
          <p style={{ fontSize: 10, fontWeight: 700, color: '#3a3a3a', letterSpacing: '0.28em', textTransform: 'uppercase', margin: 0 }}>
            {t('assessment.running_profiling')}
          </p>
        </div>
      )}
      {phase === 'insight' && (
        <div style={{ maxWidth: 580, textAlign: 'center', animation: 'fadeUp 0.5s ease forwards' }}>
          <p style={{ fontSize: 10, fontWeight: 700, color: ACCENT, letterSpacing: '0.28em', textTransform: 'uppercase', marginBottom: 28 }}>
            {t('assessment.insight_label')}
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
function QuestionScreen({ page, pageIndex, qIndex, totalQ, globalQ, answers, onAnswer, onAdvance, onBack, progress, t }: {
  page: { number: string; questions: ReadonlyArray<{ id: string; section: string; label: string; why: string; type: 'choice' | 'text' | 'scale'; options?: ReadonlyArray<{ id: string; labelKey: string }> }> }
  pageIndex: number; qIndex: number; totalQ: number; globalQ: number
  answers: Record<string, string>
  onAnswer: (id: string, val: string) => void
  onAdvance: () => void; onBack: () => void; progress: number
  t: ReturnType<typeof useT>
}) {
  const q = page.questions[qIndex]
  if (!q) return null

  const answer = answers[q.id] ?? ''
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
        onAnswer(q.id, q.options![n - 1].id)
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

      <div style={{ position: 'fixed', top: 20, right: 28, zIndex: 100, display: 'flex', alignItems: 'center', gap: 16 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: '#CCCCCC' }}>
          {globalQ}<span style={{ color: TEXT_HINT, fontWeight: 400 }}> / {totalQ}</span>
        </span>
      </div>

      <div style={{ position: 'fixed', right: -10, top: '50%', transform: 'translateY(-50%)', fontSize: 260, fontWeight: 900, color: '#1E3A5F', lineHeight: 1, userSelect: 'none', pointerEvents: 'none', zIndex: 0 }}>
        {String(qIndex + 1).padStart(2, '0')}
      </div>

      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'center', maxWidth: 680, margin: '0 auto', padding: '80px 32px', position: 'relative', zIndex: 10, opacity: visible ? 1 : 0, transform: visible ? 'translateY(0)' : 'translateY(-10px)', transition: 'opacity 0.24s ease, transform 0.24s ease' }}>

        <p style={{ fontSize: 11, fontWeight: 700, color: ACCENT, letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 20 }}>
          {t('assessment.phase_label')} {page.number} · {q.section}
        </p>

        <h1 style={{ fontSize: 36, fontWeight: 800, color: TEXT, lineHeight: 1.25, marginBottom: 8, maxWidth: 580 }}>
          {q.label}
        </h1>

        <p style={{ fontSize: 13, color: TEXT_MUTED, marginBottom: 36, fontStyle: 'italic' }}>
          {q.why}
        </p>

        {/* ── Choice ── */}
        {q.type === 'choice' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%', maxWidth: 540 }}>
            {q.options?.map((opt, i) => (
              <button
                key={opt.id}
                onClick={() => {
                  onAnswer(q.id, opt.id)
                  setVisible(false)
                  setTimeout(() => { onAdvance(); setVisible(true) }, 300)
                }}
                style={{ padding: '15px 20px', background: answer === opt.id ? BG_SELECTED : BG_CARD, border: `1.5px solid ${answer === opt.id ? BORDER_SEL : BORDER}`, borderRadius: 10, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 16, transition: 'all 0.14s ease', fontFamily: 'inherit', textAlign: 'left' }}
                onMouseEnter={e => { if (answer !== opt.id) { e.currentTarget.style.borderColor = BORDER_HOVER; e.currentTarget.style.background = 'rgba(255,255,255,0.08)' } }}
                onMouseLeave={e => { if (answer !== opt.id) { e.currentTarget.style.borderColor = BORDER; e.currentTarget.style.background = BG_CARD } }}
              >
                <span style={{ minWidth: 28, height: 28, borderRadius: 7, background: answer === opt.id ? ACCENT : NUM_BG, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: answer === opt.id ? '#fff' : '#999', flexShrink: 0, transition: 'all 0.14s' }}>
                  {i + 1}
                </span>
                <span style={{ fontSize: 16, color: TEXT, fontWeight: answer === opt.id ? 600 : 400 }}>
                  {t(opt.labelKey as Parameters<typeof t>[0])}
                </span>
              </button>
            ))}
            <p style={{ fontSize: 12, color: TEXT_HINT, marginTop: 6 }}>
              {t('assessment.key_select').replace('{n}', `1–${q.options?.length}`)}
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
              placeholder={t('assessment.type_answer')}
              autoFocus
              rows={3}
              style={{ width: '100%', background: 'transparent', border: 'none', borderBottom: `1px solid #2e2e2e`, color: TEXT, fontSize: 19, outline: 'none', resize: 'none', fontFamily: 'inherit', padding: '10px 0', lineHeight: 1.65, boxSizing: 'border-box' as const, transition: 'border-color 0.15s' }}
              onFocus={e => e.target.style.borderBottomColor = ACCENT}
              onBlur={e => e.target.style.borderBottomColor = '#2e2e2e'}
            />
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 20 }}>
              <button
                onClick={animAdvance}
                disabled={!answer.trim()}
                style={{ padding: '12px 28px', background: answer.trim() ? ACCENT : '#1e1e1e', color: answer.trim() ? '#fff' : '#444', border: 'none', borderRadius: 8, fontSize: 15, fontWeight: 600, cursor: answer.trim() ? 'pointer' : 'not-allowed', transition: 'all 0.15s', fontFamily: 'inherit' }}
              >
                {t('assessment.continue')}
              </button>
              <span style={{ fontSize: 12, color: TEXT_HINT }}>
                {t('assessment.key_or')}{' '}
                <kbd style={{ background: '#1e1e1e', color: '#777', padding: '2px 7px', borderRadius: 4, border: '1px solid #2e2e2e', fontSize: 11 }}>
                  {t('assessment.key_shift_enter')}
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
                  style={{ width: 60, height: 60, borderRadius: 12, border: `1.5px solid ${answer === String(n) ? ACCENT : BORDER}`, background: answer === String(n) ? ACCENT : BG_CARD, color: answer === String(n) ? '#fff' : '#AAAAAA', fontSize: 20, fontWeight: 700, cursor: 'pointer', transition: 'all 0.14s', fontFamily: 'inherit' }}
                >
                  {n}
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: TEXT_MUTED, marginBottom: 4, width: 310 }}>
              <span>{t('assessment.not_confident')}</span>
              <span>{t('assessment.fully_confident')}</span>
            </div>
            <p style={{ fontSize: 12, color: TEXT_HINT, marginTop: 10 }}>
              {t('assessment.key_scale')}
            </p>
          </div>
        )}

        {(qIndex > 0 || pageIndex > 0) && (
          <button onClick={animBack} style={{ marginTop: 36, background: 'none', border: 'none', color: TEXT_MUTED, fontSize: 13, cursor: 'pointer', padding: 0, fontFamily: 'inherit' }}>
            {t('assessment.back')}
          </button>
        )}
      </div>
    </div>
  )
}

// ── NUMBERS STATE ─────────────────────────────────────────────
function NumbersScreen({ fields, realNumbers, onChange, onSubmit, error, t }: {
  fields: Array<{ id: string; label: string; placeholder: string }>
  realNumbers: Record<string, string>
  onChange: (id: string, val: string) => void
  onSubmit: () => void
  error: string
  t: ReturnType<typeof useT>
}) {
  return (
    <div style={{ minHeight: '100vh', background: BG, fontFamily: 'Inter, -apple-system, sans-serif' }}>
      <ProgressBar value={100} />
      <Logo />

      <div style={{ position: 'fixed', right: -10, top: '50%', transform: 'translateY(-50%)', fontSize: 260, fontWeight: 900, color: '#1E3A5F', lineHeight: 1, userSelect: 'none', pointerEvents: 'none' }}>
        04
      </div>

      <div style={{ maxWidth: 560, margin: '0 auto', padding: '100px 32px 80px', position: 'relative', zIndex: 10 }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: ACCENT, letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 20 }}>
          {t('assessment.phase4_label')}
        </p>
        <h1 style={{ fontSize: 44, fontWeight: 900, color: TEXT, marginBottom: 12, letterSpacing: '-1px' }}>
          {t('assessment.numbers_title')}
        </h1>
        <p style={{ fontSize: 16, color: TEXT_SUB, marginBottom: 48, lineHeight: 1.7 }}>
          {t('assessment.numbers_sub')}
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 28, marginBottom: 48 }}>
          {fields.map(field => (
            <div key={field.id}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>
                {field.label}
              </label>
              <input
                type="text"
                value={realNumbers[field.id] ?? ''}
                onChange={e => onChange(field.id, e.target.value)}
                placeholder={field.placeholder}
                style={{ width: '100%', padding: '12px 0', background: 'transparent', border: 'none', borderBottom: '1px solid #2e2e2e', color: TEXT, fontSize: 18, outline: 'none', boxSizing: 'border-box' as const, fontFamily: 'inherit', transition: 'border-color 0.15s' }}
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

        <button onClick={onSubmit} style={{ width: '100%', padding: '16px', background: ACCENT, color: '#fff', border: 'none', borderRadius: 10, fontSize: 16, fontWeight: 700, cursor: 'pointer', marginBottom: 12, fontFamily: 'inherit' }}>
          {t('assessment.generate_score')}
        </button>
      </div>
    </div>
  )
}

// ── ROOT ──────────────────────────────────────────────────────
export default function AssessmentClient({ founderId, language }: Props) {
  const router = useRouter()
  const t      = useT()

  const [uiState,     setUiState]     = useState<UIState>('intro')
  const [pageIndex,   setPageIndex]   = useState(0)
  const [qIndex,      setQIndex]      = useState(0)
  const [answers,     setAnswers]     = useState<Record<string, string>>({})
  const [realNumbers, setRealNumbers] = useState<Record<string, string>>({})
  const [insightText, setInsightText] = useState('')
  const [error,       setError]       = useState('')

  // ── Build PAGES with useMemo — t is stable, rebuilds only if lang changes ──
  // Question IDs stay in English — they map directly to DB columns used in scoring
  const PAGES = useMemo(() => [
    {
      number: '01',
      title:      t('assessment.p1_title'),
      objective:  t('assessment.p1_objective'),
      indicators: t('assessment.p1_indicators'),
      time:       t('assessment.p1_time'),
      questions: [
        { id: 'founder_stage',      section: t('assessment.section_foundation'),   label: t('assessment.q_founder_stage'),      why: t('assessment.why_founder_stage'),      type: 'choice' as const, options: OPTION_MAP.founder_stage },
        { id: 'business_model',     section: t('assessment.section_foundation'),   label: t('assessment.q_business_model'),     why: t('assessment.why_business_model'),     type: 'choice' as const, options: OPTION_MAP.business_model },
        { id: 'investment_status',  section: t('assessment.section_foundation'),   label: t('assessment.q_investment_status'),  why: t('assessment.why_investment_status'),  type: 'choice' as const, options: OPTION_MAP.investment_status },
        { id: 'team_size',          section: t('assessment.section_foundation'),   label: t('assessment.q_team_size'),          why: t('assessment.why_team_size'),          type: 'choice' as const, options: OPTION_MAP.team_size },
        { id: 'technical_capacity', section: t('assessment.section_foundation'),   label: t('assessment.q_technical_capacity'), why: t('assessment.why_technical_capacity'), type: 'choice' as const, options: OPTION_MAP.technical_capacity },
        { id: 'analytics_maturity', section: t('assessment.section_foundation'),   label: t('assessment.q_analytics_maturity'), why: t('assessment.why_analytics_maturity'), type: 'choice' as const, options: OPTION_MAP.analytics_maturity },
        { id: 'execution_blocker',  section: t('assessment.section_foundation'),   label: t('assessment.q_execution_blocker'),  why: t('assessment.why_execution_blocker'),  type: 'choice' as const, options: OPTION_MAP.execution_blocker },
      ],
    },
    {
      number: '02',
      title:      t('assessment.p2_title'),
      objective:  t('assessment.p2_objective'),
      indicators: t('assessment.p2_indicators'),
      time:       t('assessment.p2_time'),
      questions: [
        { id: 'biggest_problem_now', section: t('assessment.section_diagnosis'),   label: t('assessment.q_biggest_problem_now'), why: t('assessment.why_biggest_problem_now'), type: 'text' as const },
        { id: 'runway',              section: t('assessment.section_revenue'),   label: t('assessment.q_runway'),              why: t('assessment.why_runway'),              type: 'choice' as const, options: OPTION_MAP.runway },
        { id: 'win_reason',          section: t('assessment.section_revenue'),   label: t('assessment.q_win_reason'),          why: t('assessment.why_win_reason'),          type: 'text' as const },
        { id: 'pricing_confidence',  section: t('assessment.section_revenue'),   label: t('assessment.q_pricing_confidence'),  why: t('assessment.why_pricing_confidence'),  type: 'scale' as const },
        { id: 'financial_concern',   section: t('assessment.section_revenue'),   label: t('assessment.q_financial_concern'),   why: t('assessment.why_financial_concern'),   type: 'text' as const },
        { id: 'pmf_reaction',        section: t('assessment.section_product'),   label: t('assessment.q_pmf_reaction'),        why: t('assessment.why_pmf_reaction'),        type: 'choice' as const, options: OPTION_MAP.pmf_reaction },
        { id: 'icp_alignment',       section: t('assessment.section_product'),   label: t('assessment.q_icp_alignment'),       why: t('assessment.why_icp_alignment'),       type: 'text' as const },
        { id: 'icp_targeting',       section: t('assessment.section_product'),   label: t('assessment.q_icp_targeting'),       why: t('assessment.why_icp_targeting'),       type: 'choice' as const, options: OPTION_MAP.icp_targeting },
        { id: 'ideal_customer',      section: t('assessment.section_marketing'), label: t('assessment.q_ideal_customer'),      why: t('assessment.why_ideal_customer'),      type: 'text' as const },
        { id: 'already_tried',       section: t('assessment.section_diagnosis'),   label: t('assessment.q_already_tried'),       why: t('assessment.why_already_tried'),       type: 'text' as const },
        { id: 'target_90_days',      section: t('assessment.section_diagnosis'),   label: t('assessment.q_target_90_days'),      why: t('assessment.why_target_90_days'),      type: 'text' as const },
      ],
    },
    {
      number: '03',
      title:      t('assessment.p3_title'),
      objective:  t('assessment.p3_objective'),
      indicators: t('assessment.p3_indicators'),
      time:       t('assessment.p3_time'),
      questions: [
        { id: 'team_alignment',    section: t('assessment.section_team'),     label: t('assessment.q_team_alignment'),    why: t('assessment.why_team_alignment'),    type: 'choice' as const, options: OPTION_MAP.team_alignment },
        { id: 'bug_process',       section: t('assessment.section_team'),     label: t('assessment.q_bug_process'),       why: t('assessment.why_bug_process'),       type: 'text' as const },
        { id: 'churn_reason',      section: t('assessment.section_customer'), label: t('assessment.q_churn_reason'),      why: t('assessment.why_churn_reason'),      type: 'text' as const },
        { id: 'customer_complaint',section: t('assessment.section_customer'), label: t('assessment.q_customer_complaint'),why: t('assessment.why_customer_complaint'),type: 'text' as const },
        { id: 'referral_frequency',section: t('assessment.section_customer'), label: t('assessment.q_referral_frequency'),why: t('assessment.why_referral_frequency'),type: 'choice' as const, options: OPTION_MAP.referral_frequency },
        { id: 'avoided_decision',  section: t('assessment.section_strategy'), label: t('assessment.q_avoided_decision'),  why: t('assessment.why_avoided_decision'),  type: 'text' as const },
        { id: 'team_focus',        section: t('assessment.section_strategy'), label: t('assessment.q_team_focus'),        why: t('assessment.why_team_focus'),        type: 'choice' as const, options: OPTION_MAP.team_focus },
        { id: 'success_12m',       section: t('assessment.section_strategy'), label: t('assessment.q_success_12m'),       why: t('assessment.why_success_12m'),       type: 'text' as const },
        { id: 'process_maturity',  section: t('assessment.section_strategy'), label: t('assessment.q_process_maturity'),  why: t('assessment.why_process_maturity'),  type: 'choice' as const, options: OPTION_MAP.process_maturity },
      ],
    },
  ], [t])

  const REAL_NUMBER_FIELDS = useMemo(() => [
    { id: 'num_mrr',        label: t('assessment.num_mrr'),        placeholder: 'e.g. £12,000'  },
    { id: 'num_mrr_growth', label: t('assessment.num_mrr_growth'), placeholder: 'e.g. +8% or -2%' },
    { id: 'num_cac',        label: t('assessment.num_cac'),        placeholder: 'e.g. £450'     },
    { id: 'num_ltv',        label: t('assessment.num_ltv'),        placeholder: 'e.g. £2,200'   },
    { id: 'num_churn',      label: t('assessment.num_churn'),      placeholder: 'e.g. 4.5%'     },
    { id: 'num_nps',        label: t('assessment.num_nps'),        placeholder: 'e.g. 42'       },
  ], [t])

  // ── Dynamic insight engine — ID constants, language-neutral ──
  function getInsight(fromPage: number, answers: Record<string, string>): string {
    if (fromPage === 0) {
      const stage   = answers.founder_stage      ?? ''
      const blocker = answers.execution_blocker  ?? ''
      const data    = answers.analytics_maturity ?? ''
      if (stage === FOUNDER_STAGE.EARLY_STAGE && blocker === EXECUTION_BLOCKER.TEAM_CANT_EXECUTE)
        return t('assessment.insight_p1_a')
      if (blocker === EXECUTION_BLOCKER.UNSURE_SOLUTION || blocker === EXECUTION_BLOCKER.AVOIDING_DECISION)
        return t('assessment.insight_p1_b')
      if (data === ANALYTICS_MATURITY.GUT_FEEL || data === ANALYTICS_MATURITY.TOOLS_UNUSED)
        return t('assessment.insight_p1_c')
      if (stage === FOUNDER_STAGE.PRODUCT_CUSTOMERS && blocker === EXECUTION_BLOCKER.ACTS_QUICKLY)
        return t('assessment.insight_p1_d')
      return t('assessment.insight_p1_e')
    }
    if (fromPage === 1) {
      const pmf    = answers.pmf_reaction  ?? ''
      const icp    = answers.icp_targeting ?? ''
      const runway = answers.runway        ?? ''
      if (pmf === PMF.INDIFFERENT || pmf === PMF.NOT_ASKED)
        return t('assessment.insight_p2_a')
      if (icp === ICP_TARGETING.MISALIGNED || icp === ICP_TARGETING.NOT_SURE)
        return t('assessment.insight_p2_b')
      if (runway === RUNWAY.UNDER_3 || runway === RUNWAY.R_3_6)
        return t('assessment.insight_p2_c')
      if (pmf === PMF.DEVASTATED)
        return t('assessment.insight_p2_d')
      return t('assessment.insight_p2_e')
    }
    return t('assessment.insight_p3')
  }

  const totalQ   = PAGES.reduce((s, p) => s + p.questions.length, 0)
  const doneQ    = PAGES.slice(0, pageIndex).reduce((s, p) => s + p.questions.length, 0) + (uiState === 'question' ? qIndex : 0)
  const progress = uiState === 'numbers' || uiState === 'submitting' ? 100 : Math.round((doneQ / totalQ) * 95)
  const globalQ  = PAGES.slice(0, pageIndex).reduce((s, p) => s + p.questions.length, 0) + qIndex + 1

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
        body: JSON.stringify({ assessmentId: assessment.id, founderId, answers, realNumbers: realNumbers ?? {}, language }),
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
      <p style={{ fontSize: 12, fontWeight: 700, color: TEXT_MUTED, letterSpacing: '0.18em', textTransform: 'uppercase' }}>{t('assessment.generating')}</p>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )

  // Flash
  if (uiState === 'flash') return (
    <FlashScreen insight={insightText} onDone={() => { setPageIndex(p => p + 1); setQIndex(0); setUiState('intro') }} progress={progress} t={t} />
  )

  // Intro
  const currentPage = PAGES[pageIndex]
  if (uiState === 'intro') {
    if (!currentPage) { setPageIndex(0); return null }
    return <IntroScreen page={currentPage} pageIndex={pageIndex} totalPages={PAGES.length} onBegin={() => setUiState('question')} progress={progress} t={t} />
  }

  // Numbers
  if (uiState === 'numbers') return (
    <NumbersScreen fields={REAL_NUMBER_FIELDS} realNumbers={realNumbers} onChange={(id, v) => setRealNumbers(p => ({ ...p, [id]: v }))} onSubmit={submit} error={error} t={t} />
  )

  // Question
  if (!currentPage) return null
  return (
    <QuestionScreen page={currentPage} pageIndex={pageIndex} qIndex={qIndex} totalQ={totalQ} globalQ={globalQ} answers={answers} onAnswer={(id, v) => setAnswers(p => ({ ...p, [id]: v }))} onAdvance={advance} onBack={goBack} progress={progress} t={t} />
  )
}
