'use client'

import { useState, useEffect } from 'react'
import AppPreview from '@/components/demo'

// ── Translations ──────────────────────────────────────────────
const T = {
  en: {
    dir: 'ltr' as const,
    nav: { login: 'Log in', cta: 'Start free' },
    hero: {
      badge: 'AI Business Diagnostics',
      title: 'Stop running your business on gut feeling.',
      subtitle: 'Elvanis reads your real operational data — Jira, GA4, Shopify, Intercom — and tells you exactly what to fix, ranked by impact. No spreadsheets. No guesswork.',
      cta1: 'Start free — takes 10 minutes',
      cta2: 'Book a demo',
      note: 'Free to start · No credit card required · 3 tools included',
    },
    pain: {
      title: 'Sound familiar?',
      items: [
        {
          icon: '📊',
          problem: 'You have dashboards everywhere — but no diagnosis.',
          solution: 'Elvanis reads across all your tools and surfaces the signal that matters most right now.',
        },
        {
          icon: '🔥',
          problem: "You're fixing symptoms, not root causes.",
          solution: 'Every signal comes with a ranked priority and a specific recommended action — not just a number.',
        },
        {
          icon: '⏳',
          problem: 'You find out something broke weeks after it happened.',
          solution: 'Automated scans run every 7–30 days and alert you the moment a metric moves outside healthy range.',
        },
      ],
    },
    how: {
      title: 'How it works',
      steps: [
        { icon: '🔌', step: 'Step 1', title: 'Connect your tools', desc: 'Connect Jira, GA4, Trustpilot, Shopify, or Intercom. Or upload a CSV. Or take our 25-question business health assessment — no tools needed.' },
        { icon: '🧠', step: 'Step 2', title: 'Elvanis diagnoses', desc: 'Our AI reads your real data, identifies root causes across 6 business dimensions, and generates diagnostic signals ranked by severity.' },
        { icon: '⚡', step: 'Step 3', title: 'Fix what matters first', desc: 'Get a prioritised action plan. Track whether your fixes actually worked. Know the moment something new breaks.' },
      ],
    },
    demo: {
      title: 'Your business health, at a glance',
      subtitle: 'A live health score, ranked signals, and a 90-day action plan — all from your real operational data.',
      signals: [
        { severity: 'critical', source: 'Shopify', text: 'Refund rate at 18% — 3× industry average. Root cause: misleading product photos on SKU-004.' },
        { severity: 'warning', source: 'Jira', text: 'Bug backlog up 40% in 14 days. Sprint velocity dropped below sustainable threshold.' },
        { severity: 'watch', source: 'GA4', text: 'Organic traffic share declining. Paid dependency increased from 22% to 41% in 30 days.' },
      ],
    },
    comparison: {
      title: 'Free vs Navigator',
      subtitle: 'Start free. Upgrade when you need weekly scans and AI action plans.',
      free: {
        name: 'Free',
        price: '£0',
        period: 'forever',
        features: [
          { text: 'Business health score', included: true },
          { text: '30-day automated scans', included: true },
          { text: 'Unlimited diagnostic signals', included: true },
          { text: 'Connect up to 3 tools', included: true },
          { text: '25-question health assessment', included: true },
          { text: 'Goal tracking', included: true },
          { text: 'Weekly scans (Jira & Intercom)', included: false },
          { text: 'Monthly AI Action Digest', included: false },
          { text: 'Manual on-demand scans', included: false },
        ],
        cta: 'Start free →',
        href: '/signup',
      },
      paid: {
        name: 'Navigator',
        price: '£29',
        period: 'per month',
        badge: 'Most popular',
        features: [
          { text: 'Everything in Free', included: true },
          { text: 'Weekly scans for Jira & Intercom', included: true },
          { text: 'Monthly deep-dive (GA4, Shopify, Trustpilot)', included: true },
          { text: 'Unlimited tool connections', included: true },
          { text: 'Monthly AI Action Digest', included: true },
          { text: 'Manual on-demand scans (1/week)', included: true },
          { text: 'Priority signal alerts', included: true },
          { text: 'Impact tracking — did your fixes work?', included: true },
          { text: 'AI readiness score + opportunities', included: true },
        ],
        cta: 'Get Navigator →',
        href: '/service-request?type=navigator',
      },
    },
    footer: {
      tagline: 'AI-powered business diagnostics for founder-led startups.',
      help: 'Need hands-on help?',
      helpCta: 'Talk to Elvanis Expertise →',
      links: [
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Signals', href: '/signals' },
        { label: 'Connect tools', href: '/connect' },
        { label: 'Services', href: '/service-request' },
        { label: 'Assessment', href: '/assessment' },
      ],
    },
  },
  ar: {
    dir: 'rtl' as const,
    nav: { login: 'تسجيل الدخول', cta: 'ابدأ مجاناً' },
    hero: {
      badge: 'تشخيص الأعمال بالذكاء الاصطناعي',
      title: 'توقف عن إدارة عملك بالحدس.',
      subtitle: 'Elvanis يقرأ بياناتك التشغيلية الحقيقية — Jira وGA4 وShopify وIntercom — ويخبرك بالضبط بما يجب إصلاحه، مرتباً حسب التأثير. بدون جداول بيانات. بدون تخمين.',
      cta1: 'ابدأ مجاناً — يستغرق 10 دقائق',
      cta2: 'احجز عرضاً توضيحياً',
      note: 'مجاني للبدء · لا يلزم بطاقة ائتمان · 3 أدوات مجاناً',
    },
    pain: {
      title: 'هل هذا مألوف؟',
      items: [
        {
          icon: '📊',
          problem: 'لديك لوحات بيانات في كل مكان — لكن لا يوجد تشخيص حقيقي.',
          solution: 'Elvanis يقرأ عبر جميع أدواتك ويكشف الإشارة الأكثر أهمية الآن.',
        },
        {
          icon: '🔥',
          problem: 'أنت تعالج الأعراض، وليس الأسباب الجذرية.',
          solution: 'كل إشارة تأتي مع أولوية مرتبة وإجراء محدد موصى به — وليس مجرد رقم.',
        },
        {
          icon: '⏳',
          problem: 'تكتشف أن شيئاً ما تعطل بعد أسابيع من حدوثه.',
          solution: 'تعمل الفحوصات التلقائية كل 7–30 يوماً وتنبهك فور خروج أي مقياس عن النطاق الصحي.',
        },
      ],
    },
    how: {
      title: 'كيف يعمل',
      steps: [
        { icon: '🔌', step: 'الخطوة 1', title: 'اربط أدواتك', desc: 'اربط Jira أو GA4 أو Trustpilot أو Shopify أو Intercom. أو ارفع ملف CSV. أو أجب على تقييم صحة الأعمال المكون من 25 سؤالاً — لا تحتاج أدوات.' },
        { icon: '🧠', step: 'الخطوة 2', title: 'Elvanis يشخّص', desc: 'يقرأ الذكاء الاصطناعي بياناتك الحقيقية ويحدد الأسباب الجذرية عبر 6 أبعاد تجارية ويولّد إشارات تشخيصية مرتبة حسب الخطورة.' },
        { icon: '⚡', step: 'الخطوة 3', title: 'أصلح الأهم أولاً', desc: 'احصل على خطة عمل مرتبة حسب الأولوية. تتبع ما إذا كانت إصلاحاتك تعمل فعلاً. اعرف على الفور متى يتعطل شيء جديد.' },
      ],
    },
    demo: {
      title: 'صحة عملك، في لمحة',
      subtitle: 'نقاط صحة مباشرة وإشارات مرتبة وخطة عمل لـ90 يوماً — كل هذا من بياناتك التشغيلية الحقيقية.',
      signals: [
        { severity: 'critical', source: 'Shopify', text: 'معدل الاسترداد 18% — 3 أضعاف متوسط الصناعة. السبب الجذري: صور منتجات مضللة على SKU-004.' },
        { severity: 'warning', source: 'Jira', text: 'تراكم الأخطاء ارتفع 40% في 14 يوماً. سرعة السبرينت انخفضت دون الحد المستدام.' },
        { severity: 'watch', source: 'GA4', text: 'حصة الزيارات العضوية تتراجع. الاعتماد المدفوع ارتفع من 22% إلى 41% في 30 يوماً.' },
      ],
    },
    comparison: {
      title: 'مجاني مقابل Navigator',
      subtitle: 'ابدأ مجاناً. قم بالترقية عندما تحتاج إلى فحوصات أسبوعية وخطط عمل بالذكاء الاصطناعي.',
      free: {
        name: 'مجاني',
        price: '£0',
        period: 'للأبد',
        features: [
          { text: 'نقاط صحة الأعمال', included: true },
          { text: 'فحوصات تلقائية كل 30 يوماً', included: true },
          { text: 'إشارات تشخيصية غير محدودة', included: true },
          { text: 'ربط حتى 3 أدوات', included: true },
          { text: 'تقييم صحة الأعمال — 25 سؤالاً', included: true },
          { text: 'تتبع الأهداف', included: true },
          { text: 'فحوصات أسبوعية (Jira وIntercom)', included: false },
          { text: 'ملخص العمل الشهري بالذكاء الاصطناعي', included: false },
          { text: 'فحوصات يدوية عند الطلب', included: false },
        ],
        cta: 'ابدأ مجاناً →',
        href: '/signup',
      },
      paid: {
        name: 'Navigator',
        price: '£29',
        period: 'شهرياً',
        badge: 'الأكثر شيوعاً',
        features: [
          { text: 'كل ما في الخطة المجانية', included: true },
          { text: 'فحوصات أسبوعية لـJira وIntercom', included: true },
          { text: 'غوص عميق شهري (GA4، Shopify، Trustpilot)', included: true },
          { text: 'ربط أدوات غير محدودة', included: true },
          { text: 'ملخص العمل الشهري بالذكاء الاصطناعي', included: true },
          { text: 'فحوصات يدوية (مرة أسبوعياً)', included: true },
          { text: 'تنبيهات الإشارات ذات الأولوية', included: true },
          { text: 'تتبع التأثير — هل نجحت إصلاحاتك؟', included: true },
          { text: 'نقاط جاهزية الذكاء الاصطناعي + الفرص', included: true },
        ],
        cta: 'احصل على Navigator →',
        href: '/service-request?type=navigator',
      },
    },
    footer: {
      tagline: 'تشخيص الأعمال بالذكاء الاصطناعي للشركات الناشئة بقيادة المؤسسين.',
      help: 'تحتاج مساعدة مباشرة؟',
      helpCta: 'تحدث مع خبراء Elvanis →',
      links: [
        { label: 'لوحة التحكم', href: '/dashboard' },
        { label: 'الإشارات', href: '/signals' },
        { label: 'ربط الأدوات', href: '/connect' },
        { label: 'الخدمات', href: '/service-request' },
        { label: 'التقييم', href: '/assessment' },
      ],
    },
  },
}

export default function LandingPage() {
  const [lang, setLang]       = useState<'en' | 'ar'>('en')
  const [userName,   setUserName]   = useState<string | null>(null)
  const [navLogoErr,  setNavLogoErr]  = useState(false)
  const [footLogoErr, setFootLogoErr] = useState(false)

  useEffect(() => {
    import('@/lib/supabase').then(({ createClient }) => {
      const supabase = createClient()
      supabase.auth.getUser().then(({ data: { user } }) => {
        if (user) setUserName(user.email?.split('@')[0] ?? 'Account')
      })
    })
  }, [])

  const t = T[lang]

  return (
    <main dir={t.dir} style={{ minHeight: '100vh', background: '#fff', fontFamily: "'DM Sans', Inter, sans-serif" }}>

      {/* ── NAV ── */}
      <nav style={{ borderBottom: '1px solid #E5E7EB', padding: '0 32px', position: 'sticky', top: 0, background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(8px)', zIndex: 50 }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>

          {/* Logo — place file at public/elvanis-logo-dark.png */}
          <a href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center' }}>
            {navLogoErr ? (
              <span style={{ fontSize: 22, fontWeight: 900, color: '#0F172A', letterSpacing: '-0.5px' }}>ELVANIS</span>
            ) : (
              <img
                src="/elvanis-logo-dark.png"
                alt="Elvanis"
                style={{ height: 32 }}
                onError={() => setNavLogoErr(true)}
              />
            )}
          </a>

          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <button
              onClick={() => setLang(lang === 'en' ? 'ar' : 'en')}
              style={{ padding: '6px 14px', border: '1px solid #E5E7EB', borderRadius: 8, fontSize: 13, cursor: 'pointer', background: '#F9FAFB', color: '#374151', fontWeight: 600, fontFamily: 'Arial, sans-serif' }}
            >
              {lang === 'en' ? 'عربي' : 'English'}
            </button>
            {userName ? (
              <a href="/dashboard" style={{ padding: '9px 20px', background: '#0F172A', color: '#fff', borderRadius: 10, fontSize: 14, fontWeight: 600, textDecoration: 'none' }}>
                {userName} →
              </a>
            ) : (
              <>
                <a href="/login" style={{ fontSize: 14, color: '#6B7280', textDecoration: 'none', fontWeight: 500 }}>{t.nav.login}</a>
                <a href="/signup" style={{ padding: '9px 20px', background: '#0F172A', color: '#fff', borderRadius: 10, fontSize: 14, fontWeight: 600, textDecoration: 'none' }}>
                  {t.nav.cta}
                </a>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section style={{ padding: '96px 32px 80px', textAlign: 'center', background: 'linear-gradient(180deg, #F0F4FF 0%, #fff 100%)' }}>
        <div style={{ maxWidth: 760, margin: '0 auto' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 16px', background: '#E0E7FF', borderRadius: 20, fontSize: 13, fontWeight: 700, color: '#3730A3', marginBottom: 24 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#4F46E5', display: 'inline-block' }} />
            {t.hero.badge}
          </div>
          <h1 style={{ fontSize: 56, fontWeight: 900, color: '#0F172A', lineHeight: 1.1, marginBottom: 24, letterSpacing: '-1.5px' }}>
            {t.hero.title}
          </h1>
          <p style={{ fontSize: 19, color: '#475569', lineHeight: 1.7, maxWidth: 600, margin: '0 auto 40px' }}>
            {t.hero.subtitle}
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 16 }}>
            <a href="/assessment" style={{ padding: '15px 32px', background: '#0F172A', color: '#fff', borderRadius: 12, fontSize: 16, fontWeight: 700, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              {t.hero.cta1}
            </a>
            <a href="/service-request?type=cpo" style={{ padding: '15px 32px', background: '#fff', color: '#0F172A', borderRadius: 12, fontSize: 16, fontWeight: 600, textDecoration: 'none', border: '1.5px solid #E2E8F0' }}>
              {t.hero.cta2}
            </a>
          </div>
          <p style={{ fontSize: 13, color: '#94A3B8' }}>{t.hero.note}</p>
        </div>
      </section>

      {/* ── PAIN SECTION ── */}
      <section style={{ padding: '80px 32px', background: '#0F172A' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          <h2 style={{ fontSize: 36, fontWeight: 800, color: '#fff', textAlign: 'center', marginBottom: 56, letterSpacing: '-0.5px' }}>
            {t.pain.title}
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24 }}>
            {t.pain.items.map((item, i) => (
              <div key={i} style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 16, border: '1px solid rgba(255,255,255,0.1)', padding: '32px 28px' }}>
                <div style={{ fontSize: 32, marginBottom: 16 }}>{item.icon}</div>
                <p style={{ fontSize: 15, fontWeight: 600, color: '#F87171', marginBottom: 16, lineHeight: 1.5 }}>
                  "{item.problem}"
                </p>
                <div style={{ width: 32, height: 2, background: '#4F46E5', marginBottom: 16, borderRadius: 2 }} />
                <p style={{ fontSize: 14, color: '#94A3B8', lineHeight: 1.7, margin: 0 }}>
                  {item.solution}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section style={{ padding: '80px 32px', background: '#fff' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          <h2 style={{ fontSize: 36, fontWeight: 800, color: '#0F172A', textAlign: 'center', marginBottom: 56, letterSpacing: '-0.5px' }}>
            {t.how.title}
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24 }}>
            {t.how.steps.map((step, i) => (
              <div key={i} style={{ padding: '32px 28px', background: '#F8FAFC', borderRadius: 16, border: '1px solid #E2E8F0', position: 'relative' }}>
                <div style={{ position: 'absolute', top: 24, right: 24, fontSize: 11, fontWeight: 800, color: '#CBD5E1', letterSpacing: '0.1em' }}>
                  0{i + 1}
                </div>
                <div style={{ width: 52, height: 52, borderRadius: 14, background: '#E0E7FF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, marginBottom: 20 }}>
                  {step.icon}
                </div>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#4F46E5', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
                  {step.step}
                </div>
                <h3 style={{ fontSize: 18, fontWeight: 700, color: '#0F172A', marginBottom: 10 }}>{step.title}</h3>
                <p style={{ fontSize: 14, color: '#64748B', lineHeight: 1.7, margin: 0 }}>{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── DEMO / PRODUCT PREVIEW ── */}
      <section style={{ padding: '80px 32px', background: '#F8FAFC' }}>
        <div style={{ maxWidth: 960, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <h2 style={{ fontSize: 36, fontWeight: 800, color: '#0F172A', marginBottom: 14, letterSpacing: '-0.5px' }}>
              {t.demo.title}
            </h2>
            <p style={{ fontSize: 16, color: '#64748B', maxWidth: 520, margin: '0 auto' }}>
              {t.demo.subtitle}
            </p>
          </div>
          <AppPreview lang={lang} />
        </div>
      </section>

      {/* ── COMPARISON ── */}
      <section style={{ padding: '80px 32px', background: '#fff' }}>
        <div style={{ maxWidth: 860, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <h2 style={{ fontSize: 36, fontWeight: 800, color: '#0F172A', marginBottom: 12, letterSpacing: '-0.5px' }}>
              {t.comparison.title}
            </h2>
            <p style={{ fontSize: 16, color: '#64748B' }}>{t.comparison.subtitle}</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>

            {/* Free */}
            <div style={{ background: '#F8FAFC', borderRadius: 20, border: '1px solid #E2E8F0', padding: '36px 32px' }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: '#94A3B8', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{t.comparison.free.name}</p>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, marginBottom: 32 }}>
                <span style={{ fontSize: 44, fontWeight: 900, color: '#0F172A', letterSpacing: '-1px' }}>{t.comparison.free.price}</span>
                <span style={{ fontSize: 14, color: '#94A3B8', marginBottom: 8 }}>{t.comparison.free.period}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 32 }}>
                {t.comparison.free.features.map(f => (
                  <div key={f.text} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 14, flexShrink: 0, color: f.included ? '#10B981' : '#CBD5E1' }}>{f.included ? '✓' : '✗'}</span>
                    <span style={{ fontSize: 14, color: f.included ? '#374151' : '#9CA3AF' }}>{f.text}</span>
                  </div>
                ))}
              </div>
              <a href={t.comparison.free.href} style={{ display: 'block', padding: '14px', background: '#0F172A', color: '#fff', borderRadius: 12, fontSize: 15, fontWeight: 700, textDecoration: 'none', textAlign: 'center' }}>
                {t.comparison.free.cta}
              </a>
            </div>

            {/* Navigator */}
            <div style={{ background: '#0F172A', borderRadius: 20, border: '1px solid #0F172A', padding: '36px 32px', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: 0, right: 0, left: 0, height: 3, background: 'linear-gradient(90deg, #4F46E5, #7C3AED)' }} />
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.06em', margin: 0 }}>{t.comparison.paid.name}</p>
                <span style={{ fontSize: 11, fontWeight: 700, background: '#4F46E5', color: '#fff', padding: '3px 10px', borderRadius: 20 }}>{t.comparison.paid.badge}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, marginBottom: 32 }}>
                <span style={{ fontSize: 44, fontWeight: 900, color: '#fff', letterSpacing: '-1px' }}>{t.comparison.paid.price}</span>
                <span style={{ fontSize: 14, color: '#64748B', marginBottom: 8 }}>{t.comparison.paid.period}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 32 }}>
                {t.comparison.paid.features.map(f => (
                  <div key={f.text} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 14, flexShrink: 0, color: f.included ? '#4ADE80' : '#334155' }}>{f.included ? '✓' : '✗'}</span>
                    <span style={{ fontSize: 14, color: f.included ? '#E2E8F0' : '#475569' }}>{f.text}</span>
                  </div>
                ))}
              </div>
              <a href={t.comparison.paid.href} style={{ display: 'block', padding: '14px', background: '#4F46E5', color: '#fff', borderRadius: 12, fontSize: 15, fontWeight: 700, textDecoration: 'none', textAlign: 'center' }}>
                {t.comparison.paid.cta}
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{ background: '#0F172A', padding: '72px 32px 48px' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 32, marginBottom: 40 }}>
            <div style={{ maxWidth: 280 }}>
              {/* Dark logo in footer — place white version at public/elvanis-logo.png */}
              {footLogoErr ? (
                <span style={{ fontSize: 20, fontWeight: 900, color: '#fff', letterSpacing: '-0.5px', display: 'block', marginBottom: 12 }}>ELVANIS</span>
              ) : (
                <img
                  src="/elvanis-logo-dark.png"
                  alt="Elvanis"
                  style={{ height: 32, marginBottom: 12 }}
                  onError={() => setFootLogoErr(true)}
                />
              )}
              <p style={{ fontSize: 13, color: '#94A3B8', lineHeight: 1.6, margin: 0 }}>{t.footer.tagline}</p>
              <div style={{ marginTop: 32, paddingTop: 24, borderTop: '1px solid #1E293B' }}>
                <p style={{ fontSize: 13, color: '#94A3B8', margin: '0 0 8px', fontWeight: 500 }}>{t.footer.help}</p>
                <a href="/service-request" style={{ fontSize: 15, color: '#fff', textDecoration: 'none', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 6 }}>{t.footer.helpCta}</a>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap' }}>
              {t.footer.links.map(link => (
                <a key={link.href} href={link.href} style={{ fontSize: 14, color: '#fff', textDecoration: 'none', opacity: 0.7 }}>
                  {link.label}
                </a>
              ))}
            </div>
          </div>
          <div style={{ borderTop: '1px solid #1E293B', paddingTop: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <span style={{ fontSize: 12, color: '#94A3B8' }}>© 2026 Elvanis. All rights reserved.</span>
            <button
              onClick={() => setLang(lang === 'en' ? 'ar' : 'en')}
              style={{ padding: '6px 14px', border: '1px solid #1E293B', borderRadius: 8, fontSize: 13, cursor: 'pointer', background: 'transparent', color: '#94A3B8', fontWeight: 600, fontFamily: 'Arial, sans-serif' }}
            >
              {lang === 'en' ? 'عربي' : 'English'}
            </button>
          </div>
        </div>
      </footer>

    </main>
  )
}
