/**
 * lib/assessment-ids.ts
 *
 * Single source of truth for all assessment answer IDs.
 * Imported by both AssessmentClient (UI) and /api/score (server).
 *
 * Rules:
 *   - Never use raw strings for answer comparisons — always use these constants
 *   - If an ID needs renaming, change it here — TypeScript will surface every breakage
 *   - Derived types ensure answers object is fully type-checked at compile time
 */

// ── Choice question IDs ───────────────────────────────────────

export const FOUNDER_STAGE = {
    PRODUCT_CUSTOMERS: 'product_customers',
    EARLY_STAGE:       'early_stage',
  } as const
  
  export const BUSINESS_MODEL = {
    SAAS_SUBSCRIPTION: 'saas_subscription',
    ECOMMERCE:         'ecommerce',
    MARKETPLACE:       'marketplace',
    SERVICES_AGENCY:   'services_agency',
    D2C_CONSUMER:      'd2c_consumer',
    OTHER:             'other',
  } as const
  
  export const INVESTMENT_STATUS = {
    BOOTSTRAPPED:   'bootstrapped',
    PRE_SEED:       'pre_seed',
    SEED:           'seed',
    SERIES_A_PLUS:  'series_a_plus',
    FUNDRAISING:    'fundraising',
    SME_PROFITABLE: 'sme_profitable',
  } as const
  
  export const TEAM_SIZE = {
    SOLO:              'solo',
    SMALL_2_5:         'small_2_5',
    MEDIUM_6_15:       'medium_6_15',
    LARGE_16_50:       'large_16_50',
    ENTERPRISE_50_PLUS:'enterprise_50_plus',
  } as const
  
  export const TECHNICAL_CAPACITY = {
    STRONG_TECH:  'strong_tech',
    LIMITED_TECH: 'limited_tech',
    OUTSOURCED:   'outsourced',
    NO_TECH:      'no_tech',
  } as const
  
  export const ANALYTICS_MATURITY = {
    ACTIVE_TRUSTED: 'active_trusted',
    TOOLS_UNUSED:   'tools_unused',
    PARTIAL:        'partial',
    GUT_FEEL:       'gut_feel',
    TOO_EARLY:      'too_early',
  } as const
  
  export const EXECUTION_BLOCKER = {
    NO_TIME:            'no_time',
    TEAM_CANT_EXECUTE:  'team_cant_execute',
    UNSURE_SOLUTION:    'unsure_solution',
    AVOIDING_DECISION:  'avoiding_decision',
    NO_BUDGET:          'no_budget',
    ACTS_QUICKLY:       'acts_quickly',
  } as const
  
  export const RUNWAY = {
    OVER_18:    'runway_18_plus',
    R_12_18:    'runway_12_18',
    R_6_12:     'runway_6_12',
    R_3_6:      'runway_3_6',
    UNDER_3:    'runway_under_3',
    PROFITABLE: 'profitable',
  } as const
  
  export const PMF = {
    DEVASTATED:   'devastated',
    DISAPPOINTED: 'disappointed',
    INDIFFERENT:  'indifferent',
    NOT_ASKED:    'not_asked',
    NO_CUSTOMERS: 'no_customers',
  } as const
  
  export const ICP_TARGETING = {
    ALIGNED:        'aligned',
    MOSTLY_ALIGNED: 'mostly_aligned',
    MISALIGNED:     'misaligned',
    NOT_SURE:       'not_sure',
  } as const
  
  export const TEAM_ALIGNMENT = {
    FULLY_ALIGNED:        'fully_aligned',
    MOSTLY_ALIGNED:       'mostly_aligned',
    PARTLY_MISALIGNED:    'partly_misaligned',
    SERIOUSLY_MISALIGNED: 'seriously_misaligned',
    NOT_APPLICABLE:       'not_applicable',
  } as const
  
  export const REFERRAL_FREQUENCY = {
    REGULARLY:   'regularly',
    OCCASIONALLY:'occasionally',
    RARELY:      'rarely',
    NEVER:       'never',
    TOO_EARLY:   'too_early',
  } as const
  
  export const TEAM_FOCUS = {
    ON_TRACK:     'on_track',
    MOSTLY_RIGHT: 'mostly_right',
    BUSY_UNCLEAR: 'busy_unclear',
    OFF_TRACK:    'off_track',
  } as const
  
  export const PROCESS_MATURITY = {
    DOCUMENTED_FOLLOWED:     'documented_followed',
    PARTIAL:                 'partial',
    DOCUMENTED_NOT_FOLLOWED: 'documented_not_followed',
    NOT_DOCUMENTED:          'not_documented',
    TOO_EARLY:               'too_early',
  } as const
  
  // ── Derived types ─────────────────────────────────────────────
  // Use these to type the answers object — TypeScript will reject invalid values
  
  export type FounderStageOption      = typeof FOUNDER_STAGE[keyof typeof FOUNDER_STAGE]
  export type BusinessModelOption     = typeof BUSINESS_MODEL[keyof typeof BUSINESS_MODEL]
  export type InvestmentStatusOption  = typeof INVESTMENT_STATUS[keyof typeof INVESTMENT_STATUS]
  export type TeamSizeOption          = typeof TEAM_SIZE[keyof typeof TEAM_SIZE]
  export type TechnicalCapacityOption = typeof TECHNICAL_CAPACITY[keyof typeof TECHNICAL_CAPACITY]
  export type AnalyticsMaturityOption = typeof ANALYTICS_MATURITY[keyof typeof ANALYTICS_MATURITY]
  export type ExecutionBlockerOption  = typeof EXECUTION_BLOCKER[keyof typeof EXECUTION_BLOCKER]
  export type RunwayOption            = typeof RUNWAY[keyof typeof RUNWAY]
  export type PmfOption               = typeof PMF[keyof typeof PMF]
  export type IcpTargetingOption      = typeof ICP_TARGETING[keyof typeof ICP_TARGETING]
  export type TeamAlignmentOption     = typeof TEAM_ALIGNMENT[keyof typeof TEAM_ALIGNMENT]
  export type ReferralFrequencyOption = typeof REFERRAL_FREQUENCY[keyof typeof REFERRAL_FREQUENCY]
  export type TeamFocusOption         = typeof TEAM_FOCUS[keyof typeof TEAM_FOCUS]
  export type ProcessMaturityOption   = typeof PROCESS_MATURITY[keyof typeof PROCESS_MATURITY]
  
  // ── Typed answers record ──────────────────────────────────────
  // Choice fields are typed to their union — text fields stay string
  export type AssessmentAnswers = {
    // Choice questions — typed
    founder_stage?:      FounderStageOption
    business_model?:     BusinessModelOption
    investment_status?:  InvestmentStatusOption
    team_size?:          TeamSizeOption
    technical_capacity?: TechnicalCapacityOption
    analytics_maturity?: AnalyticsMaturityOption
    execution_blocker?:  ExecutionBlockerOption
    runway?:             RunwayOption
    pmf_reaction?:       PmfOption
    icp_targeting?:      IcpTargetingOption
    team_alignment?:     TeamAlignmentOption
    referral_frequency?: ReferralFrequencyOption
    team_focus?:         TeamFocusOption
    process_maturity?:   ProcessMaturityOption
    pricing_confidence?: string // scale '1'–'5'
    // Text questions — free string
    biggest_problem_now?:  string
    win_reason?:           string
    financial_concern?:    string
    icp_alignment?:        string
    ideal_customer?:       string
    already_tried?:        string
    target_90_days?:       string
    bug_process?:          string
    churn_reason?:         string
    customer_complaint?:   string
    avoided_decision?:     string
    success_12m?:          string
    icp_targeting_saved?:  string
  }