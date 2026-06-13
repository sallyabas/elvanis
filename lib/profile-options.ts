import type { TranslationKey } from './translations'

export const STAGES: { id: string; labelKey: TranslationKey; descKey: TranslationKey; icon: string; hasData: boolean }[] = [
  { id: 'product_customers', labelKey: 'onboarding.stage_product_label', descKey: 'onboarding.stage_product_desc', icon: '🚀', hasData: true },
  { id: 'early_stage',       labelKey: 'onboarding.stage_early_label',   descKey: 'onboarding.stage_early_desc',   icon: '🌱', hasData: false },
]

export const INDUSTRIES: { value: string; key: TranslationKey }[] = [
  { value: 'B2B SaaS / Enterprise Software', key: 'profile.industry_b2b_saas' },
  { value: 'B2C Mobile Apps / Consumer Tech', key: 'profile.industry_b2c_mobile' },
  { value: 'E-commerce / Retail', key: 'profile.industry_ecommerce' },
  { value: 'Logistics / Supply Chain Tech', key: 'profile.industry_logistics' },
  { value: 'Professional Services / Consulting / Agency', key: 'profile.industry_professional_services' },
  { value: 'Marketplace / Platform', key: 'profile.industry_marketplace' },
  { value: 'HealthTech / MedTech', key: 'profile.industry_healthtech' },
  { value: 'FinTech / Financial Services', key: 'profile.industry_fintech' },
  { value: 'EdTech / Education / Training', key: 'profile.industry_edtech' },
  { value: 'Other', key: 'profile.other' },
]

export const MARKETS: { value: string; key: TranslationKey }[] = [
  { value: 'United Kingdom', key: 'profile.market_uk' },
  { value: 'Netherlands', key: 'profile.market_netherlands' },
  { value: 'UAE', key: 'profile.market_uae' },
  { value: 'Saudi Arabia', key: 'profile.market_saudi' },
  { value: 'Bahrain', key: 'profile.market_bahrain' },
  { value: 'Kuwait', key: 'profile.market_kuwait' },
  { value: 'Qatar', key: 'profile.market_qatar' },
  { value: 'Oman', key: 'profile.market_oman' },
  { value: 'Other Gulf', key: 'profile.market_other_gulf' },
  { value: 'Global / Remote-first', key: 'profile.market_global' },
  { value: 'Other', key: 'profile.other' },
]

export const TICKET_TYPES: { value: string; key: TranslationKey }[] = [
  { value: 'General question', key: 'profile.ticket_general' },
  { value: 'Bug report', key: 'profile.ticket_bug' },
  { value: 'Billing issue', key: 'profile.ticket_billing' },
  { value: 'Feature request', key: 'profile.ticket_feature' },
  { value: 'Account issue', key: 'profile.ticket_account' },
]

export const FOCUS_OPTIONS: { id: string; labelKey: TranslationKey; descKey: TranslationKey; icon: string }[] = [
  { id: 'growth',    labelKey: 'profile.focus_growth',    descKey: 'onboarding.focus_growth_desc',    icon: '🚀' },
  { id: 'retention', labelKey: 'profile.focus_retention', descKey: 'onboarding.focus_retention_desc', icon: '🔄' },
  { id: 'ops',       labelKey: 'profile.focus_ops',       descKey: 'onboarding.focus_ops_desc',       icon: '📥' },
  { id: 'delivery',  labelKey: 'profile.focus_delivery',  descKey: 'onboarding.focus_delivery_desc',  icon: '⚡' },
]
