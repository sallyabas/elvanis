/**
 * lib/ai-opportunities.ts
 *
 * Single source of truth for AI opportunity signal metadata.
 * Imported by both home/page.tsx and overview/page.tsx.
 * Never duplicate this mapping elsewhere.
 */

export interface AIOpportunity {
  title:          string
  title_ar:       string
  description:    string
  description_ar: string
  saving:         string
  saving_ar:      string
  complexity:     'low' | 'medium' | 'high'
}

export const AI_OPPORTUNITY_SIGNALS: Record<string, AIOpportunity> = {
  ticket_volume_increase: {
    title:          'AI Support Agent',
    title_ar:       'وكيل دعم بالذكاء الاصطناعي',
    description:    'Automate responses to repetitive support tickets',
    description_ar: 'أتمتة الردود على تذاكر الدعم المتكررة',
    saving:         '10-15 hrs/week',
    saving_ar:      '10-15 ساعة/أسبوع',
    complexity:     'low',
  },
  response_time_increase: {
    title:          'AI Ticket Triage',
    title_ar:       'تصنيف تذاكر بالذكاء الاصطناعي',
    description:    'Auto-categorise and prioritise incoming tickets',
    description_ar: 'تصنيف التذاكر الواردة وترتيب أولوياتها تلقائياً',
    saving:         '5-8 hrs/week',
    saving_ar:      '5-8 ساعات/أسبوع',
    complexity:     'low',
  },
  repeat_complaint_pattern: {
    title:          'AI Knowledge Base',
    title_ar:       'قاعدة معرفة بالذكاء الاصطناعي',
    description:    'Answer common complaints automatically',
    description_ar: 'الإجابة على الشكاوى الشائعة تلقائياً',
    saving:         '8-12 hrs/week',
    saving_ar:      '8-12 ساعة/أسبوع',
    complexity:     'low',
  },
  velocity_drop: {
    title:          'AI Sprint Planning',
    title_ar:       'تخطيط سبرينت بالذكاء الاصطناعي',
    description:    'AI-assisted estimation and dependency detection',
    description_ar: 'تقدير مدعوم بالذكاء الاصطناعي واكتشاف التبعيات',
    saving:         '3-5 hrs/sprint',
    saving_ar:      '3-5 ساعات/سبرينت',
    complexity:     'medium',
  },
  bug_backlog_growth: {
    title:          'AI Code Review',
    title_ar:       'مراجعة كود بالذكاء الاصطناعي',
    description:    'Catch bugs before they ship',
    description_ar: 'اكتشاف الأخطاء قبل الإطلاق',
    saving:         '6-10 hrs/week',
    saving_ar:      '6-10 ساعات/أسبوع',
    complexity:     'medium',
  },
  engagement_drop: {
    title:          'AI Personalisation',
    title_ar:       'تخصيص بالذكاء الاصطناعي',
    description:    'Tailor user journeys by behaviour',
    description_ar: 'تخصيص رحلات المستخدمين حسب سلوكهم',
    saving:         'Revenue impact',
    saving_ar:      'أثر على الإيرادات',
    complexity:     'high',
  },
  conversion_fall: {
    title:          'AI Conversion Optimisation',
    title_ar:       'تحسين التحويل بالذكاء الاصطناعي',
    description:    'Automatically test and optimise conversion paths',
    description_ar: 'اختبار مسارات التحويل وتحسينها تلقائياً',
    saving:         'Revenue impact',
    saving_ar:      'أثر على الإيرادات',
    complexity:     'high',
  },
  activation_drop: {
    title:          'AI Onboarding Agent',
    title_ar:       'وكيل تأهيل بالذكاء الاصطناعي',
    description:    'Automate activation sequences for new users',
    description_ar: 'أتمتة تسلسلات التفعيل للمستخدمين الجدد',
    saving:         '8-12 hrs/week',
    saving_ar:      '8-12 ساعة/أسبوع',
    complexity:     'medium',
  },
  nps_decline: {
    title:          'AI Feedback Analysis',
    title_ar:       'تحليل تغذية راجعة بالذكاء الاصطناعي',
    description:    'Automatically analyse and categorise NPS responses',
    description_ar: 'تحليل ردود NPS وتصنيفها تلقائياً',
    saving:         '4-6 hrs/week',
    saving_ar:      '4-6 ساعات/أسبوع',
    complexity:     'low',
  },
  csat_decline: {
    title:          'AI Support Optimisation',
    title_ar:       'تحسين الدعم بالذكاء الاصطناعي',
    description:    'Identify root causes of low satisfaction automatically',
    description_ar: 'تحديد الأسباب الجذرية لانخفاض الرضا تلقائياً',
    saving:         '5-8 hrs/week',
    saving_ar:      '5-8 ساعات/أسبوع',
    complexity:     'low',
  },
  cycle_time_increase: {
    title:          'AI Workflow Automation',
    title_ar:       'أتمتة سير العمل بالذكاء الاصطناعي',
    description:    'Identify bottlenecks and automate handoffs',
    description_ar: 'تحديد الاختناقات وأتمتة عمليات التسليم',
    saving:         '6-10 hrs/week',
    saving_ar:      '6-10 ساعات/أسبوع',
    complexity:     'medium',
  },
  traffic_source_shift: {
    title:          'AI SEO & Content Engine',
    title_ar:       'محرك SEO والمحتوى بالذكاء الاصطناعي',
    description:    'Reduce paid traffic dependency with AI-generated organic content',
    description_ar: 'تقليل الاعتماد على الزيارات المدفوعة بمحتوى عضوي بالذكاء الاصطناعي',
    saving:         'Revenue impact',
    saving_ar:      'أثر على الإيرادات',
    complexity:     'high',
  },
  session_duration_drop: {
    title:          'AI Personalisation',
    title_ar:       'تخصيص بالذكاء الاصطناعي',
    description:    'Dynamically adapt content to keep users engaged',
    description_ar: 'تكييف المحتوى ديناميكياً للحفاظ على تفاعل المستخدمين',
    saving:         'Revenue impact',
    saving_ar:      'أثر على الإيرادات',
    complexity:     'high',
  },
  blocked_tickets_spike: {
    title:          'AI Workflow Automation',
    title_ar:       'أتمتة سير العمل بالذكاء الاصطناعي',
    description:    'Detect and resolve common blockers before they stall the team',
    description_ar: 'اكتشاف العوائق الشائعة وحلها قبل أن تعيق الفريق',
    saving:         '4-6 hrs/week',
    saving_ar:      '4-6 ساعات/أسبوع',
    complexity:     'medium',
  },
}
