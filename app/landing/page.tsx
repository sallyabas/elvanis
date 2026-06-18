'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

type Lang = 'en' | 'ar'

const CONTENT = {
  en: {
    nav: {
      login: 'Go to my account',
      cta: 'Start free',
    },
    hero: {
      eyebrow: 'AI-powered business diagnostics',
      headline_before: 'See ',
      headline_highlight: 'exactly',
      headline_after: " what's breaking your business.",
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
      items: ['Shopify', 'Jira', 'Google Analytics', 'Intercom', 'Trustpilot'],
    },
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
        { num: '03', icon: '🎯', title: 'Act on what matters', desc: 'Every signal has a specific recommended action. Track whether your fixes worked. Know the moment something new breaks.' },
      ],
    },
    focus: {
      eyebrow: 'The focus metric',
      headline: 'Most platforms show you everything. Elvanis shows you what matters to your business right now.',
      body: 'During onboarding, you choose one strategic priority: Revenue Growth, Customer Retention, Operations Cost, or Product Delivery. Every signal, digest, and AI recommendation is filtered through that lens — so you never wade through noise.',
      options: [
        { icon: '💰', label: 'Revenue Growth', desc: 'Focus on acquisition, conversion, and MRR' },
        { icon: '👥', label: 'Customer Retention', desc: 'Focus on churn, NPS, and satisfaction' },
        { icon: '⚙️', label: 'Operations Cost', desc: 'Focus on efficiency, support, and overhead' },
        { icon: '🎯', label: 'Product Delivery', desc: 'Focus on velocity, quality, and PMF' },
      ],
      note: 'You can change your focus metric anytime from your Profile as your business evolves.',
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
        { icon: '⚖️', title: 'Conflict resolution', desc: 'When two tools disagree — GA4 says traffic is up, Shopify says revenue is down — Elvanis flags the conflict and asks you which source to trust.' },
        { icon: '📈', title: 'Goals & tracker', desc: 'Set measurable targets on any signal. Track progress scan by scan. Get alerted the moment a goal goes at risk.' },
        { icon: '📄', title: 'Action Digest', desc: 'A monthly AI-generated 90-day action plan built from every signal across all your tools. Navigator plan only.' },
        { icon: '✨', title: 'AI Readiness Score', desc: 'See exactly where AI automation could save your business time or revenue right now — with specific opportunities ranked by impact.' },
        { icon: '🎯', title: 'Business assessment', desc: 'A 26-question diagnostic across 6 dimensions. Takes 10 minutes. Gives you a scored baseline with priority actions.' },
      ],
    },
    demo: {
      eyebrow: 'Platform preview',
      headline: 'See the full OS in action',
      tabs: [
        { id: 'connect',    icon: '🔌', label: 'Connect' },
        { id: 'signals',    icon: '⚡', label: 'Signals' },
        { id: 'conflicts',  icon: '⚖️', label: 'Conflicts' },
        { id: 'digest',     icon: '📄', label: 'Digest' },
        { id: 'assessment', icon: '🎯', label: 'Assessment' },
      ],
      cycling: 'Auto-cycling · Click any tab to explore',
    },
    ai: {
      eyebrow: 'AI Readiness',
      headline: 'Know where AI can save your business time or revenue — right now.',
      body: 'Your AI Readiness Score is calculated from your active signals and business profile. It tells you which specific automation opportunities are available to you today — with estimated time or revenue savings.',
      opportunities: [
        { icon: '🤖', title: 'AI Support Agent', saving: 'Save ~12 hrs/week', complexity: 'Low', desc: 'Automate tier-1 support tickets based on your repeat complaint patterns.' },
        { icon: '📊', title: 'Revenue Anomaly Detection', saving: 'Catch issues early', complexity: 'Medium', desc: 'Flag refund spikes and AOV drops before they become critical.' },
        { icon: '🎯', title: 'Churn Prediction Model', saving: 'Retain 15–20% more', complexity: 'Medium', desc: 'Identify at-risk customers from NPS and engagement patterns.' },
      ],
    },
    advisory: {
      eyebrow: 'Human expertise',
      headline: 'When you need more than a diagnosis.',
      body: 'AI can detect the signal. It takes a senior consultant to resolve the root cause. Every Elvanis advisory service is delivered by experienced operators who understand founder-led businesses.',
      services: [
        { icon: '🗺️', title: 'Strategic AI Roadmap', desc: 'A custom plan for implementing AI in your business — prioritised by ROI and complexity.' },
        { icon: '👤', title: 'CPO Advisory Session', desc: 'A focused strategy session with a senior product consultant on your most critical product signals.' },
        { icon: '⚖️', title: 'Conflict Resolution', desc: 'Expert help interpreting conflicting signals and deciding which data source to trust.' },
        { icon: '🤖', title: 'Custom AI Implementation', desc: 'Hands-on delivery of a specific AI solution — from scoping to deployment.' },
      ],
      cta: 'Book a session →',
      note: 'Navigator users get priority access to all advisory services.',
    },
    pricing: {
      eyebrow: 'Pricing',
      headline: "Start free. Scale when you're ready.",
      popular: 'Most popular',
      plans: [
        {
          name: 'Free',
          price: '£0',
          period: 'forever',
          desc: 'For founders getting started with diagnostics',
          cta: 'Start free',
          features: ['Business health score', 'Up to 3 tool connections', 'Unlimited signals', 'Monthly scan cycle', 'Business assessment', 'Goal tracking'],
          highlighted: false,
        },
        {
          name: 'Navigator',
          price: '£49',
          period: 'per month',
          desc: 'For founders who need weekly intelligence',
          cta: 'Start Navigator',
          features: ['Everything in Free', 'Weekly scans', 'Unlimited tool connections', 'Monthly AI Action Digest', 'On-demand manual scans', 'Conflict resolution', 'Impact tracking', 'Priority advisory access'],
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
    cta: { headline: 'Your business is sending signals.', sub: 'Start reading them.', button: 'Diagnose my business →' },
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
      login: 'الذهاب إلى حسابي',
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
        { value: '£0', label: 'للبدء' },
      ],
    },
    logos: {
      eyebrow: 'يتصل بأدواتك',
      items: ['Shopify', 'Jira', 'Google Analytics', 'Intercom', 'Trustpilot'],
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
    focus: {
      eyebrow: 'مقياس التركيز',
      headline: 'معظم المنصات تعرض كل شيء. إلفانيس يعرض ما يهم أعمالك الآن.',
      body: 'أثناء الإعداد الأولي، تختار أولويتك الاستراتيجية: نمو الإيرادات، الاحتفاظ بالعملاء، تكاليف العمليات، أو تسليم المنتج. كل إشارة وملخص وتوصية ذكاء اصطناعي تُصفَّى عبر هذه العدسة — حتى لا تغرق في الضوضاء أبداً.',
      options: [
        { icon: '💰', label: 'نمو الإيرادات', desc: 'التركيز على الاكتساب والتحويل والـ MRR' },
        { icon: '👥', label: 'الاحتفاظ بالعملاء', desc: 'التركيز على التسرب وNPS والرضا' },
        { icon: '⚙️', label: 'تكاليف العمليات', desc: 'التركيز على الكفاءة والدعم والتكاليف العامة' },
        { icon: '🎯', label: 'تسليم المنتج', desc: 'التركيز على السرعة والجودة وملاءمة السوق' },
      ],
      note: 'يمكنك تغيير مقياس التركيز في أي وقت من ملفك الشخصي مع تطور أعمالك.',
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
    features: {
      eyebrow: 'النظام الكامل',
      headline: 'كل ما تحتاجه لإدارة أعمالك بالذكاء',
      items: [
        { icon: '⚡', title: 'إشارات مرتّبة', desc: 'كل مشكلة مكتشفة ومرتّبة حسب الأثر التجاري. الحرجة أولاً دائماً.' },
        { icon: '⚖️', title: 'حل التعارضات', desc: 'عندما تختلف أداتان — GA4 يقول الزيارات ترتفع، Shopify يقول الإيرادات تنخفض — يرصد إلفانيس التعارض ويسألك أي مصدر تثق به.' },
        { icon: '📈', title: 'الأهداف والمتابعة', desc: 'ضع أهدافاً قابلة للقياس على أي إشارة. تابع التقدم فحصاً تلو الآخر. احصل على تنبيه فور تعرّض هدف للخطر.' },
        { icon: '📄', title: 'ملخص الإجراءات', desc: 'خطة عمل شهرية مولّدة بالذكاء الاصطناعي لمدة 90 يوماً، مبنية من كل إشارة عبر أدواتك. خطة Navigator فقط.' },
        { icon: '✨', title: 'درجة الاستعداد للذكاء الاصطناعي', desc: 'اعرف بالضبط أين يمكن للذكاء الاصطناعي توفير الوقت أو الإيرادات لأعمالك الآن — مع فرص محددة مرتّبة حسب الأثر.' },
        { icon: '🎯', title: 'تقييم الأعمال', desc: 'تشخيص من 26 سؤالاً عبر 6 أبعاد. يستغرق 10 دقائق. يعطيك خطاً أساسياً مُعَيَّناً مع إجراءات ذات أولوية.' },
      ],
    },
    demo: {
      eyebrow: 'معاينة المنصة',
      headline: 'شاهد النظام الكامل في العمل',
      tabs: [
        { id: 'connect',    icon: '🔌', label: 'الربط' },
        { id: 'signals',    icon: '⚡', label: 'الإشارات' },
        { id: 'conflicts',  icon: '⚖️', label: 'التعارضات' },
        { id: 'digest',     icon: '📄', label: 'الملخص' },
        { id: 'assessment', icon: '🎯', label: 'التقييم' },
      ],
      cycling: 'يتبدّل تلقائياً · انقر على أي تبويب للاستكشاف',
    },
    ai: {
      eyebrow: 'الاستعداد للذكاء الاصطناعي',
      headline: 'اعرف أين يمكن للذكاء الاصطناعي توفير الوقت أو الإيرادات — الآن.',
      body: 'تُحسب درجة استعدادك للذكاء الاصطناعي من إشاراتك النشطة وملفك التجاري. تخبرك بفرص الأتمتة المحددة المتاحة لك اليوم — مع تقديرات لتوفير الوقت أو الإيرادات.',
      opportunities: [
        { icon: '🤖', title: 'وكيل دعم بالذكاء الاصطناعي', saving: 'وفّر ~12 ساعة/أسبوع', complexity: 'منخفض', desc: 'أتمتة تذاكر الدعم من المستوى الأول بناءً على أنماط الشكاوى المتكررة.' },
        { icon: '📊', title: 'كشف شذوذات الإيرادات', saving: 'اكتشف المشاكل مبكراً', complexity: 'متوسط', desc: 'رصد ارتفاعات الاسترداد وانخفاضات AOV قبل أن تصبح حرجة.' },
        { icon: '🎯', title: 'نموذج التنبؤ بالتسرب', saving: 'احتفظ بـ 15-20% أكثر', complexity: 'متوسط', desc: 'تحديد العملاء المعرّضين للخطر من أنماط NPS والتفاعل.' },
      ],
    },
    advisory: {
      eyebrow: 'الخبرة البشرية',
      headline: 'عندما تحتاج أكثر من تشخيص.',
      body: 'الذكاء الاصطناعي يكتشف الإشارة. يحتاج حل السبب الجذري إلى مستشار متمرس. كل خدمة استشارية في إلفانيس يقدمها مشغّلون ذوو خبرة يفهمون الشركات التي يقودها المؤسسون.',
      services: [
        { icon: '🗺️', title: 'خارطة طريق استراتيجية للذكاء الاصطناعي', desc: 'خطة مخصصة لتطبيق الذكاء الاصطناعي في أعمالك — مرتّبة حسب العائد على الاستثمار والتعقيد.' },
        { icon: '👤', title: 'جلسة استشارية CPO', desc: 'جلسة استراتيجية مركزة مع مستشار منتج كبير حول إشاراتك الأكثر إلحاحاً.' },
        { icon: '⚖️', title: 'حل التعارضات', desc: 'مساعدة خبير في تفسير الإشارات المتعارضة وتحديد مصدر البيانات الأجدر بالثقة.' },
        { icon: '🤖', title: 'تنفيذ ذكاء اصطناعي مخصص', desc: 'تسليم عملي لحل ذكاء اصطناعي محدد — من التحديد النطاق حتى النشر.' },
      ],
      cta: 'احجز جلسة ←',
      note: 'يحصل مستخدمو Navigator على أولوية الوصول لجميع الخدمات الاستشارية.',
    },
    pricing: {
      eyebrow: 'الأسعار',
      headline: 'ابدأ مجاناً. طوّر عندما تكون مستعداً.',
      popular: 'الأكثر شيوعاً',
      plans: [
        {
          name: 'مجاني',
          price: '£0',
          period: 'للأبد',
          desc: 'للمؤسسين الذين يبدأون مع التشخيص',
          cta: 'ابدأ مجاناً',
          features: ['درجة صحة الأعمال', 'حتى 3 اتصالات أدوات', 'إشارات غير محدودة', 'دورة فحص شهرية', 'تقييم الأعمال', 'تتبع الأهداف'],
          highlighted: false,
        },
        {
          name: 'Navigator',
          price: '£49',
          period: 'شهرياً',
          desc: 'للمؤسسين الذين يحتاجون ذكاءً أسبوعياً',
          cta: 'ابدأ Navigator',
          features: ['كل ما في المجاني', 'فحوصات أسبوعية', 'اتصالات أدوات غير محدودة', 'ملخص إجراءات شهري بالذكاء الاصطناعي', 'فحوصات يدوية عند الطلب', 'حل التعارضات', 'تتبع الأثر', 'وصول أولوي للاستشارة'],
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
    cta: { headline: 'أعمالك ترسل إشارات.', sub: 'ابدأ قراءتها.', button: 'شخّص أعمالي ←' },
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

// ── Demo tab panels ───────────────────────────────────────────
function DemoConnect({ isAr }: { isAr: boolean }) {
  const tools = [
    { name: 'Shopify',          icon: '🛍️', connected: true,  scanning: false },
    { name: 'Jira',             icon: '🔧', connected: true,  scanning: false },
    { name: 'Google Analytics', icon: '📊', connected: true,  scanning: false },
    { name: 'Intercom',         icon: '💬', connected: false, scanning: true  },
    { name: 'Trustpilot',       icon: '⭐', connected: false, scanning: false },
  ]
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {tools.map(tool => (
        <div key={tool.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '11px 14px', background: '#F9FAFB', borderRadius: 10, border: '1px solid #E5E7EB' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 18 }}>{tool.icon}</span>
            <span style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>{tool.name}</span>
          </div>
          <span style={{ fontSize: 12, fontWeight: 600, color: tool.connected ? '#059669' : tool.scanning ? '#D97706' : '#9CA3AF' }}>
            {tool.connected ? (isAr ? 'متصل ✓' : 'Connected ✓') : tool.scanning ? (isAr ? 'جارٍ الفحص...' : 'Scanning...') : (isAr ? 'غير متصل' : 'Not connected')}
          </span>
        </div>
      ))}
    </div>
  )
}

function DemoSignals({ isAr }: { isAr: boolean }) {
  const sev: Record<string, { bg: string; border: string; color: string }> = {
    critical: { bg: '#FEF2F2', border: '#FECACA', color: '#DC2626' },
    warning:  { bg: '#FFFBEB', border: '#FDE68A', color: '#D97706' },
    watch:    { bg: '#F9FAFB', border: '#E5E7EB', color: '#6B7280' },
  }
  const signals = isAr ? [
    { s: 'critical', dim: 'الإيرادات',  title: 'معدل الاسترداد يتجاوز 8%',                src: 'Shopify',   val: '8.3%',  label: 'حرجة'   },
    { s: 'warning',  dim: 'العملاء',    title: 'انخفض NPS 18 نقطة في 30 يوماً',           src: 'Intercom',  val: '-18',   label: 'تحذير'  },
    { s: 'watch',    dim: 'المنتج',     title: 'سرعة السبرينت تتراجع للمرة الثالثة',       src: 'Jira',      val: '↓22%',  label: 'مراقبة' },
  ] : [
    { s: 'critical', dim: 'Revenue',  title: 'Refund rate exceeding 8%',              src: 'Shopify',  val: '8.3%', label: 'Critical' },
    { s: 'warning',  dim: 'Customer', title: 'NPS dropped 18 points in 30 days',      src: 'Intercom', val: '-18',  label: 'Warning'  },
    { s: 'watch',    dim: 'Product',  title: 'Sprint velocity declining — 3rd sprint', src: 'Jira',     val: '↓22%', label: 'Watch'    },
  ]
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {signals.map((sig, i) => {
        const st = sev[sig.s]
        return (
          <div key={i} style={{ background: st.bg, border: `1px solid ${st.border}`, borderRadius: 10, padding: '12px 14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: st.color, display: 'inline-block' }} />
                <span style={{ fontSize: 11, fontWeight: 700, color: st.color, textTransform: 'uppercase' as const, letterSpacing: '0.07em' }}>{sig.label}</span>
                <span style={{ fontSize: 11, color: '#9CA3AF' }}>· {sig.dim}</span>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <span style={{ fontSize: 11, color: '#9CA3AF' }}>{sig.src}</span>
                <span style={{ fontSize: 13, fontWeight: 800, color: st.color }}>{sig.val}</span>
              </div>
            </div>
            <p style={{ fontSize: 13, fontWeight: 600, color: '#111827', margin: 0, textAlign: isAr ? 'right' : 'left' }}>{sig.title}</p>
          </div>
        )
      })}
    </div>
  )
}

function DemoConflict({ isAr }: { isAr: boolean }) {
  const [trusted, setTrusted] = useState<string | null>(null)
  return (
    <div>
      <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 10, padding: '14px 16px', marginBottom: 12 }}>
        <p style={{ fontSize: 12, fontWeight: 700, color: '#92400E', margin: '0 0 6px' }}>
          {isAr ? '⚠ تعارض بين المصادر' : '⚠ Conflict between sources'}
        </p>
        <p style={{ fontSize: 13, color: '#92400E', margin: 0, lineHeight: 1.5 }}>
          {isAr ? 'GA4 يُظهر ارتفاع الزيارات 12%. Shopify يُظهر انخفاض الإيرادات 8%.' : 'GA4 shows traffic up 12%. Shopify shows revenue down 8%.'}
        </p>
      </div>
      {trusted ? (
        <div style={{ background: '#ECFDF5', border: '1px solid #A7F3D0', borderRadius: 10, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span>✅</span>
          <p style={{ fontSize: 13, color: '#059669', fontWeight: 600, margin: 0 }}>
            {isAr ? `تم الاختيار: ${trusted} كمصدر موثوق` : `Trusted: ${trusted} as primary source`}
          </p>
        </div>
      ) : (
        <div>
          <p style={{ fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 10, textAlign: isAr ? 'right' : 'left' }}>
            {isAr ? 'أي مصدر تثق به؟' : 'Which source do you trust?'}
          </p>
          <div style={{ display: 'flex', gap: 8 }}>
            {['GA4', 'Shopify'].map(src => (
              <button key={src} onClick={() => setTrusted(src)} style={{ flex: 1, padding: '10px', background: '#D97706', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                {isAr ? `ثق بـ ${src}` : `Trust ${src}`}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function DemoDigest({ isAr }: { isAr: boolean }) {
  const items = isAr ? [
    { num: '١', title: 'معالجة ارتفاع معدل الاسترداد', why: 'يؤثر على الإيرادات ورضا العملاء', who: 'المنتج + العمليات' },
    { num: '٢', title: 'إطلاق برنامج استرداد العملاء المعرّضين للتسرب', why: 'خطر انخفاض NPS مستمر', who: 'نجاح العملاء' },
    { num: '٣', title: 'مراجعة عملية تخطيط السبرينت', why: 'ثلاثة سبرينتات بأداء ضعيف متتالية', who: 'الهندسة' },
  ] : [
    { num: '1', title: 'Address refund rate spike', why: 'Impacting revenue and customer trust', who: 'Product + Ops' },
    { num: '2', title: 'Launch at-risk customer recovery programme', why: 'NPS decline risk is compounding', who: 'Customer Success' },
    { num: '3', title: 'Review sprint planning process', why: 'Three consecutive underperforming sprints', who: 'Engineering' },
  ]
  return (
    <div>
      <p style={{ fontSize: 11, fontWeight: 700, color: '#7C3AED', textTransform: 'uppercase' as const, letterSpacing: '0.08em', marginBottom: 12 }}>
        {isAr ? 'ملخص الإجراءات — 90 يوماً' : 'Action Digest — 90-day plan'}
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {items.map((item, i) => (
          <div key={i} style={{ background: '#F5F3FF', border: '1px solid #DDD6FE', borderRadius: 10, padding: '12px 14px', display: 'flex', gap: 10 }}>
            <span style={{ width: 22, height: 22, borderRadius: '50%', background: '#7C3AED', color: '#fff', fontSize: 11, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>{item.num}</span>
            <div>
              <p style={{ fontSize: 13, fontWeight: 700, color: '#4C1D95', margin: '0 0 3px', textAlign: isAr ? 'right' : 'left' }}>{item.title}</p>
              <p style={{ fontSize: 11, color: '#7C3AED', margin: '0 0 2px', textAlign: isAr ? 'right' : 'left' }}>{isAr ? 'لماذا:' : 'Why:'} {item.why}</p>
              <p style={{ fontSize: 11, color: '#A78BFA', margin: 0, textAlign: isAr ? 'right' : 'left' }}>{isAr ? 'المسؤول:' : 'Owner:'} {item.who}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function DemoAssessment({ isAr }: { isAr: boolean }) {
  const dims = isAr ? [
    { name: 'الإيرادات', score: 62, color: '#D97706' },
    { name: 'العملاء',   score: 74, color: '#059669' },
    { name: 'التسويق',   score: 48, color: '#D97706' },
    { name: 'المنتج',    score: 55, color: '#D97706' },
    { name: 'الفريق',    score: 81, color: '#059669' },
    { name: 'الاستراتيجية', score: 67, color: '#059669' },
  ] : [
    { name: 'Revenue',  score: 62, color: '#D97706' },
    { name: 'Customer', score: 74, color: '#059669' },
    { name: 'Marketing',score: 48, color: '#D97706' },
    { name: 'Product',  score: 55, color: '#D97706' },
    { name: 'Team',     score: 81, color: '#059669' },
    { name: 'Strategy', score: 67, color: '#059669' },
  ]
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14, padding: '12px 14px', background: '#FFF7ED', border: '1px solid #FDE68A', borderRadius: 10 }}>
        <div style={{ textAlign: 'center', flexShrink: 0 }}>
          <p style={{ fontSize: 34, fontWeight: 900, color: '#D97706', margin: 0, lineHeight: 1 }}>64</p>
          <p style={{ fontSize: 10, color: '#92400E', margin: 0 }}>/100</p>
        </div>
        <div>
          <p style={{ fontSize: 13, fontWeight: 700, color: '#92400E', margin: '0 0 3px' }}>{isAr ? 'يحتاج اهتماماً' : 'Needs Attention'}</p>
          <p style={{ fontSize: 12, color: '#B45309', margin: 0 }}>{isAr ? 'التسويق والمنتج يحتاجان تدخلاً فورياً' : 'Marketing and Product need immediate focus'}</p>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
        {dims.map(dim => (
          <div key={dim.name} style={{ padding: '8px 10px', background: '#F9FAFB', borderRadius: 8, border: '1px solid #E5E7EB' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>{dim.name}</span>
              <span style={{ fontSize: 12, fontWeight: 800, color: dim.color }}>{dim.score}</span>
            </div>
            <div style={{ height: 4, background: '#E5E7EB', borderRadius: 99 }}>
              <div style={{ height: 4, background: dim.color, borderRadius: 99, width: `${dim.score}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

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

// ── Main ──────────────────────────────────────────────────────
export default function LandingPage() {
  const [lang, setLang] = useState<Lang>('en')
  const [activeTab, setActiveTab] = useState(0)
  const isAr = lang === 'ar'
  const c = CONTENT[lang]

  useEffect(() => {
    const saved = localStorage.getItem('preferred_lang')
    if (saved === 'ar' || saved === 'en') setLang(saved as Lang)
  }, [])

  useEffect(() => {
    const iv = setInterval(() => setActiveTab(t => (t + 1) % 5), 3200)
    return () => clearInterval(iv)
  }, [])

  function toggleLang() {
    const next: Lang = lang === 'en' ? 'ar' : 'en'
    setLang(next)
    localStorage.setItem('preferred_lang', next)
  }

  const NAV: React.CSSProperties = { position: 'sticky', top: 0, zIndex: 100, background: 'rgba(9,7,26,0.96)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(255,255,255,0.07)', padding: '0 24px' }
  const WRAP: React.CSSProperties = { maxWidth: 1080, margin: '0 auto' }
  const SEC = (bg: string): React.CSSProperties => ({ padding: '96px 24px', background: bg })

  return (
    <div dir={isAr ? 'rtl' : 'ltr'} style={{ fontFamily: "'Inter',-apple-system,sans-serif", color: '#111827', overflowX: 'hidden' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;}
        html{scroll-behavior:smooth;}
        .hl{background:linear-gradient(135deg,#4B35CC,#7C3AED);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;font-weight:900;font-style:italic;}
        .btn{display:inline-block;padding:14px 28px;background:linear-gradient(135deg,#4B35CC,#7C3AED);color:#fff;border:none;border-radius:12px;font-size:15px;font-weight:700;cursor:pointer;text-decoration:none;transition:transform 0.2s,box-shadow 0.2s;font-family:inherit;box-shadow:0 4px 20px rgba(75,53,204,0.3);}
        .btn:hover{transform:translateY(-2px);box-shadow:0 8px 30px rgba(75,53,204,0.4);}
        .btn-o{display:inline-block;padding:14px 28px;background:transparent;color:#E2E8F0;border:1px solid rgba(255,255,255,0.2);border-radius:12px;font-size:15px;font-weight:600;cursor:pointer;text-decoration:none;transition:all 0.2s;font-family:inherit;}
        .btn-o:hover{border-color:rgba(255,255,255,0.4);background:rgba(255,255,255,0.05);}
        .ey{font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#4B35CC;margin-bottom:12px;display:block;}
        .sh{font-size:clamp(26px,4vw,40px);font-weight:800;color:#09071A;line-height:1.2;letter-spacing:-0.02em;}
        @media(max-width:768px){.g2{grid-template-columns:1fr!important;}.g3{grid-template-columns:1fr 1fr!important;}.g4{grid-template-columns:1fr 1fr!important;}.hm{display:none!important;}}
      `}</style>

      {/* Nav */}
      <nav style={NAV}>
        <div style={{ ...WRAP, height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <span style={{ fontSize: 20, fontWeight: 900, color: '#F8F4EE', letterSpacing: '-0.03em', display: 'block', lineHeight: 1.15 }}>Elvanis</span>
            <span style={{ fontSize: 9, color: '#4B5563', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase' as const }}>AI Business OS</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <button onClick={toggleLang} title={lang === 'en' ? 'Arabic' : 'English'} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, opacity: 0.7, padding: 4 }}>🌐</button>
            <Link href="/login" style={{ fontSize: 13, color: '#94A3B8', textDecoration: 'none', fontWeight: 500, whiteSpace: 'nowrap' as const }}>{c.nav.login}</Link>
            <Link href="/signup" style={{ display: 'inline-block', padding: '8px 18px', background: 'linear-gradient(135deg,#4B35CC,#7C3AED)', color: '#fff', borderRadius: 10, fontSize: 13, fontWeight: 700, textDecoration: 'none', whiteSpace: 'nowrap' as const }}>{c.nav.cta}</Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section style={{ background: 'linear-gradient(180deg,#09071A 0%,#0F0A2E 60%,#09071A 100%)', padding: '120px 24px 96px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: '30%', left: '50%', transform: 'translateX(-50%)', width: 700, height: 500, background: 'radial-gradient(circle,rgba(75,53,204,0.12) 0%,transparent 70%)', pointerEvents: 'none' as const }} />
        <div style={{ ...WRAP, textAlign: 'center', position: 'relative' }}>
          <span className="ey" style={{ color: '#C9A84C' }}>{c.hero.eyebrow}</span>
          <h1 style={{ fontSize: 'clamp(36px,6vw,68px)', fontWeight: 900, color: '#F8F4EE', lineHeight: 1.08, letterSpacing: '-0.03em', maxWidth: 820, margin: '0 auto 24px' }}>
            {c.hero.headline_before}<span className="hl">{c.hero.headline_highlight}</span>{c.hero.headline_after}
          </h1>
          <p style={{ fontSize: 'clamp(16px,2vw,20px)', color: '#CBD5E1', lineHeight: 1.7, maxWidth: 540, margin: '0 auto 40px' }}>{c.hero.sub}</p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' as const, marginBottom: 72 }}>
            <Link href="/signup" className="btn">{c.hero.cta_primary}</Link>
            <a href="#how" className="btn-o">{c.hero.cta_secondary}</a>
          </div>
          <div style={{ display: 'flex', gap: 56, justifyContent: 'center', flexWrap: 'wrap' as const }}>
            {c.hero.stats.map(s => (
              <div key={s.label} style={{ textAlign: 'center' }}>
                <p style={{ fontSize: 34, fontWeight: 900, color: '#F8F4EE', margin: '0 0 4px', letterSpacing: '-0.02em' }}>{s.value}</p>
                <p style={{ fontSize: 13, color: '#64748B', margin: 0 }}>{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Logos */}
      <section style={{ background: '#F8F4EE', padding: '32px 24px', borderBottom: '1px solid #E5E7EB' }}>
        <div style={{ ...WRAP, textAlign: 'center' }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: '#9CA3AF', letterSpacing: '0.1em', textTransform: 'uppercase' as const, display: 'block', marginBottom: 16 }}>{c.logos.eyebrow}</span>
          <div style={{ display: 'flex', gap: 40, justifyContent: 'center', flexWrap: 'wrap' as const }}>
            {c.logos.items.map(logo => <span key={logo} style={{ fontSize: 14, fontWeight: 700, color: '#9CA3AF' }}>{logo}</span>)}
          </div>
        </div>
      </section>

      {/* Problem */}
      <section style={SEC('#fff')}>
        <div style={{ ...WRAP, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 64, alignItems: 'center' }} className="g2">
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
                <p style={{ fontSize: 14, color: '#374151', margin: 0, fontWeight: 500, lineHeight: 1.5 }}>{p.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How */}
      <section id="how" style={SEC('#09071A')}>
        <div style={WRAP}>
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <span className="ey" style={{ color: '#C9A84C' }}>{c.how.eyebrow}</span>
            <h2 className="sh" style={{ color: '#F8F4EE' }}>{c.how.headline}</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 24 }} className="g3">
            {c.how.steps.map((step, i) => (
              <div key={i} style={{ padding: 28, background: 'rgba(255,255,255,0.04)', borderRadius: 16, border: '1px solid rgba(255,255,255,0.08)', position: 'relative' }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#4B35CC', letterSpacing: '0.1em', display: 'block', marginBottom: 16 }}>{step.num}</span>
                <span style={{ fontSize: 28, display: 'block', marginBottom: 12 }}>{step.icon}</span>
                <h3 style={{ fontSize: 18, fontWeight: 700, color: '#F8F4EE', margin: '0 0 10px' }}>{step.title}</h3>
                <p style={{ fontSize: 14, color: '#94A3B8', lineHeight: 1.65, margin: 0 }}>{step.desc}</p>
                {i < 2 && <div className="hm" style={{ position: 'absolute', top: '50%', [isAr ? 'left' : 'right']: -13, transform: 'translateY(-50%)', fontSize: 20, color: '#4B35CC' }}>{isAr ? '←' : '→'}</div>}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Focus metric */}
      <section style={SEC('#F8F4EE')}>
        <div style={WRAP}>
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
      <section style={SEC('#fff')}>
        <div style={WRAP}>
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
      <section style={SEC('#09071A')}>
        <div style={WRAP}>
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
      <section style={SEC('#F8F4EE')}>
        <div style={{ maxWidth: 760, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <span className="ey">{c.demo.eyebrow}</span>
            <h2 className="sh">{c.demo.headline}</h2>
          </div>
          <div style={{ background: '#fff', borderRadius: 20, border: '1px solid #E5E7EB', boxShadow: '0 20px 60px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
            <div style={{ background: '#F3F4F6', padding: '10px 16px', borderBottom: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', gap: 7 }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#EF4444' }} />
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#F59E0B' }} />
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#10B981' }} />
              <span style={{ fontSize: 11, color: '#9CA3AF', marginInlineStart: 8 }}>app.elvanis.com</span>
            </div>
            <div style={{ display: 'flex', borderBottom: '1px solid #E5E7EB', overflowX: 'auto' as const }}>
              {c.demo.tabs.map((tab, i) => (
                <button key={tab.id} onClick={() => setActiveTab(i)} style={{ flex: 1, padding: '11px 6px', background: activeTab === i ? '#fff' : '#F9FAFB', border: 'none', borderBottom: `2px solid ${activeTab === i ? '#4B35CC' : 'transparent'}`, cursor: 'pointer', fontFamily: 'inherit', fontSize: 12, fontWeight: activeTab === i ? 700 : 500, color: activeTab === i ? '#4B35CC' : '#6B7280', transition: 'all 0.2s', whiteSpace: 'nowrap' as const }}>
                  {tab.icon} {tab.label}
                </button>
              ))}
            </div>
            <div style={{ padding: 20, minHeight: 280 }}>
              {activeTab === 0 && <DemoConnect isAr={isAr} />}
              {activeTab === 1 && <DemoSignals isAr={isAr} />}
              {activeTab === 2 && <DemoConflict isAr={isAr} />}
              {activeTab === 3 && <DemoDigest isAr={isAr} />}
              {activeTab === 4 && <DemoAssessment isAr={isAr} />}
            </div>
          </div>
          <p style={{ textAlign: 'center', fontSize: 12, color: '#9CA3AF', marginTop: 14 }}>{c.demo.cycling}</p>
        </div>
      </section>

      {/* AI Readiness */}
      <section style={SEC('#fff')}>
        <div style={{ ...WRAP, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 64, alignItems: 'center' }} className="g2">
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
      <section style={SEC('#09071A')}>
        <div style={WRAP}>
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

      {/* Pricing */}
      <section style={SEC('#F8F4EE')}>
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
      <section style={SEC('#fff')}>
        <div style={{ maxWidth: 680, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <span className="ey">{c.faq.eyebrow}</span>
            <h2 className="sh">{c.faq.headline}</h2>
          </div>
          {c.faq.items.map((item, i) => <FAQItem key={i} q={item.q} a={item.a} isAr={isAr} />)}
        </div>
      </section>

      {/* CTA */}
      <section style={{ padding: '96px 24px', background: 'linear-gradient(135deg,#09071A 0%,#1E1B4B 100%)' }}>
        <div style={{ ...WRAP, textAlign: 'center' }}>
          <h2 style={{ fontSize: 'clamp(32px,5vw,54px)', fontWeight: 900, color: '#F8F4EE', margin: '0 0 12px', letterSpacing: '-0.02em' }}>{c.cta.headline}</h2>
          <p style={{ fontSize: 22, color: '#C9A84C', fontWeight: 700, margin: '0 0 40px' }}>{c.cta.sub}</p>
          <Link href="/signup" style={{ display: 'inline-block', padding: '16px 40px', background: 'linear-gradient(135deg,#4B35CC,#7C3AED)', color: '#fff', borderRadius: 14, fontSize: 16, fontWeight: 700, textDecoration: 'none', boxShadow: '0 8px 30px rgba(75,53,204,0.4)' }}>{c.cta.button}</Link>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ background: '#09071A', borderTop: '1px solid rgba(255,255,255,0.07)', padding: '40px 24px' }}>
        <div style={WRAP}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap' as const, gap: 24, marginBottom: 28 }}>
            <div>
              <span style={{ fontSize: 18, fontWeight: 900, color: '#F8F4EE', letterSpacing: '-0.03em', display: 'block', marginBottom: 4 }}>Elvanis</span>
              <p style={{ fontSize: 13, color: '#4B5563', maxWidth: 260, lineHeight: 1.6, margin: 0 }}>{c.footer.tagline}</p>
            </div>
            <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' as const }}>
              {c.footer.links.map(link => (
                <Link key={link.label} href={link.href} style={{ fontSize: 13, color: '#6B7280', textDecoration: 'none', fontWeight: 500 }}>{link.label}</Link>
              ))}
            </div>
          </div>
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 20 }}>
            <p style={{ fontSize: 12, color: '#374151', margin: 0 }}>{c.footer.copy}</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
