'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'

type Lang = 'en' | 'ar'

// ── Demo Step Definitions ─────────────────────────────────────
const DEMO_STEPS = {
  en: [
    { id: 'connect',    label: 'Connect',    num: '01', title: 'Zero-setup ingestion', body: 'Connect Shopify, Jira, GA4, Intercom, and Trustpilot in under 60 seconds. No configuration. No code. No process changes.' },
    { id: 'scan',       label: 'Scan',       num: '02', title: 'Live data flows in',   body: 'Elvanis reads your real operational data — orders, tickets, sprints, reviews, sessions. Every scan processes thousands of data points across all tools.' },
    { id: 'signals',    label: 'Signals',    num: '03', title: 'Signals surface',      body: 'Every issue detected and ranked by business impact. Critical first, always. No noise — just the problems that are actually hurting your business right now.' },
    { id: 'conflict',   label: 'Conflicts',  num: '04', title: 'Conflicts caught',     body: 'When two tools disagree, Elvanis flags the collision before you waste a week chasing the wrong number. You decide which source to trust.' },
    { id: 'digest',     label: 'Digest',     num: '05', title: 'Your action plan',     body: 'Not a dashboard. A diagnosis. A 90-day AI-generated action plan — exactly what to fix, in what order, and why.' },
    { id: 'assessment', label: 'Assessment', num: '06', title: 'Your business OS is ready', body: 'A health score, a ranked action plan, and a clear view of everything your business needs to fix. This is what day one looks like.' },
  ],
  ar: [
    { id: 'connect',    label: 'الربط',       num: '٠١', title: 'ربط فوري بدون إعداد', body: 'اربط Shopify وJira وGA4 وIntercom وTrustpilot في أقل من 60 ثانية. بدون إعداد. بدون كود. بدون تغيير في العمليات.' },
    { id: 'scan',       label: 'الفحص',       num: '٠٢', title: 'البيانات الحية تتدفق',  body: 'يقرأ إلفانيس بياناتك التشغيلية الحقيقية — الطلبات والتذاكر والسبرينتات والتقييمات والجلسات. كل فحص يعالج آلاف نقاط البيانات.' },
    { id: 'signals',    label: 'الإشارات',    num: '٠٣', title: 'الإشارات تظهر',         body: 'كل مشكلة مكتشفة ومرتّبة حسب الأثر التجاري. الحرجة أولاً دائماً. لا ضوضاء — فقط المشاكل التي تضر أعمالك الآن.' },
    { id: 'conflict',   label: 'التعارضات',   num: '٠٤', title: 'التعارضات مرصودة',      body: 'عندما تختلف أداتان، يرصد إلفانيس التعارض قبل أن تضيع أسبوعاً في تتبع الرقم الخاطئ. أنت تقرر أي مصدر تثق به.' },
    { id: 'digest',     label: 'الملخص',      num: '٠٥', title: 'خطة عملك',              body: 'ليس لوحة تحكم. تشخيص. خطة عمل مولّدة بالذكاء الاصطناعي لمدة 90 يوماً — بالضبط ماذا تصلح، وبأي ترتيب، ولماذا.' },
    { id: 'assessment', label: 'التقييم',     num: '٠٦', title: 'نظام أعمالك جاهز',      body: 'درجة صحة، وخطة إجراءات مرتّبة، ورؤية واضحة لكل ما يحتاج عملك إلى إصلاحه. هذا ما يبدو عليه اليوم الأول.' },
  ],
}

// ── Canvas Components ─────────────────────────────────────────
function C1Connect({ isAr, active }: { isAr: boolean; active: boolean }) {
  const [lit, setLit] = useState<number[]>([])
  const tools = [
    { name: 'Shopify', icon: '🛍️', color: '#96BF48' },
    { name: 'Jira', icon: '🔧', color: '#0052CC' },
    { name: 'GA4', icon: '📊', color: '#E37400' },
    { name: 'Intercom', icon: '💬', color: '#1F8EFF' },
    { name: 'Trustpilot', icon: '⭐', color: '#00B67A' },
  ]
  useEffect(() => {
    if (!active) return
    setLit([])
    tools.forEach((_, i) => setTimeout(() => setLit(p => [...p, i]), i * 350 + 200))
  }, [active])
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <p style={{ fontSize: 12, color: '#6B7280', margin: '0 0 10px', textAlign: isAr ? 'right' : 'left' }}>
        {isAr ? '🔌 جارٍ ربط مساحة العمل...' : '🔌 Connecting workspace...'}
      </p>
      {tools.map((tool, i) => {
        const on = lit.includes(i)
        return (
          <div key={tool.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: on ? '#F0FDF4' : '#F9FAFB', border: `1.5px solid ${on ? tool.color + '60' : '#E5E7EB'}`, borderRadius: 10, transition: 'all 0.5s ease' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 18 }}>{tool.icon}</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>{tool.name}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {on && <span style={{ width: 7, height: 7, borderRadius: '50%', background: tool.color, display: 'inline-block', boxShadow: `0 0 8px ${tool.color}` }} />}
              <span style={{ fontSize: 11, fontWeight: 700, color: on ? '#059669' : '#9CA3AF', transition: 'color 0.5s' }}>
                {on ? (isAr ? 'متصل ✓' : 'Connected ✓') : (isAr ? 'جارٍ...' : 'Connecting...')}
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function C2Scan({ isAr, active }: { isAr: boolean; active: boolean }) {
  const [pulse, setPulse] = useState(0)
  const [lit, setLit] = useState<number[]>([])
  const sources = [
    { name: 'Shopify', icon: '🛍️', label: isAr ? 'الطلبات والإيرادات' : 'Orders & revenue' },
    { name: 'Intercom', icon: '💬', label: isAr ? 'تذاكر الدعم' : 'Support tickets' },
    { name: 'Jira', icon: '🔧', label: isAr ? 'السبرينتات والأخطاء' : 'Sprints & bugs' },
    { name: 'GA4', icon: '📊', label: isAr ? 'الزيارات والتحويل' : 'Traffic & conversion' },
  ]
  useEffect(() => {
    if (!active) return
    setLit([])
    setPulse(0)
    const iv = setInterval(() => setPulse(p => (p + 1) % 3), 500)
    sources.forEach((_, i) => setTimeout(() => setLit(p => [...p, i]), i * 400 + 200))
    return () => clearInterval(iv)
  }, [active])
  return (
    <div>
      <div style={{ background: '#F0F9FF', border: '1px solid #BAE6FD', borderRadius: 12, padding: '14px 16px', marginBottom: 14, textAlign: 'center' }}>
        <p style={{ fontSize: 12, fontWeight: 700, color: '#0284C7', margin: 0, letterSpacing: '0.06em', textTransform: 'uppercase' as const }}>
          ⚡ {isAr ? 'جارٍ قراءة البيانات الحية' : 'Reading live data'}
          <span style={{ opacity: pulse === 0 ? 1 : 0.2, transition: 'opacity 0.2s' }}>.</span>
          <span style={{ opacity: pulse === 1 ? 1 : 0.2, transition: 'opacity 0.2s' }}>.</span>
          <span style={{ opacity: pulse === 2 ? 1 : 0.2, transition: 'opacity 0.2s' }}>.</span>
        </p>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {sources.map((src, i) => (
          <div key={src.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: lit.includes(i) ? '#F0F9FF' : '#F9FAFB', border: `1px solid ${lit.includes(i) ? '#BAE6FD' : '#E5E7EB'}`, borderRadius: 10, transition: 'all 0.4s ease' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 16 }}>{src.icon}</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>{src.name}</span>
              <span style={{ fontSize: 11, color: '#9CA3AF' }}>· {src.label}</span>
            </div>
            <span style={{ fontSize: 11, fontWeight: 600, color: lit.includes(i) ? '#0284C7' : '#D1D5DB' }}>
              {lit.includes(i) ? (isAr ? 'جارٍ ✓' : 'Reading ✓') : '...'}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

function C3Signals({ isAr, active }: { isAr: boolean; active: boolean }) {
  const [shown, setShown] = useState(0)
  const sigs = isAr ? [
    { s: 'critical', label: 'حرجة',   dim: 'الإيرادات', title: 'معدل الاسترداد يتجاوز 8%',          src: 'Shopify',  val: '8.3%', color: '#DC2626', bg: '#FEF2F2', border: '#FECACA', action: 'افحص عملية التوصيل خلال 48 ساعة' },
    { s: 'warning',  label: 'تحذير',  dim: 'العملاء',   title: 'انخفض NPS 18 نقطة في 30 يوماً',     src: 'Intercom', val: '-18',   color: '#D97706', bg: '#FFFBEB', border: '#FDE68A', action: 'صنّف المعترضين وجدوِل مكالمات متابعة' },
    { s: 'watch',    label: 'مراقبة', dim: 'المنتج',    title: 'سرعة السبرينت تتراجع — الثالث',     src: 'Jira',     val: '↓22%',  color: '#6B7280', bg: '#F9FAFB', border: '#E5E7EB', action: 'راجع عملية تخطيط السبرينت' },
  ] : [
    { s: 'critical', label: 'Critical', dim: 'Revenue',  title: 'Refund rate exceeding 8%',              src: 'Shopify',  val: '8.3%', color: '#DC2626', bg: '#FEF2F2', border: '#FECACA', action: 'Audit fulfilment — identify top refund categories' },
    { s: 'warning',  label: 'Warning',  dim: 'Customer', title: 'NPS dropped 18 points in 30 days',      src: 'Intercom', val: '-18',   color: '#D97706', bg: '#FFFBEB', border: '#FDE68A', action: 'Segment detractors — schedule follow-up calls' },
    { s: 'watch',    label: 'Watch',    dim: 'Product',  title: 'Sprint velocity declining — 3rd sprint', src: 'Jira',     val: '↓22%',  color: '#6B7280', bg: '#F9FAFB', border: '#E5E7EB', action: 'Review sprint planning — remove blockers' },
  ]
  useEffect(() => {
    if (!active) return
    setShown(0)
    sigs.forEach((_, i) => setTimeout(() => setShown(i + 1), i * 500 + 300))
  }, [active])
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {sigs.map((sig, i) => (
        <div key={i} style={{ background: sig.bg, border: `1px solid ${sig.border}`, borderRadius: 10, padding: '11px 14px', opacity: shown > i ? 1 : 0, transform: shown > i ? 'translateY(0)' : 'translateY(8px)', transition: 'opacity 0.4s ease, transform 0.4s ease' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: sig.color, display: 'inline-block' }} />
              <span style={{ fontSize: 10, fontWeight: 700, color: sig.color, textTransform: 'uppercase' as const, letterSpacing: '0.07em' }}>{sig.label}</span>
              <span style={{ fontSize: 10, color: '#9CA3AF' }}>· {sig.dim}</span>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <span style={{ fontSize: 10, color: '#9CA3AF' }}>{sig.src}</span>
              <span style={{ fontSize: 12, fontWeight: 800, color: sig.color }}>{sig.val}</span>
            </div>
          </div>
          <p style={{ fontSize: 12, fontWeight: 700, color: '#111827', margin: '0 0 3px', textAlign: isAr ? 'right' : 'left' }}>{sig.title}</p>
          <p style={{ fontSize: 11, color: '#6B7280', margin: 0, textAlign: isAr ? 'right' : 'left' }}>→ {sig.action}</p>
        </div>
      ))}
    </div>
  )
}

function C4Conflict({ isAr, active }: { isAr: boolean; active: boolean }) {
  const [trusted, setTrusted] = useState<string | null>(null)
  const [shown, setShown] = useState(false)
  useEffect(() => {
    if (!active) return
    setTrusted(null)
    setShown(false)
    setTimeout(() => setShown(true), 400)
  }, [active])
  return (
    <div style={{ opacity: shown ? 1 : 0, transition: 'opacity 0.5s ease' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
        {[
          { tool: 'GA4', icon: '📊', stat: isAr ? 'الزيارات ↑12%' : 'Traffic ↑12%', color: '#059669', bg: '#F0FDF4', border: '#A7F3D0' },
          { tool: 'Shopify', icon: '🛍️', stat: isAr ? 'الإيرادات ↓8%' : 'Revenue ↓8%', color: '#DC2626', bg: '#FEF2F2', border: '#FECACA' },
        ].map(item => (
          <div key={item.tool} style={{ background: item.bg, border: `2px solid ${item.border}`, borderRadius: 10, padding: '12px', textAlign: 'center' }}>
            <span style={{ fontSize: 22, display: 'block', marginBottom: 4 }}>{item.icon}</span>
            <p style={{ fontSize: 12, fontWeight: 700, color: '#111827', margin: '0 0 3px' }}>{item.tool}</p>
            <p style={{ fontSize: 13, fontWeight: 800, color: item.color, margin: 0 }}>{item.stat}</p>
          </div>
        ))}
      </div>
      <div style={{ background: '#FFFBEB', border: '2px solid #FDE68A', borderRadius: 10, padding: '12px 14px' }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: '#92400E', margin: '0 0 6px' }}>
          ⚠ {isAr ? 'تعارض مرصود' : 'Conflict detected'}
        </p>
        <p style={{ fontSize: 12, color: '#92400E', margin: '0 0 10px', lineHeight: 1.5 }}>
          {isAr ? 'GA4 وShopify يُظهران نتائج متعارضة. أي المصدرين تثق به؟' : 'GA4 and Shopify are showing conflicting results. Which do you trust?'}
        </p>
        {trusted ? (
          <div style={{ background: '#ECFDF5', border: '1px solid #A7F3D0', borderRadius: 8, padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 6 }}>
            <span>✅</span>
            <span style={{ fontSize: 12, color: '#059669', fontWeight: 600 }}>
              {isAr ? `${trusted} — تم تعيينه كمصدر موثوق` : `${trusted} set as trusted source`}
            </span>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: 8 }}>
            {['GA4', 'Shopify'].map(src => (
              <button key={src} onClick={() => setTrusted(src)} style={{ flex: 1, padding: '8px', background: '#D97706', color: '#fff', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                {isAr ? `ثق بـ ${src}` : `Trust ${src}`}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function C5Digest({ isAr, active }: { isAr: boolean; active: boolean }) {
  const [shown, setShown] = useState(0)
  const items = isAr ? [
    { num: '١', title: 'معالجة ارتفاع معدل الاسترداد', why: 'تأثير مباشر على الإيرادات', who: 'المنتج + العمليات', urgent: true },
    { num: '٢', title: 'إطلاق برنامج استرداد العملاء', why: 'خطر تراكم انخفاض NPS', who: 'نجاح العملاء', urgent: false },
    { num: '٣', title: 'مراجعة تخطيط السبرينت', why: 'ثلاثة سبرينتات متتالية ضعيفة', who: 'الهندسة', urgent: false },
  ] : [
    { num: '1', title: 'Address refund rate spike', why: 'Direct revenue impact', who: 'Product + Ops', urgent: true },
    { num: '2', title: 'Launch at-risk customer recovery', why: 'NPS decline compounding weekly', who: 'Customer Success', urgent: false },
    { num: '3', title: 'Fix sprint planning process', why: 'Third consecutive underperforming sprint', who: 'Engineering', urgent: false },
  ]
  useEffect(() => {
    if (!active) return
    setShown(0)
    items.forEach((_, i) => setTimeout(() => setShown(i + 1), i * 500 + 300))
  }, [active])
  return (
    <div>
      <p style={{ fontSize: 11, fontWeight: 700, color: '#7C3AED', textTransform: 'uppercase' as const, letterSpacing: '0.08em', margin: '0 0 12px', textAlign: isAr ? 'right' : 'left' }}>
        📄 {isAr ? 'ملخص الإجراءات — خطة 90 يوماً' : 'Action Digest — 90-day plan'}
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {items.map((item, i) => (
          <div key={i} style={{ background: item.urgent ? '#FEF2F2' : '#F5F3FF', border: `1px solid ${item.urgent ? '#FECACA' : '#DDD6FE'}`, borderRadius: 10, padding: '11px 13px', display: 'flex', gap: 10, opacity: shown > i ? 1 : 0, transform: shown > i ? 'translateX(0)' : `translateX(${isAr ? '-' : ''}12px)`, transition: 'opacity 0.4s ease, transform 0.4s ease' }}>
            <span style={{ width: 20, height: 20, borderRadius: '50%', background: item.urgent ? '#DC2626' : '#7C3AED', color: '#fff', fontSize: 10, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>{item.num}</span>
            <div>
              <p style={{ fontSize: 12, fontWeight: 700, color: item.urgent ? '#991B1B' : '#4C1D95', margin: '0 0 2px', textAlign: isAr ? 'right' : 'left' }}>{item.title}</p>
              <p style={{ fontSize: 10, color: item.urgent ? '#DC2626' : '#7C3AED', margin: '0 0 1px', textAlign: isAr ? 'right' : 'left' }}>{isAr ? 'لماذا:' : 'Why:'} {item.why}</p>
              <p style={{ fontSize: 10, color: '#9CA3AF', margin: 0, textAlign: isAr ? 'right' : 'left' }}>{isAr ? 'المسؤول:' : 'Owner:'} {item.who}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function C6Assessment({ isAr, active }: { isAr: boolean; active: boolean }) {
  const [score, setScore] = useState(0)
  const [showCTA, setShowCTA] = useState(false)
  const dims = isAr ? [
    { name: 'الإيرادات', score: 62, color: '#D97706' },
    { name: 'العملاء',   score: 74, color: '#059669' },
    { name: 'التسويق',   score: 48, color: '#DC2626' },
    { name: 'المنتج',    score: 55, color: '#D97706' },
    { name: 'الفريق',    score: 81, color: '#059669' },
    { name: 'الاستراتيجية', score: 67, color: '#059669' },
  ] : [
    { name: 'Revenue',   score: 62, color: '#D97706' },
    { name: 'Customer',  score: 74, color: '#059669' },
    { name: 'Marketing', score: 48, color: '#DC2626' },
    { name: 'Product',   score: 55, color: '#D97706' },
    { name: 'Team',      score: 81, color: '#059669' },
    { name: 'Strategy',  score: 67, color: '#059669' },
  ]
  useEffect(() => {
    if (!active) return
    setScore(0)
    setShowCTA(false)
    const target = 64
    const dur = 1800
    const start = Date.now()
    const tick = () => {
      const p = Math.min((Date.now() - start) / dur, 1)
      const eased = 1 - Math.pow(1 - p, 3)
      setScore(Math.round(eased * target))
      if (p < 1) requestAnimationFrame(tick)
      else setTimeout(() => setShowCTA(true), 400)
    }
    setTimeout(() => requestAnimationFrame(tick), 200)
  }, [active])
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 12, padding: '12px 14px', background: '#FFF7ED', border: '1px solid #FDE68A', borderRadius: 10 }}>
        <div style={{ textAlign: 'center', flexShrink: 0 }}>
          <p style={{ fontSize: 38, fontWeight: 900, color: '#D97706', margin: 0, lineHeight: 1 }}>{score}</p>
          <p style={{ fontSize: 10, color: '#92400E', margin: 0 }}>/100</p>
        </div>
        <div>
          <p style={{ fontSize: 13, fontWeight: 700, color: '#92400E', margin: '0 0 2px' }}>{isAr ? 'يحتاج اهتماماً' : 'Needs Attention'}</p>
          <p style={{ fontSize: 11, color: '#B45309', margin: '0 0 6px' }}>{isAr ? '3 مشاكل حرجة تحتاج إجراءً فورياً' : '3 critical issues need immediate action'}</p>
          <div style={{ opacity: showCTA ? 1 : 0, transform: showCTA ? 'translateY(0)' : 'translateY(6px)', transition: 'all 0.5s ease' }}>
            <a href="https://calendly.com/elvanis/book-demo-session" target="_blank" rel="noopener noreferrer" style={{ display: 'inline-block', padding: '7px 14px', background: 'linear-gradient(135deg,#4B35CC,#7C3AED)', color: '#fff', borderRadius: 8, fontSize: 12, fontWeight: 700, textDecoration: 'none' }}>
              {isAr ? 'احجز جلسة استراتيجية ←' : 'Book a Strategy Briefing →'}
            </a>
          </div>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
        {dims.map(dim => (
          <div key={dim.name} style={{ padding: '7px 10px', background: '#F9FAFB', borderRadius: 8, border: '1px solid #E5E7EB' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ fontSize: 10, fontWeight: 600, color: '#374151' }}>{dim.name}</span>
              <span style={{ fontSize: 10, fontWeight: 800, color: dim.color }}>{dim.score}</span>
            </div>
            <div style={{ height: 3, background: '#E5E7EB', borderRadius: 99 }}>
              <div style={{ height: 3, background: dim.color, borderRadius: 99, width: active ? `${dim.score}%` : '0%', transition: 'width 1.5s ease 0.5s' }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Auto-Play Demo Panel ──────────────────────────────────────
const STEP_DURATION = 3500

function DemoPanel({ isAr }: { isAr: boolean }) {
  const [step, setStep] = useState(0)
  const [paused, setPaused] = useState(false)
  const [progress, setProgress] = useState(0)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const rafRef = useRef<number | null>(null)
  const startRef = useRef<number>(0)
  const steps = DEMO_STEPS[isAr ? 'ar' : 'en']
  const TOTAL = steps.length

  const startTimer = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    startRef.current = Date.now()
    const tick = () => {
      const elapsed = Date.now() - startRef.current
      const p = Math.min(elapsed / STEP_DURATION, 1)
      setProgress(p)
      if (p < 1) {
        rafRef.current = requestAnimationFrame(tick)
      } else {
        setStep(s => (s + 1) % TOTAL)
        setProgress(0)
      }
    }
    rafRef.current = requestAnimationFrame(tick)
  }, [TOTAL])

  useEffect(() => {
    if (!paused) {
      startTimer()
    } else {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }
  }, [paused, step, startTimer])

  function goTo(i: number) {
    setStep(i)
    setProgress(0)
    setPaused(true)
  }

  function prev() { goTo((step - 1 + TOTAL) % TOTAL) }
  function next() { goTo((step + 1) % TOTAL) }

  function resume() {
    setProgress(0)
    setPaused(false)
  }

  const canvases = [
    <C1Connect isAr={isAr} active={step === 0} />,
    <C2Scan isAr={isAr} active={step === 1} />,
    <C3Signals isAr={isAr} active={step === 2} />,
    <C4Conflict isAr={isAr} active={step === 3} />,
    <C5Digest isAr={isAr} active={step === 4} />,
    <C6Assessment isAr={isAr} active={step === 5} />,
  ]

  return (
    <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 20, overflow: 'hidden' }}>
      {/* Step tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.08)', overflowX: 'auto' as const }}>
        {steps.map((s, i) => (
          <button key={s.id} onClick={() => goTo(i)} style={{ flex: 1, padding: '12px 8px', background: step === i ? 'rgba(75,53,204,0.2)' : 'transparent', border: 'none', borderBottom: `2px solid ${step === i ? '#4B35CC' : 'transparent'}`, cursor: 'pointer', fontFamily: 'inherit', fontSize: 11, fontWeight: step === i ? 700 : 500, color: step === i ? '#A78BFA' : '#4B5563', transition: 'all 0.2s', whiteSpace: 'nowrap' as const }}>
            {s.label}
          </button>
        ))}
      </div>

      {/* Progress bar */}
      <div style={{ height: 2, background: 'rgba(255,255,255,0.06)' }}>
        <div style={{ height: 2, background: 'linear-gradient(90deg,#4B35CC,#7C3AED)', width: `${progress * 100}%`, transition: 'none' }} />
      </div>

      {/* Content — left copy + right canvas */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 3fr', minHeight: 340 }}>
        {/* Left — step copy */}
        <div style={{ padding: '28px 24px', borderInlineEnd: '1px solid rgba(255,255,255,0.06)', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: '#C9A84C', letterSpacing: '0.12em', display: 'block', marginBottom: 10 }}>{steps[step].num}</span>
          <h3 style={{ fontSize: 18, fontWeight: 800, color: '#F8F4EE', margin: '0 0 12px', lineHeight: 1.25, letterSpacing: '-0.01em' }}>{steps[step].title}</h3>
          <p style={{ fontSize: 13, color: '#94A3B8', lineHeight: 1.7, margin: '0 0 20px' }}>{steps[step].body}</p>
          {paused && (
            <button onClick={resume} style={{ fontSize: 11, color: '#4B35CC', background: 'rgba(75,53,204,0.1)', border: '1px solid rgba(75,53,204,0.3)', borderRadius: 8, padding: '6px 12px', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600, width: 'fit-content' }}>
              {isAr ? '▶ استئناف' : '▶ Resume'}
            </button>
          )}
        </div>

        {/* Right — canvas */}
        <div style={{ padding: '20px', background: '#fff', overflowY: 'auto' as const }}>
          <div key={`canvas-${step}`}>
            {canvases[step]}
          </div>
        </div>
      </div>

      {/* Prev / Next */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <button onClick={prev} style={{ background: 'none', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 8, padding: '7px 14px', color: '#6B7280', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
          {isAr ? '▶ السابق' : '◀ Prev'}
        </button>
        <div style={{ display: 'flex', gap: 6 }}>
          {steps.map((_, i) => (
            <div key={i} onClick={() => goTo(i)} style={{ width: 7, height: 7, borderRadius: '50%', background: step === i ? '#4B35CC' : 'rgba(255,255,255,0.15)', cursor: 'pointer', transition: 'background 0.3s' }} />
          ))}
        </div>
        <button onClick={next} style={{ background: 'none', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 8, padding: '7px 14px', color: '#6B7280', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
          {isAr ? 'التالي ◀' : 'Next ▶'}
        </button>
      </div>
    </div>
  )
}

// ── FAQ ───────────────────────────────────────────────────────
function FAQItem({ q, a, isAr }: { q: string; a: string; isAr: boolean }) {
  const [open, setOpen] = useState(false)
  return (
    <div style={{ borderBottom: '1px solid #E5E7EB' }}>
      <button onClick={() => setOpen(o => !o)} style={{ width: '100%', padding: '18px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
        <span style={{ fontSize: 15, fontWeight: 600, color: '#111827', flex: 1, textAlign: isAr ? 'right' : 'left' }}>{q}</span>
        <span style={{ fontSize: 20, color: '#4B35CC', flexShrink: 0, transform: open ? 'rotate(45deg)' : 'none', transition: 'transform 0.2s', lineHeight: 1 }}>+</span>
      </button>
      {open && <p style={{ fontSize: 14, color: '#475569', lineHeight: 1.75, margin: '0 0 18px', textAlign: isAr ? 'right' : 'left' }}>{a}</p>}
    </div>
  )
}

// ── Content ───────────────────────────────────────────────────
const CONTENT = {
  en: {
    nav: { login: 'Go to my account', cta: 'Start free' },
    hero: {
      eyebrow: '✦ AI-POWERED STRATEGIC DIAGNOSTICS',
      headline_before: 'See ', headline_highlight: 'exactly', headline_after: " what's breaking your business.",
      sub: 'Elvanis connects to your existing tools, analyses your real operational data, and hands you an immediate roadmap of structural issues to fix first — ranked by business impact.',
      cta_primary: 'Start the diagnostic →',
      cta_secondary: 'See how it works',
      stats: [
        { value: '6', label: 'Business dimensions' },
        { value: '10 min', label: 'To your first signal' },
        { value: '£0', label: 'To get started' },
      ],
    },
    logos: { eyebrow: 'Connects to your stack', items: ['Shopify', 'Jira', 'Google Analytics', 'Intercom', 'Trustpilot'] },
    problem: {
      eyebrow: "The founder's dilemma",
      headline: 'Data is everywhere. Clarity is rare.',
      body: 'You have dashboards, reports, and alerts — but still can\'t answer: "What is the single most important thing to fix right now?" Elvanis was built to answer that question, every time you log in.',
      pains: [
        { icon: '📊', text: 'Metrics that tell you what happened, not why' },
        { icon: '🔄', text: 'Weekly syncs that surface problems too late' },
        { icon: '💸', text: 'Consultants who diagnose slowly and cost heavily' },
        { icon: '⏱', text: 'Hours lost deciding what actually matters most' },
      ],
    },
    how: {
      eyebrow: 'How it works',
      headline: 'From raw data to a ranked action plan',
      steps: [
        { num: '01', icon: '🔌', title: 'Connect your tools', desc: 'Link Shopify, Jira, GA4, Intercom, Trustpilot — or upload a CSV. Takes under 3 minutes.' },
        { num: '02', icon: '⚡', title: 'Get your diagnosis', desc: 'Elvanis reads your live data, detects patterns, and surfaces signals ranked by business impact.' },
        { num: '03', icon: '🎯', title: 'Act on what matters', desc: 'Every signal has a specific recommended action. Track whether your fixes worked.' },
      ],
    },
    focus: {
      eyebrow: 'The focus metric',
      headline: 'Most platforms show you everything. Elvanis shows you what matters to your business right now.',
      body: 'During onboarding, you choose one strategic priority. Every signal, digest, and AI recommendation is filtered through that lens.',
      options: [
        { icon: '💰', label: 'Revenue Growth', desc: 'Acquisition, conversion, and MRR' },
        { icon: '👥', label: 'Customer Retention', desc: 'Churn, NPS, and satisfaction' },
        { icon: '⚙️', label: 'Operations Cost', desc: 'Efficiency, support, and overhead' },
        { icon: '🎯', label: 'Product Delivery', desc: 'Velocity, quality, and PMF' },
      ],
      note: 'You can change your focus metric anytime from your Profile.',
    },
    dimensions: {
      eyebrow: 'What we diagnose',
      headline: 'Every dimension of your business, in one OS',
      items: [
        { icon: '💰', name: 'Revenue', desc: 'MRR trends, churn drivers, refund spikes, pricing signals' },
        { icon: '👥', name: 'Customer', desc: 'NPS patterns, complaint clusters, referral health, repeat behaviour' },
        { icon: '📣', name: 'Marketing', desc: 'CAC trends, channel efficiency, conversion drop-off, traffic shifts' },
        { icon: '🎯', name: 'Product', desc: 'PMF signals, feature adoption, bug impact, delivery velocity' },
        { icon: '⚙️', name: 'Team', desc: 'Sprint velocity, alignment gaps, execution blockers, capacity signals' },
        { icon: '🧭', name: 'Strategy', desc: 'ICP drift, decision avoidance, process maturity, 90-day alignment' },
      ],
    },
    features: {
      eyebrow: 'The full OS',
      headline: 'Everything you need to run your business on intelligence',
      items: [
        { icon: '⚡', title: 'Ranked signals', desc: 'Every issue detected and ranked by business impact. Critical first, always.' },
        { icon: '⚖️', title: 'Conflict resolution', desc: 'When two tools disagree, Elvanis flags the conflict and asks which source to trust.' },
        { icon: '📈', title: 'Goals & tracker', desc: 'Set measurable targets on any signal. Get alerted the moment a goal goes at risk.' },
        { icon: '📄', title: 'Action Digest', desc: 'A monthly AI-generated 90-day action plan. Navigator plan only.' },
        { icon: '✨', title: 'AI Readiness Score', desc: 'Specific automation opportunities ranked by impact, with estimated savings.' },
        { icon: '🎯', title: 'Business assessment', desc: 'A 26-question diagnostic across 6 dimensions. 10 minutes. Immediate results.' },
      ],
    },
    demo: {
      eyebrow: "Here's what founders see on day one",
      headline: 'Watch Elvanis work.',
      sub: 'Auto-plays through the full story. Click any step or use the arrows to explore.',
    },
    ai: {
      eyebrow: 'AI Readiness',
      headline: 'Know where AI can save your business time or revenue — right now.',
      body: 'Your AI Readiness Score is calculated from your active signals and business profile. It surfaces specific automation opportunities available today.',
      opportunities: [
        { icon: '🤖', title: 'AI Support Agent', saving: 'Save ~12 hrs/week', complexity: 'Low', desc: 'Automate tier-1 support tickets based on your repeat complaint patterns.' },
        { icon: '📊', title: 'Revenue Anomaly Detection', saving: 'Catch issues early', complexity: 'Medium', desc: 'Flag refund spikes and AOV drops before they become critical.' },
        { icon: '🎯', title: 'Churn Prediction Model', saving: 'Retain 15–20% more', complexity: 'Medium', desc: 'Identify at-risk customers from NPS and engagement patterns.' },
      ],
    },
    advisory: {
      eyebrow: 'Human expertise',
      headline: 'When you need more than a diagnosis.',
      body: 'AI can detect the signal. It takes a senior consultant to resolve the root cause.',
      services: [
        { icon: '🗺️', title: 'Strategic AI Roadmap', desc: 'A custom plan for implementing AI — prioritised by ROI and complexity.' },
        { icon: '👤', title: 'CPO Advisory Session', desc: 'A focused strategy session with a senior product consultant.' },
        { icon: '⚖️', title: 'Conflict Resolution', desc: 'Expert help interpreting conflicting signals and deciding which source to trust.' },
        { icon: '🤖', title: 'Custom AI Implementation', desc: 'Hands-on delivery of a specific AI solution — from scoping to deployment.' },
      ],
      cta: 'Book a session →',
      note: 'Navigator users get priority access to all advisory services.',
    },
    demo_cta: {
      eyebrow: 'See it live',
      headline: 'Watch Elvanis diagnose a real business.',
      body: 'Book a free 30-minute live walkthrough. We connect to a real tool, run a scan, and show you exactly what your business would see on day one.',
      button: 'Book a live demo →',
      note: 'Free. No commitment. 30 minutes.',
    },
    pricing: {
      eyebrow: 'Pricing',
      headline: "Start free. Scale when you're ready.",
      popular: 'Most popular',
      plans: [
        { name: 'Free', price: '£0', period: 'forever', desc: 'For founders getting started with diagnostics', cta: 'Start free', features: ['Business health score', 'Up to 3 tool connections', 'Unlimited signals', 'Monthly scan cycle', 'Business assessment', 'Goal tracking'], highlighted: false },
        { name: 'Navigator', price: '£49', period: 'per month', desc: 'For founders who need weekly intelligence', cta: 'Start Navigator', features: ['Everything in Free', 'Weekly scans', 'Unlimited tool connections', 'Monthly AI Action Digest', 'On-demand manual scans', 'Conflict resolution', 'Impact tracking', 'Priority advisory access'], highlighted: true },
      ],
    },
    faq: {
      eyebrow: 'Common questions',
      headline: 'Everything you need to know',
      items: [
        { q: 'Is my data safe?', a: 'Yes. Elvanis only requests read-only access to your connected tools. We never write or modify your data. All data is encrypted in transit and at rest, stored on EU-hosted infrastructure.' },
        { q: 'How long does it take to see results?', a: 'Most founders see their first diagnostic signals within 10 minutes of connecting a tool. The business assessment takes around 10 minutes and gives you an immediate scored breakdown across 6 dimensions.' },
        { q: 'Does it work for non-technical founders?', a: 'Absolutely. Elvanis is built for operators, not engineers. No code, no setup, no dashboards to configure. Connect your tools, take the assessment, and your diagnosis is ready.' },
        { q: 'Can I cancel at any time?', a: 'Yes. There are no long-term contracts. You can cancel Navigator at any time from your profile. Your data is retained for 30 days after cancellation.' },
        { q: 'What tools does Elvanis connect to?', a: 'Shopify, Jira, Google Analytics 4, Intercom, and Trustpilot. You can also upload CSV exports from any tool. More integrations are being added regularly.' },
        { q: 'How is Elvanis different from a dashboard?', a: 'A dashboard shows you data. Elvanis diagnoses it. We read your metrics, detect patterns across multiple tools, rank issues by business impact, and tell you exactly what to fix first — with a recommended action.' },
      ],
    },
    cta: { headline: 'Your business is sending signals.', sub: 'Start reading them.', button: 'Diagnose my business →' },
    footer: {
      tagline: 'AI-powered business diagnostics for founder-led companies.',
      groups: [
        { title: 'Product', links: [{ label: 'Start free', href: '/signup' }, { label: 'Pricing', href: '#pricing' }, { label: 'Book a demo', href: 'https://calendly.com/elvanis/book-demo-session' }] },
        { title: 'Services', links: [{ label: 'Strategic Roadmap', href: '/signup' }, { label: 'CPO Advisory', href: '/signup' }, { label: 'Contact us', href: 'https://calendar.app.google/BgGMvvW5VJ2rKPjP9' }] },
        { title: 'Legal', links: [{ label: 'Terms of Service', href: '/terms' }, { label: 'Privacy Policy', href: '/privacy' }, { label: 'Sign in', href: '/login' }] },
      ],
      copy: '© 2026 Elvanis. All rights reserved.',
    },
  },
  ar: {
    nav: { login: 'الذهاب إلى حسابي', cta: 'ابدأ مجاناً' },
    hero: {
      eyebrow: '✦ التشخيص الاستراتيجي المدعوم بالذكاء الاصطناعي',
      headline_before: 'اكتشف ', headline_highlight: 'فوراً', headline_after: ' الاختناقات الهيكلية التي تعطّل نمو أعمالك.',
      sub: 'يتصل إلفانيس بأدواتك الحالية، يحلّل بياناتك التشغيلية الحقيقية، ويمنحك خارطة طريق فورية بالمشاكل الهيكلية التي يجب إصلاحها أولاً — مرتّبةً تلقائياً حسب الأثر التجاري.',
      cta_primary: 'ابدأ التشخيص ←',
      cta_secondary: 'شاهد كيف يعمل',
      stats: [
        { value: '٦', label: 'أبعاد تجارية' },
        { value: '١٠ د', label: 'حتى أول إشارة' },
        { value: '£0', label: 'للبدء' },
      ],
    },
    logos: { eyebrow: 'يتصل بأدواتك', items: ['Shopify', 'Jira', 'Google Analytics', 'Intercom', 'Trustpilot'] },
    problem: {
      eyebrow: 'معضلة المؤسس',
      headline: 'البيانات في كل مكان. الوضوح نادر.',
      body: 'لديك لوحات تحكم وتقارير وتنبيهات — لكنك لا تزال غير قادر على الإجابة: "ما هو الشيء الأهم الذي يجب إصلاحه الآن؟" بُني إلفانيس للإجابة على هذا السؤال في كل مرة تسجّل الدخول.',
      pains: [
        { icon: '📊', text: 'مقاييس تخبرك بما حدث، لا بالسبب' },
        { icon: '🔄', text: 'اجتماعات أسبوعية تكشف المشاكل متأخرة جداً' },
        { icon: '💸', text: 'مستشارون يشخّصون ببطء ويكلّفون كثيراً' },
        { icon: '⏱', text: 'ساعات ضائعة في تحديد ما يهم فعلاً' },
      ],
    },
    how: {
      eyebrow: 'كيف يعمل',
      headline: 'من البيانات الخام إلى خطة عمل مرتّبة',
      steps: [
        { num: '٠١', icon: '🔌', title: 'اربط أدواتك', desc: 'اربط Shopify وJira وGA4 وIntercom وTrustpilot. يستغرق أقل من 3 دقائق.' },
        { num: '٠٢', icon: '⚡', title: 'احصل على تشخيصك', desc: 'يقرأ إلفانيس بياناتك الحية، يكتشف الأنماط، ويرصد الإشارات مرتبةً حسب الأثر.' },
        { num: '٠٣', icon: '🎯', title: 'تصرّف بناءً على ما يهم', desc: 'كل إشارة لها إجراء موصى به محدد. تابع ما إذا كانت إصلاحاتك نجحت.' },
      ],
    },
    focus: {
      eyebrow: 'مقياس التركيز',
      headline: 'معظم المنصات تعرض كل شيء. إلفانيس يعرض ما يهم أعمالك الآن.',
      body: 'أثناء الإعداد الأولي، تختار أولويتك الاستراتيجية. كل إشارة وملخص وتوصية تُصفَّى عبر هذه العدسة.',
      options: [
        { icon: '💰', label: 'نمو الإيرادات', desc: 'الاكتساب والتحويل والـ MRR' },
        { icon: '👥', label: 'الاحتفاظ بالعملاء', desc: 'التسرب وNPS والرضا' },
        { icon: '⚙️', label: 'تكاليف العمليات', desc: 'الكفاءة والدعم والتكاليف العامة' },
        { icon: '🎯', label: 'تسليم المنتج', desc: 'السرعة والجودة وملاءمة السوق' },
      ],
      note: 'يمكنك تغيير مقياس التركيز في أي وقت من ملفك الشخصي.',
    },
    dimensions: {
      eyebrow: 'ما نشخّصه',
      headline: 'كل بُعد من أبعاد أعمالك في نظام واحد',
      items: [
        { icon: '💰', name: 'الإيرادات', desc: 'اتجاهات MRR، محركات التسرب، ارتفاعات الاسترداد' },
        { icon: '👥', name: 'العملاء', desc: 'أنماط NPS، مجموعات الشكاوى، صحة الإحالة' },
        { icon: '📣', name: 'التسويق', desc: 'اتجاهات CAC، كفاءة القناة، انخفاض التحويل' },
        { icon: '🎯', name: 'المنتج', desc: 'إشارات PMF، اعتماد الميزات، تأثير الأخطاء' },
        { icon: '⚙️', name: 'الفريق', desc: 'سرعة السبرينت، فجوات التوافق، عوائق التنفيذ' },
        { icon: '🧭', name: 'الاستراتيجية', desc: 'انجراف ICP، تجنب القرارات، نضج العمليات' },
      ],
    },
    features: {
      eyebrow: 'النظام الكامل',
      headline: 'كل ما تحتاجه لإدارة أعمالك بالذكاء',
      items: [
        { icon: '⚡', title: 'إشارات مرتّبة', desc: 'كل مشكلة مكتشفة ومرتّبة حسب الأثر التجاري.' },
        { icon: '⚖️', title: 'حل التعارضات', desc: 'عندما تختلف أداتان، يرصد إلفانيس التعارض ويسألك أي مصدر تثق به.' },
        { icon: '📈', title: 'الأهداف والمتابعة', desc: 'ضع أهدافاً قابلة للقياس. احصل على تنبيه فور تعرّض هدف للخطر.' },
        { icon: '📄', title: 'ملخص الإجراءات', desc: 'خطة عمل شهرية مولّدة بالذكاء الاصطناعي لمدة 90 يوماً.' },
        { icon: '✨', title: 'درجة الاستعداد للذكاء الاصطناعي', desc: 'فرص أتمتة محددة مرتّبة حسب الأثر، مع تقديرات للتوفير.' },
        { icon: '🎯', title: 'تقييم الأعمال', desc: 'تشخيص من 26 سؤالاً عبر 6 أبعاد. 10 دقائق. نتائج فورية.' },
      ],
    },
    demo: {
      eyebrow: 'هذا ما يراه المؤسسون في اليوم الأول',
      headline: 'شاهد إلفانيس يعمل.',
      sub: 'يُشغَّل تلقائياً عبر القصة الكاملة. انقر على أي خطوة أو استخدم الأسهم للاستكشاف.',
    },
    ai: {
      eyebrow: 'الاستعداد للذكاء الاصطناعي',
      headline: 'اعرف أين يمكن للذكاء الاصطناعي توفير الوقت أو الإيرادات — الآن.',
      body: 'تُحسب درجة استعدادك للذكاء الاصطناعي من إشاراتك النشطة وملفك التجاري.',
      opportunities: [
        { icon: '🤖', title: 'وكيل دعم بالذكاء الاصطناعي', saving: 'وفّر ~12 ساعة/أسبوع', complexity: 'منخفض', desc: 'أتمتة تذاكر الدعم بناءً على أنماط الشكاوى المتكررة.' },
        { icon: '📊', title: 'كشف شذوذات الإيرادات', saving: 'اكتشف المشاكل مبكراً', complexity: 'متوسط', desc: 'رصد ارتفاعات الاسترداد وانخفاضات AOV قبل أن تصبح حرجة.' },
        { icon: '🎯', title: 'نموذج التنبؤ بالتسرب', saving: 'احتفظ بـ 15-20% أكثر', complexity: 'متوسط', desc: 'تحديد العملاء المعرّضين للخطر من أنماط NPS والتفاعل.' },
      ],
    },
    advisory: {
      eyebrow: 'الخبرة البشرية',
      headline: 'عندما تحتاج أكثر من تشخيص.',
      body: 'الذكاء الاصطناعي يكتشف الإشارة. يحتاج حل السبب الجذري إلى مستشار متمرس.',
      services: [
        { icon: '🗺️', title: 'خارطة طريق استراتيجية للذكاء الاصطناعي', desc: 'خطة مخصصة مرتّبة حسب العائد على الاستثمار.' },
        { icon: '👤', title: 'جلسة استشارية CPO', desc: 'جلسة استراتيجية مركزة مع مستشار منتج كبير.' },
        { icon: '⚖️', title: 'حل التعارضات', desc: 'مساعدة خبير في تفسير الإشارات المتعارضة.' },
        { icon: '🤖', title: 'تنفيذ ذكاء اصطناعي مخصص', desc: 'تسليم عملي من التحديد النطاق حتى النشر.' },
      ],
      cta: 'احجز جلسة ←',
      note: 'يحصل مستخدمو Navigator على أولوية الوصول لجميع الخدمات الاستشارية.',
    },
    demo_cta: {
      eyebrow: 'شاهده مباشرة',
      headline: 'شاهد إلفانيس يشخّص أعمالاً حقيقية.',
      body: 'احجز جلسة مباشرة مجانية لمدة 30 دقيقة. نربط أداة حقيقية ونريك بالضبط ما ستراه أعمالك.',
      button: 'احجز عرضاً مباشراً ←',
      note: 'مجاني. بدون التزام. 30 دقيقة.',
    },
    pricing: {
      eyebrow: 'الأسعار',
      headline: 'ابدأ مجاناً. طوّر عندما تكون مستعداً.',
      popular: 'الأكثر شيوعاً',
      plans: [
        { name: 'مجاني', price: '£0', period: 'للأبد', desc: 'للمؤسسين الذين يبدأون مع التشخيص', cta: 'ابدأ مجاناً', features: ['درجة صحة الأعمال', 'حتى 3 اتصالات أدوات', 'إشارات غير محدودة', 'دورة فحص شهرية', 'تقييم الأعمال', 'تتبع الأهداف'], highlighted: false },
        { name: 'Navigator', price: '£49', period: 'شهرياً', desc: 'للمؤسسين الذين يحتاجون ذكاءً أسبوعياً', cta: 'ابدأ Navigator', features: ['كل ما في المجاني', 'فحوصات أسبوعية', 'اتصالات أدوات غير محدودة', 'ملخص إجراءات شهري بالذكاء الاصطناعي', 'فحوصات يدوية عند الطلب', 'حل التعارضات', 'تتبع الأثر', 'وصول أولوي للاستشارة'], highlighted: true },
      ],
    },
    faq: {
      eyebrow: 'أسئلة شائعة',
      headline: 'كل ما تحتاج معرفته',
      items: [
        { q: 'هل بياناتي آمنة؟', a: 'نعم. يطلب إلفانيس صلاحية القراءة فقط. لا نكتب بياناتك. جميع البيانات مشفّرة على بنية تحتية في الاتحاد الأوروبي.' },
        { q: 'كم يستغرق رؤية النتائج؟', a: 'يرى معظم المؤسسين أول إشاراتهم في غضون 10 دقائق. يستغرق التقييم نحو 10 دقائق ويعطيك تحليلاً فورياً عبر 6 أبعاد.' },
        { q: 'هل يناسب المؤسسين غير التقنيين؟', a: 'بالتأكيد. لا كود، لا إعداد. اربط أدواتك، أجرِ التقييم، وتشخيصك جاهز.' },
        { q: 'هل يمكنني الإلغاء في أي وقت؟', a: 'نعم. لا توجد عقود طويلة الأمد. يمكنك الإلغاء في أي وقت من ملفك الشخصي.' },
        { q: 'ما الأدوات التي يتصل بها إلفانيس؟', a: 'Shopify وJira وGoogle Analytics 4 وIntercom وTrustpilot. يمكنك أيضاً رفع ملفات CSV.' },
        { q: 'كيف يختلف إلفانيس عن لوحة التحكم؟', a: 'لوحة التحكم تعرض البيانات. إلفانيس يشخّصها ويخبرك بالضبط بما يجب إصلاحه أولاً.' },
      ],
    },
    cta: { headline: 'أعمالك ترسل إشارات.', sub: 'ابدأ قراءتها.', button: 'شخّص أعمالي ←' },
    footer: {
      tagline: 'تشخيص الأعمال بالذكاء الاصطناعي للشركات التي يقودها المؤسسون.',
      groups: [
        { title: 'المنتج', links: [{ label: 'ابدأ مجاناً', href: '/signup' }, { label: 'الأسعار', href: '#pricing' }, { label: 'احجز عرضاً', href: 'https://calendly.com/elvanis/book-demo-session' }] },
        { title: 'الخدمات', links: [{ label: 'خارطة طريق استراتيجية', href: '/signup' }, { label: 'استشارة CPO', href: '/signup' }, { label: 'تواصل معنا', href: 'https://calendar.app.google/BgGMvvW5VJ2rKPjP9' }] },
        { title: 'قانوني', links: [{ label: 'شروط الخدمة', href: '/terms' }, { label: 'سياسة الخصوصية', href: '/privacy' }, { label: 'تسجيل الدخول', href: '/login' }] },
      ],
      copy: '© 2026 إلفانيس. جميع الحقوق محفوظة.',
    },
  },
}

// ── Main ──────────────────────────────────────────────────────
export default function LandingPage() {
  const [lang, setLang] = useState<Lang>('en')
  const isAr = lang === 'ar'
  const c = CONTENT[lang]
  const demoRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const saved = localStorage.getItem('preferred_lang')
    if (saved === 'ar' || saved === 'en') setLang(saved as Lang)
  }, [])

  function toggleLang() {
    const next: Lang = lang === 'en' ? 'ar' : 'en'
    setLang(next)
    localStorage.setItem('preferred_lang', next)
  }

  function scrollToDemo() {
    demoRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const W: React.CSSProperties = { maxWidth: 1080, margin: '0 auto' }
  const S = (bg: string): React.CSSProperties => ({ padding: '96px 24px', background: bg })

  return (
    <div dir={isAr ? 'rtl' : 'ltr'} style={{ fontFamily: "'Inter',-apple-system,sans-serif", color: '#111827', overflowX: 'hidden' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;}
        html{scroll-behavior:smooth;}
        .hl{background:linear-gradient(135deg,#4B35CC,#7C3AED);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;font-weight:900;font-style:italic;padding:0 6px;display:inline-block;line-height:1.2;}
        .btn{display:inline-block;padding:14px 28px;background:linear-gradient(135deg,#4B35CC,#7C3AED);color:#fff;border:none;border-radius:12px;font-size:15px;font-weight:700;cursor:pointer;text-decoration:none;transition:transform 0.2s,box-shadow 0.2s;font-family:inherit;box-shadow:0 4px 20px rgba(75,53,204,0.3);}
        .btn:hover{transform:translateY(-2px);box-shadow:0 8px 30px rgba(75,53,204,0.4);}
        .btn-o{display:inline-block;padding:14px 28px;background:transparent;color:#E2E8F0;border:1px solid rgba(255,255,255,0.2);border-radius:12px;font-size:15px;font-weight:600;cursor:pointer;text-decoration:none;transition:all 0.2s;font-family:inherit;}
        .btn-o:hover{border-color:rgba(255,255,255,0.5);background:rgba(255,255,255,0.07);}
        .ey{font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#4B35CC;margin-bottom:12px;display:block;}
        .sh{font-size:clamp(26px,4vw,40px);font-weight:800;color:#09071A;line-height:1.2;letter-spacing:-0.02em;}
        @media(max-width:768px){.g2{grid-template-columns:1fr!important;}.g3{grid-template-columns:1fr 1fr!important;}.g4{grid-template-columns:1fr 1fr!important;}.hm{display:none!important;}.demo-grid{grid-template-columns:1fr!important;}}
      `}</style>

      {/* Nav */}
      <nav style={{ position: 'sticky', top: 0, zIndex: 100, background: 'rgba(9,7,26,0.96)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(255,255,255,0.07)', padding: '0 24px' }}>
        <div style={{ ...W, height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <span style={{ fontSize: 20, fontWeight: 900, color: '#F8F4EE', letterSpacing: '-0.03em', display: 'block', lineHeight: 1.15 }}>Elvanis</span>
            <span style={{ fontSize: 9, color: '#94A3B8', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase' as const }}>AI Business OS</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
            <Link href="/login" style={{ fontSize: 13, color: '#64748B', textDecoration: 'none', fontWeight: 500, whiteSpace: 'nowrap' as const }}>{c.nav.login}</Link>
            <a href="https://calendly.com/elvanis/book-demo-session" target="_blank" rel="noopener noreferrer" className="hm" style={{ fontSize: 13, color: '#C9A84C', textDecoration: 'none', fontWeight: 600, whiteSpace: 'nowrap' as const }}>
              {isAr ? 'احجز عرضاً' : 'Book a demo'}
            </a>
            <button onClick={toggleLang} style={{ background: 'none', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 8, padding: '5px 12px', color: '#64748B', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
              {lang === 'en' ? 'عربي' : 'EN'}
            </button>
            <Link href="/signup" style={{ display: 'inline-block', padding: '9px 20px', background: 'linear-gradient(135deg,#4B35CC,#7C3AED)', color: '#fff', borderRadius: 10, fontSize: 13, fontWeight: 700, textDecoration: 'none', whiteSpace: 'nowrap' as const }}>{c.nav.cta}</Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section style={{ background: 'linear-gradient(180deg,#09071A 0%,#0F0A2E 60%,#09071A 100%)', padding: '120px 24px 96px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: '30%', left: '50%', transform: 'translateX(-50%)', width: 700, height: 500, background: 'radial-gradient(circle,rgba(75,53,204,0.12) 0%,transparent 70%)', pointerEvents: 'none' as const }} />
        <div style={{ ...W, textAlign: 'center', position: 'relative' }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: '#C9A84C', letterSpacing: '0.15em', display: 'block', marginBottom: 16 }}>{c.hero.eyebrow}</span>
          <h1 style={{ fontSize: 'clamp(36px,6vw,68px)', fontWeight: 900, color: '#F8F4EE', lineHeight: 1.1, letterSpacing: '-0.03em', maxWidth: 860, margin: '0 auto 24px' }}>
            {c.hero.headline_before}<span className="hl">{c.hero.headline_highlight}</span>{c.hero.headline_after}
          </h1>
          <p style={{ fontSize: 'clamp(16px,2vw,19px)', color: '#CBD5E1', lineHeight: 1.75, maxWidth: 580, margin: '0 auto 40px' }}>{c.hero.sub}</p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' as const, marginBottom: 72 }}>
            <Link href="/signup" className="btn">{c.hero.cta_primary}</Link>
            <button onClick={scrollToDemo} className="btn-o" style={{ cursor: 'pointer' }}>{c.hero.cta_secondary}</button>
          </div>
        </div>
      </section>

      {/* Logos */}
      <section style={{ background: '#F8F4EE', padding: '32px 24px', borderBottom: '1px solid #E5E7EB' }}>
        <div style={{ ...W, textAlign: 'center' }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: '#9CA3AF', letterSpacing: '0.1em', textTransform: 'uppercase' as const, display: 'block', marginBottom: 16 }}>{c.logos.eyebrow}</span>
          <div style={{ display: 'flex', gap: 40, justifyContent: 'center', flexWrap: 'wrap' as const }}>
            {c.logos.items.map(logo => <span key={logo} style={{ fontSize: 14, fontWeight: 700, color: '#9CA3AF' }}>{logo}</span>)}
          </div>
        </div>
      </section>

      {/* Problem */}
      <section style={S('#fff')}>
        <div style={{ ...W, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 64, alignItems: 'center' }} className="g2">
          <div>
            <span className="ey">{c.problem.eyebrow}</span>
            <h2 className="sh" style={{ marginBottom: 20 }}>{c.problem.headline}</h2>
            <p style={{ fontSize: 16, color: '#475569', lineHeight: 1.75, marginBottom: 32 }}>{c.problem.body}</p>
            <Link href="/signup" style={{ display: 'inline-block', padding: '13px 26px', background: '#09071A', color: '#F8F4EE', borderRadius: 12, fontSize: 14, fontWeight: 700, textDecoration: 'none' }}>{c.hero.cta_primary}</Link>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {c.problem.pains.map((p, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px', background: '#F8F4EE', borderRadius: 12, border: '1px solid #E5E7EB' }}>
                <span style={{ fontSize: 22, flexShrink: 0 }}>{p.icon}</span>
                <p style={{ fontSize: 14, color: '#374151', margin: 0, fontWeight: 500 }}>{p.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How */}
      <section style={S('#09071A')}>
        <div style={W}>
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <span className="ey" style={{ color: '#C9A84C' }}>{c.how.eyebrow}</span>
            <h2 className="sh" style={{ color: '#F8F4EE' }}>{c.how.headline}</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 24 }} className="g3">
            {c.how.steps.map((step, i) => (
              <div key={i} style={{ padding: 28, background: 'rgba(255,255,255,0.04)', borderRadius: 16, border: '1px solid rgba(255,255,255,0.08)', position: 'relative' }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#A78BFA', letterSpacing: '0.1em', display: 'block', marginBottom: 16 }}>{step.num}</span>
                <span style={{ fontSize: 28, display: 'block', marginBottom: 12 }}>{step.icon}</span>
                <h3 style={{ fontSize: 18, fontWeight: 700, color: '#F8F4EE', margin: '0 0 10px' }}>{step.title}</h3>
                <p style={{ fontSize: 14, color: '#94A3B8', lineHeight: 1.65, margin: 0 }}>{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Focus */}
      <section style={S('#F8F4EE')}>
        <div style={W}>
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <span className="ey">{c.focus.eyebrow}</span>
            <h2 className="sh" style={{ maxWidth: 680, margin: '0 auto 16px' }}>{c.focus.headline}</h2>
            <p style={{ fontSize: 16, color: '#475569', lineHeight: 1.75, maxWidth: 560, margin: '0 auto' }}>{c.focus.body}</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 20 }} className="g4">
            {c.focus.options.map((opt, i) => (
              <div key={i} style={{ background: '#fff', borderRadius: 14, border: '1px solid #E5E7EB', padding: 20, textAlign: 'center' }}>
                <span style={{ fontSize: 28, display: 'block', marginBottom: 10 }}>{opt.icon}</span>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: '#09071A', margin: '0 0 6px' }}>{opt.label}</h3>
                <p style={{ fontSize: 12, color: '#6B7280', margin: 0, lineHeight: 1.5 }}>{opt.desc}</p>
              </div>
            ))}
          </div>
          <p style={{ fontSize: 13, color: '#9CA3AF', textAlign: 'center', fontStyle: 'italic' }}>💡 {c.focus.note}</p>
        </div>
      </section>

      {/* Dimensions */}
      <section style={S('#fff')}>
        <div style={W}>
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <span className="ey">{c.dimensions.eyebrow}</span>
            <h2 className="sh">{c.dimensions.headline}</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16 }} className="g3">
            {c.dimensions.items.map((dim, i) => (
              <div key={i} style={{ background: '#F8F4EE', border: '1px solid #E5E7EB', borderRadius: 14, padding: 22 }}>
                <span style={{ fontSize: 26, display: 'block', marginBottom: 10 }}>{dim.icon}</span>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: '#09071A', margin: '0 0 6px' }}>{dim.name}</h3>
                <p style={{ fontSize: 13, color: '#6B7280', margin: 0, lineHeight: 1.6 }}>{dim.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section style={S('#09071A')}>
        <div style={W}>
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <span className="ey" style={{ color: '#C9A84C' }}>{c.features.eyebrow}</span>
            <h2 className="sh" style={{ color: '#F8F4EE' }}>{c.features.headline}</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 20 }} className="g3">
            {c.features.items.map((f, i) => (
              <div key={i} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: 24 }}>
                <span style={{ fontSize: 26, display: 'block', marginBottom: 12 }}>{f.icon}</span>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: '#F8F4EE', margin: '0 0 8px' }}>{f.title}</h3>
                <p style={{ fontSize: 13, color: '#94A3B8', margin: 0, lineHeight: 1.65 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Demo */}
      <section ref={demoRef} style={{ background: '#09071A', padding: '96px 24px' }}>
        <div style={W}>
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <span className="ey" style={{ color: '#C9A84C' }}>{c.demo.eyebrow}</span>
            <h2 className="sh" style={{ color: '#F8F4EE', marginBottom: 12 }}>{c.demo.headline}</h2>
            <p style={{ fontSize: 15, color: '#64748B', maxWidth: 480, margin: '0 auto' }}>{c.demo.sub}</p>
          </div>
          <DemoPanel isAr={isAr} />
          <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' as const, marginTop: 48 }}>
            <Link href="/signup" className="btn">{c.hero.cta_primary}</Link>
            <a href="https://calendly.com/elvanis/book-demo-session" target="_blank" rel="noopener noreferrer" className="btn-o">
              {isAr ? 'احجز عرضاً مباشراً ←' : 'Book a live demo →'}
            </a>
          </div>
        </div>
      </section>

      {/* AI Readiness */}
      <section style={S('#fff')}>
        <div style={{ ...W, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 64, alignItems: 'center' }} className="g2">
          <div>
            <span className="ey">{c.ai.eyebrow}</span>
            <h2 className="sh" style={{ marginBottom: 16 }}>{c.ai.headline}</h2>
            <p style={{ fontSize: 15, color: '#475569', lineHeight: 1.75, marginBottom: 32 }}>{c.ai.body}</p>
            <Link href="/signup" style={{ display: 'inline-block', padding: '13px 26px', background: 'linear-gradient(135deg,#4B35CC,#7C3AED)', color: '#fff', borderRadius: 12, fontSize: 14, fontWeight: 700, textDecoration: 'none' }}>{c.hero.cta_primary}</Link>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {c.ai.opportunities.map((opp, i) => (
              <div key={i} style={{ background: '#F5F3FF', border: '1px solid #DDD6FE', borderRadius: 14, padding: '16px 18px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 22 }}>{opp.icon}</span>
                    <span style={{ fontSize: 14, fontWeight: 700, color: '#4C1D95' }}>{opp.title}</span>
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#7C3AED', background: '#EDE9FE', padding: '2px 8px', borderRadius: 20 }}>{opp.complexity}</span>
                </div>
                <p style={{ fontSize: 13, color: '#6D28D9', margin: '0 0 6px', lineHeight: 1.5, textAlign: isAr ? 'right' : 'left' }}>{opp.desc}</p>
                <p style={{ fontSize: 12, fontWeight: 700, color: '#7C3AED', margin: 0 }}>⏱ {opp.saving}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Advisory */}
      <section style={S('#09071A')}>
        <div style={W}>
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <span className="ey" style={{ color: '#C9A84C' }}>{c.advisory.eyebrow}</span>
            <h2 className="sh" style={{ color: '#F8F4EE', marginBottom: 16 }}>{c.advisory.headline}</h2>
            <p style={{ fontSize: 16, color: '#94A3B8', maxWidth: 560, margin: '0 auto' }}>{c.advisory.body}</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 36 }} className="g2">
            {c.advisory.services.map((svc, i) => (
              <div key={i} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: 22 }}>
                <span style={{ fontSize: 26, display: 'block', marginBottom: 12 }}>{svc.icon}</span>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: '#F8F4EE', margin: '0 0 8px' }}>{svc.title}</h3>
                <p style={{ fontSize: 13, color: '#94A3B8', margin: 0, lineHeight: 1.6 }}>{svc.desc}</p>
              </div>
            ))}
          </div>
          <div style={{ textAlign: 'center' }}>
            <Link href="/signup" style={{ display: 'inline-block', padding: '13px 28px', background: 'rgba(201,168,76,0.15)', color: '#C9A84C', border: '1px solid rgba(201,168,76,0.3)', borderRadius: 12, fontSize: 14, fontWeight: 700, textDecoration: 'none', marginBottom: 12 }}>{c.advisory.cta}</Link>
            <p style={{ fontSize: 12, color: '#4B5563', marginTop: 8 }}>{c.advisory.note}</p>
          </div>
        </div>
      </section>

      {/* Book a Demo CTA */}
      <section style={{ padding: '80px 24px', background: '#fff' }}>
        <div style={{ maxWidth: 640, margin: '0 auto', textAlign: 'center' }}>
          <span className="ey">{c.demo_cta.eyebrow}</span>
          <h2 className="sh" style={{ marginBottom: 16 }}>{c.demo_cta.headline}</h2>
          <p style={{ fontSize: 16, color: '#475569', lineHeight: 1.75, maxWidth: 500, margin: '0 auto 36px' }}>{c.demo_cta.body}</p>
          <a href="https://calendly.com/elvanis/book-demo-session" target="_blank" rel="noopener noreferrer" style={{ display: 'inline-block', padding: '15px 32px', background: 'linear-gradient(135deg,#4B35CC,#7C3AED)', color: '#fff', borderRadius: 12, fontSize: 15, fontWeight: 700, textDecoration: 'none', boxShadow: '0 4px 20px rgba(75,53,204,0.3)', marginBottom: 12 }}>
            {c.demo_cta.button}
          </a>
          <p style={{ fontSize: 13, color: '#9CA3AF', margin: 0 }}>{c.demo_cta.note}</p>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" style={S('#F8F4EE')}>
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <span className="ey">{c.pricing.eyebrow}</span>
            <h2 className="sh">{c.pricing.headline}</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }} className="g2">
            {c.pricing.plans.map((plan, i) => (
              <div key={i} style={{ borderRadius: 20, padding: 32, background: plan.highlighted ? 'linear-gradient(135deg,#4B35CC,#7C3AED)' : '#fff', border: plan.highlighted ? 'none' : '1px solid #E5E7EB', position: 'relative', boxShadow: plan.highlighted ? '0 20px 60px rgba(75,53,204,0.3)' : '0 4px 20px rgba(0,0,0,0.06)' }}>
                {plan.highlighted && (
                  <span style={{ position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)', background: '#C9A84C', color: '#09071A', fontSize: 11, fontWeight: 800, padding: '4px 14px', borderRadius: 20, letterSpacing: '0.06em', textTransform: 'uppercase' as const, whiteSpace: 'nowrap' as const }}>
                    {c.pricing.popular}
                  </span>
                )}
                <h3 style={{ fontSize: 20, fontWeight: 800, color: plan.highlighted ? '#F8F4EE' : '#09071A', margin: '0 0 8px' }}>{plan.name}</h3>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, marginBottom: 8 }}>
                  <span style={{ fontSize: 42, fontWeight: 900, color: plan.highlighted ? '#F8F4EE' : '#09071A', lineHeight: 1 }}>{plan.price}</span>
                  <span style={{ fontSize: 14, color: plan.highlighted ? '#C4B5FD' : '#6B7280', marginBottom: 6 }}>/{plan.period}</span>
                </div>
                <p style={{ fontSize: 14, color: plan.highlighted ? '#C4B5FD' : '#6B7280', marginBottom: 24 }}>{plan.desc}</p>
                <ul style={{ listStyle: 'none', padding: 0, marginBottom: 28, display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {plan.features.map((f, j) => (
                    <li key={j} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, color: plan.highlighted ? '#EDE9FE' : '#374151' }}>
                      <span style={{ color: plan.highlighted ? '#C9A84C' : '#4B35CC', fontWeight: 700, flexShrink: 0 }}>✓</span>{f}
                    </li>
                  ))}
                </ul>
                <Link href="/signup" style={{ display: 'block', padding: 13, textAlign: 'center', background: plan.highlighted ? '#F8F4EE' : '#09071A', color: plan.highlighted ? '#4B35CC' : '#F8F4EE', borderRadius: 10, fontSize: 14, fontWeight: 700, textDecoration: 'none' }}>
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section style={S('#fff')}>
        <div style={{ maxWidth: 680, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <span className="ey">{c.faq.eyebrow}</span>
            <h2 className="sh">{c.faq.headline}</h2>
          </div>
          {c.faq.items.map((item, i) => <FAQItem key={i} q={item.q} a={item.a} isAr={isAr} />)}
        </div>
      </section>

      {/* Final CTA */}
      <section style={{ padding: '96px 24px', background: 'linear-gradient(135deg,#09071A 0%,#1E1B4B 100%)' }}>
        <div style={{ ...W, textAlign: 'center' }}>
          <h2 style={{ fontSize: 'clamp(32px,5vw,54px)', fontWeight: 900, color: '#F8F4EE', margin: '0 0 12px', letterSpacing: '-0.02em' }}>{c.cta.headline}</h2>
          <p style={{ fontSize: 22, color: '#C9A84C', fontWeight: 700, margin: '0 0 40px' }}>{c.cta.sub}</p>
          <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' as const }}>
            <Link href="/signup" style={{ display: 'inline-block', padding: '16px 40px', background: 'linear-gradient(135deg,#4B35CC,#7C3AED)', color: '#fff', borderRadius: 14, fontSize: 16, fontWeight: 700, textDecoration: 'none', boxShadow: '0 8px 30px rgba(75,53,204,0.4)' }}>{c.cta.button}</Link>
            <a href="https://calendly.com/elvanis/book-demo-session" target="_blank" rel="noopener noreferrer" style={{ display: 'inline-block', padding: '16px 40px', background: 'transparent', color: '#C9A84C', border: '1px solid rgba(201,168,76,0.4)', borderRadius: 14, fontSize: 16, fontWeight: 700, textDecoration: 'none' }}>
              {isAr ? 'احجز عرضاً ←' : 'Book a demo →'}
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ background: '#09071A', borderTop: '1px solid rgba(255,255,255,0.07)', padding: '56px 24px 40px' }}>
        <div style={W}>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: 40, marginBottom: 48 }} className="g2">
            <div>
              <span style={{ fontSize: 18, fontWeight: 900, color: '#F8F4EE', letterSpacing: '-0.03em', display: 'block', marginBottom: 8 }}>Elvanis</span>
              <p style={{ fontSize: 13, color: '#6B7280', maxWidth: 240, lineHeight: 1.7, margin: '0 0 20px' }}>{c.footer.tagline}</p>
              <a href="https://calendly.com/elvanis/book-demo-session" target="_blank" rel="noopener noreferrer" style={{ display: 'inline-block', padding: '9px 18px', background: 'rgba(201,168,76,0.15)', color: '#C9A84C', border: '1px solid rgba(201,168,76,0.3)', borderRadius: 9, fontSize: 13, fontWeight: 700, textDecoration: 'none' }}>
                {isAr ? 'احجز عرضاً ←' : 'Book a demo →'}
              </a>
            </div>
            {c.footer.groups.map(group => (
              <div key={group.title}>
                <p style={{ fontSize: 11, fontWeight: 700, color: '#4B5563', textTransform: 'uppercase' as const, letterSpacing: '0.1em', margin: '0 0 14px' }}>{group.title}</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {group.links.map(link => (
                    link.href.startsWith('http') ? (
                      <a key={link.label} href={link.href} target="_blank" rel="noopener noreferrer" style={{ fontSize: 13, color: '#9CA3AF', textDecoration: 'none', fontWeight: 500 }}>{link.label}</a>
                    ) : (
                      <Link key={link.label} href={link.href} style={{ fontSize: 13, color: '#9CA3AF', textDecoration: 'none', fontWeight: 500 }}>{link.label}</Link>
                    )
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 20 }}>
            <p style={{ fontSize: 12, color: '#4B5563', margin: 0 }}>{c.footer.copy}</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
