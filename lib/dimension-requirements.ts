// lib/dimension-requirements.ts
// Single source of truth for dimension-to-tool mapping.
// Drives all placeholder CTAs, unlock messages, and gamification.

import type { DimensionId } from './gravity-engine'

export interface DimensionRequirement {
  tools:          string[]       // source_type values from data_sources table
  csvTemplate:    string | null  // CSV template name if applicable
  ctaText:        string         // Short CTA for compact dimension cards
  ctaText_ar:     string
  ctaHref:        string         // Where CTA links to
  unlockText:     string         // Full message for hero card locked state
  unlockText_ar:  string
  pendingText:    string         // Message when tools connected but no scan yet
  pendingText_ar: string
  healthyText:    string         // Message when scanned and no signals (positive)
  healthyText_ar: string
}

export const DIMENSION_REQUIREMENTS: Record<DimensionId, DimensionRequirement> = {
  revenue: {
    tools:          ['shopify'],
    csvTemplate:    'financial',
    ctaText:        'Connect Shopify or upload financial data',
    ctaText_ar:     'اربط Shopify أو ارفع بيانات مالية',
    ctaHref:        '/connect',
    unlockText:     'Connect Shopify or upload a financial CSV to activate your Revenue Engine.',
    unlockText_ar:  'اربط Shopify أو ارفع ملف CSV مالياً لتفعيل محرك الإيرادات.',
    pendingText:    'Run a scan to generate your first Revenue signals.',
    pendingText_ar: 'أجرِ فحصاً لإنشاء أول إشارات الإيرادات.',
    healthyText:    'No revenue issues detected. Your engine looks healthy.',
    healthyText_ar: 'لم يتم اكتشاف مشاكل في الإيرادات. محركك يبدو في حالة جيدة.',
  },
  customer: {
    tools:          ['intercom', 'trustpilot'],
    csvTemplate:    'satisfaction',
    ctaText:        'Connect Intercom or Trustpilot',
    ctaText_ar:     'اربط Intercom أو Trustpilot',
    ctaHref:        '/connect',
    unlockText:     'Connect Intercom or Trustpilot to activate Customer Health signals.',
    unlockText_ar:  'اربط Intercom أو Trustpilot لتفعيل إشارات صحة العملاء.',
    pendingText:    'Run a scan to generate your first Customer Health signals.',
    pendingText_ar: 'أجرِ فحصاً لإنشاء أول إشارات صحة العملاء.',
    healthyText:    'No customer issues detected. Retention looks healthy.',
    healthyText_ar: 'لم يتم اكتشاف مشاكل في العملاء. معدل الاحتفاظ يبدو جيداً.',
  },
  marketing: {
    tools:          ['ga4'],
    csvTemplate:    'marketing',
    ctaText:        'Connect Google Analytics',
    ctaText_ar:     'اربط Google Analytics',
    ctaHref:        '/connect',
    unlockText:     'Connect Google Analytics to activate Growth & Acquisition signals.',
    unlockText_ar:  'اربط Google Analytics لتفعيل إشارات النمو والاستحواذ.',
    pendingText:    'Run a scan to generate your first Growth signals.',
    pendingText_ar: 'أجرِ فحصاً لإنشاء أول إشارات النمو.',
    healthyText:    'No growth issues detected. Acquisition looks healthy.',
    healthyText_ar: 'لم يتم اكتشاف مشاكل في النمو. الاستحواذ يبدو جيداً.',
  },
  team: {
    tools:          ['jira'],
    csvTemplate:    'velocity',
    ctaText:        'Connect Jira or upload velocity data',
    ctaText_ar:     'اربط Jira أو ارفع بيانات السرعة',
    ctaHref:        '/connect',
    unlockText:     'Connect Jira or upload a velocity CSV to activate Execution Capacity.',
    unlockText_ar:  'اربط Jira أو ارفع ملف CSV للسرعة لتفعيل قدرة التنفيذ.',
    pendingText:    'Run a scan to generate your first Execution signals.',
    pendingText_ar: 'أجرِ فحصاً لإنشاء أول إشارات التنفيذ.',
    healthyText:    'No execution issues detected. Delivery looks healthy.',
    healthyText_ar: 'لم يتم اكتشاف مشاكل في التنفيذ. التسليم يبدو جيداً.',
  },
  product: {
    tools:          ['ga4', 'shopify', 'intercom', 'jira', 'trustpilot'],
    csvTemplate:    null,
    ctaText:        'Complete your assessment and connect tools',
    ctaText_ar:     'أكمل تقييمك وربط الأدوات',
    ctaHref:        '/assessment',
    unlockText:     'Complete your assessment to start measuring Product-Market Fit.',
    unlockText_ar:  'أكمل تقييمك لبدء قياس التوافق بين المنتج والسوق.',
    pendingText:    'Run a scan to generate your first PMF signals.',
    pendingText_ar: 'أجرِ فحصاً لإنشاء أول إشارات التوافق.',
    healthyText:    'No PMF issues detected. Product fit looks strong.',
    healthyText_ar: 'لم يتم اكتشاف مشاكل في التوافق. المنتج يبدو قوياً.',
  },
  strategy: {
    tools:          [],
    csvTemplate:    null,
    ctaText:        'Complete your assessment',
    ctaText_ar:     'أكمل تقييمك',
    ctaHref:        '/assessment',
    unlockText:     'Complete your assessment to activate Strategic Clarity signals.',
    unlockText_ar:  'أكمل تقييمك لتفعيل إشارات وضوح الاستراتيجية.',
    pendingText:    'Run a scan to generate your first Strategy signals.',
    pendingText_ar: 'أجرِ فحصاً لإنشاء أول إشارات الاستراتيجية.',
    healthyText:    'No strategic issues detected. Direction looks clear.',
    healthyText_ar: 'لم يتم اكتشاف مشاكل استراتيجية. الاتجاه يبدو واضحاً.',
  },
}

// ── Helper: get missing tools for a dimension ─────────────────
export function getMissingTools(
  dimensionId:          DimensionId,
  connectedSourceTypes: string[],
): string[] {
  const req = DIMENSION_REQUIREMENTS[dimensionId]
  return req.tools.filter(t => !connectedSourceTypes.includes(t))
}

// ── Helper: check if dimension has relevant tool connected ─────
export function hasDimensionTool(
  dimensionId:          DimensionId,
  connectedSourceTypes: string[],
  hasAssessment:        boolean,
): boolean {
  const req = DIMENSION_REQUIREMENTS[dimensionId]

  if (dimensionId === 'strategy') return hasAssessment
  if (dimensionId === 'product')  return hasAssessment ||
    req.tools.some(t => connectedSourceTypes.includes(t))

  return req.tools.some(t => connectedSourceTypes.includes(t)) ||
         connectedSourceTypes.includes('csv')
}

// ── Source icon map ───────────────────────────────────────────
export const SOURCE_ICONS: Record<string, string> = {
    shopify:    '🛍️',
    jira:       '🔧',
    ga4:        '📊',
    intercom:   '💬',
    trustpilot: '⭐',
    csv:        '📄',
    manual:     '📋',
  }
  
  // ── Helper: get icons for a list of source types ──────────────
  export function getSourceIcons(sources: string[]): string[] {
    return sources.map(s => SOURCE_ICONS[s] ?? '🔗')
  }