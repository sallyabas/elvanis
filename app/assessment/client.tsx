'use client'

import { useState } from 'react'
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

const QUESTIONS = [
  // CONTEXT
  {
    id: 'biggest_problem_now',
    section: 'Context',
    label: 'What is the single biggest problem hurting your business right now?',
    type: 'text',
  },
  {
    id: 'business_model',
    section: 'Context',
    label: 'What is your primary business model?',
    type: 'choice',
    options: ['SaaS / Subscription', 'E-commerce', 'Marketplace', 'Services / Agency', 'D2C / Consumer brand', 'Other'],
  },
  {
    id: 'investment_status',
    section: 'Context',
    label: 'What is your investment situation?',
    type: 'choice',
    options: ['Bootstrapped — self-funded', 'Pre-seed or angel funded', 'Seed funded', 'Series A or above', 'Actively fundraising right now', 'Not applicable — established SME'],
  },
  {
    id: 'team_size',
    section: 'Context',
    label: 'How many people work in your business full time?',
    type: 'choice',
    options: ['Just me', '2–5 people', '6–15 people', '16–50 people', '50+ people'],
  },
  {
    id: 'technical_capacity',
    section: 'Context',
    label: 'Do you have technical or engineering capacity in-house?',
    type: 'choice',
    options: ['Yes — strong technical team', 'Yes — limited technical capacity', 'No — we outsource development', 'No — non-technical business'],
  },
  {
    id: 'analytics_maturity',
    section: 'Context',
    label: 'Do you use analytics tools to track performance?',
    type: 'choice',
    options: ['Yes — I use tools actively and trust the data', 'Yes — I have tools but rarely look at them', 'Partially — some basic tracking', 'No — I run on gut feel', 'No — too early stage'],
  },
  {
    id: 'execution_blocker',
    section: 'Context',
    label: 'When you identify a problem, what usually stops you acting on it?',
    type: 'choice',
    options: ['Not enough time', 'Team cannot execute', 'Not sure what the right solution is', 'Avoiding the decision', 'No budget or resources', 'Nothing — I act quickly'],
  },
  {
    id: 'already_tried',
    section: 'Context',
    label: 'What have you already tried to fix your main problem?',
    type: 'text',
  },
  {
    id: 'target_90_days',
    section: 'Context',
    label: 'What is the most important thing to achieve in the next 90 days — and what happens if you do not?',
    type: 'text',
  },

  // REVENUE
  {
    id: 'runway',
    section: 'Revenue',
    label: 'How many months of runway do you have?',
    type: 'choice',
    options: ['More than 18 months', '12–18 months', '6–12 months', '3–6 months', 'Less than 3 months', 'Not applicable — profitable'],
  },
  {
    id: 'win_reason',
    section: 'Revenue',
    label: 'When you win a new customer, what is the main reason they chose you?',
    type: 'text',
  },
  {
    id: 'pricing_confidence',
    section: 'Revenue',
    label: 'How confident are you in your pricing? (1 = not confident, 5 = fully confident)',
    type: 'scale',
  },
  {
    id: 'financial_concern',
    section: 'Revenue',
    label: 'What is your biggest financial concern right now?',
    type: 'text',
  },

  // PRODUCT
  {
    id: 'pmf_reaction',
    section: 'Product',
    label: 'If your product disappeared tomorrow, how would customers react?',
    type: 'choice',
    options: ['Devastated — no real alternative', 'Disappointed — but would find something else', 'Indifferent — would move on quickly', 'Not sure — have not asked them', 'No customers yet'],
  },
  {
    id: 'icp_alignment',
    section: 'Product',
    label: 'Who gets the most value from your product?',
    type: 'text',
  },
  {
    id: 'icp_targeting',
    section: 'Product',
    label: 'Is that who you are currently targeting and acquiring?',
    type: 'choice',
    options: ['Yes — perfectly aligned', 'Mostly — some misalignment', 'No — we target a different segment', 'Not sure'],
  },

  // TEAM
  {
    id: 'team_alignment',
    section: 'Team',
    label: 'How aligned are your tech and business teams on priorities?',
    type: 'choice',
    options: ['Fully aligned', 'Mostly aligned', 'Partly misaligned', 'Seriously misaligned — frequent conflict', 'Not applicable — solo or single team'],
  },
  {
    id: 'bug_process',
    section: 'Team',
    label: 'When bugs reach customers — how does your team find out and how fast do you fix them?',
    type: 'text',
  },

  // CUSTOMER
  {
    id: 'churn_reason',
    section: 'Customer',
    label: 'When customers cancel or stop buying, what reason do they most commonly give?',
    type: 'text',
  },
  {
    id: 'customer_complaint',
    section: 'Customer',
    label: 'What do your customers complain about most?',
    type: 'text',
  },
  {
    id: 'referral_frequency',
    section: 'Customer',
    label: 'How often do customers refer others without being asked?',
    type: 'choice',
    options: ['Regularly', 'Occasionally', 'Rarely', 'Never', 'Too early to measure'],
  },

  // MARKETING
  {
    id: 'ideal_customer',
    section: 'Marketing',
    label: 'Describe your ideal customer in one sentence — who they are and what pain you solve.',
    type: 'text',
  },

  // STRATEGY
  {
    id: 'avoided_decision',
    section: 'Strategy',
    label: 'What is the one decision you have been avoiding that would change the business if you made it?',
    type: 'text',
  },
  {
    id: 'team_focus',
    section: 'Strategy',
    label: 'Is your team working on the right things — or busy but not moving the needle?',
    type: 'choice',
    options: ['Working on the right things', 'Mostly right', 'Busy but unclear impact', 'Clearly off track'],
  },
  {
    id: 'success_12m',
    section: 'Strategy',
    label: 'What does success look like in 12 months — be specific with a number?',
    type: 'text',
  },
  {
    id: 'process_maturity',
    section: 'Strategy',
    label: 'Do you have documented processes — and does the team actually follow them?',
    type: 'choice',
    options: ['Documented and followed', 'Partially documented', 'Documented but not followed', 'Not documented', 'Too early'],
  },
]

const REAL_NUMBERS = [
  { id: 'num_mrr', label: 'Monthly Recurring Revenue (MRR)', placeholder: 'e.g. £12,000', group: 'Revenue' },
  { id: 'num_mrr_growth', label: 'MRR growth last month', placeholder: 'e.g. +8% or -2%', group: 'Revenue' },
  { id: 'num_cac', label: 'Customer Acquisition Cost (CAC)', placeholder: 'e.g. £450', group: 'Revenue' },
  { id: 'num_ltv', label: 'Customer Lifetime Value (LTV)', placeholder: 'e.g. £2,200', group: 'Revenue' },
  { id: 'num_churn', label: 'Monthly churn rate', placeholder: 'e.g. 4.5%', group: 'Customer' },
  { id: 'num_nps', label: 'NPS score (if measured)', placeholder: 'e.g. 42', group: 'Customer' },
]

const GROUP_COLORS: Record<string, string> = {
  Revenue: '#2563EB',
  Customer: '#D97706',
  Team: '#7C3AED',
  Marketing: '#DC2626',
}

const ContinueBtn = ({ disabled, onClick, label }: { disabled: boolean; onClick: () => void; label: string }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    style={{
      marginTop: 24, padding: '14px 36px',
      background: disabled ? '#E5E7EB' : '#2563EB',
      color: disabled ? '#9CA3AF' : '#fff',
      fontWeight: 700, borderRadius: 12, border: 'none', fontSize: 15,
      cursor: disabled ? 'not-allowed' : 'pointer',
    }}
  >
    {label}
  </button>
)

export default function AssessmentClient({ founderId, language }: Props) {
  const router = useRouter()
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [realNumbers, setRealNumbers] = useState<Record<string, string>>({})
  const [current, setCurrent] = useState(0)
  const [showNumbers, setShowNumbers] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const q = QUESTIONS[current]
  const progress = showNumbers ? 100 : Math.round(((current + 1) / (QUESTIONS.length + 1)) * 100)
  const isLast = current === QUESTIONS.length - 1
  const answer = answers[q?.id ?? ''] ?? ''

  function setAnswer(val: string) {
    setAnswers(prev => ({ ...prev, [q.id]: val }))
  }

  function next() {
    if (!answer.trim()) return
    if (isLast) setShowNumbers(true)
    else setCurrent(c => c + 1)
  }

  function back() {
    if (showNumbers) setShowNumbers(false)
    else if (current > 0) setCurrent(c => c - 1)
  }

  async function submit() {
    setSubmitting(true)
    setError('')
    const supabase = createClient()

    try {
      const assessmentData = {
        founder_id: founderId,
        language,
        status: 'completed',
        biggest_problem_now: answers.biggest_problem_now ?? null,
        business_model: answers.business_model ?? null,
        analytics_maturity: answers.analytics_maturity ?? null,
        investment_status: answers.investment_status ?? null,
        target_90_days: answers.target_90_days ?? null,
        execution_blocker: answers.execution_blocker ?? null,
        already_tried: answers.already_tried ?? null,
        team_size: answers.team_size ?? null,
        technical_capacity: answers.technical_capacity ?? null,
        runway: answers.runway ?? null,
        win_reason: answers.win_reason ?? null,
        pricing_confidence: answers.pricing_confidence ? parseInt(answers.pricing_confidence) : null,
        financial_concern: answers.financial_concern ?? null,
        pmf_reaction: answers.pmf_reaction ?? null,
        icp_alignment: answers.icp_alignment ?? null,
        team_alignment: answers.team_alignment ?? null,
        bug_process: answers.bug_process ?? null,
        churn_reason: answers.churn_reason ?? null,
        customer_complaint: answers.customer_complaint ?? null,
        referral_frequency: answers.referral_frequency ?? null,
        ideal_customer: answers.ideal_customer ?? null,
        avoided_decision: answers.avoided_decision ?? null,
        team_focus: answers.team_focus ?? null,
        success_12m: answers.success_12m ?? null,
        process_maturity: answers.process_maturity ?? null,
      }

      const { data: assessment, error: aErr } = await supabase
        .from('assessments')
        .insert(assessmentData)
        .select()
        .single()

      if (aErr) throw new Error('Assessment save failed: ' + aErr.message)

      const res = await fetch('/api/score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assessmentId: assessment.id,
          founderId,
          answers,
          realNumbers: realNumbers ?? {},
          language,
        }),
      })

      let data: { error?: string; success?: boolean } = {}
      try { data = await res.json() } catch { throw new Error('Server error — check terminal logs') }
      if (!res.ok) throw new Error(data.error ?? 'Scoring failed')

      router.push('/assessment/result')
      router.refresh()
    } catch (err) {
      console.error('Submit error:', err)
      setError(String(err))
    }
    setSubmitting(false)
  }

  if (submitting) {
    return (
      <main style={{ minHeight: '100vh', background: '#F9FAFB', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter, sans-serif' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 20 }}>🔍</div>
          <h2 style={{ fontSize: 24, fontWeight: 800, color: '#111827', marginBottom: 8 }}>Analysing your business...</h2>
          <p style={{ color: '#6B7280' }}>This takes about 30 seconds</p>
        </div>
      </main>
    )
  }

  if (showNumbers) {
    return (
      <main style={{ minHeight: '100vh', background: '#F9FAFB', fontFamily: 'Inter, sans-serif' }}>
        <header style={{ background: '#fff', borderBottom: '1px solid #E5E7EB', padding: '0 24px' }}>
          <div style={{ maxWidth: 680, margin: '0 auto', height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 18, fontWeight: 800, color: '#2563EB' }}>Elvanis</span>
            <span style={{ fontSize: 13, color: '#6B7280' }}>Final step</span>
          </div>
        </header>
        <div style={{ height: 4, background: '#2563EB', width: '100%' }} />
        <div style={{ maxWidth: 680, margin: '0 auto', padding: '48px 24px' }}>
          <div style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 14, padding: '16px 20px', marginBottom: 32 }}>
            <p style={{ fontSize: 14, color: '#1D4ED8', fontWeight: 600, marginBottom: 4 }}>Optional but recommended</p>
            <p style={{ fontSize: 13, color: '#3B82F6', lineHeight: 1.6, margin: 0 }}>
              Paste your real numbers below. The more data you provide, the more accurate your diagnosis. Leave blank if you do not have a metric.
            </p>
          </div>
          {['Revenue', 'Customer'].map(group => (
            <div key={group} style={{ marginBottom: 32 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: GROUP_COLORS[group] }} />
                <h3 style={{ fontSize: 13, fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>{group}</h3>
              </div>
              {REAL_NUMBERS.filter(n => n.group === group).map(field => (
                <div key={field.id} style={{ marginBottom: 12 }}>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 5 }}>{field.label}</label>
                  <input
                    type="text"
                    value={realNumbers[field.id] ?? ''}
                    onChange={e => setRealNumbers(prev => ({ ...prev, [field.id]: e.target.value }))}
                    placeholder={field.placeholder}
                    style={{ width: '100%', padding: '11px 14px', border: '1.5px solid #E5E7EB', borderRadius: 10, fontSize: 14, color: '#111827', outline: 'none', boxSizing: 'border-box' as const }}
                  />
                </div>
              ))}
            </div>
          ))}
          {error && (
            <div style={{ marginBottom: 16, padding: '12px 16px', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 10 }}>
              <p style={{ color: '#DC2626', fontSize: 14, margin: 0 }}>{error}</p>
            </div>
          )}
          <button
            onClick={submit}
            style={{ width: '100%', padding: '16px', background: '#2563EB', color: '#fff', fontWeight: 700, borderRadius: 14, border: 'none', fontSize: 17, cursor: 'pointer' }}
          >
            Get my health score →
          </button>
          <button
            onClick={back}
            style={{ marginTop: 14, display: 'block', background: 'none', border: 'none', color: '#9CA3AF', fontSize: 14, cursor: 'pointer' }}
          >
            ← Back to questions
          </button>
        </div>
      </main>
    )
  }

  return (
    <main style={{ minHeight: '100vh', background: '#F9FAFB', fontFamily: 'Inter, sans-serif' }}>
      <header style={{ background: '#fff', borderBottom: '1px solid #E5E7EB', padding: '0 24px' }}>
        <div style={{ maxWidth: 680, margin: '0 auto', height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 18, fontWeight: 800, color: '#2563EB' }}>Elvanis</span>
          <span style={{ fontSize: 13, color: '#6B7280' }}>{current + 1} of {QUESTIONS.length}</span>
        </div>
      </header>
      <div style={{ height: 4, background: '#E5E7EB' }}>
        <div style={{ height: 4, background: '#2563EB', width: `${progress}%`, transition: 'width 0.3s' }} />
      </div>
      <div style={{ maxWidth: 680, margin: '0 auto', padding: '48px 24px' }}>
        <p style={{ fontSize: 12, fontWeight: 600, color: '#2563EB', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>{q.section}</p>
        <h2 style={{ fontSize: 22, fontWeight: 700, color: '#111827', marginBottom: 32, lineHeight: 1.4 }}>{q.label}</h2>

        {q.type === 'choice' && (
          <div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {q.options?.map(opt => (
                <button
                  key={opt}
                  onClick={() => setAnswer(opt)}
                  style={{
                    padding: '14px 18px',
                    border: `2px solid ${answer === opt ? '#2563EB' : '#E5E7EB'}`,
                    borderRadius: 12,
                    background: answer === opt ? '#EFF6FF' : '#fff',
                    color: '#111827', fontSize: 15, textAlign: 'left',
                    cursor: 'pointer', fontWeight: answer === opt ? 600 : 400,
                  }}
                >
                  {opt}
                </button>
              ))}
            </div>
            <ContinueBtn disabled={!answer} onClick={next} label={isLast ? 'Continue to data →' : 'Continue →'} />
          </div>
        )}

        {q.type === 'text' && (
          <div>
            <textarea
              value={answer}
              onChange={e => setAnswer(e.target.value)}
              placeholder="Type your answer here..."
              rows={4}
              style={{ width: '100%', padding: '14px 16px', border: '2px solid #E5E7EB', borderRadius: 12, fontSize: 15, color: '#111827', resize: 'vertical', outline: 'none', fontFamily: 'Inter, sans-serif', boxSizing: 'border-box' as const }}
            />
            <ContinueBtn disabled={!answer.trim()} onClick={next} label={isLast ? 'Continue to data →' : 'Continue →'} />
          </div>
        )}

        {q.type === 'scale' && (
          <div>
            <div style={{ display: 'flex', gap: 12, marginBottom: 8 }}>
              {[1, 2, 3, 4, 5].map(n => (
                <button
                  key={n}
                  onClick={() => setAnswer(String(n))}
                  style={{
                    width: 56, height: 56, borderRadius: 12,
                    border: `2px solid ${answer === String(n) ? '#2563EB' : '#E5E7EB'}`,
                    background: answer === String(n) ? '#2563EB' : '#fff',
                    color: answer === String(n) ? '#fff' : '#374151',
                    fontSize: 20, fontWeight: 700, cursor: 'pointer',
                  }}
                >
                  {n}
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#9CA3AF', marginBottom: 4, width: 292 }}>
              <span>Not confident</span><span>Fully confident</span>
            </div>
            <ContinueBtn disabled={!answer} onClick={next} label={isLast ? 'Continue to data →' : 'Continue →'} />
          </div>
        )}

        {error && (
          <div style={{ marginTop: 16, padding: '12px 16px', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 10 }}>
            <p style={{ color: '#DC2626', fontSize: 14, margin: 0 }}>{error}</p>
          </div>
        )}

        {current > 0 && (
          <button
            onClick={back}
            style={{ marginTop: 16, display: 'block', background: 'none', border: 'none', color: '#9CA3AF', fontSize: 14, cursor: 'pointer' }}
          >
            ← Back
          </button>
        )}
      </div>
    </main>
  )
}
