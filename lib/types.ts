// ── Founder ────────────────────────────────────────────────────────────────
export type Founder = {
    id: string
    user_id: string
    full_name: string | null
    email: string
    language: 'en' | 'ar'
    business_name: string | null
    industry: string | null
    business_model: string | null
    location: string | null
    team_size: number | null
    founded_date: string | null
    revenue_range: string | null
    funding_stage: string | null
    primary_market: string | null
    expert_preference: string | null
    subscription_tier: 'free' | 'navigator' | 'advisor'
    stripe_customer_id: string | null
    subscription_status: string
    created_at: string
    updated_at: string
  }
  
  // ── Assessment ─────────────────────────────────────────────────────────────
  export type Assessment = {
    id: string
    founder_id: string
    status: 'in_progress' | 'completed' | 'scored'
    language: string
    free_text_challenge: string | null
  
    // Context (X)
    analytics_maturity: string | null
    analytics_tools: string | null
    investment_status: string | null
    target_90_days: string | null
    execution_blocker: string | null
    process_maturity: string | null
  
    // Revenue (R)
    revenue_trend: string | null
    win_reason: string | null
    pricing_confidence: number | null
    pricing_blocker: string | null
    runway: string | null
    financial_concern: string | null
  
    // PMF (P)
    pmf_reaction: string | null
    validation_method: string | null
    icp_alignment: string | null
    usage_pattern: string | null
  
    // Team (T)
    founder_dependency: number | null
    team_alignment: string | null
    delivery_velocity: string | null
    cs_visibility: string | null
    bug_process: string | null
  
    // Customer (C)
    churn_reason: string | null
    activation_time: string | null
    referral_frequency: string | null
    cs_bug_awareness: string | null
  
    // Marketing (M)
    ideal_customer: string | null
    trial_conversion: string | null
    acquisition_channel: string | null
    marketing_visibility: string | null
  
    // Strategy (S)
    avoided_decision: string | null
    team_focus: string | null
    win_loss_clarity: string | null
    success_12m: string | null
  
    created_at: string
    completed_at: string | null
  }
  
  // ── Score ──────────────────────────────────────────────────────────────────
  export type Score = {
    id: string
    assessment_id: string
    founder_id: string
    overall_score: number
    overall_status: string
    overall_summary: string
    business_stage: string
    urgency_level: 'normal' | 'elevated' | 'critical' | 'survival'
    diagnosis_confidence: 'low' | 'standard' | 'high'
    investor_lens: boolean
    recommended_next_step: 'self_guided' | 'expert_session' | 'urgent_action'
    score_revenue: number
    score_pmf: number
    score_team: number
    score_customer: number
    score_marketing: number
    score_strategy: number
    label_revenue: string | null
    label_pmf: string | null
    label_team: string | null
    label_customer: string | null
    label_marketing: string | null
    label_strategy: string | null
    is_symptom_revenue: boolean | null
    is_symptom_pmf: boolean | null
    is_symptom_team: boolean | null
    is_symptom_customer: boolean | null
    is_symptom_marketing: boolean | null
    is_symptom_strategy: boolean | null
    primary_constraint_dimension: string | null
    primary_constraint_summary: string | null
    primary_constraint_urgency: string | null
    primary_constraint_is_root_cause: boolean | null
    causal_chains: CausalChain[] | null
    priority_order: PriorityItem[] | null
    top_3_findings: Finding[] | null
    implementation_roadmap: RoadmapItem[] | null
    investor_view: InvestorView | null
    raw_ai_response: Record<string, unknown> | null
    created_at: string
    language: string
  }
  
  // ── Nested types ───────────────────────────────────────────────────────────
  export type CausalChain = {
    chain_name: string
    cause_dimension: string
    cause_signal: string
    symptom_dimensions: string[]
    symptom_signals: string[]
    fix_order: string
  }
  
  export type PriorityItem = {
    priority: number
    action: string
    dimension: string
    reason: string
    timeframe: string
    effort: 'low' | 'medium' | 'high'
    impact: 'low' | 'medium' | 'high'
  }
  
  export type Finding = {
    rank: number
    dimension: string
    finding: string
    impact: string
    is_root_cause: boolean
  }
  
  export type RoadmapItem = {
    priority: number
    timeframe: string
    action: string
    dimension: string
    effort: 'low' | 'medium' | 'high'
    impact: 'low' | 'medium' | 'high'
    is_root_cause_fix: boolean
  }
  
  export type InvestorView = {
    included: boolean
    key_metrics_to_show: string[]
    narrative_strength: 'weak' | 'developing' | 'strong'
    recommended_focus: string
  }
  
  // ── Goal ───────────────────────────────────────────────────────────────────
  export type Goal = {
    id: string
    founder_id: string
    title: string
    description: string | null
    dimension: string | null
    target_value: string | null
    current_value: string | null
    unit: string | null
    due_date: string | null
    status: 'active' | 'completed' | 'paused'
    created_at: string
    updated_at: string
  }
  
  // ── Dimension keys ─────────────────────────────────────────────────────────
  export type DimensionKey =
    | 'revenue_financial'
    | 'product_market_fit'
    | 'team_operations'
    | 'customer_retention'
    | 'marketing_growth'
    | 'strategy_goals'
  
  export const DIMENSION_LABELS: Record<DimensionKey, { en: string; ar: string; color: string }> = {
    revenue_financial:  { en: 'Revenue & Financial',    ar: 'الإيرادات والصحة المالية', color: '#2563EB' },
    product_market_fit: { en: 'Product & Market Fit',   ar: 'الملاءمة مع السوق',        color: '#059669' },
    team_operations:    { en: 'Team & Operations',       ar: 'الفريق والعمليات',          color: '#7C3AED' },
    customer_retention: { en: 'Customer & Retention',    ar: 'العملاء والاحتفاظ',         color: '#D97706' },
    marketing_growth:   { en: 'Marketing & Growth',      ar: 'التسويق والنمو',            color: '#DC2626' },
    strategy_goals:     { en: 'Strategy & Goals',        ar: 'الاستراتيجية والأهداف',    color: '#1D4ED8' },
  }