'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'

// ── Types ─────────────────────────────────────────────────────
type Lang = 'en' | 'ar'

// ── Content ───────────────────────────────────────────────────
const CONTENT = {
  en: {
    nav: {
      logo: 'Elvanis',
      tagline: 'AI Business OS',
      login: 'Sign in',
      cta: 'Start free',
    },
    hero: {
      eyebrow: 'AI-powered business diagnostics',
      headline_before: 'See ',
      headline_highlight: 'exactly',
      headline_after: ' what\'s breaking your business.',
      sub: 'Elvanis connects to your tools, reads your real data, and tells you what to fix first — ranked by impact.',
      cta_primary: 'Start the diagnostic →',
      cta_secondary: 'See how it works',
      stats: [
        { value: '6', label: 'Business dimensions' },
        { value: '10 min', label: 'To your first signal' },
        { value: '£0', label: 'To get started' },
      ],
    },
    logos: {
      eyebrow: 'Connects to your stack',
      items: ['Shopify', 'Jira', 'GA4', 'Intercom', 'Trustpilot', 'Stripe'],
    },
    problem: {
      eyebrow: 'The founder\'s dilemma',
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
        { num: '03', icon: '🎯', title: 'Act on what matters', desc: 'Every signal has a specific recommended action. Track whether your fixes worked. Know the moment something new breaks.' },
      ],
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
    demo: {
      eyebrow: 'Live preview',
      headline: 'What founders actually see',
      signals: [
        { severity: 'critical', dimension: 'Revenue', title: 'Refund rate exceeding 8%', action: 'Audit fulfilment process and identify top refund categories', source: 'Shopify', value: '8.3%' },
        { severity: 'warning', dimension: 'Customer', title: 'NPS dropped 18 points in 30 days', action: 'Segment detractors and schedule follow-up calls within 48 hours', source: 'Intercom', value: '-18' },
        { severity: 'watch', dimension: 'Product', title: 'Sprint velocity declining for 3rd consecutive sprint', action: 'Review sprint planning process and remove blockers', source: 'Jira', value: '↓22%' },
      ],
    },
    pricing: {
      eyebrow: 'Pricing',
      headline: 'Start free. Scale when you\'re ready.',
      plans: [
        {
          name: 'Free',
          price: '£0',
          period: 'forever',
          desc: 'For founders getting started with diagnostics',
          cta: 'Start free',
          features: [
            'Business health score',
            'Up to 3 tool connections',
            'Unlimited signals',
            'Monthly scan cycle',
            'Business assessment (26 questions)',
            'Goal tracking',
          ],
          highlighted: false,
        },
        {
          name: 'Navigator',
          price: '£29',
          period: 'per month',
          desc: 'For founders who need weekly intelligence',
          cta: 'Start Navigator',
          features: [
            'Everything in Free',
            'Weekly scans (Jira + Intercom)',
            'Unlimited tool connections',
            'Monthly AI Action Digest',
            'On-demand manual scans',
            'Conflict resolution',
            'Impact tracking',
            'Priority advisory access',
          ],
          highlighted: true,
        },
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
    cta: {
      headline: 'Your business is sending signals.',
      sub: 'Start reading them.',
      button: 'Diagnose my business →',
    },
    footer: {
      tagline: 'AI-powered business diagnostics for founder-led companies.',
      links: [
        { label: 'Terms of Service', href: '/terms' },
        { label: 'Privacy Policy', href: '/privacy' },
        { label: 'Sign in', href: '/login' },
        { label: 'Get started', href: '/signup' },
      ],
      copy: '© 2026 Elvanis. All rights reserved.',
    },
  },
  ar: {
    nav: {
      logo: 'Elvanis',
      tagline: 'نظام أعمال ذكي',
      login: 'تسجيل الدخول',
      cta: 'ابدأ مجاناً',
    },
    hero: {
      eyebrow: 'تشخيص الأعمال بالذكاء الاصطناعي',
      headline_before: 'اعرف ',
      headline_highlight: 'بالضبط',
      headline_after: ' ما الذي يعيق نمو أعمالك.',
      sub: 'يتصل إلفانيس بأدواتك، يقرأ بياناتك الحقيقية، ويخبرك بما يجب إصلاحه أولاً — مرتباً حسب الأثر.',
      cta_primary: 'ابدأ التشخيص ←',
      cta_secondary: 'كيف يعمل',
      stats: [
        { value: '٦', label: 'أبعاد تجارية' },
        { value: '١٠ د', label: 'حتى أول إشارة' },
        { value: '£٠', label: 'للبدء' },
      ],
    },
    logos: {
      eyebrow: 'يتصل بأدواتك',
      items: ['Shopify', 'Jira', 'GA4', 'Intercom', 'Trustpilot', 'Stripe'],
    },
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
        { num: '٠١', icon: '🔌', title: 'اربط أدواتك', desc: 'اربط Shopify وJira وGA4 وIntercom وTrustpilot — أو ارفع ملف CSV. يستغرق أقل من 3 دقائق.' },
        { num: '٠٢', icon: '⚡', title: 'احصل على تشخيصك', desc: 'يقرأ إلفانيس بياناتك الحية، يكتشف الأنماط، ويرصد الإشارات مرتبةً حسب الأثر التجاري.' },
        { num: '٠٣', icon: '🎯', title: 'تصرّف بناءً على ما يهم', desc: 'كل إشارة لها إجراء موصى به محدد. تابع ما إذا كانت إصلاحاتك نجحت. اعرف فور حدوث أي خلل جديد.' },
      ],
    },
    dimensions: {
      eyebrow: 'ما نشخّصه',
      headline: 'كل بُعد من أبعاد أعمالك في نظام واحد',
      items: [
        { icon: '💰', name: 'الإيرادات', desc: 'اتجاهات MRR، محركات التسرب، ارتفاعات الاسترداد، إشارات التسعير' },
        { icon: '👥', name: 'العملاء', desc: 'أنماط NPS، مجموعات الشكاوى، صحة الإحالة، سلوك التكرار' },
        { icon: '📣', name: 'التسويق', desc: 'اتجاهات CAC، كفاءة القناة، انخفاض التحويل، تحولات الزيارات' },
        { icon: '🎯', name: 'المنتج', desc: 'إشارات PMF، اعتماد الميزات، تأثير الأخطاء، سرعة التسليم' },
        { icon: '⚙️', name: 'الفريق', desc: 'سرعة السبرينت، فجوات التوافق، عوائق التنفيذ، إشارات الطاقة' },
        { icon: '🧭', name: 'الاستراتيجية', desc: 'انجراف ICP، تجنب القرارات، نضج العمليات، توافق 90 يوماً' },
      ],
    },
    demo: {
      eyebrow: 'معاينة مباشرة',
      headline: 'ما يراه المؤسسون فعلاً',
      signals: [
        { severity: 'critical', dimension: 'الإيرادات', title: 'معدل الاسترداد يتجاوز 8%', action: 'افحص عملية التوصيل وحدّد أبرز فئات الاسترداد', source: 'Shopify', value: '8.3%' },
        { severity: 'warning', dimension: 'العملاء', title: 'انخفض NPS 18 نقطة في 30 يوماً', action: 'صنّف المعترضين وجدوِل مكالمات متابعة خلال 48 ساعة', source: 'Intercom', value: '-18' },
        { severity: 'watch', dimension: 'المنتج', title: 'سرعة السبرينت تتراجع للمرة الثالثة', action: 'راجع عملية تخطيط السبرينت وأزل العوائق', source: 'Jira', value: '↓22%' },
      ],
    },
    pricing: {
      eyebrow: 'الأسعار',
      headline: 'ابدأ مجاناً. طوّر عندما تكون مستعداً.',
      plans: [
        {
          name: 'مجاني',
          price: '£٠',
          period: 'للأبد',
          desc: 'للمؤسسين الذين يبدأون مع التشخيص',
          cta: 'ابدأ مجاناً',
          features: [
            'درجة صحة الأعمال',
            'حتى 3 اتصالات أدوات',
            'إشارات غير محدودة',
            'دورة فحص شهرية',
            'تقييم الأعمال (26 سؤالاً)',
            'تتبع الأهداف',
          ],
          highlighted: false,
        },
        {
          name: 'Navigator',
          price: '£29',
          period: 'شهرياً',
          desc: 'للمؤسسين الذين يحتاجون ذكاءً أسبوعياً',
          cta: 'ابدأ Navigator',
          features: [
            'كل ما في المجاني',
            'فحوصات أسبوعية (Jira + Intercom)',
            'اتصالات أدوات غير محدودة',
            'ملخص إجراءات شهري بالذكاء الاصطناعي',
            'فحوصات يدوية عند الطلب',
            'حل التعارضات',
            'تتبع الأثر',
            'وصول أولوي للاستشارة',
          ],
          highlighted: true,
        },
      ],
    },
    faq: {
      eyebrow: 'أسئلة شائعة',
      headline: 'كل ما تحتاج معرفته',
      items: [
        { q: 'هل بياناتي آمنة؟', a: 'نعم. يطلب إلفانيس صلاحية القراءة فقط من أدواتك المتصلة. لا نكتب بياناتك أو نعدّلها أبداً. جميع البيانات مشفّرة أثناء النقل وعند التخزين، على بنية تحتية مستضافة في الاتحاد الأوروبي.' },
        { q: 'كم يستغرق رؤية النتائج؟', a: 'يرى معظم المؤسسين أول إشاراتهم التشخيصية في غضون 10 دقائق من ربط أداة. يستغرق تقييم الأعمال نحو 10 دقائق ويعطيك تحليلاً مُعَيَّناً فورياً عبر 6 أبعاد.' },
        { q: 'هل يناسب المؤسسين غير التقنيين؟', a: 'بالتأكيد. بُني إلفانيس للمشغّلين، لا للمهندسين. لا كود، لا إعداد، لا لوحات تحكم للتهيئة. اربط أدواتك، أجرِ التقييم، وتشخيصك جاهز.' },
        { q: 'هل يمكنني الإلغاء في أي وقت؟', a: 'نعم. لا توجد عقود طويلة الأمد. يمكنك إلغاء Navigator في أي وقت من ملفك الشخصي. تُحتفظ ببياناتك لمدة 30 يوماً بعد الإلغاء.' },
        { q: 'ما الأدوات التي يتصل بها إلفانيس؟', a: 'Shopify وJira وGoogle Analytics 4 وIntercom وTrustpilot. يمكنك أيضاً رفع ملفات CSV من أي أداة. تُضاف تكاملات جديدة باستمرار.' },
        { q: 'كيف يختلف إلفانيس عن لوحة التحكم؟', a: 'لوحة التحكم تعرض البيانات. إلفانيس يشخّصها. نقرأ مقاييسك، نكتشف الأنماط عبر أدوات متعددة، نرتّب المشكلات حسب الأثر التجاري، ونخبرك بالضبط بما يجب إصلاحه أولاً — مع إجراء موصى به.' },
      ],
    },
    cta: {
      headline: 'أعمالك ترسل إشارات.',
      sub: 'ابدأ قراءتها.',
      button: 'شخّص أعمالي ←',
    },
    footer: {
      tagline: 'تشخيص الأعمال بالذكاء الاصطناعي للشركات التي يقودها المؤسسون.',
      links: [
        { label: 'شروط الخدمة', href: '/terms' },
        { label: 'سياسة الخصوصية', href: '/privacy' },
        { label: 'تسجيل الدخول', href: '/login' },
        { label: 'ابدأ الآن', href: '/signup' },
      ],
      copy: '© 2026 إلفانيس. جميع الحقوق محفوظة.',
    },
  },
}

// ── Severity config ───────────────────────────────────────────
const SEVERITY: Record<string, { bg: string; border: string; color: string; dot: string; label: string; labelAr: string }> = {
  critical: { bg: '#FEF2F2', border: '#FECACA', color: '#DC2626', dot: '#DC2626', label: 'Critical', labelAr: 'حرجة' },
  warning:  { bg: '#FFFBEB', border: '#FDE68A', color: '#D97706', dot: '#D97706', label: 'Warning',  labelAr: 'تحذير' },
  watch:    { bg: '#F9FAFB', border: '#E5E7EB', color: '#6B7280', dot: '#6B7280', label: 'Watch',    labelAr: 'مراقبة' },
}

// ── Animated signal card ──────────────────────────────────────
function AnimatedSignal({ signal, isAr, delay }: { signal: typeof CONTENT.en.demo.signals[0]; isAr: boolean; delay: number }) {
  const [visible, setVisible] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const s = SEVERITY[signal.severity]

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), delay)
    return () => clearTimeout(timer)
  }, [delay])

  return (
    <div
      ref={ref}
      style={{
        background: '#fff',
        border: `1px solid ${s.border}`,
        borderLeft: isAr ? `1px solid ${s.border}` : `4px solid ${s.color}`,
        borderRight: isAr ? `4px solid ${s.color}` : `1px solid ${s.border}`,
        borderRadius: 12,
        padding: '14px 16px',
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(12px)',
        transition: 'opacity 0.5s ease, transform 0.5s ease',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: s.dot, display: 'inline-block', flexShrink: 0 }} />
          <span style={{ fontSize: 11, fontWeight: 700, color: s.color, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            {isAr ? s.labelAr : s.label}
          </span>
          <span style={{ fontSize: 11, color: '#9CA3AF' }}>· {signal.dimension}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 11, color: '#9CA3AF' }}>{signal.source}</span>
          <span style={{ fontSize: 13, fontWeight: 800, color: s.color }}>{signal.value}</span>
        </div>
      </div>
      <p style={{ fontSize: 14, fontWeight: 700, color: '#111827', margin: '0 0 4px', textAlign: isAr ? 'right' : 'left' }}>{signal.title}</p>
      <p style={{ fontSize: 12, color: '#6B7280', margin: 0, lineHeight: 1.5, textAlign: isAr ? 'right' : 'left' }}>→ {signal.action}</p>
    </div>
  )
}

// ── FAQ Accordion ─────────────────────────────────────────────
function FAQItem({ q, a, isAr }: { q: string; a: string; isAr: boolean }) {
  const [open, setOpen] = useState(false)
  return (
    <div style={{ borderBottom: '1px solid #E5E7EB' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', padding: '18px 0',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16,
          background: 'none', border: 'none', cursor: 'pointer',
          textAlign: isAr ? 'right' : 'left', fontFamily: 'Inter, sans-serif',
        }}
      >
        <span style={{ fontSize: 15, fontWeight: 600, color: '#111827', flex: 1, textAlign: isAr ? 'right' : 'left' }}>{q}</span>
        <span style={{ fontSize: 18, color: '#4B35CC', flexShrink: 0, transform: open ? 'rotate(45deg)' : 'none', transition: 'transform 0.2s', lineHeight: 1 }}>+</span>
      </button>
      {open && (
        <p style={{ fontSize: 14, color: '#475569', lineHeight: 1.75, margin: '0 0 18px', textAlign: isAr ? 'right' : 'left' }}>{a}</p>
      )}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────
export default function LandingPage() {
  const [lang, setLang] = useState<Lang>('en')
  const isAr = lang === 'ar'
  const c = CONTENT[lang]

  useEffect(() => {
    const saved = localStorage.getItem('preferred_lang')
    if (saved === 'ar' || saved === 'en') setLang(saved as Lang)
  }, [])

  function toggleLang() {
    const next = lang === 'en' ? 'ar' : 'en'
    setLang(next)
    localStorage.setItem('preferred_lang', next)
  }

  return (
    <div dir={isAr ? 'rtl' : 'ltr'} style={{ fontFamily: "'Inter', -apple-system, sans-serif", color: '#111827', overflowX: 'hidden' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        html { scroll-behavior: smooth; }
        .highlight-gradient {
          background: linear-gradient(135deg, #4B35CC 0%, #7C3AED 50%, #C9A84C 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          font-weight: 900;
        }
        .btn-primary {
          display: inline-block;
          padding: 14px 28px;
          background: linear-gradient(135deg, #4B35CC, #7C3AED);
          color: #fff;
          border: none;
          border-radius: 12px;
          font-size: 15px;
          font-weight: 700;
          cursor: pointer;
          text-decoration: none;
          transition: transform 0.2s, box-shadow 0.2s;
          font-family: inherit;
          box-shadow: 0 4px 20px rgba(75,53,204,0.3);
        }
        .btn-primary:hover { transform: translateY(-2px); box-shadow: 0 8px 30px rgba(75,53,204,0.4); }
        .btn-secondary {
          display: inline-block;
          padding: 14px 28px;
          background: transparent;
          color: #E2E8F0;
          border: 1px solid rgba(255,255,255,0.2);
          border-radius: 12px;
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
          text-decoration: none;
          transition: all 0.2s;
          font-family: inherit;
        }
        .btn-secondary:hover { border-color: rgba(255,255,255,0.4); background: rgba(255,255,255,0.05); }
        .section { padding: 96px 24px; }
        .container { max-width: 1080px; margin: 0 auto; }
        .eyebrow {
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: #4B35CC;
          margin-bottom: 12px;
          display: block;
        }
        .section-headline {
          font-size: clamp(28px, 4vw, 40px);
          font-weight: 800;
          color: #09071A;
          line-height: 1.2;
          letter-spacing: -0.02em;
        }
        .card {
          background: #fff;
          border: 1px solid #E5E7EB;
          border-radius: 16px;
          padding: 24px;
          transition: box-shadow 0.2s;
        }
        .card:hover { box-shadow: 0 8px 30px rgba(0,0,0,0.08); }
        @media (max-width: 768px) {
          .section { padding: 64px 20px; }
          .hide-mobile { display: none !important; }
        }
      `}</style>

      {/* ── Nav ── */}
      <nav style={{
        position: 'sticky', top: 0, zIndex: 100,
        background: 'rgba(9,7,26,0.95)', backdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        padding: '0 24px',
      }}>
        <div className="container" style={{ height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 20, fontWeight: 900, color: '#F8F4EE', letterSpacing: '-0.03em' }}>{c.nav.logo}</span>
            <span style={{ fontSize: 10, color: '#4B5563', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase' }}>{c.nav.tagline}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button
              onClick={toggleLang}
              style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 8, padding: '6px 12px', color: '#94A3B8', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
            >
              {lang === 'en' ? 'عربي' : 'English'}
            </button>
            <Link href="/login" style={{ fontSize: 14, color: '#94A3B8', textDecoration: 'none', fontWeight: 500 }}>{c.nav.login}</Link>
            <Link href="/signup" className="btn-primary" style={{ padding: '8px 18px', fontSize: 13 }}>{c.nav.cta}</Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section style={{ background: 'linear-gradient(180deg, #09071A 0%, #0F0A2E 60%, #09071A 100%)', padding: '120px 24px 96px', position: 'relative', overflow: 'hidden' }}>
        {/* Background glow */}
        <div style={{ position: 'absolute', top: '20%', left: '50%', transform: 'translateX(-50%)', width: 600, height: 600, background: 'radial-gradient(circle, rgba(75,53,204,0.15) 0%, transparent 70%)', pointerEvents: 'none' }} />

        <div className="container" style={{ textAlign: 'center', position: 'relative' }}>
          <span className="eyebrow" style={{ color: '#C9A84C' }}>{c.hero.eyebrow}</span>

          <h1 style={{ fontSize: 'clamp(36px, 6vw, 64px)', fontWeight: 900, color: '#F8F4EE', lineHeight: 1.1, letterSpacing: '-0.03em', marginBottom: 24, maxWidth: 800, margin: '0 auto 24px' }}>
            {c.hero.headline_before}
            <span className="highlight-gradient">{c.hero.headline_highlight}</span>
            {c.hero.headline_after}
          </h1>

          <p style={{ fontSize: 'clamp(16px, 2vw, 20px)', color: '#CBD5E1', lineHeight: 1.7, maxWidth: 560, margin: '0 auto 40px' }}>
            {c.hero.sub}
          </p>

          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 64 }}>
            <Link href="/signup" className="btn-primary">{c.hero.cta_primary}</Link>
            <a href="#how" className="btn-secondary">{c.hero.cta_secondary}</a>
          </div>

          {/* Stats */}
          <div style={{ display: 'flex', gap: 48, justifyContent: 'center', flexWrap: 'wrap' }}>
            {c.hero.stats.map(stat => (
              <div key={stat.label} style={{ textAlign: 'center' }}>
                <p style={{ fontSize: 32, fontWeight: 900, color: '#F8F4EE', margin: '0 0 4px', letterSpacing: '-0.02em' }}>{stat.value}</p>
                <p style={{ fontSize: 13, color: '#64748B', margin: 0, fontWeight: 500 }}>{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Logos ── */}
      <section style={{ background: '#F8F4EE', padding: '40px 24px', borderBottom: '1px solid #E5E7EB' }}>
        <div className="container" style={{ textAlign: 'center' }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: '#9CA3AF', letterSpacing: '0.1em', textTransform: 'uppercase', display: 'block', marginBottom: 20 }}>{c.logos.eyebrow}</span>
          <div style={{ display: 'flex', gap: 32, justifyContent: 'center', flexWrap: 'wrap', alignItems: 'center' }}>
            {c.logos.items.map(logo => (
              <span key={logo} style={{ fontSize: 15, fontWeight: 700, color: '#9CA3AF', letterSpacing: '-0.01em' }}>{logo}</span>
            ))}
          </div>
        </div>
      </section>

      {/* ── Problem ── */}
      <section className="section" style={{ background: '#fff' }}>
        <div className="container">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 64, alignItems: 'center' }}>
            <div>
              <span className="eyebrow">{c.problem.eyebrow}</span>
              <h2 className="section-headline" style={{ marginBottom: 20 }}>{c.problem.headline}</h2>
              <p style={{ fontSize: 16, color: '#475569', lineHeight: 1.75, marginBottom: 32 }}>{c.problem.body}</p>
              <Link href="/signup" className="btn-primary" style={{ background: '#09071A', boxShadow: 'none' }}>{c.hero.cta_primary}</Link>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {c.problem.pains.map((pain, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px', background: '#F8F4EE', borderRadius: 12, border: '1px solid #E5E7EB' }}>
                  <span style={{ fontSize: 22, flexShrink: 0 }}>{pain.icon}</span>
                  <p style={{ fontSize: 14, color: '#374151', margin: 0, fontWeight: 500, lineHeight: 1.5 }}>{pain.text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section id="how" className="section" style={{ background: '#09071A' }}>
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <span className="eyebrow" style={{ color: '#C9A84C' }}>{c.how.eyebrow}</span>
            <h2 className="section-headline" style={{ color: '#F8F4EE' }}>{c.how.headline}</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24 }}>
            {c.how.steps.map((step, i) => (
              <div key={i} style={{ padding: '28px', background: 'rgba(255,255,255,0.04)', borderRadius: 16, border: '1px solid rgba(255,255,255,0.08)', position: 'relative' }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#4B35CC', letterSpacing: '0.1em', display: 'block', marginBottom: 16 }}>{step.num}</span>
                <span style={{ fontSize: 28, display: 'block', marginBottom: 12 }}>{step.icon}</span>
                <h3 style={{ fontSize: 18, fontWeight: 700, color: '#F8F4EE', margin: '0 0 10px' }}>{step.title}</h3>
                <p style={{ fontSize: 14, color: '#94A3B8', lineHeight: 1.65, margin: 0 }}>{step.desc}</p>
                {i < c.how.steps.length - 1 && (
                  <div className="hide-mobile" style={{ position: 'absolute', top: '50%', [isAr ? 'left' : 'right']: -13, transform: 'translateY(-50%)', fontSize: 20, color: '#4B35CC' }}>{isAr ? '←' : '→'}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Dimensions ── */}
      <section className="section" style={{ background: '#F8F4EE' }}>
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <span className="eyebrow">{c.dimensions.eyebrow}</span>
            <h2 className="section-headline">{c.dimensions.headline}</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
            {c.dimensions.items.map((dim, i) => (
              <div key={i} className="card">
                <span style={{ fontSize: 28, display: 'block', marginBottom: 12 }}>{dim.icon}</span>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: '#09071A', margin: '0 0 8px' }}>{dim.name}</h3>
                <p style={{ fontSize: 13, color: '#6B7280', margin: 0, lineHeight: 1.6 }}>{dim.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Demo ── */}
      <section className="section" style={{ background: '#fff' }}>
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <span className="eyebrow">{c.demo.eyebrow}</span>
            <h2 className="section-headline">{c.demo.headline}</h2>
          </div>
          <div style={{ maxWidth: 640, margin: '0 auto', background: '#F9FAFB', borderRadius: 20, border: '1px solid #E5E7EB', padding: '24px', boxShadow: '0 20px 60px rgba(0,0,0,0.08)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20, paddingBottom: 16, borderBottom: '1px solid #E5E7EB' }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#EF4444' }} />
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#F59E0B' }} />
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#10B981' }} />
              <span style={{ fontSize: 12, color: '#9CA3AF', marginInlineStart: 8, fontWeight: 500 }}>app.elvanis.com/signals</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {c.demo.signals.map((signal, i) => (
                <AnimatedSignal key={i} signal={signal} isAr={isAr} delay={i * 600} />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section className="section" style={{ background: '#09071A' }}>
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <span className="eyebrow" style={{ color: '#C9A84C' }}>{c.pricing.eyebrow}</span>
            <h2 className="section-headline" style={{ color: '#F8F4EE' }}>{c.pricing.headline}</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, maxWidth: 800, margin: '0 auto' }}>
            {c.pricing.plans.map((plan, i) => (
              <div key={i} style={{
                borderRadius: 20,
                padding: '32px',
                background: plan.highlighted ? 'linear-gradient(135deg, #4B35CC, #7C3AED)' : 'rgba(255,255,255,0.04)',
                border: plan.highlighted ? 'none' : '1px solid rgba(255,255,255,0.08)',
                position: 'relative',
                boxShadow: plan.highlighted ? '0 20px 60px rgba(75,53,204,0.4)' : 'none',
              }}>
                {plan.highlighted && (
                  <span style={{ position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)', background: '#C9A84C', color: '#09071A', fontSize: 11, fontWeight: 800, padding: '4px 14px', borderRadius: 20, letterSpacing: '0.06em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                    {lang === 'ar' ? 'الأكثر شيوعاً' : 'Most popular'}
                  </span>
                )}
                <h3 style={{ fontSize: 20, fontWeight: 800, color: '#F8F4EE', margin: '0 0 8px' }}>{plan.name}</h3>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, marginBottom: 8 }}>
                  <span style={{ fontSize: 40, fontWeight: 900, color: '#F8F4EE', lineHeight: 1 }}>{plan.price}</span>
                  <span style={{ fontSize: 14, color: plan.highlighted ? '#C4B5FD' : '#64748B', marginBottom: 4 }}>/{plan.period}</span>
                </div>
                <p style={{ fontSize: 14, color: plan.highlighted ? '#C4B5FD' : '#64748B', marginBottom: 24 }}>{plan.desc}</p>
                <ul style={{ listStyle: 'none', padding: 0, marginBottom: 28, display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {plan.features.map((f, j) => (
                    <li key={j} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, color: plan.highlighted ? '#EDE9FE' : '#94A3B8' }}>
                      <span style={{ color: plan.highlighted ? '#C9A84C' : '#4B35CC', fontWeight: 700, flexShrink: 0 }}>✓</span>
                      {f}
                    </li>
                  ))}
                </ul>
                <Link href="/signup" style={{
                  display: 'block', padding: '13px', textAlign: 'center',
                  background: plan.highlighted ? '#F8F4EE' : 'rgba(255,255,255,0.1)',
                  color: plan.highlighted ? '#4B35CC' : '#F8F4EE',
                  borderRadius: 10, fontSize: 14, fontWeight: 700, textDecoration: 'none',
                  transition: 'opacity 0.2s',
                }}>
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="section" style={{ background: '#F8F4EE' }}>
        <div className="container" style={{ maxWidth: 720 }}>
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <span className="eyebrow">{c.faq.eyebrow}</span>
            <h2 className="section-headline">{c.faq.headline}</h2>
          </div>
          <div>
            {c.faq.items.map((item, i) => (
              <FAQItem key={i} q={item.q} a={item.a} isAr={isAr} />
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="section" style={{ background: 'linear-gradient(135deg, #09071A 0%, #1E1B4B 100%)' }}>
        <div className="container" style={{ textAlign: 'center' }}>
          <h2 style={{ fontSize: 'clamp(32px, 5vw, 52px)', fontWeight: 900, color: '#F8F4EE', margin: '0 0 12px', letterSpacing: '-0.02em' }}>{c.cta.headline}</h2>
          <p style={{ fontSize: 20, color: '#C9A84C', fontWeight: 600, margin: '0 0 40px' }}>{c.cta.sub}</p>
          <Link href="/signup" className="btn-primary" style={{ fontSize: 16, padding: '16px 36px' }}>{c.cta.button}</Link>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer style={{ background: '#09071A', borderTop: '1px solid rgba(255,255,255,0.08)', padding: '40px 24px' }}>
        <div className="container">
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 24, marginBottom: 32 }}>
            <div>
              <span style={{ fontSize: 18, fontWeight: 900, color: '#F8F4EE', letterSpacing: '-0.03em', display: 'block', marginBottom: 6 }}>{c.nav.logo}</span>
              <p style={{ fontSize: 13, color: '#4B5563', maxWidth: 280, lineHeight: 1.6 }}>{c.footer.tagline}</p>
            </div>
            <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
              {c.footer.links.map(link => (
                <Link key={link.label} href={link.href} style={{ fontSize: 13, color: '#6B7280', textDecoration: 'none', fontWeight: 500, transition: 'color 0.15s' }}
                  onMouseEnter={e => e.currentTarget.style.color = '#F8F4EE'}
                  onMouseLeave={e => e.currentTarget.style.color = '#6B7280'}
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 24 }}>
            <p style={{ fontSize: 12, color: '#374151', margin: 0 }}>{c.footer.copy}</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
