// lib/signal-goal-map.ts
// Single source of truth: signal_type → goal metadata → upsell service
// Used in: measure page (goal form), dashboard (goal cards + upsell)
// Never duplicate this mapping elsewhere

export const SIGNAL_GOAL_MAP: Record<string, {
  label:        string    // human readable signal name
  metric:       string    // what the number represents
  unit:         string    // %, tickets, points, days, £, stars, sec
  lowerBetter:  boolean   // true = lower is better (churn), false = higher is better (NPS)
  goalVerb:     string    // verb shown in goal form placeholder
  service:      'roadmap' | 'cpo'
  serviceLabel: string
  servicePrice: string
  serviceUrl:   string
  upsellCopy:   string    // shown on failing goal card
}> = {

  churn_spike: {
    label:        'Monthly Churn Rate',
    metric:       'Churn %',
    unit:         '%',
    lowerBetter:  true,
    goalVerb:     'Reduce churn to',
    service:      'cpo',
    serviceLabel: 'Fractional CPO Session',
    servicePrice: '£250',
    serviceUrl:   '/advisory?type=cpo',
    upsellCopy:   'High churn needs a retention strategy — not just automation.',
  },
  ticket_volume_increase: {
    label:        'Support Ticket Volume',
    metric:       'Tickets / month',
    unit:         'tickets',
    lowerBetter:  true,
    goalVerb:     'Keep tickets under',
    service:      'roadmap',
    serviceLabel: 'AI Implementation Roadmap',
    servicePrice: '£99',
    serviceUrl:   '/advisory?type=roadmap',
    upsellCopy:   'AI can automate triage, FAQs and saved replies to cut volume.',
  },
  response_time_increase: {
    label:        'Support Response Time',
    metric:       'Avg hours to respond',
    unit:         'hours',
    lowerBetter:  true,
    goalVerb:     'Respond within',
    service:      'roadmap',
    serviceLabel: 'AI Implementation Roadmap',
    servicePrice: '£99',
    serviceUrl:   '/service-advisory?type=roadmap',
    upsellCopy:   'AI auto-response can cut response time by 60% without extra headcount.',
  },
  repeat_complaint_pattern: {
    label:        'Repeat Contact Rate',
    metric:       'Repeat contacts %',
    unit:         '%',
    lowerBetter:  true,
    goalVerb:     'Reduce repeat contacts to',
    service:      'roadmap',
    serviceLabel: 'AI Implementation Roadmap',
    servicePrice: '£99',
    serviceUrl:   '/advisory?type=roadmap',
    upsellCopy:   'AI deflection and self-serve docs can eliminate repeat contacts.',
  },
  nps_decline: {
    label:        'Net Promoter Score',
    metric:       'NPS score',
    unit:         'points',
    lowerBetter:  false,
    goalVerb:     'Reach NPS of',
    service:      'cpo',
    serviceLabel: 'Fractional CPO Session',
    servicePrice: '£250',
    serviceUrl:   '/advisory?type=cpo',
    upsellCopy:   'NPS improvement needs a product and retention strategy.',
  },
  csat_decline: {
    label:        'Customer Satisfaction',
    metric:       'CSAT %',
    unit:         '%',
    lowerBetter:  false,
    goalVerb:     'Reach CSAT of',
    service:      'cpo',
    serviceLabel: 'Fractional CPO Session',
    servicePrice: '£250',
    serviceUrl:   '/advisory?type=cpo',
    upsellCopy:   'CSAT recovery requires both product and operations strategy.',
  },
  velocity_drop: {
    label:        'Engineering Velocity',
    metric:       'Story points / sprint',
    unit:         'points',
    lowerBetter:  false,
    goalVerb:     'Reach velocity of',
    service:      'cpo',
    serviceLabel: 'Fractional CPO Session',
    servicePrice: '£250',
    serviceUrl:   '/advisory?type=cpo',
    upsellCopy:   'Velocity recovery needs delivery prioritisation and process strategy.',
  },
  bug_backlog_growth: {
    label:        'Bug Backlog',
    metric:       'Open critical bugs',
    unit:         'bugs',
    lowerBetter:  true,
    goalVerb:     'Keep critical bugs under',
    service:      'cpo',
    serviceLabel: 'Fractional CPO Session',
    servicePrice: '£250',
    serviceUrl:   '/advisory?type=cpo',
    upsellCopy:   'A growing bug backlog signals a triage and process problem.',
  },
  cycle_time_increase: {
    label:        'Engineering Cycle Time',
    metric:       'Days per ticket',
    unit:         'days',
    lowerBetter:  true,
    goalVerb:     'Reduce cycle time to',
    service:      'cpo',
    serviceLabel: 'Fractional CPO Session',
    servicePrice: '£250',
    serviceUrl:   '/advisory?type=cpo',
    upsellCopy:   'Long cycle times need a workflow and dependency strategy.',
  },
  blocked_tickets_spike: {
    label:        'Blocked Tickets',
    metric:       'Blocked tickets count',
    unit:         'tickets',
    lowerBetter:  true,
    goalVerb:     'Reduce blocked tickets to',
    service:      'cpo',
    serviceLabel: 'Fractional CPO Session',
    servicePrice: '£250',
    serviceUrl:   '/advisory?type=cpo',
    upsellCopy:   'Blocked tickets signal team dependency and process issues.',
  },
  conversion_fall: {
    label:        'Conversion Rate',
    metric:       'Conversion %',
    unit:         '%',
    lowerBetter:  false,
    goalVerb:     'Reach conversion of',
    service:      'roadmap',
    serviceLabel: 'AI Implementation Roadmap',
    servicePrice: '£99',
    serviceUrl:   '/advisory?type=roadmap',
    upsellCopy:   'AI personalisation and funnel automation can recover conversion.',
  },
  engagement_drop: {
    label:        'User Engagement',
    metric:       'Engagement rate %',
    unit:         '%',
    lowerBetter:  false,
    goalVerb:     'Reach engagement of',
    service:      'roadmap',
    serviceLabel: 'AI Implementation Roadmap',
    servicePrice: '£99',
    serviceUrl:   '/advisory?type=roadmap',
    upsellCopy:   'AI content recommendations can lift engagement significantly.',
  },
  activation_drop: {
    label:        'User Activation Rate',
    metric:       'Activation %',
    unit:         '%',
    lowerBetter:  false,
    goalVerb:     'Reach activation of',
    service:      'roadmap',
    serviceLabel: 'AI Implementation Roadmap',
    servicePrice: '£99',
    serviceUrl:   '/advisory?type=roadmap',
    upsellCopy:   'AI-powered onboarding nudges can double activation rates.',
  },
  refund_spike: {
    label:        'Refund Rate',
    metric:       'Refund %',
    unit:         '%',
    lowerBetter:  true,
    goalVerb:     'Keep refunds under',
    service:      'cpo',
    serviceLabel: 'Fractional CPO Session',
    servicePrice: '£250',
    serviceUrl:   '/advisory?type=cpo',
    upsellCopy:   'High refunds signal a product quality or expectation problem — fix the root cause first.',
  },
  aov_decline: {
    label:        'Average Order Value',
    metric:       'AOV (£)',
    unit:         '£',
    lowerBetter:  false,
    goalVerb:     'Reach AOV of',
    service:      'cpo',
    serviceLabel: 'Fractional CPO Session',
    servicePrice: '£250',
    serviceUrl:   '/advisory?type=cpo',
    upsellCopy:   'AOV improvement needs a pricing and upsell strategy.',
  },
  traffic_source_shift: {
    label:        'Organic Traffic Share',
    metric:       'Organic %',
    unit:         '%',
    lowerBetter:  false,
    goalVerb:     'Maintain organic share of',
    service:      'roadmap',
    serviceLabel: 'AI Implementation Roadmap',
    servicePrice: '£99',
    serviceUrl:   '/advisory?type=roadmap',
    upsellCopy:   'AI content and SEO automation can rebuild organic traffic.',
  },
  session_duration_drop: {
    label:        'Session Duration',
    metric:       'Avg session (seconds)',
    unit:         'sec',
    lowerBetter:  false,
    goalVerb:     'Reach avg session of',
    service:      'roadmap',
    serviceLabel: 'AI Implementation Roadmap',
    servicePrice: '£99',
    serviceUrl:   '/advisory?type=roadmap',
    upsellCopy:   'AI personalisation can increase time-on-site significantly.',
  },
  rating_decline: {
    label:        'Trustpilot Rating',
    metric:       'Rating (out of 5)',
    unit:         'stars',
    lowerBetter:  false,
    goalVerb:     'Reach rating of',
    service:      'cpo',
    serviceLabel: 'Fractional CPO Session',
    servicePrice: '£250',
    serviceUrl:   '/advisory?type=cpo',
    upsellCopy:   'Rating recovery needs a brand and product response strategy.',
  },

  // F21: repeat_purchase_drop added
  // lowerBetter: false — the metric is repeat purchase RATE, higher is better
  // The signal name "drop" identifies the problem; the metric itself is positive-directional
  // Service: cpo — low repeat purchase rate is a retention and loyalty strategy problem
  repeat_purchase_drop: {
    label:        'Repeat Purchase Rate',
    metric:       'Repeat customers %',
    unit:         '%',
    lowerBetter:  false,
    goalVerb:     'Maintain repeat purchase rate above',
    service:      'cpo',
    serviceLabel: 'Fractional CPO Session',
    servicePrice: '£250',
    serviceUrl:   '/advisory?type=cpo',
    upsellCopy:   'Low repeat purchase rate signals a retention and loyalty problem.',
  },
}

// F22: @deprecated — do not use getGoalStatus client-side
// The DB column goal.status is the single authority on goal status.
// Status is set server-side only by checkAndUpdateGoals in lib/goal-checker.ts.
// Calling this function client-side causes badge/display inconsistencies
// because it recalculates status from values the DB may not have confirmed yet.
// Remove all imports and calls to this function — read goal.status from DB instead.
/** @deprecated Use goal.status from DB. Server is authority. Do not call client-side. */
export function getGoalStatus(
  currentValue: number | null,
  targetValue:  number,
  lowerBetter:  boolean,
  targetDate:   string
): 'active' | 'at_risk' | 'achieved' | 'missed' {
  if (currentValue === null) return 'active'
  const isAchieved = lowerBetter ? currentValue <= targetValue : currentValue >= targetValue
  if (isAchieved) return 'achieved'
  const isPastDeadline = new Date(targetDate) < new Date()
  if (isPastDeadline) return 'missed'
  return 'at_risk'
}

// Helper: calculate progress percentage for progress bar
export function getGoalProgress(
  startValue:   number | null,
  currentValue: number | null,
  targetValue:  number,
  lowerBetter:  boolean
): number {
  if (startValue === null || currentValue === null) return 0
  if (startValue === targetValue) return 100
  const totalNeeded = Math.abs(targetValue - startValue)
  const achieved    = lowerBetter
    ? startValue - currentValue
    : currentValue - startValue
  return Math.min(100, Math.max(0, Math.round((achieved / totalNeeded) * 100)))
}