import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import Groq from 'groq-sdk'
import { Resend } from 'resend'

const groq   = new Groq({ apiKey: process.env.GROQ_API_KEY })
const resend = new Resend(process.env.RESEND_API_KEY)

// ── WEIGHT MATRICES — server-side, deterministic, never delegated to AI ──
// AI scores each dimension independently. Server applies weights and calculates overall_score.
// Each matrix validated to sum exactly 1.00
const WEIGHT_MATRICES: Record<string, Record<string, number>> = {
  early_stage: {
    revenue_financial:  0.15,
    product_market_fit: 0.30, // PMF is the core question for pre-product founders
    team_operations:    0.20,
    customer_retention: 0.10,
    marketing_growth:   0.10, // Find PMF before scaling marketing
    strategy_goals:     0.15, // Strategy clarity matters more than marketing early
  },
  product_customers: {
    revenue_financial:  0.25,
    product_market_fit: 0.20,
    team_operations:    0.20, // Ops pressure grows with customer load
    customer_retention: 0.20,
    marketing_growth:   0.07,
    strategy_goals:     0.08,
  },
}

// ── STATUS LABELS — deterministic, matching dashboard pattern ──
function getOverallStatus(score: number): string {
  if (score >= 80) return 'Healthy'
  if (score >= 60) return 'Needs Attention'
  if (score >= 40) return 'At Risk'
  return 'Critical'
}

const SYSTEM_PROMPT = `You are Elvanis, an expert AI business health advisor for founder-led startups and SMEs in the UK and Gulf. Diagnose why the business is not growing and identify root causes not just symptoms.

RULES:
- Every insight must reference the founder specific answers directly
- Never give generic advice — be specific to their situation
- When data clearly points to one conclusion state it directly
- If language is ar respond entirely in Arabic Gulf dialect. If en respond in English
- You must respond with valid JSON only. No preamble. No explanation. No markdown fences. Pure JSON starting with { and ending with }
- Do NOT include overall_score in your response — it is calculated server-side from your dimension scores

JSON structure to follow exactly:
{
  "language": "en",
  "assessed_at": "2026-04-26",
  "business_stage": "early_traction",
  "urgency_level": "normal",
  "overall_summary": "3-4 sentences specific to this founder referencing their actual answers",
  "primary_constraint": {
    "dimension": "team_operations",
    "summary": "specific explanation referencing their answers",
    "urgency": "high"
  },
  "causal_chains": [
    {
      "chain_name": "Velocity Chain",
      "cause_dimension": "team_operations",
      "cause_signal": "specific signal from their answers",
      "symptom_dimensions": ["customer_retention"],
      "fix_order": "Fix team velocity first because..."
    }
  ],
  "dimensions": {
    "revenue_financial":  { "score": 58, "status": "needs_attention", "headline": "specific headline", "diagnosis": "specific diagnosis referencing their answers", "top_actions": ["specific action 1", "specific action 2", "specific action 3"] },
    "product_market_fit": { "score": 72, "status": "healthy",         "headline": "specific headline", "diagnosis": "specific diagnosis", "top_actions": ["action 1", "action 2", "action 3"] },
    "team_operations":    { "score": 44, "status": "needs_attention", "headline": "specific headline", "diagnosis": "specific diagnosis", "top_actions": ["action 1", "action 2", "action 3"] },
    "customer_retention": { "score": 38, "status": "critical",        "headline": "specific headline", "diagnosis": "specific diagnosis", "top_actions": ["action 1", "action 2", "action 3"] },
    "marketing_growth":   { "score": 65, "status": "healthy",         "headline": "specific headline", "diagnosis": "specific diagnosis", "top_actions": ["action 1", "action 2", "action 3"] },
    "strategy_goals":     { "score": 70, "status": "healthy",         "headline": "specific headline", "diagnosis": "specific diagnosis", "top_actions": ["action 1", "action 2", "action 3"] }
  },
  "top_3_findings": [
    { "rank": 1, "dimension": "customer_retention", "finding": "specific finding from their answers", "impact": "specific impact" },
    { "rank": 2, "dimension": "team_operations",    "finding": "specific finding", "impact": "specific impact" },
    { "rank": 3, "dimension": "revenue_financial",  "finding": "specific finding", "impact": "specific impact" }
  ],
  "priority_order": [
    { "priority": 1, "action": "specific action", "dimension": "team_operations",    "reason": "why this first", "timeframe": "This week",    "effort": "low",    "impact": "high" },
    { "priority": 2, "action": "specific action", "dimension": "customer_retention", "reason": "why second",    "timeframe": "Next 2 weeks", "effort": "medium", "impact": "high" }
  ],
  "implementation_roadmap": [
    { "priority": 1, "timeframe": "This week",    "action": "specific action", "dimension": "team_operations",    "effort": "low",    "impact": "high" },
    { "priority": 2, "timeframe": "Next 2 weeks", "action": "specific action", "dimension": "customer_retention", "effort": "medium", "impact": "high" }
  ],
  "closing_message": "2-3 sentences personal and directional to this specific founder"
}`

// ── SIGNAL GENERATION — assessment answers → diagnostic signals ──
function generateAssessmentSignals(
  founderId: string,
  assessmentId: string,
  answers: Record<string, string>,
  realNumbers: Record<string, string>
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
      insight_summary: `Customer lifetime value (£${ltv}) is lower than acquisition cost (£${cac}) — losing money on every customer acquired`,
      recommended_action: 'Immediately review pricing and retention strategy — current unit economics are unsustainable',
      raw_data: { ...base.raw_data, ltv, cac, calculation: 'LTV < CAC' },
    })
  }

  // LTV:CAC ratio < 3:1 — scaling risk
  if (ltv !== null && cac !== null && ltv >= cac && ltv / cac < 3) {
    signals.push({ ...base, signal_type: 'conversion_fall', dimension: 'revenue', severity: 'warning', confidence_score: 0.85, value: parseFloat((ltv / cac).toFixed(2)),
      insight_summary: `LTV:CAC ratio is ${(ltv / cac).toFixed(1)}:1 — healthy SaaS requires at least 3:1 to scale profitably`,
      recommended_action: 'Focus on increasing retention and reducing acquisition costs before scaling spend',
      raw_data: { ...base.raw_data, ltv, cac, ratio: ltv / cac },
    })
  }

  // High churn
  if (churnRate !== null && churnRate > 5) {
    signals.push({ ...base, signal_type: 'churn_spike', dimension: 'customer', severity: churnRate > 10 ? 'critical' : 'warning', confidence_score: 0.88, value: churnRate,
      insight_summary: `Monthly churn of ${churnRate}% means losing approximately ${Math.round(churnRate * 12)}% of customers annually`,
      recommended_action: 'Identify top 3 churn reasons and build a 30-day intervention plan for at-risk customers',
      raw_data: { ...base.raw_data, churn_rate: churnRate },
    })
  }

  // Negative or flat MRR growth
  if (mrrGrowth !== null && mrrGrowth <= 0) {
    signals.push({ ...base, signal_type: 'conversion_fall', dimension: 'revenue', severity: mrrGrowth < -5 ? 'critical' : 'warning', confidence_score: 0.85, value: mrrGrowth, change_percent: mrrGrowth,
      insight_summary: `MRR growth is ${mrrGrowth}% — revenue is ${mrrGrowth < 0 ? 'declining' : 'flat'} which signals a growth problem`,
      recommended_action: 'Audit your acquisition funnel and identify where leads are dropping off',
      raw_data: { ...base.raw_data, mrr_growth: mrrGrowth },
    })
  }

  // Low NPS
  if (nps !== null && nps < 30) {
    signals.push({ ...base, signal_type: 'nps_decline', dimension: 'customer', severity: nps < 0 ? 'critical' : 'warning', confidence_score: 0.85, value: nps,
      insight_summary: `NPS of ${nps} indicates more detractors than promoters — customers unlikely to recommend your product`,
      recommended_action: 'Survey detractors directly to understand the top 3 reasons for dissatisfaction',
      raw_data: { ...base.raw_data, nps },
    })
  }

  // ── THRESHOLD SIGNALS ──

  // Critical runway
  if (answers.runway === 'Less than 3 months') {
    signals.push({ ...base, signal_type: 'conversion_fall', dimension: 'revenue', severity: 'critical', confidence_score: 0.82, value: null,
      insight_summary: 'Less than 3 months of runway — business faces immediate existential risk without revenue growth or new funding',
      recommended_action: 'Focus exclusively on revenue-generating activities and cut all non-essential costs this week',
      raw_data: { ...base.raw_data, runway: answers.runway },
    })
  } else if (answers.runway === '3–6 months') {
    signals.push({ ...base, signal_type: 'conversion_fall', dimension: 'revenue', severity: 'warning', confidence_score: 0.78, value: null,
      insight_summary: '3–6 months of runway — limited time to prove growth before needing to fundraise or reach profitability',
      recommended_action: 'Define your key revenue milestone for the next 90 days and work backwards to weekly targets',
      raw_data: { ...base.raw_data, runway: answers.runway },
    })
  }

  // PMF signal
  if (answers.pmf_reaction === 'Indifferent — would move on quickly') {
    signals.push({ ...base, signal_type: 'engagement_drop', dimension: 'product', severity: 'critical', confidence_score: 0.78, value: null,
      insight_summary: 'Customers report they would be indifferent if your product disappeared — strong signal of weak product-market fit',
      recommended_action: 'Run 10 customer interviews this week to understand what job they are actually hiring your product to do',
      raw_data: { ...base.raw_data, pmf_reaction: answers.pmf_reaction },
    })
  } else if (answers.pmf_reaction === 'Not sure — have not asked them') {
    signals.push({ ...base, signal_type: 'engagement_drop', dimension: 'product', severity: 'watch', confidence_score: 0.65, value: null,
      insight_summary: 'Product-market fit has not been validated — you do not know if customers would miss your product',
      recommended_action: 'Run the Sean Ellis PMF survey with your top 20 customers this week',
      raw_data: { ...base.raw_data, pmf_reaction: answers.pmf_reaction },
    })
  }

  // Team misalignment
  if (answers.team_alignment === 'Seriously misaligned — frequent conflict') {
    signals.push({ ...base, signal_type: 'velocity_drop', dimension: 'team', severity: 'critical', confidence_score: 0.75, value: null,
      insight_summary: 'Serious misalignment between tech and business teams — frequent conflict is slowing execution and delivery',
      recommended_action: 'Hold a 2-hour priority alignment session this week — agree on top 3 priorities for next 30 days and stop everything else',
      raw_data: { ...base.raw_data, team_alignment: answers.team_alignment },
    })
  } else if (answers.team_alignment === 'Partly misaligned') {
    signals.push({ ...base, signal_type: 'velocity_drop', dimension: 'team', severity: 'warning', confidence_score: 0.68, value: null,
      insight_summary: 'Partial misalignment between tech and business teams is creating friction and slowing delivery',
      recommended_action: 'Establish a weekly 30-minute priority sync between tech and business leads',
      raw_data: { ...base.raw_data, team_alignment: answers.team_alignment },
    })
  }

  // Team focus
  if (answers.team_focus === 'Clearly off track') {
    signals.push({ ...base, signal_type: 'velocity_drop', dimension: 'team', severity: 'critical', confidence_score: 0.75, value: null,
      insight_summary: 'Team is clearly off track — busy but not moving the needle on what matters for growth',
      recommended_action: 'Audit last 2 weeks of work against your 90-day goal — identify and stop the 3 biggest time drains',
      raw_data: { ...base.raw_data, team_focus: answers.team_focus },
    })
  } else if (answers.team_focus === 'Busy but unclear impact') {
    signals.push({ ...base, signal_type: 'velocity_drop', dimension: 'team', severity: 'warning', confidence_score: 0.68, value: null,
      insight_summary: 'Team is busy but impact is unclear — effort is not translating to measurable business outcomes',
      recommended_action: 'Define one measurable north star metric and ensure every team task connects to it',
      raw_data: { ...base.raw_data, team_focus: answers.team_focus },
    })
  }

  // ICP misalignment
  if (answers.icp_targeting === 'No — we target a different segment') {
    signals.push({ ...base, signal_type: 'conversion_fall', dimension: 'marketing', severity: 'warning', confidence_score: 0.72, value: null,
      insight_summary: 'You know who gets the most value from your product but are targeting a different segment — marketing spend is likely wasted',
      recommended_action: 'Realign acquisition strategy to target your highest-value customer profile within 30 days',
      raw_data: { ...base.raw_data, icp_targeting: answers.icp_targeting },
    })
  }

  // Low referrals
  if (answers.referral_frequency === 'Never') {
    signals.push({ ...base, signal_type: 'nps_decline', dimension: 'customer', severity: 'warning', confidence_score: 0.65, value: null,
      insight_summary: 'Customers never refer others without being asked — satisfaction is not strong enough to drive organic growth',
      recommended_action: 'Survey your best customers to understand what would make them recommend you spontaneously',
      raw_data: { ...base.raw_data, referral_frequency: answers.referral_frequency },
    })
  }

  // Process maturity gap
  if (answers.process_maturity === 'Documented but not followed') {
    signals.push({ ...base, signal_type: 'repeat_complaint_pattern', dimension: 'team', severity: 'warning', confidence_score: 0.65, value: null,
      insight_summary: 'Processes are documented but not followed — execution inconsistency is likely causing recurring issues',
      recommended_action: 'Identify why processes are not followed and either simplify them or enforce accountability',
      raw_data: { ...base.raw_data, process_maturity: answers.process_maturity },
    })
  }

  // ── NEW SIGNAL 1: Solo founder — operational bottleneck + key-person risk ──
  // Solo founders are almost always execution bottlenecks. High team_operations friction,
  // slow velocity, severe key-person risk. Correlates with delivery delays and burnout.
  if (answers.team_size === 'Just me — solo founder') {
    signals.push({ ...base, signal_type: 'velocity_drop', dimension: 'team', severity: 'warning', confidence_score: 0.80, value: null,
      insight_summary: 'Solo founder detected — you are the single point of failure for all execution, strategy and operations. Key-person risk is extremely high.',
      recommended_action: 'Identify the one highest-value task only you can do and systematically delegate or automate everything else. Consider a fractional hire or co-founder for critical gaps.',
      raw_data: { ...base.raw_data, team_size: answers.team_size, signal_origin: 'solo_founder' },
    })
  }

  // ── NEW SIGNAL 2: Technical capacity gap — slow PMF validation, expensive iteration ──
  // Non-technical founders outsourcing 100% of engineering face painfully slow and
  // expensive iteration cycles. This sinks runway before PMF is found.
  if (
    answers.technical_capacity === 'No — fully outsourced or no technical capacity' ||
    answers.technical_capacity === 'No technical capacity at all'
  ) {
    signals.push({ ...base, signal_type: 'velocity_drop', dimension: 'product', severity: 'warning', confidence_score: 0.75, value: null,
      insight_summary: 'No internal technical capacity — 100% outsourced engineering means slow iteration cycles and high costs that erode runway before product-market fit is found.',
      recommended_action: 'Either hire a part-time technical lead or find a technical co-founder. Outsourcing 100% of engineering at early stage typically results in 3-5x longer iteration cycles.',
      raw_data: { ...base.raw_data, technical_capacity: answers.technical_capacity, signal_origin: 'no_technical_capacity' },
    })
  } else if (answers.technical_capacity === 'Yes — limited technical capacity') {
    signals.push({ ...base, signal_type: 'velocity_drop', dimension: 'product', severity: 'watch', confidence_score: 0.65, value: null,
      insight_summary: 'Limited technical capacity — engineering bandwidth may constrain your ability to iterate quickly enough to find product-market fit.',
      recommended_action: 'Audit your current technical bottlenecks and identify the highest-impact capability gap to address in the next 60 days.',
      raw_data: { ...base.raw_data, technical_capacity: answers.technical_capacity, signal_origin: 'limited_technical_capacity' },
    })
  }

  // ── NEW SIGNAL 3: Pricing confidence — over-discounting, weak value prop, wrong ICP ──
  // Low pricing confidence means the founder is over-discounting to win deals.
  // Directly impacts LTV, CAC payback period, and gross margin. Lagging indicator
  // of weak value proposition or targeting the wrong ICP.
  if (answers.pricing_confidence === 'Not confident — often discount to close') {
    signals.push({ ...base, signal_type: 'conversion_fall', dimension: 'revenue', severity: 'warning', confidence_score: 0.78, value: null,
      insight_summary: 'Low pricing confidence — regularly discounting to close deals. This compresses margins, extends CAC payback periods, and signals either a weak value proposition or targeting customers who cannot afford your true price.',
      recommended_action: 'Stop discounting immediately. Run 5 customer value-mapping conversations to understand what outcomes your product drives. Then reprice based on value delivered, not competitive fear.',
      raw_data: { ...base.raw_data, pricing_confidence: answers.pricing_confidence, signal_origin: 'pricing_confidence_low' },
    })
  } else if (answers.pricing_confidence === 'Unsure — never tested higher prices') {
    signals.push({ ...base, signal_type: 'conversion_fall', dimension: 'revenue', severity: 'watch', confidence_score: 0.65, value: null,
      insight_summary: 'Pricing has never been tested — you may be leaving significant revenue on the table without knowing it.',
      recommended_action: 'Run a simple price sensitivity test: offer your next 5 prospects at 20% above your current price and measure conversion. Most founders discover they are under-pricing by 30-50%.',
      raw_data: { ...base.raw_data, pricing_confidence: answers.pricing_confidence, signal_origin: 'pricing_never_tested' },
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
    revenue_financial:  'Revenue & Financial',
    product_market_fit: 'Product-Market Fit',
    team_operations:    'Team & Operations',
    customer_retention: 'Customer & Retention',
    marketing_growth:   'Marketing & Growth',
    strategy_goals:     'Strategy & Goals',
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
    <p style="font-weight:600;color:#374151;margin:12px 0 8px">${diagnosis.overall_status}</p>
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
    <a href="${process.env.NEXT_PUBLIC_APP_URL ?? ''}/dashboard" style="display:inline-block;padding:14px 36px;background:#2563EB;color:#fff;font-weight:700;border-radius:12px;text-decoration:none;font-size:16px">View full dashboard →</a>
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

    // ── SERVER-SIDE SCORE CALCULATION — deterministic, never delegated to AI ──
    // Use founder's actual stage from request (passed from founders table)
    // Fall back to AI's business_stage only if not provided, then to early_stage default
    const stageFromRequest = founderStage ?? founder.founder_stage ?? 'early_stage'
    const stageKey = stageFromRequest === 'product_customers' ? 'product_customers' : 'early_stage'
    const weights  = WEIGHT_MATRICES[stageKey]

    const aiDims = diagnosis.dimensions as Record<string, { score: number }> ?? {}
    const scoreRevenue  = aiDims?.revenue_financial?.score  ?? 0
    const scorePmf      = aiDims?.product_market_fit?.score ?? 0
    const scoreTeam     = aiDims?.team_operations?.score    ?? 0
    const scoreCustomer = aiDims?.customer_retention?.score ?? 0
    const scoreMarketing= aiDims?.marketing_growth?.score   ?? 0
    const scoreStrategy = aiDims?.strategy_goals?.score     ?? 0

    const trueOverallScore = Math.round(
      (scoreRevenue   * weights.revenue_financial)  +
      (scorePmf       * weights.product_market_fit) +
      (scoreTeam      * weights.team_operations)    +
      (scoreCustomer  * weights.customer_retention) +
      (scoreMarketing * weights.marketing_growth)   +
      (scoreStrategy  * weights.strategy_goals)
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
      overall_status:               diagnosis.overall_status as string,
      overall_summary:              diagnosis.overall_summary as string,
      primary_constraint_dimension: (diagnosis.primary_constraint as Record<string, string>)?.dimension,
      primary_constraint_summary:   (diagnosis.primary_constraint as Record<string, string>)?.summary,
      primary_constraint_urgency:   (diagnosis.primary_constraint as Record<string, string>)?.urgency,
      score_revenue:                scoreRevenue,
      score_pmf:                    scorePmf,
      score_team:                   scoreTeam,
      score_customer:               scoreCustomer,
      score_marketing:              scoreMarketing,
      score_strategy:               scoreStrategy,
      label_revenue:   (diagnosis.dimensions as Record<string, Record<string, string>>)?.revenue_financial?.status,
      label_pmf:       (diagnosis.dimensions as Record<string, Record<string, string>>)?.product_market_fit?.status,
      label_team:      (diagnosis.dimensions as Record<string, Record<string, string>>)?.team_operations?.status,
      label_customer:  (diagnosis.dimensions as Record<string, Record<string, string>>)?.customer_retention?.status,
      label_marketing: (diagnosis.dimensions as Record<string, Record<string, string>>)?.marketing_growth?.status,
      label_strategy:  (diagnosis.dimensions as Record<string, Record<string, string>>)?.strategy_goals?.status,
      causal_chains:          diagnosis.causal_chains,
      top_3_findings:         diagnosis.top_3_findings,
      priority_order:         diagnosis.priority_order,
      implementation_roadmap: diagnosis.implementation_roadmap,
      raw_ai_response:        diagnosis,
    })

    if (dbError) {
      console.error('[score] database error:', dbError)
      return NextResponse.json({ error: dbError.message }, { status: 500 })
    }

    // ── GENERATE ASSESSMENT SIGNALS ──
    console.log('[score] generating assessment signals...')
    const assessmentSignals = generateAssessmentSignals(founderId, assessmentId, answers, safeRealNumbers)

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