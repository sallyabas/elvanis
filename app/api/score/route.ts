import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import { getT } from '@/lib/translations'
import Groq from 'groq-sdk'
import { Resend } from 'resend'
import {
  RUNWAY, PMF, TEAM_ALIGNMENT, TEAM_FOCUS,
  ICP_TARGETING, REFERRAL_FREQUENCY, PROCESS_MATURITY,
  TEAM_SIZE, TECHNICAL_CAPACITY,
} from '@/lib/assessment-ids'
import { DIMENSIONS } from '@/lib/gravity-engine'


const groq   = new Groq({ apiKey: process.env.GROQ_API_KEY })
const resend = new Resend(process.env.RESEND_API_KEY)

// ── WEIGHT MATRICES — server-side, deterministic, never delegated to AI ──
// AI scores each dimension independently. Server applies weights and calculates overall_score.
// Each matrix validated to sum exactly 1.00
const WEIGHT_MATRICES: Record<string, Record<string, number>> = {
  early_stage: {
    revenue:   0.15,
    product:   0.30, // PMF is the core question for pre-product founders
    team:      0.20,
    customer:  0.10,
    marketing: 0.10, // Find PMF before scaling marketing
    strategy:  0.15, // Strategy clarity matters more than marketing early
  },
  product_customers: {
    revenue:   0.25,
    product:   0.20,
    team:      0.20, // Ops pressure grows with customer load
    customer:  0.20,
    marketing: 0.07,
    strategy:  0.08,
  },
}

// ── STATUS LABELS — deterministic, matching dashboard pattern ──
function getOverallStatus(score: number): string {
  if (score >= 80) return 'assessment.status_healthy'
  if (score >= 60) return 'assessment.status_needs_attention'
  if (score >= 40) return 'assessment.status_at_risk'
  return 'assessment.status_critical'
}

const VALID_DIMENSION_KEYS = Object.keys(DIMENSIONS) // ['revenue', 'customer', 'marketing', 'team', 'product', 'strategy']


const SYSTEM_PROMPT = `You are Elvanis, an expert AI business health advisor for founder-led startups and SMEs in the UK and Gulf. Diagnose why the business is not growing and identify root causes not just symptoms.

RULES:
- Every insight must reference the founder specific answers directly
- Never give generic advice — be specific to their situation
- When data clearly points to one conclusion state it directly
- If language is ar respond entirely in Arabic Gulf dialect. Do NOT mix in English words, acronyms, or Latin letters anywhere — including for technical/business terms. If en respond in English
- Specifically: translate "solo founder" as "مؤسس فردي" — NEVER write the English word "Solo" in Arabic text. This applies to all founder/team descriptors: write "فريق صغير" not "small team", "فريق فردي" not "solo team". Scan your own Arabic output before finalising and replace any remaining English words with their Arabic equivalent.
- You must respond with valid JSON only. No preamble. No explanation. No markdown fences. Pure JSON starting with { and ending with }
- Do NOT include overall_score in your response — it is calculated server-side from your dimension scores
- The "dimensions" object keys MUST be exactly these strings, nothing else: ${VALID_DIMENSION_KEYS.map(k => `"${k}"`).join(', ')}. Any other key name will be silently ignored by the application and will break score calculation.
- Use these score-band definitions consistently across all 6 dimensions:
  0-40 (Critical): fundamental gaps requiring immediate intervention — e.g. no PMF validation, runway under 3 months, solo founder with no delegation capacity, no retention signal.
  41-65 (Needs Attention): foundational elements exist but execution gaps limit growth — e.g. some traction but inconsistent, processes exist but not followed, team aligned on some but not all priorities.
  66-100 (Healthy): this dimension is a genuine strength, not a constraint — e.g. validated PMF, strong team alignment, healthy retention, clear strategic direction.

  JSON structure to follow exactly:
{
  "language": "en",
  "assessed_at": "2026-04-26",
  "business_stage": "early_traction",
  "urgency_level": "normal",
  "overall_summary": "3-4 sentences specific to this founder referencing their actual answers",
  "primary_constraint": {
    "dimension": "team",
    "summary": "specific explanation referencing their answers",
    "urgency": "high"
  },
  "causal_chains": [
    {
      "chain_name": "Velocity Chain",
      "cause_dimension": "team",
      "cause_signal": "specific signal from their answers",
      "symptom_dimensions": ["customer"],
      "fix_order": "Fix team velocity first because..."
    }
  ],
  "dimensions": {
    "revenue":   { "score": 58, "status": "needs_attention", "headline": "specific headline", "diagnosis": "specific diagnosis referencing their answers", "top_actions": ["specific action 1", "specific action 2", "specific action 3"] },
    "product":   { "score": 72, "status": "healthy",         "headline": "specific headline", "diagnosis": "specific diagnosis", "top_actions": ["action 1", "action 2", "action 3"] },
    "team":      { "score": 44, "status": "needs_attention", "headline": "specific headline", "diagnosis": "specific diagnosis", "top_actions": ["action 1", "action 2", "action 3"] },
    "customer":  { "score": 38, "status": "critical",        "headline": "specific headline", "diagnosis": "specific diagnosis", "top_actions": ["action 1", "action 2", "action 3"] },
    "marketing": { "score": 65, "status": "healthy",         "headline": "specific headline", "diagnosis": "specific diagnosis", "top_actions": ["action 1", "action 2", "action 3"] },
    "strategy":  { "score": 70, "status": "healthy",         "headline": "specific headline", "diagnosis": "specific diagnosis", "top_actions": ["action 1", "action 2", "action 3"] }
  },
  "top_3_findings": [
    { "rank": 1, "dimension": "customer", "finding": "specific finding from their answers", "impact": "specific impact" },
    { "rank": 2, "dimension": "team",     "finding": "specific finding", "impact": "specific impact" },
    { "rank": 3, "dimension": "revenue",  "finding": "specific finding", "impact": "specific impact" }
  ],
  "priority_order": [
    { "priority": 1, "action": "specific action", "dimension": "team",     "reason": "why this first", "timeframe": "This week",    "effort": "low",    "impact": "high" },
    { "priority": 2, "action": "specific action", "dimension": "customer", "reason": "why second",    "timeframe": "Next 2 weeks", "effort": "medium", "impact": "high" }
  ],
  "implementation_roadmap": [
    { "priority": 1, "timeframe": "This week",    "action": "specific action", "dimension": "team",     "effort": "low",    "impact": "high" },
    { "priority": 2, "timeframe": "Next 2 weeks", "action": "specific action", "dimension": "customer", "effort": "medium", "impact": "high" }
  ],
  "closing_message": "2-3 sentences personal and directional to this specific founder"
}`

// ── SIGNAL GENERATION — assessment answers → diagnostic signals ──
function generateAssessmentSignals(
  founderId: string,
  assessmentId: string,
  answers: Record<string, string>,
  realNumbers: Record<string, string>,
  tEn: ReturnType<typeof getT>,
  tAr: ReturnType<typeof getT>
): Array<Record<string, unknown>> {
  const signals: Array<Record<string, unknown>> = []
  const now = new Date()
  const periodStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  const periodEnd   = now.toISOString().split('T')[0]

  const base = {
    founder_id:   founderId,
    source_id:    null,
    source:       'manual',
    status:       'new',
    trend:        'new',
    period_start: periodStart,
    period_end:   periodEnd,
    raw_data:     { assessment_id: assessmentId, source: 'assessment' },
  }

  // Parse real numbers
  const mrr       = realNumbers.num_mrr       ? parseFloat(realNumbers.num_mrr.replace(/[^0-9.]/g, ''))       : null
  const cac       = realNumbers.num_cac       ? parseFloat(realNumbers.num_cac.replace(/[^0-9.]/g, ''))       : null
  const ltv       = realNumbers.num_ltv       ? parseFloat(realNumbers.num_ltv.replace(/[^0-9.]/g, ''))       : null
  const churnRate = realNumbers.num_churn     ? parseFloat(realNumbers.num_churn.replace(/[^0-9.]/g, ''))     : null
  const nps       = realNumbers.num_nps       ? parseFloat(realNumbers.num_nps.replace(/[^0-9.]/g, ''))       : null
  const mrrGrowth = realNumbers.num_mrr_growth? parseFloat(realNumbers.num_mrr_growth.replace(/[^0-9.\-]/g, '')): null

  // ── MATHEMATICAL SIGNALS ──

  // LTV < CAC — existential unit economics failure
  if (ltv !== null && cac !== null && ltv < cac) {
    signals.push({ ...base, signal_type: 'churn_spike', dimension: 'revenue', severity: 'critical', confidence_score: 0.92, value: ltv,
      insight_summary: tEn('signals.ltv_below_cac_insight').replace('{ltv}', String(ltv)).replace('{cac}', String(cac)),
      insight_summary_ar: tAr('signals.ltv_below_cac_insight').replace('{ltv}', String(ltv)).replace('{cac}', String(cac)),
      recommended_action: tEn('signals.ltv_below_cac_action'),
      recommended_action_ar: tAr('signals.ltv_below_cac_action'),
      raw_data: { ...base.raw_data, ltv, cac, calculation: 'LTV < CAC' },
    })
  }

  // LTV:CAC ratio < 3:1 — scaling risk
  if (ltv !== null && cac !== null && ltv >= cac && ltv / cac < 3) {
    signals.push({ ...base, signal_type: 'conversion_fall', dimension: 'revenue', severity: 'warning', confidence_score: 0.85, value: parseFloat((ltv / cac).toFixed(2)),
      insight_summary: tEn('signals.ltv_cac_ratio_insight').replace('{ratio}', (ltv / cac).toFixed(1)),
      insight_summary_ar: tAr('signals.ltv_cac_ratio_insight').replace('{ratio}', (ltv / cac).toFixed(1)),
      recommended_action: tEn('signals.ltv_cac_ratio_action'),
      recommended_action_ar: tAr('signals.ltv_cac_ratio_action'),
      raw_data: { ...base.raw_data, ltv, cac, ratio: ltv / cac },
    })
  }

  // High churn
  if (churnRate !== null && churnRate > 5) {
    signals.push({ ...base, signal_type: 'churn_spike', dimension: 'customer', severity: churnRate > 10 ? 'critical' : 'warning', confidence_score: 0.88, value: churnRate,
      insight_summary: tEn('signals.high_churn_insight').replace('{churn}', String(churnRate)).replace('{annual}', String(Math.round(churnRate * 12))),
      insight_summary_ar: tAr('signals.high_churn_insight').replace('{churn}', String(churnRate)).replace('{annual}', String(Math.round(churnRate * 12))),
      recommended_action: tEn('signals.high_churn_action'),
      recommended_action_ar: tAr('signals.high_churn_action'),
      raw_data: { ...base.raw_data, churn_rate: churnRate },
    })
  }

  // Negative or flat MRR growth
  if (mrrGrowth !== null && mrrGrowth <= 0) {
    signals.push({ ...base, signal_type: 'conversion_fall', dimension: 'revenue', severity: mrrGrowth < -5 ? 'critical' : 'warning', confidence_score: 0.85, value: mrrGrowth, change_percent: mrrGrowth,
      insight_summary: (mrrGrowth < 0 ? tEn('signals.mrr_declining_insight') : tEn('signals.mrr_flat_insight')).replace('{growth}', String(mrrGrowth)),
      insight_summary_ar: (mrrGrowth < 0 ? tAr('signals.mrr_declining_insight') : tAr('signals.mrr_flat_insight')).replace('{growth}', String(mrrGrowth)),
      recommended_action: tEn('signals.mrr_growth_action'),
      recommended_action_ar: tAr('signals.mrr_growth_action'),
      raw_data: { ...base.raw_data, mrr_growth: mrrGrowth },
    })
  }

  // Low NPS
  if (nps !== null && nps < 30) {
    signals.push({ ...base, signal_type: 'nps_decline', dimension: 'customer', severity: nps < 0 ? 'critical' : 'warning', confidence_score: 0.85, value: nps,
      insight_summary: tEn('signals.low_nps_insight').replace('{nps}', String(nps)),
      insight_summary_ar: tAr('signals.low_nps_insight').replace('{nps}', String(nps)),
      recommended_action: tEn('signals.low_nps_action'),
      recommended_action_ar: tAr('signals.low_nps_action'),
      raw_data: { ...base.raw_data, nps },
    })
  }

  // ── THRESHOLD SIGNALS ──

  // Critical runway
  if (answers.runway === RUNWAY.UNDER_3) {
    signals.push({ ...base, signal_type: 'conversion_fall', dimension: 'revenue', severity: 'critical', confidence_score: 0.82, value: null,
      insight_summary: tEn('signals.runway_critical_insight'),
      insight_summary_ar: tAr('signals.runway_critical_insight'),
      recommended_action: tEn('signals.runway_critical_action'),
      recommended_action_ar: tAr('signals.runway_critical_action'),
      raw_data: { ...base.raw_data, runway: answers.runway },
    })
  } else if (answers.runway === RUNWAY.R_3_6) {
    signals.push({ ...base, signal_type: 'conversion_fall', dimension: 'revenue', severity: 'warning', confidence_score: 0.78, value: null,
      insight_summary: tEn('signals.runway_3_6_insight'),
      insight_summary_ar: tAr('signals.runway_3_6_insight'),
      recommended_action: tEn('signals.runway_3_6_action'),
      recommended_action_ar: tAr('signals.runway_3_6_action'),
      raw_data: { ...base.raw_data, runway: answers.runway },
    })
  }

  // PMF signal
  if (answers.pmf_reaction === PMF.INDIFFERENT) {
    signals.push({ ...base, signal_type: 'engagement_drop', dimension: 'product', severity: 'critical', confidence_score: 0.78, value: null,
      insight_summary: tEn('signals.pmf_indifferent_insight'),
      insight_summary_ar: tAr('signals.pmf_indifferent_insight'),
      recommended_action: tEn('signals.pmf_indifferent_action'),
      recommended_action_ar: tAr('signals.pmf_indifferent_action'),
      raw_data: { ...base.raw_data, pmf_reaction: answers.pmf_reaction },
    })
  } else if (answers.pmf_reaction === PMF.NOT_ASKED) {
    signals.push({ ...base, signal_type: 'engagement_drop', dimension: 'product', severity: 'watch', confidence_score: 0.65, value: null,
      insight_summary: tEn('signals.pmf_not_validated_insight'),
      insight_summary_ar: tAr('signals.pmf_not_validated_insight'),
      recommended_action: tEn('signals.pmf_not_validated_action'),
      recommended_action_ar: tAr('signals.pmf_not_validated_action'),
      raw_data: { ...base.raw_data, pmf_reaction: answers.pmf_reaction },
    })
  }

  // Team misalignment
  if (answers.team_alignment === TEAM_ALIGNMENT.SERIOUSLY_MISALIGNED) {
    signals.push({ ...base, signal_type: 'velocity_drop', dimension: 'team', severity: 'critical', confidence_score: 0.75, value: null,
      insight_summary: tEn('signals.team_seriously_misaligned_insight'),
      insight_summary_ar: tAr('signals.team_seriously_misaligned_insight'),
      recommended_action: tEn('signals.team_seriously_misaligned_action'),
      recommended_action_ar: tAr('signals.team_seriously_misaligned_action'),
      raw_data: { ...base.raw_data, team_alignment: answers.team_alignment },
    })
  } else if (answers.team_alignment === TEAM_ALIGNMENT.PARTLY_MISALIGNED) {
    signals.push({ ...base, signal_type: 'velocity_drop', dimension: 'team', severity: 'warning', confidence_score: 0.68, value: null,
      insight_summary: tEn('signals.team_partly_misaligned_insight'),
      insight_summary_ar: tAr('signals.team_partly_misaligned_insight'),
      recommended_action: tEn('signals.team_partly_misaligned_action'),
      recommended_action_ar: tAr('signals.team_partly_misaligned_action'),
      raw_data: { ...base.raw_data, team_alignment: answers.team_alignment },
    })
  }

  // Team focus
  if (answers.team_focus === TEAM_FOCUS.OFF_TRACK) {
    signals.push({ ...base, signal_type: 'velocity_drop', dimension: 'team', severity: 'critical', confidence_score: 0.75, value: null,
      insight_summary: tEn('signals.team_focus_off_track_insight'),
      insight_summary_ar: tAr('signals.team_focus_off_track_insight'),
      recommended_action: tEn('signals.team_focus_off_track_action'),
      recommended_action_ar: tAr('signals.team_focus_off_track_action'),
      raw_data: { ...base.raw_data, team_focus: answers.team_focus },
    })
  } else if (answers.team_focus === TEAM_FOCUS.BUSY_UNCLEAR) {
    signals.push({ ...base, signal_type: 'velocity_drop', dimension: 'team', severity: 'warning', confidence_score: 0.68, value: null,
      insight_summary: tEn('signals.team_focus_busy_unclear_insight'),
      insight_summary_ar: tAr('signals.team_focus_busy_unclear_insight'),
      recommended_action: tEn('signals.team_focus_busy_unclear_action'),
      recommended_action_ar: tAr('signals.team_focus_busy_unclear_action'),
      raw_data: { ...base.raw_data, team_focus: answers.team_focus },
    })
  }

  // ICP misalignment
  if (answers.icp_targeting === ICP_TARGETING.MISALIGNED) {
    signals.push({ ...base, signal_type: 'conversion_fall', dimension: 'marketing', severity: 'warning', confidence_score: 0.72, value: null,
      insight_summary: tEn('signals.icp_misaligned_insight'),
      insight_summary_ar: tAr('signals.icp_misaligned_insight'),
      recommended_action: tEn('signals.icp_misaligned_action'),
      recommended_action_ar: tAr('signals.icp_misaligned_action'),
      raw_data: { ...base.raw_data, icp_targeting: answers.icp_targeting },
    })
  }

  // Low referrals
  if (answers.referral_frequency === REFERRAL_FREQUENCY.NEVER) {
    signals.push({ ...base, signal_type: 'nps_decline', dimension: 'customer', severity: 'warning', confidence_score: 0.65, value: null,
      insight_summary: tEn('signals.low_referrals_insight'),
      insight_summary_ar: tAr('signals.low_referrals_insight'),
      recommended_action: tEn('signals.low_referrals_action'),
      recommended_action_ar: tAr('signals.low_referrals_action'),
      raw_data: { ...base.raw_data, referral_frequency: answers.referral_frequency },
    })
  }

  // Process maturity gap
  if (answers.process_maturity === PROCESS_MATURITY.DOCUMENTED_NOT_FOLLOWED) {
    signals.push({ ...base, signal_type: 'repeat_complaint_pattern', dimension: 'team', severity: 'warning', confidence_score: 0.65, value: null,
      insight_summary: tEn('signals.process_not_followed_insight'),
      insight_summary_ar: tAr('signals.process_not_followed_insight'),
      recommended_action: tEn('signals.process_not_followed_action'),
      recommended_action_ar: tAr('signals.process_not_followed_action'),
      raw_data: { ...base.raw_data, process_maturity: answers.process_maturity },
    })
  }

  // ── NEW SIGNAL 1: Solo founder — operational bottleneck + key-person risk ──
  // Solo founders are almost always execution bottlenecks. High  friction,
  // slow velocity, severe key-person risk. Correlates with delivery delays and burnout.
  if (answers.team_size === TEAM_SIZE.SOLO) {
    signals.push({ ...base, signal_type: 'velocity_drop', dimension: 'team', severity: 'warning', confidence_score: 0.80, value: null,
      insight_summary: tEn('signals.solo_founder_insight'),
      insight_summary_ar: tAr('signals.solo_founder_insight'),
      recommended_action: tEn('signals.solo_founder_action'),
      recommended_action_ar: tAr('signals.solo_founder_action'),
      raw_data: { ...base.raw_data, team_size: answers.team_size, signal_origin: 'solo_founder' },
    })
  }

  // ── NEW SIGNAL 2: Technical capacity gap — slow PMF validation, expensive iteration ──
  // Non-technical founders outsourcing 100% of engineering face painfully slow and
  // expensive iteration cycles. This sinks runway before PMF is found.
  if (
    answers.technical_capacity === TECHNICAL_CAPACITY.OUTSOURCED
    
  ) {
    signals.push({ ...base, signal_type: 'velocity_drop', dimension: 'product', severity: 'warning', confidence_score: 0.75, value: null,
      insight_summary: tEn('signals.tech_outsourced_insight'),
      insight_summary_ar: tAr('signals.tech_outsourced_insight'),
      recommended_action: tEn('signals.tech_outsourced_action'),
      recommended_action_ar: tAr('signals.tech_outsourced_action'),
      raw_data: { ...base.raw_data, technical_capacity: answers.technical_capacity, signal_origin: 'no_technical_capacity' },
    })
  } else if (answers.technical_capacity === TECHNICAL_CAPACITY.LIMITED_TECH) {
    signals.push({ ...base, signal_type: 'velocity_drop', dimension: 'product', severity: 'watch', confidence_score: 0.65, value: null,
      insight_summary: tEn('signals.tech_limited_insight'),
      insight_summary_ar: tAr('signals.tech_limited_insight'),
      recommended_action: tEn('signals.tech_limited_action'),
      recommended_action_ar: tAr('signals.tech_limited_action'),
      raw_data: { ...base.raw_data, technical_capacity: answers.technical_capacity, signal_origin: 'limited_technical_capacity' },
    })
  }

  // ── NEW SIGNAL 3: Pricing confidence — over-discounting, weak value prop, wrong ICP ──
  // Low pricing confidence means the founder is over-discounting to win deals.
  // Directly impacts LTV, CAC payback period, and gross margin. Lagging indicator
  // of weak value proposition or targeting the wrong ICP.
  const pricingScore = parseInt(answers.pricing_confidence ?? '0')
  if (pricingScore > 0 && pricingScore <= 2) {
    signals.push({ ...base, signal_type: 'conversion_fall', dimension: 'revenue',
      severity: pricingScore === 1 ? 'critical' : 'warning',
      confidence_score: 0.75, value: pricingScore,
      insight_summary: tEn('signals.pricing_low_insight').replace('{score}', String(pricingScore)),
      insight_summary_ar: tAr('signals.pricing_low_insight').replace('{score}', String(pricingScore)),
      recommended_action: tEn('signals.pricing_low_action'),
      recommended_action_ar: tAr('signals.pricing_low_action'),
      raw_data: { ...base.raw_data, pricing_confidence: pricingScore, signal_origin: 'pricing_confidence_low' },
    })
  } else if (pricingScore === 3) {
    signals.push({ ...base, signal_type: 'conversion_fall', dimension: 'revenue',
      severity: 'watch', confidence_score: 0.60, value: pricingScore,
      insight_summary: tEn('signals.pricing_medium_insight'),
      insight_summary_ar: tAr('signals.pricing_medium_insight'),
      recommended_action: tEn('signals.pricing_medium_action'),
      recommended_action_ar: tAr('signals.pricing_medium_action'),
      raw_data: { ...base.raw_data, pricing_confidence: pricingScore, signal_origin: 'pricing_confidence_medium' },
    })
  }

  return signals
}

function buildEmailHtml(diagnosis: Record<string, unknown>, founderEmail: string, founderFirstName: string): string {
  const dims     = diagnosis.dimensions as Record<string, { score: number; status: string; headline: string }>
  const findings = diagnosis.top_3_findings as Array<{ rank: number; finding: string; impact: string }>
  const primary  = diagnosis.primary_constraint as { dimension: string; summary: string }
  const roadmap  = diagnosis.priority_order as Array<{ priority: number; action: string; timeframe: string }>

  const scoreColor = (s: number) => s >= 66 ? '#059669' : s >= 41 ? '#D97706' : '#DC2626'
  const dimLabel: Record<string, string> = {
    revenue:   'Revenue Engine',
    product:   'Product-Market Fit',
    team:      'Execution Capacity',
    customer:  'Customer Health',
    marketing: 'Growth & Acquisition',
    strategy:  'Strategic Clarity',
  }

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F9FAFB;font-family:Inter,Arial,sans-serif">
<div style="max-width:600px;margin:0 auto;padding:32px 16px">
  <div style="text-align:center;margin-bottom:32px">
    <h1 style="font-size:28px;font-weight:800;color:#2563EB;margin:0">Elvanis</h1>
    <p style="color:#6B7280;font-size:14px;margin:4px 0 0">Your Business Health Report</p>
  </div>
  <div style="background:#fff;border-radius:16px;border:1px solid #E5E7EB;padding:32px;margin-bottom:20px;text-align:center">
    <p style="font-size:12px;font-weight:600;color:#6B7280;text-transform:uppercase;margin:0 0 8px">Overall Health Score</p>
    <div style="font-size:72px;font-weight:800;color:#111827;line-height:1">${diagnosis.overall_score}<span style="font-size:28px;color:#9CA3AF">/100</span></div>
    <p style="font-weight:600;color:#374151;margin:12px 0 8px">${({ 'assessment.status_healthy': 'Healthy', 'assessment.status_needs_attention': 'Needs Attention', 'assessment.status_at_risk': 'At Risk', 'assessment.status_critical': 'Critical', 'Healthy': 'Healthy', 'Needs Attention': 'Needs Attention', 'At Risk': 'At Risk', 'Critical': 'Critical' })[diagnosis.overall_status as string] ?? diagnosis.overall_status}</p>
    <p style="color:#6B7280;font-size:15px;line-height:1.6;margin:0">${diagnosis.overall_summary}</p>
  </div>
  <div style="background:#FEF2F2;border:1px solid #FECACA;border-radius:16px;padding:24px;margin-bottom:20px">
    <p style="font-size:12px;font-weight:700;color:#DC2626;text-transform:uppercase;margin:0 0 8px">⚡ Primary Constraint</p>
    <p style="color:#1F2937;font-size:15px;line-height:1.65;margin:0">${primary?.summary ?? ''}</p>
  </div>
  <div style="background:#fff;border-radius:16px;border:1px solid #E5E7EB;padding:24px;margin-bottom:20px">
    <h3 style="font-size:16px;font-weight:700;color:#111827;margin:0 0 20px">Health by Dimension</h3>
    ${Object.entries(dims ?? {}).map(([key, dim]) => `
    <div style="margin-bottom:16px">
      <div style="display:flex;justify-content:space-between;margin-bottom:4px">
        <span style="font-size:13px;font-weight:600;color:#374151">${dimLabel[key] ?? key}</span>
        <span style="font-size:16px;font-weight:800;color:${scoreColor(dim.score)}">${dim.score}</span>
      </div>
      <div style="height:6px;background:#F3F4F6;border-radius:99px">
        <div style="height:6px;background:${scoreColor(dim.score)};border-radius:99px;width:${dim.score}%"></div>
      </div>
      <p style="font-size:12px;color:#6B7280;margin:4px 0 0">${dim.headline}</p>
    </div>`).join('')}
  </div>
  <div style="background:#fff;border-radius:16px;border:1px solid #E5E7EB;padding:24px;margin-bottom:20px">
    <h3 style="font-size:16px;font-weight:700;color:#111827;margin:0 0 20px">Top 3 Findings</h3>
    ${(findings ?? []).map(f => `
    <div style="display:flex;gap:12px;margin-bottom:14px">
      <div style="width:26px;height:26px;background:#EFF6FF;border-radius:50%;text-align:center;line-height:26px;font-size:12px;font-weight:800;color:#2563EB;flex-shrink:0">${f.rank}</div>
      <div>
        <p style="font-weight:600;color:#1F2937;font-size:14px;margin:0 0 3px">${f.finding}</p>
        <p style="color:#6B7280;font-size:12px;margin:0">${f.impact}</p>
      </div>
    </div>`).join('')}
  </div>
  <div style="background:#fff;border-radius:16px;border:1px solid #E5E7EB;padding:24px;margin-bottom:20px">
    <h3 style="font-size:16px;font-weight:700;color:#111827;margin:0 0 20px">Your Priority Actions</h3>
    ${(roadmap ?? []).map(r => `
    <div style="display:flex;gap:12px;margin-bottom:12px">
      <div style="width:26px;height:26px;background:#2563EB;border-radius:50%;text-align:center;line-height:26px;font-size:12px;font-weight:800;color:#fff;flex-shrink:0">${r.priority}</div>
      <div>
        <p style="font-weight:600;color:#1F2937;font-size:14px;margin:0 0 2px">${r.action}</p>
        <p style="color:#9CA3AF;font-size:12px;margin:0">${r.timeframe}</p>
      </div>
    </div>`).join('')}
  </div>
  <div style="background:#EFF6FF;border-radius:16px;padding:24px;margin-bottom:24px">
    <p style="color:#1D4ED8;font-size:15px;line-height:1.7;margin:0;font-style:italic">${diagnosis.closing_message}</p>
  </div>
  <div style="text-align:center;margin-bottom:32px">
    <a href="${process.env.NEXT_PUBLIC_APP_URL ?? ''}/" style="display:inline-block;padding:14px 36px;background:#2563EB;color:#fff;font-weight:700;border-radius:12px;text-decoration:none;font-size:16px">View full dashboard →</a>
  </div>
  <div style="text-align:center;border-top:1px solid #E5E7EB;padding-top:20px">
    <p style="color:#9CA3AF;font-size:12px;margin:0">Elvanis · Know what to fix before you scale</p>
    <p style="color:#9CA3AF;font-size:12px;margin:4px 0 0">${founderEmail}</p>
  </div>
</div>
</body>
</html>`
}

export async function POST(request: NextRequest) {
  try {
    const { assessmentId, founderId, answers, realNumbers, language, founderStage, founderMarket, founderIndustry, founderIndustryOther, founderBrandUrl } = await request.json()
    console.log('[score] called — founder:', founderId, 'stage:', founderStage)

    // ── AUTH GUARD — verify caller owns founderId ──
    const supabase = createAdminClient()
    const { data: founder } = await supabase
      .from('founders')
      .select('email, full_name, user_id, founder_stage')
      .eq('id', founderId)
      .maybeSingle()

    if (!founder) {
      console.error('[score] founder not found:', founderId)
      return NextResponse.json({ error: 'Founder not found' }, { status: 404 })
    }

    const safeRealNumbers = realNumbers && typeof realNumbers === 'object' ? realNumbers : {}

    // ── COMPLETENESS SCORE — deterministic, server-side ──
    const ALL_QUESTION_IDS = [
      'founder_stage', 'business_model', 'investment_status', 'team_size', 'technical_capacity', 'analytics_maturity', 'execution_blocker',
      'biggest_problem_now', 'runway', 'win_reason', 'pricing_confidence', 'financial_concern', 'pmf_reaction', 'icp_alignment', 'icp_targeting', 'ideal_customer',
      'already_tried', 'target_90_days', 'team_alignment', 'bug_process', 'churn_reason', 'customer_complaint', 'referral_frequency', 'avoided_decision', 'team_focus', 'success_12m', 'process_maturity',
    ]
    const THIN_TEXT_IDS  = ['ideal_customer', 'biggest_problem_now', 'already_tried', 'target_90_days']
    const THIN_THRESHOLD = 10
    const safeAnswers = answers && typeof answers === 'object' ? answers : {}
    let completeCount = 0
    for (const qid of ALL_QUESTION_IDS) {
      const val = (safeAnswers[qid] ?? '').toString().trim()
      if (!val) continue
      if (THIN_TEXT_IDS.includes(qid) && val.length < THIN_THRESHOLD) continue
      completeCount++
    }
    const completenessScore = Math.round((completeCount / ALL_QUESTION_IDS.length) * 100)
    console.log(`[score] completeness: ${completeCount}/${ALL_QUESTION_IDS.length} = ${completenessScore}%`)
    const realMetrics = Object.entries(safeRealNumbers)
      .filter(([, v]) => v)
      .map(([k, v]) => `${k}: ${v}`)
      .join('\n') || 'None provided'

    // Resolve industry label — use industry_other for 'Other' founders
    const industryLabel = founderIndustry === 'Other' && founderIndustryOther
      ? `Other (${founderIndustryOther})`
      : founderIndustry || 'Not specified'

    const userPrompt = `Analyse this business and produce a complete health diagnosis.

FOUNDER BUSINESS CONTEXT (use this to personalise every insight):
Industry: ${industryLabel}
Market: ${founderMarket || 'Not specified'}
Stage: ${founderStage === 'product_customers' ? 'Product with customers' : 'Early stage / pre-revenue'}
Website: ${founderBrandUrl || 'Not provided'}

FOUNDER ANSWERS:
${Object.entries(answers).map(([k, v]) => `${k}: ${v}`).join('\n')}

REAL METRICS PROVIDED BY FOUNDER (treat as ground truth):
${realMetrics}

Language: ${language}

Every insight, diagnosis, and recommendation must reference this specific industry and market context. Do NOT give generic advice.
Respond with JSON only. Do NOT include overall_score — it is calculated server-side.`

    console.log('[score] calling Groq...')

    const response = await groq.chat.completions.create({
      model:               'llama-3.3-70b-versatile',
      max_tokens:          4000,
      temperature:         0.3,
      response_format:     { type: 'json_object' },
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user',   content: userPrompt },
      ],
    })

    const text = response.choices[0]?.message?.content ?? ''
    console.log('[score] Groq response preview:', text.substring(0, 200))

    // response_format guarantees valid JSON — strip leading prose if any
    const firstBrace = text.indexOf('{')
    const cleaned    = firstBrace > 0 ? text.substring(firstBrace) : text

    let diagnosis: Record<string, unknown>
    try {
      diagnosis = JSON.parse(cleaned)
    } catch (parseErr) {
      console.error('[score] JSON parse error:', parseErr)
      console.error('[score] Full text:', text)
      return NextResponse.json({ error: 'Invalid JSON from AI' }, { status: 500 })
    }

      // ── DUAL-LANGUAGE TRANSLATION — second small call for summary/findings/closing ──
      const altLanguage = (diagnosis.language as string) === 'ar' ? 'en' : 'ar'
      let overallSummaryAlt: string | null = null
      let top3FindingsAlt: unknown = null
      let closingMessageAlt: string | null = null
      let primaryConstraintSummaryAlt: string | null = null
      let priorityOrderAlt: unknown = null
      let causalChainsAlt: unknown = null
      let isTranslated = false
      try {
        const translatePrompt = `Translate the following JSON fields from ${diagnosis.language} to ${altLanguage}. Preserve business tone and meaning exactly. If translating to Arabic, use Gulf Arabic dialect, and do NOT mix in any English words or Latin letters. Respond with valid JSON only, same structure, no preamble.
  
  ${JSON.stringify({
    overall_summary:            diagnosis.overall_summary,
    top_3_findings:             (diagnosis.top_3_findings as Array<Record<string, unknown>>)?.map(f => ({ finding: f.finding, impact: f.impact })),
    closing_message:            diagnosis.closing_message,
    primary_constraint_summary: (diagnosis.primary_constraint as Record<string, string>)?.summary ?? '',
    causal_chains:              (diagnosis.causal_chains as Array<Record<string, unknown>>)?.map(c => ({ chain_name: c.chain_name, cause_signal: c.cause_signal, fix_order: c.fix_order })),
    priority_order:             (diagnosis.priority_order as Array<Record<string, unknown>>)?.map(p => ({ action: p.action, reason: p.reason })),
        })}`
  
        const translateResponse = await groq.chat.completions.create({
          model:            'llama-3.1-8b-instant',
          max_tokens:      4000,
          temperature:     0.3,
          response_format: { type: 'json_object' },
          messages: [
            { role: 'system', content: 'You are a professional business translator. Output valid JSON only.' },
            { role: 'user',   content: translatePrompt },
          ],
        })
        const translateText = translateResponse.choices[0]?.message?.content ?? ''
        const tFirstBrace   = translateText.indexOf('{')
        const tCleaned      = tFirstBrace > 0 ? translateText.substring(tFirstBrace) : translateText
        const translated    = JSON.parse(tCleaned)
        overallSummaryAlt = translated.overall_summary ?? null
        const translatedFindings = translated.top_3_findings
        top3FindingsAlt = translatedFindings
          ? (diagnosis.top_3_findings as Array<Record<string, unknown>>).map((orig, i) => ({
              ...orig,
              finding: translatedFindings[i]?.finding ?? orig.finding,
              impact:  translatedFindings[i]?.impact  ?? orig.impact,
            }))
          : null
        closingMessageAlt = translated.closing_message ?? null
        primaryConstraintSummaryAlt = translated.primary_constraint_summary ?? null
        const translatedPriority = translated.priority_order
        const translatedChains = translated.causal_chains
        causalChainsAlt = translatedChains
          ? (diagnosis.causal_chains as Array<Record<string, unknown>>).map((orig, i) => ({
              ...orig,
              chain_name:   translatedChains[i]?.chain_name   ?? orig.chain_name,
              cause_signal: translatedChains[i]?.cause_signal ?? orig.cause_signal,
              fix_order:    translatedChains[i]?.fix_order    ?? orig.fix_order,
            }))
          : null
          priorityOrderAlt = translatedPriority
          ? (diagnosis.priority_order as Array<Record<string, unknown>>).map((orig, i) => ({
              ...orig,
              action: translatedPriority[i]?.action ?? orig.action,
              reason: translatedPriority[i]?.reason ?? orig.reason,
            }))
          : null
          isTranslated = !!(overallSummaryAlt && top3FindingsAlt && closingMessageAlt && primaryConstraintSummaryAlt && priorityOrderAlt && causalChainsAlt)
        console.log(`[score] translation to ${altLanguage}: ${isTranslated ? 'success' : 'partial/failed'}`)
      } catch (translateErr) {
        console.error('[score] translation call failed (non-fatal):', translateErr)
      }  
    
    // ── SERVER-SIDE SCORE CALCULATION — deterministic, never delegated to AI ──
    // Use founder's actual stage from request (passed from founders table)
    // Fall back to AI's business_stage only if not provided, then to early_stage default
    const stageFromRequest = founderStage ?? founder.founder_stage ?? 'early_stage'
    const stageKey = stageFromRequest === 'product_customers' ? 'product_customers' : 'early_stage'
    const weights  = WEIGHT_MATRICES[stageKey]

        // Defensive: only accept dimension keys that exist in gravity-engine.ts.
    // Protects against Groq drifting back to legacy long-form key names.
    const aiDimsRaw = diagnosis.dimensions as Record<string, { score: number }> ?? {}
    const aiDims: Record<string, { score: number }> = {}
    for (const key of VALID_DIMENSION_KEYS) {
      if (aiDimsRaw[key]) aiDims[key] = aiDimsRaw[key]
    }
    const scoreRevenue   = aiDims?.revenue?.score   ?? 0
    const scorePmf       = aiDims?.product?.score   ?? 0
    const scoreTeam      = aiDims?.team?.score      ?? 0
    const scoreCustomer  = aiDims?.customer?.score  ?? 0
    const scoreMarketing = aiDims?.marketing?.score ?? 0
    const scoreStrategy  = aiDims?.strategy?.score  ?? 0

    const trueOverallScore = Math.round(
      (scoreRevenue   * weights.revenue)   +
      (scorePmf       * weights.product)   +
      (scoreTeam      * weights.team)      +
      (scoreCustomer  * weights.customer)  +
      (scoreMarketing * weights.marketing) +
      (scoreStrategy  * weights.strategy)
    )

    // Inject calculated score — overrides any AI-generated score
    diagnosis.overall_score  = trueOverallScore
    diagnosis.overall_status = getOverallStatus(trueOverallScore)

    console.log(`[score] calculated score for stage=${stageKey}: ${trueOverallScore}/100 status=${diagnosis.overall_status}`)

    // ── URGENCY LEVEL NORMALISATION ──
    const urgencyRaw = (diagnosis.urgency_level as string)?.toLowerCase() ?? 'normal'
    const urgencyMap: Record<string, string> = {
      normal: 'normal', elevated: 'elevated', critical: 'critical', survival: 'survival',
      high: 'elevated', urgent: 'critical', severe: 'critical', low: 'normal',
    }
    const urgencyNorm = urgencyMap[urgencyRaw]
    if (!urgencyNorm) {
      console.warn(`[score] unexpected urgency_level: "${urgencyRaw}" — defaulting to normal`)
    }
    const urgencyLevel = urgencyNorm ?? 'normal'

    // ── SAVE TO DATABASE ──
    console.log('[score] saving to database...')
    const { error: dbError } = await supabase.from('scores').insert({
      assessment_id:                assessmentId,
      founder_id:                   founderId,
      language:                     diagnosis.language as string,
      business_stage:               stageKey,
      urgency_level:                urgencyLevel,
      overall_score:                trueOverallScore,
      overall_status:               ({ 'assessment.status_healthy': 'Healthy', 'assessment.status_needs_attention': 'Needs Attention', 'assessment.status_at_risk': 'At Risk', 'assessment.status_critical': 'Critical' })[diagnosis.overall_status as string] ?? diagnosis.overall_status as string,
      completeness_score:           completenessScore,
      overall_summary:              diagnosis.overall_summary as string,
      overall_summary_alt:          overallSummaryAlt,
      closing_message:              diagnosis.closing_message as string,
      closing_message_alt:          closingMessageAlt,
      top_3_findings:               diagnosis.top_3_findings,
      top_3_findings_alt:           top3FindingsAlt,
      primary_constraint_dimension: (diagnosis.primary_constraint as Record<string, string>)?.dimension,
      primary_constraint_summary:   (diagnosis.primary_constraint as Record<string, string>)?.summary,
      primary_constraint_summary_alt: primaryConstraintSummaryAlt,
      primary_constraint_urgency:   (diagnosis.primary_constraint as Record<string, string>)?.urgency,
      causal_chains:                diagnosis.causal_chains,
      causal_chains_alt:            causalChainsAlt,
      priority_order:               diagnosis.priority_order,
      priority_order_alt:           priorityOrderAlt,
      alt_language:                 altLanguage,
      is_translated:                isTranslated,
      score_revenue:                scoreRevenue,
      score_pmf:                    scorePmf,
      score_team:                   scoreTeam,
      score_customer:               scoreCustomer,
      score_marketing:              scoreMarketing,
      score_strategy:               scoreStrategy,
      label_revenue:   (diagnosis.dimensions as Record<string, Record<string, string>>)?.revenue?.status,
      label_pmf:       (diagnosis.dimensions as Record<string, Record<string, string>>)?.product?.status,
      label_team:      (diagnosis.dimensions as Record<string, Record<string, string>>)?.team?.status,
      label_customer:  (diagnosis.dimensions as Record<string, Record<string, string>>)?.customer?.status,
      label_marketing: (diagnosis.dimensions as Record<string, Record<string, string>>)?.marketing?.status,
      label_strategy:  (diagnosis.dimensions as Record<string, Record<string, string>>)?.strategy?.status,
      implementation_roadmap:   diagnosis.implementation_roadmap,
      raw_ai_response:          diagnosis,
    })

    if (dbError) {
      console.error('[score] database error:', dbError)
      return NextResponse.json({ error: dbError.message }, { status: 500 })
    }

    // ── GENERATE ASSESSMENT SIGNALS ──
    console.log('[score] generating assessment signals...')
    const tEn = getT('en')
    const tAr = getT('ar')
    const assessmentSignals = generateAssessmentSignals(founderId, assessmentId, answers, safeRealNumbers, tEn, tAr)
    if (assessmentSignals.length > 0) {
      const { data: existingManual } = await supabase
        .from('diagnostic_signals')
        .select('id, signal_type, value, change_percent')
        .eq('founder_id', founderId)
        .eq('source', 'manual')
        .eq('status', 'new')

      const existingMap = new Map(existingManual?.map(s => [s.signal_type, s]) ?? [])

      for (const signal of assessmentSignals) {
        const prev = existingMap.get(signal.signal_type as string)
        if (prev) {
          let trend = 'unchanged'
          if (prev.value !== null && prev.value !== undefined && signal.value !== null && signal.value !== undefined) {
            if (Number(signal.value) < Number(prev.value)) trend = 'improving'
            else if (Number(signal.value) > Number(prev.value)) trend = 'worsening'
          }
          await supabase.from('diagnostic_signals').update({
            ...signal,
            previous_value:         prev.value ?? null,
            previous_change_percent: prev.change_percent ?? null,
            trend,
            updated_at: new Date().toISOString(),
          }).eq('id', prev.id)
        } else {
          await supabase.from('diagnostic_signals').insert(signal)
        }
      }
      // Hard-delete stale manual signals not regenerated this run — fully re-derivable from assessments/scores history
      const generatedTypes = new Set(assessmentSignals.map(s => s.signal_type as string))
      for (const [signalType, prev] of existingMap) {
        if (!generatedTypes.has(signalType)) {
          await supabase.from('diagnostic_signals').delete().eq('id', prev.id)
        }
      }

      // Confirm assessment signals against live source signals
      const { data: liveSignals } = await supabase
        .from('diagnostic_signals')
        .select('signal_type, source')
        .eq('founder_id', founderId)
        .eq('status', 'new')
        .neq('source', 'manual')

      if (liveSignals && liveSignals.length > 0) {
        const liveTypes = new Map(liveSignals.map(s => [s.signal_type, s.source]))
        for (const signal of assessmentSignals) {
          const confirmedBy = liveTypes.get(signal.signal_type as string)
          if (confirmedBy) {
            await supabase
              .from('diagnostic_signals')
              .update({
                confidence_score: Math.min((signal.confidence_score as number) + 0.1, 0.95),
                raw_data: {
                  ...(signal.raw_data as Record<string, unknown>),
                  confirmed_by:      confirmedBy,
                  confirmation_note: `Confirmed by ${confirmedBy} data`,
                },
              })
              .eq('founder_id', founderId)
              .eq('source', 'manual')
              .eq('signal_type', signal.signal_type as string)
              .eq('status', 'new')
          }
        }
      }

      console.log(`[score] ${assessmentSignals.length} signals generated`)
    }

    // ── SEND EMAIL ──
    if (founder?.email) {
      const founderFirstName = (founder.full_name as string)?.split(' ')[0] ?? 'Founder'
      const { error: emailError } = await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL ?? 'onboarding@resend.dev',
        to:      founder.email as string,
        subject: `${founderFirstName} — your Elvanis diagnosis is ready (Score: ${trueOverallScore}/100)`,
        html:    buildEmailHtml(diagnosis, founder.email as string, founderFirstName),
      })
      if (emailError) console.error('[score] email error:', emailError)
      else console.log('[score] email sent to', founder.email)
    }

    return NextResponse.json({ success: true, overall_score: trueOverallScore })

  } catch (err) {
    console.error('[score] unexpected error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}