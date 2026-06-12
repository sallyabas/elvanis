/**
 * lib/assessment-answer-map.ts
 *
 * OPTION_MAP — maps each choice question to its { id, labelKey } options.
 * IDs imported from assessment-ids.ts — single source of truth.
 * labelKeys map to translations.ts assessment.opt_* keys.
 *
 * Used by AssessmentClient to build the PAGES structure.
 */

import {
    FOUNDER_STAGE,
    BUSINESS_MODEL,
    INVESTMENT_STATUS,
    TEAM_SIZE,
    TECHNICAL_CAPACITY,
    ANALYTICS_MATURITY,
    EXECUTION_BLOCKER,
    RUNWAY,
    PMF,
    ICP_TARGETING,
    TEAM_ALIGNMENT,
    REFERRAL_FREQUENCY,
    TEAM_FOCUS,
    PROCESS_MATURITY,
  } from '@/lib/assessment-ids'
  
  export const OPTION_MAP = {
    founder_stage: [
      { id: FOUNDER_STAGE.PRODUCT_CUSTOMERS, labelKey: 'assessment.opt_founder_stage_0' },
      { id: FOUNDER_STAGE.EARLY_STAGE,       labelKey: 'assessment.opt_founder_stage_1' },
    ],
    business_model: [
      { id: BUSINESS_MODEL.SAAS_SUBSCRIPTION, labelKey: 'assessment.opt_business_model_0' },
      { id: BUSINESS_MODEL.ECOMMERCE,         labelKey: 'assessment.opt_business_model_1' },
      { id: BUSINESS_MODEL.MARKETPLACE,       labelKey: 'assessment.opt_business_model_2' },
      { id: BUSINESS_MODEL.SERVICES_AGENCY,   labelKey: 'assessment.opt_business_model_3' },
      { id: BUSINESS_MODEL.D2C_CONSUMER,      labelKey: 'assessment.opt_business_model_4' },
      { id: BUSINESS_MODEL.OTHER,             labelKey: 'assessment.opt_business_model_5' },
    ],
    investment_status: [
      { id: INVESTMENT_STATUS.BOOTSTRAPPED,   labelKey: 'assessment.opt_investment_status_0' },
      { id: INVESTMENT_STATUS.PRE_SEED,       labelKey: 'assessment.opt_investment_status_1' },
      { id: INVESTMENT_STATUS.SEED,           labelKey: 'assessment.opt_investment_status_2' },
      { id: INVESTMENT_STATUS.SERIES_A_PLUS,  labelKey: 'assessment.opt_investment_status_3' },
      { id: INVESTMENT_STATUS.FUNDRAISING,    labelKey: 'assessment.opt_investment_status_4' },
      { id: INVESTMENT_STATUS.SME_PROFITABLE, labelKey: 'assessment.opt_investment_status_5' },
    ],
    team_size: [
      { id: TEAM_SIZE.SOLO,               labelKey: 'assessment.opt_team_size_0' },
      { id: TEAM_SIZE.SMALL_2_5,          labelKey: 'assessment.opt_team_size_1' },
      { id: TEAM_SIZE.MEDIUM_6_15,        labelKey: 'assessment.opt_team_size_2' },
      { id: TEAM_SIZE.LARGE_16_50,        labelKey: 'assessment.opt_team_size_3' },
      { id: TEAM_SIZE.ENTERPRISE_50_PLUS, labelKey: 'assessment.opt_team_size_4' },
    ],
    technical_capacity: [
      { id: TECHNICAL_CAPACITY.STRONG_TECH,  labelKey: 'assessment.opt_technical_capacity_0' },
      { id: TECHNICAL_CAPACITY.LIMITED_TECH, labelKey: 'assessment.opt_technical_capacity_1' },
      { id: TECHNICAL_CAPACITY.OUTSOURCED,   labelKey: 'assessment.opt_technical_capacity_2' },
      { id: TECHNICAL_CAPACITY.NO_TECH,      labelKey: 'assessment.opt_technical_capacity_3' },
    ],
    analytics_maturity: [
      { id: ANALYTICS_MATURITY.ACTIVE_TRUSTED, labelKey: 'assessment.opt_analytics_maturity_0' },
      { id: ANALYTICS_MATURITY.TOOLS_UNUSED,   labelKey: 'assessment.opt_analytics_maturity_1' },
      { id: ANALYTICS_MATURITY.PARTIAL,        labelKey: 'assessment.opt_analytics_maturity_2' },
      { id: ANALYTICS_MATURITY.GUT_FEEL,       labelKey: 'assessment.opt_analytics_maturity_3' },
      { id: ANALYTICS_MATURITY.TOO_EARLY,      labelKey: 'assessment.opt_analytics_maturity_4' },
    ],
    execution_blocker: [
      { id: EXECUTION_BLOCKER.NO_TIME,           labelKey: 'assessment.opt_execution_blocker_0' },
      { id: EXECUTION_BLOCKER.TEAM_CANT_EXECUTE, labelKey: 'assessment.opt_execution_blocker_1' },
      { id: EXECUTION_BLOCKER.UNSURE_SOLUTION,   labelKey: 'assessment.opt_execution_blocker_2' },
      { id: EXECUTION_BLOCKER.AVOIDING_DECISION, labelKey: 'assessment.opt_execution_blocker_3' },
      { id: EXECUTION_BLOCKER.NO_BUDGET,         labelKey: 'assessment.opt_execution_blocker_4' },
      { id: EXECUTION_BLOCKER.ACTS_QUICKLY,      labelKey: 'assessment.opt_execution_blocker_5' },
    ],
    runway: [
      { id: RUNWAY.OVER_18,    labelKey: 'assessment.opt_runway_0' },
      { id: RUNWAY.R_12_18,    labelKey: 'assessment.opt_runway_1' },
      { id: RUNWAY.R_6_12,     labelKey: 'assessment.opt_runway_2' },
      { id: RUNWAY.R_3_6,      labelKey: 'assessment.opt_runway_3' },
      { id: RUNWAY.UNDER_3,    labelKey: 'assessment.opt_runway_4' },
      { id: RUNWAY.PROFITABLE, labelKey: 'assessment.opt_runway_5' },
    ],
    pmf_reaction: [
      { id: PMF.DEVASTATED,   labelKey: 'assessment.opt_pmf_reaction_0' },
      { id: PMF.DISAPPOINTED, labelKey: 'assessment.opt_pmf_reaction_1' },
      { id: PMF.INDIFFERENT,  labelKey: 'assessment.opt_pmf_reaction_2' },
      { id: PMF.NOT_ASKED,    labelKey: 'assessment.opt_pmf_reaction_3' },
      { id: PMF.NO_CUSTOMERS, labelKey: 'assessment.opt_pmf_reaction_4' },
    ],
    icp_targeting: [
      { id: ICP_TARGETING.ALIGNED,        labelKey: 'assessment.opt_icp_targeting_0' },
      { id: ICP_TARGETING.MOSTLY_ALIGNED, labelKey: 'assessment.opt_icp_targeting_1' },
      { id: ICP_TARGETING.MISALIGNED,     labelKey: 'assessment.opt_icp_targeting_2' },
      { id: ICP_TARGETING.NOT_SURE,       labelKey: 'assessment.opt_icp_targeting_3' },
    ],
    team_alignment: [
      { id: TEAM_ALIGNMENT.FULLY_ALIGNED,        labelKey: 'assessment.opt_team_alignment_0' },
      { id: TEAM_ALIGNMENT.MOSTLY_ALIGNED,       labelKey: 'assessment.opt_team_alignment_1' },
      { id: TEAM_ALIGNMENT.PARTLY_MISALIGNED,    labelKey: 'assessment.opt_team_alignment_2' },
      { id: TEAM_ALIGNMENT.SERIOUSLY_MISALIGNED, labelKey: 'assessment.opt_team_alignment_3' },
      { id: TEAM_ALIGNMENT.NOT_APPLICABLE,       labelKey: 'assessment.opt_team_alignment_4' },
    ],
    referral_frequency: [
      { id: REFERRAL_FREQUENCY.REGULARLY,    labelKey: 'assessment.opt_referral_frequency_0' },
      { id: REFERRAL_FREQUENCY.OCCASIONALLY, labelKey: 'assessment.opt_referral_frequency_1' },
      { id: REFERRAL_FREQUENCY.RARELY,       labelKey: 'assessment.opt_referral_frequency_2' },
      { id: REFERRAL_FREQUENCY.NEVER,        labelKey: 'assessment.opt_referral_frequency_3' },
      { id: REFERRAL_FREQUENCY.TOO_EARLY,    labelKey: 'assessment.opt_referral_frequency_4' },
    ],
    team_focus: [
      { id: TEAM_FOCUS.ON_TRACK,     labelKey: 'assessment.opt_team_focus_0' },
      { id: TEAM_FOCUS.MOSTLY_RIGHT, labelKey: 'assessment.opt_team_focus_1' },
      { id: TEAM_FOCUS.BUSY_UNCLEAR, labelKey: 'assessment.opt_team_focus_2' },
      { id: TEAM_FOCUS.OFF_TRACK,    labelKey: 'assessment.opt_team_focus_3' },
    ],
    process_maturity: [
      { id: PROCESS_MATURITY.DOCUMENTED_FOLLOWED,     labelKey: 'assessment.opt_process_maturity_0' },
      { id: PROCESS_MATURITY.PARTIAL,                 labelKey: 'assessment.opt_process_maturity_1' },
      { id: PROCESS_MATURITY.DOCUMENTED_NOT_FOLLOWED, labelKey: 'assessment.opt_process_maturity_2' },
      { id: PROCESS_MATURITY.NOT_DOCUMENTED,          labelKey: 'assessment.opt_process_maturity_3' },
      { id: PROCESS_MATURITY.TOO_EARLY,               labelKey: 'assessment.opt_process_maturity_4' },
    ],
  } as const