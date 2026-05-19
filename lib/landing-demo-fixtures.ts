// Fixture data for landing page AppPreview — mirrors real diagnostic_signals shape

export type DemoSignal = {
  id: string
  severity: 'critical' | 'warning' | 'watch'
  source: string
  sourceIcon: string
  dimension: string
  dimensionIcon: string
  signalType: string
  label: string
  value: string
  trend: 'worsening' | 'improving' | 'unchanged'
  confidence: number
  insight: string
  rootCause: string
  recommendedAction: string
  evidence?: string
  confirmedBy?: string
}

export type DemoPreviewCopy = {
  nav: { dashboard: string; signals: string; tracker: string; plan: string }
  healthLabel: string
  healthStatus: string
  activeSignals: string
  lastScan: string
  filters: { all: string; critical: string; warning: string }
  panel: { rootCause: string; recommendedAction: string; evidence: string; priority: string }
  businessName: string
}

export const DEMO_COPY: Record<'en' | 'ar', DemoPreviewCopy> = {
  en: {
    nav: { dashboard: 'Dashboard', signals: 'Signals', tracker: 'Health Tracker', plan: 'Action Digest' },
    healthLabel: 'Business Health',
    healthStatus: 'Needs Attention',
    activeSignals: 'Active Signals',
    lastScan: 'Last scan',
    filters: { all: 'All Active', critical: 'Critical', warning: 'Warning' },
    panel: { rootCause: 'Root cause analysis', recommendedAction: 'Recommended action', evidence: 'Evidence', priority: 'Priority score' },
    businessName: 'Acme Commerce Ltd',
  },
  ar: {
    nav: { dashboard: 'لوحة التحكم', signals: 'الإشارات', tracker: 'متتبع الصحة', plan: 'ملخص العمل' },
    healthLabel: 'صحة الأعمال',
    healthStatus: 'يحتاج انتباه',
    activeSignals: 'الإشارات النشطة',
    lastScan: 'آخر فحص',
    filters: { all: 'كل النشطة', critical: 'حرجة', warning: 'تحذير' },
    panel: { rootCause: 'تحليل السبب الجذري', recommendedAction: 'الإجراء الموصى به', evidence: 'دليل', priority: 'درجة الأولوية' },
    businessName: 'شركة أكم للتجارة',
  },
}

export const DEMO_SIGNALS: Record<'en' | 'ar', DemoSignal[]> = {
  en: [
    {
      id: 'refund',
      severity: 'critical',
      source: 'shopify',
      sourceIcon: '🛍️',
      dimension: 'revenue',
      dimensionIcon: '💰',
      signalType: 'refund_spike',
      label: 'Refund Rate',
      value: '18%',
      trend: 'worsening',
      confidence: 0.91,
      insight: 'Refund rate hit 18% in the last 30 days — 3× your category average. Concentrated on SKU-004 (linen set).',
      rootCause: 'Product photos on SKU-004 overpromise fit and colour. 62% of refunds cite “not as described”. Returns cluster in first 7 days post-delivery.',
      recommendedAction: 'Update SKU-004 gallery this week. Add size guide video to PDP. Email last 30 refunders with a 15% retention offer tied to corrected listing.',
      evidence: 'Shopify Admin → Orders → Refunded (last 30d): 47 refunds, 29 on SKU-004',
      confirmedBy: 'Trustpilot',
    },
    {
      id: 'bugs',
      severity: 'warning',
      source: 'jira',
      sourceIcon: '🔧',
      dimension: 'team',
      dimensionIcon: '⚙️',
      signalType: 'bug_backlog_growth',
      label: 'Bug Backlog',
      value: '34 open',
      trend: 'worsening',
      confidence: 0.87,
      insight: 'Critical bug backlog grew 40% in 14 days. Sprint velocity dropped from 42 to 28 story points.',
      rootCause: 'No triage ritual after release. P1 bugs from checkout flow are queuing behind feature work. Two engineers blocked on external API dependency.',
      recommendedAction: 'Daily 15-min bug triage at standup. Assign all P1 bugs due within 3 days. Unblock API dependency with vendor call this week.',
      evidence: 'Jira filter “Priority = Critical, Status = Open”: 12 issues, avg age 9 days',
    },
    {
      id: 'organic',
      severity: 'watch',
      source: 'ga4',
      sourceIcon: '📊',
      dimension: 'marketing',
      dimensionIcon: '📣',
      signalType: 'traffic_source_shift',
      label: 'Organic Traffic',
      value: '41% paid',
      trend: 'worsening',
      confidence: 0.79,
      insight: 'Organic traffic share fell from 58% to 41% in 30 days. Paid dependency increased — CAC up 22% on Meta campaigns.',
      rootCause: 'Top 5 landing pages lost rankings after site migration. No 301 map for blog content. Paid spend filled the gap temporarily.',
      recommendedAction: 'Audit Search Console for crawl errors. Redirect top 20 legacy URLs. Publish 2 comparison articles targeting high-intent keywords.',
      evidence: 'GA4 → Acquisition → Traffic acquisition: Organic sessions −31% MoM',
    },
  ],
  ar: [
    {
      id: 'refund',
      severity: 'critical',
      source: 'shopify',
      sourceIcon: '🛍️',
      dimension: 'revenue',
      dimensionIcon: '💰',
      signalType: 'refund_spike',
      label: 'معدل الاسترداد',
      value: '18%',
      trend: 'worsening',
      confidence: 0.91,
      insight: 'وصل معدل الاسترداد إلى 18% خلال 30 يوماً — 3 أضعاف متوسط فئتك. التركيز على SKU-004 (طقم الكتان).',
      rootCause: 'صور المنتج على SKU-004 تبالغ في الوصف. 62% من الاستردادات بسبب «لا يطابق الوصف». التركيز في أول 7 أيام من التسليم.',
      recommendedAction: 'حدّث معرض SKU-004 هذا الأسبوع. أضف دليل مقاسات بالفيديو. راسل المستردين خلال 30 يوماً بعرض احتفاظ 15%.',
      evidence: 'Shopify → الطلبات → مستردة (30 يوم): 47 استرداد، 29 على SKU-004',
      confirmedBy: 'Trustpilot',
    },
    {
      id: 'bugs',
      severity: 'warning',
      source: 'jira',
      sourceIcon: '🔧',
      dimension: 'team',
      dimensionIcon: '⚙️',
      signalType: 'bug_backlog_growth',
      label: 'تراكم الأخطاء',
      value: '34 مفتوحة',
      trend: 'worsening',
      confidence: 0.87,
      insight: 'تراكم الأخطاء الحرجة زاد 40% في 14 يوماً. سرعة السبرينت انخفضت من 42 إلى 28 نقطة.',
      rootCause: 'لا يوجد فرز يومي بعد الإصدار. أخطاء P1 في الدفع تتأخر خلف الميزات. مهندسان محجوبان بسبب API خارجي.',
      recommendedAction: 'فرز أخطاء 15 دقيقة يومياً. تعيين P1 خلال 3 أيام. اجتماع مع المورّد لرفع الحجب.',
      evidence: 'Jira: 12 مشكلة حرجة مفتوحة، متوسط العمر 9 أيام',
    },
    {
      id: 'organic',
      severity: 'watch',
      source: 'ga4',
      sourceIcon: '📊',
      dimension: 'marketing',
      dimensionIcon: '📣',
      signalType: 'traffic_source_shift',
      label: 'الزيارات العضوية',
      value: '41% مدفوع',
      trend: 'worsening',
      confidence: 0.79,
      insight: 'حصة الزيارات العضوية من 58% إلى 41% في 30 يوماً. الاعتماد المدفوع زاد — تكلفة الاكتساب +22% على Meta.',
      rootCause: 'فقدت 5 صفحات هبوط ترتيبها بعد ترحيل الموقع. لا توجيه 301 للمدونة. الإنفاق المدفوع سد الفجوة مؤقتاً.',
      recommendedAction: 'مراجعة Search Console. إعادة توجيه 20 رابطاً. نشر مقالين مقارنة لكلمات عالية النية.',
      evidence: 'GA4: الجلسات العضوية −31% شهرياً',
    },
  ],
}

export const DEMO_HEALTH = {
  score: 61,
  critical: 1,
  warning: 1,
  watch: 1,
  sources: 3,
}
