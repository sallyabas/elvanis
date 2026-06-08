'use client'

import { useState, useEffect } from 'react'
import AppPreview from '@/components/demo'

// ── Contrast-verified palette ─────────────────────────────────
// Light (#fff / #F8FAFC): body=#0F172A, sub=#475569, muted=#64748B
// Dark  (#0F172A):        body=#F1F5F9, sub=#94A3B8
// Footer (#080E1A):       body=#94A3B8, links=hover #fff
// ─────────────────────────────────────────────────────────────

const TOOL_COLORS: Record<string, { border: string; bg: string; text: string; badge: string; badgeText: string }> = {
  Baremetrics: { border: '#FF6B2B', bg: 'rgba(255,107,43,0.06)', text: '#92400E', badge: 'rgba(255,107,43,0.12)', badgeText: '#C2410C' },
  GA4:         { border: '#E37400', bg: 'rgba(227,116,0,0.06)',   text: '#92400E', badge: 'rgba(227,116,0,0.12)',   badgeText: '#B45309' },
  Jira:        { border: '#0052CC', bg: 'rgba(0,82,204,0.05)',    text: '#1E3A8A', badge: 'rgba(0,82,204,0.1)',     badgeText: '#1D4ED8' },
  Shopify:     { border: '#96BF48', bg: 'rgba(150,191,72,0.06)',  text: '#3D6B21', badge: 'rgba(150,191,72,0.12)',  badgeText: '#4D7C0F' },
}

const T = {
  en: {
    dir: 'ltr' as const,
    nav: { login: 'Log in', cta: 'Start free' },
    hero: {
      badge: 'AI Business Diagnostics',
      title: 'Know what\'s breaking your business\nbefore it breaks you.',
      subtitle: 'Elvanis connects to your tools, reads your real data, and tells you exactly what to fix — ranked by impact. Not a dashboard. A diagnosis.',
      cta: 'Start free — 10 minutes',
      note: 'Free forever · No credit card · 3 tool connections included',
    },
    numbers: [
      { value: '6', label: 'Business dimensions diagnosed' },
      { value: '10 min', label: 'To your first signal' },
      { value: '£0', label: 'To get started' },
    ],
    pain: {
      eyebrow: 'Sound familiar?',
      title: 'You have the data.\nYou don\'t have the diagnosis.',
      rows: [
        { tool: 'Baremetrics', icon: '📊', them: 'Churn went up 4% this month', us: 'Which segment is leaving, why they\'re leaving, and what to change first' },
        { tool: 'GA4',         icon: '📈', them: 'Traffic dropped 30% last week', us: 'Which channel collapsed, whether it\'s seasonal or structural, and the fix' },
        { tool: 'Jira',        icon: '🔧', them: 'Sprint velocity fell below threshold', us: 'Whether it\'s a team problem, a bug backlog, or a planning failure' },
        { tool: 'Shopify',     icon: '🛍️', them: 'Refund rate spiked to 18%', us: 'Which SKUs are the root cause, ranked by revenue impact' },
      ],
    },
    how: {
      eyebrow: 'How it works',
      title: 'Three steps from data to action',
      steps: [
        { num: '01', icon: '🔌', title: 'Connect your tools', desc: 'Jira, GA4, Shopify, Intercom, Trustpilot. Or upload a CSV. Or take the 25-question health assessment — no tools needed to start.' },
        { num: '02', icon: '🧠', title: 'Elvanis diagnoses', desc: 'Our AI reads across all your data, identifies root causes across 6 business dimensions, and generates signals ranked by severity and impact.' },
        { num: '03', icon: '⚡', title: 'Fix what matters first', desc: 'Every signal has a specific recommended action. Track whether your fixes worked. Know the moment something new breaks.' },
      ],
    },
    dimensions: {
      eyebrow: 'What we diagnose',
      title: '6 dimensions. One health score.',
      subtitle: 'Most tools look at one dimension. Elvanis reads your entire business simultaneously and tells you where the real problem lives.',
      items: [
        { icon: '💰', name: 'Revenue', desc: 'MRR trends, churn drivers, refund spikes, pricing signals' },
        { icon: '👥', name: 'Customer', desc: 'NPS patterns, complaint clusters, referral health, repeat behaviour' },
        { icon: '📣', name: 'Marketing', desc: 'CAC trends, channel efficiency, conversion drop-off, traffic shifts' },
        { icon: '🎯', name: 'Product', desc: 'PMF signals, feature adoption, bug impact, delivery velocity' },
        { icon: '⚙️', name: 'Team', desc: 'Sprint velocity, alignment gaps, execution blockers, capacity signals' },
        { icon: '🧭', name: 'Strategy', desc: 'ICP drift, decision avoidance, process maturity, 90-day alignment' },
      ],
    },
    navigator: {
      eyebrow: 'Why Navigator exists',
      title: 'When your tools disagree,\nyou need someone to arbitrate.',
      subtitle: 'GA4 says traffic is up. Shopify says revenue is down. Jira says velocity is fine. Intercom says support load doubled. Which one is telling the truth? Navigator reads all of them together and tells you.',
      card: {
        badge: '⚠ Data Conflict Detected',
        signal: 'GA4 shows organic traffic up 31% · Shopify shows revenue down 18%',
        root: 'Paid traffic surge with near-zero purchase intent. New visitors are not your ICP.',
        action: 'Pause broad paid campaigns. Redirect budget to retargeting existing high-LTV segments.',
        label: 'Elvanis resolved this conflict automatically',
      },
    },
    demo: {
      eyebrow: 'Live preview',
      title: 'See what founders actually see',
      subtitle: 'A real health score, ranked signals with root causes, and specific actions — all from your operational data. Click a signal to see the full diagnosis.',
    },
    pricing: {
      eyebrow: 'Pricing',
      title: 'Start free.\nUpgrade when you\'re ready.',
      features: [
        { icon: '🏥', label: 'Business health score', desc: 'Overall health score across 6 dimensions', free: true, nav: true },
        { icon: '📊', label: 'Health score history', desc: 'Track how your score changes over time', free: true, nav: true },
        { icon: '🔌', label: 'Connected tool sources', desc: '3 sources on Free · Unlimited on Navigator', free: true, nav: true, freeNote: '3 sources', navNote: 'Unlimited', highlight: true },
        { icon: '📁', label: 'CSV uploads', desc: 'Upload data from any tool manually', free: true, nav: true, freeNote: 'Unlimited', navNote: 'Unlimited' },
        { icon: '📋', label: 'Business assessment', desc: '25-question health assessment', free: true, nav: true },
        { icon: '📊', label: 'Dashboard & tracker', desc: 'Full business health dashboard', free: true, nav: true },
        { icon: '⚡', label: 'Diagnostic signals', desc: 'Signals with root causes and actions', free: true, nav: true, freeNote: 'Unlimited', navNote: 'Unlimited' },
        { icon: '📅', label: 'Automated scans', desc: 'Monthly for Free · Weekly Jira & Intercom on Nav', free: true, nav: true, freeNote: 'Monthly', navNote: 'Weekly+' },
        { icon: '🔍', label: 'Manual on-demand scans', desc: 'Run a scan anytime you need one', free: false, nav: true, navNote: '1/week' },
        { icon: '📄', label: 'Monthly action report', desc: 'Summary of signals and priorities', free: true, nav: true },
        { icon: '🤖', label: 'AI Action Digest', desc: 'AI-prioritised monthly action plan', free: false, nav: true },
        { icon: '⚖️', label: 'Conflict resolution', desc: 'Resolve when tools show conflicting data', free: false, nav: true },
        { icon: '📈', label: 'Impact tracking', desc: 'See if your fixes actually worked', free: false, nav: true },
      ],
      free: { name: 'Free', price: '£0', period: 'forever', cta: 'Start free →', href: '/signup', desc: 'Everything you need to get your first diagnosis. Free forever, no time limit.' },
      nav: { name: 'Navigator', price: '£29', period: '/mo', badge: 'Most popular', cta: 'Get Navigator →', href: '/service-request?type=navigator', desc: 'For founders with multiple tools that don\'t agree. Weekly scans, conflict resolution, and an AI that reads everything together and tells you the truth.' },
    },
    finalCta: {
      title: 'Stop guessing.\nStart fixing.',
      subtitle: 'Most founders find at least 3 critical issues in their first scan. Takes 10 minutes to set up.',
      cta: 'Start free — no credit card →',
    },
    footer: {
      tagline: 'AI-powered business diagnostics for founder-led startups.',
      help: 'Need hands-on help?',
      helpCta: 'Talk to Elvanis Expertise →',
      links: ['Dashboard', 'Signals', 'Connect tools', 'Services', 'Assessment'],
      hrefs: ['/focus', '/signals', '/connect', '/service-request', '/assessment'],
    },
  },
  ar: {
    dir: 'rtl' as const,
    nav: { login: 'تسجيل الدخول', cta: 'ابدأ مجاناً' },
    hero: {
      badge: 'تشخيص الأعمال بالذكاء الاصطناعي',
      title: 'اعرف ما يكسر عملك\nقبل أن يكسرك.',
      subtitle: 'Elvanis يتصل بأدواتك، يقرأ بياناتك الحقيقية، ويخبرك بالضبط بما يجب إصلاحه — مرتباً حسب التأثير. ليس لوحة تحكم. تشخيص.',
      cta: 'ابدأ مجاناً — 10 دقائق',
      note: 'مجاني للأبد · لا بطاقة ائتمان · 3 مصادر مجاناً',
    },
    numbers: [
      { value: '6', label: 'أبعاد تجارية يتم تشخيصها' },
      { value: '10 دق', label: 'إلى أول إشارة' },
      { value: '£0', label: 'للبدء' },
    ],
    pain: {
      eyebrow: 'هل هذا مألوف؟',
      title: 'لديك البيانات.\nلكن ليس لديك التشخيص.',
      rows: [
        { tool: 'Baremetrics', icon: '📊', them: 'معدل الإلغاء ارتفع 4% هذا الشهر', us: 'أي شريحة تغادر، لماذا تغادر، وما الذي يجب تغييره أولاً' },
        { tool: 'GA4',         icon: '📈', them: 'الزيارات انخفضت 30% الأسبوع الماضي', us: 'أي قناة انهارت، هل هو موسمي أم هيكلي، والحل' },
        { tool: 'Jira',        icon: '🔧', them: 'سرعة السبرينت انخفضت دون العتبة', us: 'هل هي مشكلة فريق، تراكم أخطاء، أو فشل تخطيط' },
        { tool: 'Shopify',     icon: '🛍️', them: 'معدل المرتجعات ارتفع إلى 18%', us: 'أي منتجات هي السبب الجذري، مرتبة حسب التأثير على الإيرادات' },
      ],
    },
    how: {
      eyebrow: 'كيف يعمل',
      title: 'ثلاث خطوات من البيانات إلى الإجراء',
      steps: [
        { num: '01', icon: '🔌', title: 'اربط أدواتك', desc: 'Jira وGA4 وShopify وIntercom وTrustpilot. أو ارفع CSV. أو أجب على تقييم الصحة المكون من 25 سؤالاً.' },
        { num: '02', icon: '🧠', title: 'Elvanis يشخّص', desc: 'يقرأ الذكاء الاصطناعي عبر جميع بياناتك، يحدد الأسباب الجذرية في 6 أبعاد، ويولّد إشارات مرتبة حسب الخطورة.' },
        { num: '03', icon: '⚡', title: 'أصلح الأهم أولاً', desc: 'كل إشارة لها إجراء موصى به محدد. تتبع ما إذا نجحت إصلاحاتك. اعرف فوراً متى يتعطل شيء جديد.' },
      ],
    },
    dimensions: {
      eyebrow: 'ما نشخّصه',
      title: '6 أبعاد. نقاط صحة واحدة.',
      subtitle: 'معظم الأدوات تنظر إلى بُعد واحد. Elvanis يقرأ عملك بأكمله في آن واحد ويخبرك أين تكمن المشكلة الحقيقية.',
      items: [
        { icon: '💰', name: 'الإيرادات', desc: 'اتجاهات MRR، محركات الإلغاء، ارتفاع المرتجعات، إشارات التسعير' },
        { icon: '👥', name: 'العملاء', desc: 'أنماط NPS، مجموعات الشكاوى، صحة الإحالات، سلوك التكرار' },
        { icon: '📣', name: 'التسويق', desc: 'اتجاهات CAC، كفاءة القنوات، انخفاض التحويل، تحولات الزيارات' },
        { icon: '🎯', name: 'المنتج', desc: 'إشارات PMF، اعتماد الميزات، تأثير الأخطاء، سرعة التسليم' },
        { icon: '⚙️', name: 'الفريق', desc: 'سرعة السبرينت، فجوات التوافق، عوائق التنفيذ، إشارات الطاقة' },
        { icon: '🧭', name: 'الاستراتيجية', desc: 'انحراف ICP، تجنب القرارات، نضج العمليات، توافق 90 يوماً' },
      ],
    },
    navigator: {
      eyebrow: 'لماذا Navigator موجود',
      title: 'عندما تتعارض أدواتك،\nتحتاج من يحكم بينها.',
      subtitle: 'GA4 يقول الزيارات ارتفعت. Shopify يقول الإيرادات انخفضت. Jira يقول السرعة بخير. Intercom يقول الدعم تضاعف. أيهم يقول الحقيقة؟ Navigator يقرأ الكل معاً ويخبرك.',
      card: {
        badge: '⚠ تعارض بيانات مكتشف',
        signal: 'GA4 يُظهر ارتفاع الزيارات 31% · Shopify يُظهر انخفاض الإيرادات 18%',
        root: 'ارتفاع مفاجئ في الزيارات المدفوعة بنية شراء شبه معدومة. الزوار الجدد ليسوا عملاءك المثاليين.',
        action: 'أوقف الحملات المدفوعة الواسعة. أعد توجيه الميزانية لاستهداف الشرائح عالية القيمة.',
        label: 'Elvanis حل هذا التعارض تلقائياً',
      },
    },
    demo: {
      eyebrow: 'معاينة مباشرة',
      title: 'شاهد ما يراه المؤسسون فعلاً',
      subtitle: 'نقاط صحة حقيقية، إشارات مرتبة مع الأسباب الجذرية، وإجراءات محددة. انقر على إشارة لرؤية التشخيص الكامل.',
    },
    pricing: {
      eyebrow: 'الأسعار',
      title: 'ابدأ مجاناً.\nقم بالترقية عندما تكون جاهزاً.',
      features: [
        { icon: '🏥', label: 'نقاط صحة الأعمال', desc: 'نقاط صحة شاملة عبر 6 أبعاد', free: true, nav: true },
        { icon: '📊', label: 'تاريخ نقاط الصحة', desc: 'تتبع كيف تتغير نقاطك بمرور الوقت', free: true, nav: true },
        { icon: '🔌', label: 'مصادر الأدوات المتصلة', desc: '3 مصادر مجاناً · غير محدود مع Navigator', free: true, nav: true, freeNote: '3 مصادر', navNote: 'غير محدود', highlight: true },
        { icon: '📁', label: 'رفع CSV', desc: 'رفع البيانات من أي أداة يدوياً', free: true, nav: true, freeNote: 'غير محدود', navNote: 'غير محدود' },
        { icon: '📋', label: 'تقييم الأعمال', desc: 'تقييم صحة الأعمال بـ25 سؤالاً', free: true, nav: true },
        { icon: '📊', label: 'لوحة التحكم والتتبع', desc: 'لوحة صحة أعمال كاملة', free: true, nav: true },
        { icon: '⚡', label: 'الإشارات التشخيصية', desc: 'إشارات مع الأسباب الجذرية والإجراءات', free: true, nav: true, freeNote: 'غير محدودة', navNote: 'غير محدودة' },
        { icon: '📅', label: 'الفحوصات التلقائية', desc: 'شهرية مجاناً · أسبوعية مع Navigator', free: true, nav: true, freeNote: 'شهرية', navNote: 'أسبوعية+' },
        { icon: '🔍', label: 'فحوصات يدوية عند الطلب', desc: 'فحص في أي وقت تحتاجه', free: false, nav: true, navNote: 'مرة/أسبوع' },
        { icon: '📄', label: 'تقرير عمل شهري', desc: 'ملخص الإشارات والأولويات', free: true, nav: true },
        { icon: '🤖', label: 'ملخص AI الشهري', desc: 'خطة عمل شهرية بالذكاء الاصطناعي', free: false, nav: true },
        { icon: '⚖️', label: 'حل التعارضات', desc: 'حل تعارض البيانات بين الأدوات', free: false, nav: true },
        { icon: '📈', label: 'تتبع التأثير', desc: 'معرفة ما إذا نجحت إصلاحاتك', free: false, nav: true },
      ],
      free: { name: 'Free', price: '£0', period: 'للأبد', cta: 'ابدأ مجاناً →', href: '/signup', desc: 'كل ما تحتاجه للحصول على أول تشخيص. مجاني للأبد، بدون حد زمني.' },
      nav: { name: 'Navigator', price: '£29', period: '/شهر', badge: 'الأكثر شيوعاً', cta: 'احصل على Navigator →', href: '/service-request?type=navigator', desc: 'للمؤسسين الذين لديهم أدوات متعددة لا تتفق. فحوصات أسبوعية، حل التعارضات، وذكاء اصطناعي يقرأ كل شيء معاً ويخبرك بالحقيقة.' },
    },
    finalCta: {
      title: 'توقف عن التخمين.\nابدأ الإصلاح.',
      subtitle: 'معظم المؤسسين يجدون 3 مشكلات حرجة على الأقل في أول فحص. يستغرق الإعداد 10 دقائق.',
      cta: 'ابدأ مجاناً — لا بطاقة ائتمان →',
    },
    footer: {
      tagline: 'تشخيص الأعمال بالذكاء الاصطناعي للشركات الناشئة بقيادة المؤسسين.',
      help: 'تحتاج مساعدة مباشرة؟',
      helpCta: 'تحدث مع خبراء Elvanis →',
      links: ['لوحة التحكم', 'الإشارات', 'ربط الأدوات', 'الخدمات', 'التقييم', 'الشروط', 'الخصوصية'],
      hrefs: ['/focus', '/signals', '/connect', '/service-request', '/assessment', '/terms', '/privacy'],
    },
  },
}

export default function LandingPage() {
  const [lang, setLang] = useState<'en' | 'ar'>('en')
  const [userName, setUserName] = useState<string | null>(null)
  const [logoErr, setLogoErr] = useState(false)

  useEffect(() => {
    import('@/lib/supabase').then(({ createClient }) => {
      const sb = createClient()
      sb.auth.getUser().then(({ data: { user } }) => {
        if (user) setUserName(user.email?.split('@')[0] ?? 'Account')
      })
    })
  }, [])

  const t = T[lang]

  return (
    <main dir={t.dir} style={{ minHeight: '100vh', background: '#fff', fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif", color: '#0F172A' }}>

      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0 }
        a { text-decoration: none }
        .btn-dark:hover  { opacity: 0.85 }
        .btn-blue:hover  { opacity: 0.88 }
        .nav-link:hover  { color: #0F172A !important }
        .foot-link:hover { color: #fff !important }
        .dim-card:hover  { border-color: rgba(59,130,246,0.45) !important; background: rgba(255,255,255,0.07) !important }
        .pain-row:hover .us-col { background: #DBEAFE !important }
        .pain-row:hover { transform: translateY(-1px) }
        .pain-row { transition: transform 0.15s }
        .feat-card:hover { border-color: #CBD5E1 !important; box-shadow: 0 2px 8px rgba(15,23,42,0.06) }
        .feat-card { transition: all 0.15s }
        @media (max-width: 860px) {
          .hero-h1   { font-size: 36px !important; white-space: normal !important; letter-spacing: -1px !important }
          .three-col { grid-template-columns: 1fr !important }
          .two-col   { grid-template-columns: 1fr !important }
          .six-col   { grid-template-columns: 1fr 1fr !important }
          .feat-grid { grid-template-columns: 1fr 1fr !important }
          .num-bar   { flex-direction: column !important; gap: 24px !important }
          .pain-row  { grid-template-columns: 1fr !important }
          .nav-split { flex-direction: column !important }
          .cta-title { font-size: 38px !important; white-space: normal !important }
        }
      `}</style>

      {/* ══ NAV ══════════════════════════════════════════════ */}
      <nav style={{ position: 'sticky', top: 0, zIndex: 100, background: 'rgba(255,255,255,0.94)', backdropFilter: 'blur(16px)', borderBottom: '1px solid #E2E8F0' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 32px', height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <a href="/">
            {logoErr
              ? <span style={{ fontSize: 19, fontWeight: 900, color: '#0F172A', letterSpacing: '-0.5px' }}>Elvanis</span>
              : <img src="/elvanis-logo-dark.png" alt="Elvanis" style={{ height: 38 }} onError={() => setLogoErr(true)} />
            }
          </a>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            <button onClick={() => setLang(l => l === 'en' ? 'ar' : 'en')} style={{ padding: '5px 12px', border: '1px solid #E2E8F0', borderRadius: 7, fontSize: 12, cursor: 'pointer', background: 'transparent', color: '#64748B', fontWeight: 500 }}>
              {lang === 'en' ? 'عربي' : 'English'}
            </button>
            {userName
              ? <a href="/focus" className="btn-dark" style={{ padding: '8px 20px', background: '#0F172A', color: '#fff', borderRadius: 9, fontSize: 13, fontWeight: 700, transition: 'opacity 0.15s' }}>{userName} →</a>
              : <>
                  <a href="/login" className="nav-link" style={{ fontSize: 13, color: '#64748B', fontWeight: 500, transition: 'color 0.15s' }}>{t.nav.login}</a>
                  <a href="/signup" className="btn-dark" style={{ padding: '8px 20px', background: '#0F172A', color: '#fff', borderRadius: 9, fontSize: 13, fontWeight: 700, transition: 'opacity 0.15s' }}>{t.nav.cta}</a>
                </>
            }
          </div>
        </div>
      </nav>

      {/* ══ HERO ═════════════════════════════════════════════ */}
      <section style={{ background: '#0F172A', padding: '88px 32px 72px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(ellipse 70% 50% at 50% -5%, rgba(37,99,235,0.25) 0%, transparent 65%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(255,255,255,0.015) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.015) 1px, transparent 1px)', backgroundSize: '52px 52px', pointerEvents: 'none' }} />

        <div style={{ maxWidth: 860, margin: '0 auto', textAlign: 'center', position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '5px 14px', background: 'rgba(37,99,235,0.18)', border: '1px solid rgba(59,130,246,0.35)', borderRadius: 20, marginBottom: 28 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#60A5FA' }} />
            <span style={{ fontSize: 12, fontWeight: 600, color: '#93C5FD', letterSpacing: '0.08em' }}>{t.hero.badge}</span>
          </div>

          <h1 className="hero-h1" style={{ fontSize: 60, fontWeight: 900, color: '#F8FAFC', lineHeight: 1.08, letterSpacing: '-2px', marginBottom: 22, whiteSpace: 'pre-line' }}>
            {t.hero.title}
          </h1>
          <p style={{ fontSize: 18, color: '#94A3B8', lineHeight: 1.75, maxWidth: 520, margin: '0 auto 36px' }}>
            {t.hero.subtitle}
          </p>
          <a href="/assessment" className="btn-blue" style={{ display: 'inline-block', padding: '15px 40px', background: '#2563EB', color: '#fff', borderRadius: 12, fontSize: 16, fontWeight: 700, boxShadow: '0 8px 32px rgba(37,99,235,0.45)', transition: 'opacity 0.15s', marginBottom: 14 }}>
            {t.hero.cta}
          </a>
          <p style={{ fontSize: 12, color: '#475569', marginBottom: 56 }}>{t.hero.note}</p>

          {/* Static signal card */}
          <div style={{ background: '#1E293B', borderRadius: 16, border: '1px solid #334155', padding: '20px 24px', textAlign: 'left', maxWidth: 520, margin: '0 auto', boxShadow: '0 24px 48px rgba(0,0,0,0.4)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: '#FCA5A5', background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', padding: '3px 9px', borderRadius: 12, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Critical</span>
                <span style={{ fontSize: 11, color: '#64748B' }}>🛍️ Shopify · 94% confidence</span>
              </div>
              <span style={{ fontSize: 11, color: '#475569' }}>Today</span>
            </div>
            <p style={{ fontSize: 15, fontWeight: 600, color: '#F1F5F9', lineHeight: 1.5, marginBottom: 12 }}>
              Refund rate at 18% — 3× industry average. Revenue at risk: £8,400/mo.
            </p>
            <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, padding: '10px 14px', marginBottom: 10 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#FCA5A5' }}>Root cause: </span>
              <span style={{ fontSize: 13, color: '#CBD5E1' }}>Misleading product photos on SKU-004, SKU-011, SKU-019</span>
            </div>
            <div style={{ background: 'rgba(37,99,235,0.1)', border: '1px solid rgba(59,130,246,0.25)', borderRadius: 8, padding: '10px 14px' }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#93C5FD' }}>Action: </span>
              <span style={{ fontSize: 13, color: '#CBD5E1' }}>Update product images before next campaign. Fix SKU-004 first — highest refund volume.</span>
            </div>
          </div>
        </div>
      </section>

      {/* ══ NUMBERS BAR ══════════════════════════════════════ */}
      <div style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
        <div className="num-bar" style={{ maxWidth: 680, margin: '0 auto', padding: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 72 }}>
          {t.numbers.map((n, i) => (
            <div key={i} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 36, fontWeight: 900, color: '#0F172A', letterSpacing: '-1.5px', lineHeight: 1 }}>{n.value}</div>
              <div style={{ fontSize: 13, color: '#475569', marginTop: 6, fontWeight: 500 }}>{n.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ══ SOUND FAMILIAR + GAP ═════════════════════════════ */}
      <section style={{ padding: '96px 32px', background: '#fff' }}>
        <div style={{ maxWidth: 940, margin: '0 auto' }}>
          <div style={{ marginBottom: 52 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: '#2563EB', letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: 14 }}>{t.pain.eyebrow}</p>
            <h2 style={{ fontSize: 44, fontWeight: 900, color: '#0F172A', lineHeight: 1.12, letterSpacing: '-1.5px', whiteSpace: 'pre-line' }}>
              {t.pain.title}
            </h2>
          </div>

          {/* Column headers */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, marginBottom: 8 }}>
            <div style={{ padding: '6px 20px' }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.12em' }}>
                {lang === 'en' ? 'Your tool tells you' : 'أداتك تقول'}
              </span>
            </div>
            <div style={{ padding: '6px 20px' }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#2563EB', textTransform: 'uppercase', letterSpacing: '0.12em' }}>
                {lang === 'en' ? 'Elvanis tells you' : 'Elvanis يخبرك'}
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {t.pain.rows.map((row, i) => {
              const tc = TOOL_COLORS[row.tool] || TOOL_COLORS.Baremetrics
              return (
                <div key={i} className="pain-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
                  {/* Their tool */}
                  <div style={{
                    padding: '20px 20px',
                    background: tc.bg,
                    borderRadius: '12px 0 0 12px',
                    borderLeft: `4px solid ${tc.border}`,
                    display: 'flex', alignItems: 'center', gap: 12,
                  }}>
                    <span style={{ fontSize: 18, flexShrink: 0 }}>{row.icon}</span>
                    <div>
                      <span style={{ fontSize: 10, fontWeight: 700, color: tc.badgeText, background: tc.badge, padding: '2px 7px', borderRadius: 5, letterSpacing: '0.06em', display: 'inline-block', marginBottom: 6 }}>{row.tool}</span>
                      <p style={{ fontSize: 14, color: '#475569', lineHeight: 1.5, margin: 0 }}>{row.them}</p>
                    </div>
                  </div>
                  {/* Elvanis */}
                  <div className="us-col" style={{
                    padding: '20px 20px',
                    background: '#EFF6FF',
                    borderRadius: '0 12px 12px 0',
                    borderLeft: '4px solid #2563EB',
                    display: 'flex', alignItems: 'center', gap: 12,
                    transition: 'background 0.15s',
                  }}>
                    <span style={{ width: 28, height: 28, borderRadius: 8, background: '#2563EB', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, flexShrink: 0 }}>⚡</span>
                    <p style={{ fontSize: 14, color: '#1E40AF', fontWeight: 500, lineHeight: 1.55, margin: 0 }}>{row.us}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ══ HOW IT WORKS ═════════════════════════════════════ */}
      <section style={{ padding: '96px 32px', background: '#F8FAFC' }}>
        <div style={{ maxWidth: 1020, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 60 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: '#2563EB', letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: 14 }}>{t.how.eyebrow}</p>
            <h2 style={{ fontSize: 44, fontWeight: 900, color: '#0F172A', letterSpacing: '-1.5px' }}>{t.how.title}</h2>
          </div>
          <div className="three-col" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
            {t.how.steps.map((step, i) => (
              <div key={i} style={{ background: '#fff', borderRadius: 16, border: '1px solid #E2E8F0', padding: '36px 32px', position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: 16, right: 20, fontSize: 56, fontWeight: 900, color: '#F1F5F9', lineHeight: 1, userSelect: 'none', pointerEvents: 'none' }}>{step.num}</div>
                <div style={{ width: 48, height: 48, borderRadius: 12, background: '#EFF6FF', border: '1px solid #BFDBFE', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, marginBottom: 24 }}>{step.icon}</div>
                <h3 style={{ fontSize: 17, fontWeight: 700, color: '#0F172A', marginBottom: 10 }}>{step.title}</h3>
                <p style={{ fontSize: 14, color: '#475569', lineHeight: 1.75 }}>{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ 6 DIMENSIONS ═════════════════════════════════════ */}
      <section style={{ padding: '96px 32px', background: '#0F172A' }}>
        <div style={{ maxWidth: 1020, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 60 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: '#60A5FA', letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: 14 }}>{t.dimensions.eyebrow}</p>
            <h2 style={{ fontSize: 44, fontWeight: 900, color: '#F1F5F9', letterSpacing: '-1.5px', marginBottom: 16 }}>{t.dimensions.title}</h2>
            <p style={{ fontSize: 16, color: '#94A3B8', maxWidth: 520, margin: '0 auto', lineHeight: 1.7 }}>{t.dimensions.subtitle}</p>
          </div>
          <div className="six-col" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
            {t.dimensions.items.map((dim, i) => (
              <div key={i} className="dim-card" style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 14, border: '1px solid rgba(255,255,255,0.08)', padding: '28px 24px', transition: 'all 0.2s', cursor: 'default' }}>
                <div style={{ fontSize: 30, marginBottom: 14 }}>{dim.icon}</div>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: '#F1F5F9', marginBottom: 8 }}>{dim.name}</h3>
                <p style={{ fontSize: 13, color: '#94A3B8', lineHeight: 1.7 }}>{dim.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ NAVIGATOR PAIN ═══════════════════════════════════ */}
      <section style={{ padding: '96px 32px', background: '#fff' }}>
        <div style={{ maxWidth: 1020, margin: '0 auto' }}>
          <div className="nav-split" style={{ display: 'flex', alignItems: 'center', gap: 64 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: '#2563EB', letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: 16 }}>{t.navigator.eyebrow}</p>
              <h2 style={{ fontSize: 40, fontWeight: 900, color: '#0F172A', lineHeight: 1.15, letterSpacing: '-1.5px', marginBottom: 20, whiteSpace: 'pre-line' }}>{t.navigator.title}</h2>
              <p style={{ fontSize: 16, color: '#475569', lineHeight: 1.8, marginBottom: 32 }}>{t.navigator.subtitle}</p>
              <a href="/service-request?type=navigator" className="btn-blue" style={{ display: 'inline-block', padding: '13px 32px', background: '#2563EB', color: '#fff', borderRadius: 10, fontSize: 15, fontWeight: 700, transition: 'opacity 0.15s' }}>
                {lang === 'en' ? 'Get Navigator →' : 'احصل على Navigator →'}
              </a>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ background: '#0F172A', borderRadius: 16, border: '1px solid #1E293B', padding: '24px', boxShadow: '0 24px 48px rgba(15,23,42,0.15)' }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 8, padding: '6px 12px', marginBottom: 16 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#FCD34D' }}>{t.navigator.card.badge}</span>
                </div>
                <p style={{ fontSize: 13, color: '#94A3B8', lineHeight: 1.6, marginBottom: 16, paddingBottom: 16, borderBottom: '1px solid #1E293B' }}>{t.navigator.card.signal}</p>
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>Root cause</div>
                  <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, padding: '10px 14px' }}>
                    <span style={{ fontSize: 13, color: '#FCA5A5' }}>{t.navigator.card.root}</span>
                  </div>
                </div>
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>Recommended action</div>
                  <div style={{ background: 'rgba(37,99,235,0.1)', border: '1px solid rgba(59,130,246,0.25)', borderRadius: 8, padding: '10px 14px' }}>
                    <span style={{ fontSize: 13, color: '#93C5FD' }}>{t.navigator.card.action}</span>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#4ADE80' }} />
                  <span style={{ fontSize: 12, color: '#4ADE80', fontWeight: 600 }}>{t.navigator.card.label}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══ INTERACTIVE DEMO ══════════════════════════════════ */}
      <section style={{ padding: '96px 32px', background: '#F8FAFC' }}>
        <div style={{ maxWidth: 980, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 52 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: '#2563EB', letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: 14 }}>{t.demo.eyebrow}</p>
            <h2 style={{ fontSize: 44, fontWeight: 900, color: '#0F172A', letterSpacing: '-1.5px', marginBottom: 14 }}>{t.demo.title}</h2>
            <p style={{ fontSize: 16, color: '#475569', maxWidth: 500, margin: '0 auto', lineHeight: 1.7 }}>{t.demo.subtitle}</p>
          </div>
          <AppPreview lang={lang} />
        </div>
      </section>

      {/* ══ PRICING ══════════════════════════════════════════ */}
      <section style={{ padding: '96px 32px', background: '#fff' }}>
        <div style={{ maxWidth: 1060, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: '#2563EB', letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: 14 }}>{t.pricing.eyebrow}</p>
            <h2 style={{ fontSize: 44, fontWeight: 900, color: '#0F172A', letterSpacing: '-1.5px', whiteSpace: 'pre-line' }}>{t.pricing.title}</h2>
          </div>

          {/* Feature grid */}
          <div className="feat-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 40 }}>
            {t.pricing.features.map((f, i) => {
              const navOnly = !f.free && f.nav
              return (
                <div key={i} className="feat-card" style={{
                  background: navOnly ? '#0F172A' : '#F8FAFC',
                  borderRadius: 12,
                  border: navOnly ? '1px solid #1E293B' : '1px solid #E2E8F0',
                  borderLeft: navOnly ? '3px solid #2563EB' : f.highlight ? '3px solid #10B981' : undefined,
                  padding: '16px',
                  display: 'flex', flexDirection: 'column', gap: 8,
                  position: 'relative', overflow: 'hidden',
                  cursor: 'default',
                }}>
                  {navOnly && (
                    <div style={{ position: 'absolute', top: 10, right: 10 }}>
                      <span style={{ fontSize: 12 }}>🔒</span>
                    </div>
                  )}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 20 }}>{f.icon}</span>
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 600, color: navOnly ? '#F1F5F9' : '#0F172A', lineHeight: 1.4, paddingRight: navOnly ? 20 : 0 }}>{f.label}</span>
                  <span style={{ fontSize: 11, color: navOnly ? '#64748B' : '#94A3B8', lineHeight: 1.5 }}>{f.desc}</span>
                  {(f.freeNote || f.navNote) && (
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 2 }}>
                      {f.freeNote && <span style={{ fontSize: 10, fontWeight: 700, color: '#15803D', background: '#F0FDF4', border: '1px solid #BBF7D0', padding: '2px 7px', borderRadius: 5 }}>Free: {f.freeNote}</span>}
                      {f.navNote && <span style={{ fontSize: 10, fontWeight: 700, color: '#1D4ED8', background: navOnly ? 'rgba(37,99,235,0.2)' : '#EFF6FF', border: navOnly ? '1px solid rgba(59,130,246,0.4)' : '1px solid #BFDBFE', padding: '2px 7px', borderRadius: 5 }}>Nav: {f.navNote}</span>}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Price cards */}
          <div className="two-col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            {/* Free */}
            <div style={{ background: '#F8FAFC', borderRadius: 20, border: '1px solid #E2E8F0', padding: '40px 36px' }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{t.pricing.free.name}</p>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 12 }}>
                <span style={{ fontSize: 52, fontWeight: 900, color: '#0F172A', letterSpacing: '-2px' }}>{t.pricing.free.price}</span>
                <span style={{ fontSize: 14, color: '#64748B' }}>{t.pricing.free.period}</span>
              </div>
              <p style={{ fontSize: 14, color: '#475569', lineHeight: 1.7, marginBottom: 32 }}>{t.pricing.free.desc}</p>
              <a href={t.pricing.free.href} style={{ display: 'block', padding: '14px', background: '#0F172A', color: '#fff', borderRadius: 12, fontSize: 15, fontWeight: 700, textAlign: 'center' }}>
                {t.pricing.free.cta}
              </a>
            </div>

            {/* Navigator */}
            <div style={{ background: '#0F172A', borderRadius: 20, border: '1px solid #1E293B', padding: '40px 36px', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: 'linear-gradient(90deg, #2563EB, #60A5FA)' }} />
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.1em', margin: 0 }}>{t.pricing.nav.name}</p>
                <span style={{ fontSize: 10, fontWeight: 700, background: '#2563EB', color: '#fff', padding: '3px 10px', borderRadius: 20 }}>{t.pricing.nav.badge}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 12 }}>
                <span style={{ fontSize: 52, fontWeight: 900, color: '#fff', letterSpacing: '-2px' }}>{t.pricing.nav.price}</span>
                <span style={{ fontSize: 14, color: '#64748B' }}>{t.pricing.nav.period}</span>
              </div>
              <p style={{ fontSize: 14, color: '#94A3B8', lineHeight: 1.7, marginBottom: 32 }}>{t.pricing.nav.desc}</p>
              <a href={t.pricing.nav.href} style={{ display: 'block', padding: '14px', background: '#2563EB', color: '#fff', borderRadius: 12, fontSize: 15, fontWeight: 700, textAlign: 'center' }}>
                {t.pricing.nav.cta}
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ══ FINAL CTA ══════════════════════════════════════════ */}
      <section style={{ padding: '120px 32px', background: '#0F172A', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(ellipse 50% 60% at 50% 50%, rgba(37,99,235,0.14) 0%, transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ maxWidth: 560, margin: '0 auto', position: 'relative', zIndex: 1 }}>
          <h2 className="cta-title" style={{ fontSize: 54, fontWeight: 900, color: '#F8FAFC', lineHeight: 1.08, marginBottom: 18, letterSpacing: '-2px', whiteSpace: 'pre-line' }}>
            {t.finalCta.title}
          </h2>
          <p style={{ fontSize: 17, color: '#94A3B8', lineHeight: 1.75, marginBottom: 44 }}>{t.finalCta.subtitle}</p>
          <a href="/signup" className="btn-blue" style={{ display: 'inline-block', padding: '17px 44px', background: '#2563EB', color: '#fff', borderRadius: 14, fontSize: 16, fontWeight: 700, boxShadow: '0 8px 40px rgba(37,99,235,0.45)', transition: 'opacity 0.15s' }}>
            {t.finalCta.cta}
          </a>
        </div>
      </section>

      {/* ══ FOOTER ══════════════════════════════════════════════ */}
      <footer style={{ background: '#080E1A', padding: '64px 32px 40px' }}>
        <div style={{ maxWidth: 1020, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 40, marginBottom: 48 }}>
            <div style={{ maxWidth: 260 }}>
              <span style={{ fontSize: 20, fontWeight: 900, color: '#fff', letterSpacing: '-0.5px', display: 'block', marginBottom: 14 }}>Elvanis</span>
              <p style={{ fontSize: 14, color: '#94A3B8', lineHeight: 1.7, marginBottom: 28 }}>{t.footer.tagline}</p>
              <p style={{ fontSize: 13, color: '#475569', marginBottom: 8 }}>{t.footer.help}</p>
              <a href="/service-request" className="foot-link" style={{ fontSize: 14, color: '#94A3B8', fontWeight: 600, transition: 'color 0.15s' }}>{t.footer.helpCta}</a>
            </div>
            <div style={{ display: 'flex', gap: 36, flexWrap: 'wrap', paddingTop: 4 }}>
              {t.footer.links.map((label, i) => (
                <a key={label} href={t.footer.hrefs[i]} className="foot-link" style={{ fontSize: 14, color: '#94A3B8', transition: 'color 0.15s' }}>{label}</a>
              ))}
            </div>
          </div>
          <div style={{ borderTop: '1px solid #1E293B', paddingTop: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <span style={{ fontSize: 12, color: '#475569' }}>© 2026 Elvanis. All rights reserved.</span>
            <button onClick={() => setLang(l => l === 'en' ? 'ar' : 'en')} style={{ padding: '5px 12px', border: '1px solid #1E293B', borderRadius: 7, fontSize: 12, cursor: 'pointer', background: 'transparent', color: '#64748B', fontWeight: 500 }}>
              {lang === 'en' ? 'عربي' : 'English'}
            </button>
          </div>
        </div>
      </footer>

    </main>
  )
}
