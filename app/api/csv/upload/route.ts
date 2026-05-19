import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import { createServerComponentClient } from '@/lib/supabase-server'
import { recordScan } from '@/lib/scan-recorder'
import type { SignalUpsertResult } from '@/lib/scan-recorder'
import { resetStaleConflictPreferences } from '@/lib/conflict-reset'
import { calculateHealthScore, ScoringInput } from '@/lib/health-scoring'
import Groq from 'groq-sdk'

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

const VALID_SIGNAL_TYPES = [
  'churn_spike', 'ticket_volume_increase', 'rating_decline',
  'velocity_drop', 'conversion_fall', 'engagement_drop',
  'refund_spike', 'response_time_increase', 'repeat_complaint_pattern',
  'bug_backlog_growth', 'aov_decline', 'repeat_purchase_drop',
  'activation_drop', 'traffic_source_shift', 'session_duration_drop',
  'cycle_time_increase', 'blocked_tickets_spike', 'nps_decline', 'csat_decline'
]

const VALID_DIMENSIONS = ['customer', 'team', 'marketing', 'revenue', 'product', 'strategy']
const VALID_SEVERITIES = ['critical', 'warning', 'watch']

// Challenge 2: Universal direction map — all 19 signal types
// Direction is universal regardless of CSV template type
const CSV_SIGNAL_DIRECTION: Record<string, 'lower_better' | 'higher_better'> = {
  churn_spike:              'lower_better',
  ticket_volume_increase:   'lower_better',
  rating_decline:           'higher_better',
  velocity_drop:            'higher_better',
  conversion_fall:          'higher_better',
  engagement_drop:          'higher_better',
  refund_spike:             'lower_better',
  response_time_increase:   'lower_better',
  repeat_complaint_pattern: 'lower_better',
  bug_backlog_growth:       'lower_better',
  aov_decline:              'higher_better',
  repeat_purchase_drop:     'higher_better',
  activation_drop:          'higher_better',
  traffic_source_shift:     'higher_better',
  session_duration_drop:    'higher_better',
  cycle_time_increase:      'lower_better',
  blocked_tickets_spike:    'lower_better',
  nps_decline:              'higher_better',
  csat_decline:             'higher_better',
}

function csvTrend(signalType: string, prevVal: number, currVal: number): 'improving' | 'worsening' | 'unchanged' {
  if (prevVal === currVal) return 'unchanged'
  const dir = CSV_SIGNAL_DIRECTION[signalType] ?? 'lower_better'
  if (dir === 'lower_better') return currVal < prevVal ? 'improving' : 'worsening'
  return currVal > prevVal ? 'improving' : 'worsening'
}

// Issue 8: Valid template types — reject unknown values
const VALID_TEMPLATE_TYPES = ['support', 'orders', 'velocity', 'satisfaction', 'financial', 'marketing']

// ── Template Validation System — Anchor Column approach ──
// Keywords derived from actual downloadable template columns (document 20 ground truth)
// matchType 'all': structural templates where generic columns exist across types
// matchType 'any': domain-specific templates where any single rare keyword confirms file type
// humanHint: human-friendly guidance shown in rejection messages — no raw keyword arrays

interface TemplateRule {
  keywords:  string[]
  matchType: 'all' | 'any'
  humanHint: string
}

const TEMPLATE_RULES: Record<string, TemplateRule> = {
  support: {
    keywords:  ['ticket', 'status'],
    matchType: 'all', // both needed — 'status' alone appears in velocity, orders, and many other CSVs
    humanHint: 'Your customer support export should include ticket IDs and status history from tools like Intercom, Zendesk, or Gorgias.',
  },
  orders: {
    keywords:  ['order', 'value'],
    matchType: 'all', // derived from actual orders template: order_id + value columns
    humanHint: 'Your orders export should include order IDs and order values from tools like Shopify or WooCommerce.',
  },
  velocity: {
    keywords:  ['sprint', 'points'],
    matchType: 'all', // derived from actual velocity template: sprint_name + planned_points/delivered_points
    humanHint: 'Your sprint velocity report should include sprint names and story points from tools like Jira or Linear.',
  },
  satisfaction: {
    keywords:  ['score'],
    matchType: 'any', // 'score' always present in NPS/CSAT exports — sufficient discriminator
    humanHint: 'Your satisfaction file should include NPS or CSAT scores from tools like Typeform or Delighted.',
  },
  financial: {
    keywords:  ['mrr', 'churn', 'balance', 'invoice', 'subscription', 'recurring', 'attrition', 'arr'],
    matchType: 'any', // all are financial-specific — 'revenue' excluded (too generic, appears in marketing/orders)
    humanHint: 'Your financial report should include subscription recurring billing metrics from tools like Stripe, Chargebee, or QuickBooks.',
  },
  marketing: {
    keywords:  ['cac', 'cpl', 'roas', 'spend'],
    matchType: 'any', // all marketing-specific — 'ad' removed (substring matches 'address', 'added_at')
    humanHint: 'Your marketing metrics report should include ad spend and conversion data from tools like Meta Ads, Google Ads, or HubSpot.',
  },
}

// verifyAndRejectMismatches — three-case validation:
// Case C: selected template matches → accept immediately
// Case A: different template detected → reject with specific suggestion
// Case B: unrecognized structure → reject with humanHint guidance
// Checks selected template FIRST — avoids break-on-first bug in cross-template detection
function verifyAndRejectMismatches(
  selectedType: string,
  headers: string[]
): { shouldReject: boolean; reason?: string } {
  const clean = headers.join(' ').toLowerCase()

  const matches = (rule: TemplateRule): boolean => {
    const matched = rule.keywords.filter(k => clean.includes(k))
    return rule.matchType === 'all'
      ? matched.length === rule.keywords.length
      : matched.length > 0
  }

  // Case C: selected template matches — accept immediately
  const selectedRule = TEMPLATE_RULES[selectedType]
  if (selectedRule && matches(selectedRule)) {
    return { shouldReject: false }
  }

  // Case A: detect what template the file actually belongs to
  for (const [type, rule] of Object.entries(TEMPLATE_RULES)) {
    if (type !== selectedType && matches(rule)) {
      return {
        shouldReject: true,
        reason: `Mismatched template: you selected '${selectedType}' but this file looks like '${type}' data. Please re-upload using the '${type}' template.`,
      }
    }
  }

  // Case B: unrecognized structure — file doesn't match any known template
  return {
    shouldReject: true,
    reason: `Unrecognized structure: this file does not match the '${selectedType}' template. ${selectedRule?.humanHint ?? 'Please download the template and fill it with your data.'}`,
  }
}


type NormalisedSignal = Record<string, unknown> & {
  signal_type: string
  dimension: string
  severity: string
  insight_summary?: string
  recommended_action?: string
  confidence_score?: number
  value?: number | null
  change_percent?: number | null
  evidence?: string
}

function normalise(s: Record<string, unknown>): NormalisedSignal {
  let signal_type = s.signal_type as string
  if (!VALID_SIGNAL_TYPES.includes(signal_type)) {
    if (signal_type?.includes('ticket') || signal_type?.includes('support')) signal_type = 'ticket_volume_increase'
    else if (signal_type?.includes('refund') || signal_type?.includes('return')) signal_type = 'refund_spike'
    else if (signal_type?.includes('velocity') || signal_type?.includes('sprint')) signal_type = 'velocity_drop'
    else if (signal_type?.includes('bug') || signal_type?.includes('backlog')) signal_type = 'bug_backlog_growth'
    else if (signal_type?.includes('churn') || signal_type?.includes('cancel')) signal_type = 'churn_spike'
    else if (signal_type?.includes('nps') || signal_type?.includes('net_promoter')) signal_type = 'nps_decline'
    else if (signal_type?.includes('csat') || signal_type?.includes('satisfaction')) signal_type = 'csat_decline'
    else if (signal_type?.includes('repeat') || signal_type?.includes('complaint')) signal_type = 'repeat_complaint_pattern'
    else if (signal_type?.includes('activ')) signal_type = 'activation_drop'
    else if (signal_type?.includes('mrr') || signal_type?.includes('revenue') || signal_type?.includes('financial')) signal_type = 'churn_spike'
    else if (signal_type?.includes('cac') || signal_type?.includes('marketing') || signal_type?.includes('campaign')) signal_type = 'conversion_fall'
    else signal_type = 'repeat_complaint_pattern'
  }

  let dimension = s.dimension as string
  if (!VALID_DIMENSIONS.includes(dimension)) {
    if (dimension?.includes('support') || dimension?.includes('customer') || dimension?.includes('cs')) dimension = 'customer'
    else if (dimension?.includes('team') || dimension?.includes('eng') || dimension?.includes('dev')) dimension = 'team'
    else if (dimension?.includes('revenue') || dimension?.includes('order') || dimension?.includes('finance')) dimension = 'revenue'
    else if (dimension?.includes('market') || dimension?.includes('growth')) dimension = 'marketing'
    else dimension = 'customer'
  }

  let severity = (s.severity as string)?.toLowerCase()
  if (!VALID_SEVERITIES.includes(severity)) {
    if (severity === 'high' || severity === 'urgent' || severity === 'critical') severity = 'critical'
    else if (severity === 'medium' || severity === 'moderate') severity = 'warning'
    else severity = 'watch'
  }

  return { ...s, signal_type, dimension, severity }
}

function parseCSV(text: string): { headers: string[]; rows: Record<string, string>[] } {
  const lines = text.trim().split('\n').filter(l => l.trim())
  if (lines.length < 2) return { headers: [], rows: [] }

  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, '').toLowerCase())
  const rows = lines.slice(1).map(line => {
    const values = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''))
    return Object.fromEntries(headers.map((h, i) => [h, values[i] ?? '']))
  })

  return { headers, rows }
}

async function analyseCSV(
  templateType: string,
  headers: string[],
  rows: Record<string, string>[],
) {
  // Issue 11: Sample rows — max 500 to Groq to stay within context budget
  // Shows founders with large files still get analysis from representative sample
  const MAX_ROWS_TO_GROQ = 500
  const rowsForAnalysis = rows.length > MAX_ROWS_TO_GROQ ? rows.slice(0, MAX_ROWS_TO_GROQ) : rows
  const sampledNote = rows.length > MAX_ROWS_TO_GROQ
    ? `(analysing first ${MAX_ROWS_TO_GROQ} rows as representative sample of ${rows.length} total)`
    : ''

  // Adopt doc 17 prompt exactly — with all standard fixes applied
  const prompt = `You are Elvanis, an AI business analyst. Analyse this CSV data FRESH — treat this as new data every time, recalculate all metrics from scratch.

TEMPLATE TYPE: ${templateType}
COLUMNS: ${headers.join(', ')}
TOTAL ROWS: ${rows.length} ${sampledNote}
ALL DATA:
${JSON.stringify(rowsForAnalysis, null, 2)}

Calculate exact metrics from the actual data above:
${templateType === 'support' ? `
- Count total tickets
- Count open vs resolved vs reopened tickets
- Calculate average resolution time in hours for resolved tickets only
- Find most common issue categories
- Identify tickets with status open or reopen as unresolved` : ''}
- Signal types to use: ticket_volume_increase for unresolved/high volume, response_time_increase for slow resolution, repeat_complaint_pattern for recurring issue categories
${templateType === 'orders' ? `
- Count total orders
- Calculate refund rate (refunded orders / total orders * 100)
- Calculate average order value
- Count repeat customers (same customer_id appearing more than once)
- Find most common order issues` : ''}
- Signal types to use: refund_spike for high refund rate, aov_decline for dropping order value, repeat_purchase_drop for low repeat customers, churn_spike for customer loss
${templateType === 'velocity' ? `
- Calculate sprint completion rate (completed / total * 100)
- Count open bugs vs closed bugs
- Calculate average cycle time
- Identify blocked items` : ''}
- Signal types to use: velocity_drop for low sprint completion, bug_backlog_growth for open bugs, cycle_time_increase for slow delivery, blocked_tickets_spike for blocked items
${templateType === 'satisfaction' ? `
- Calculate average NPS or CSAT score
- Count promoters (score >= 9), passives (7-8), detractors (0-6) for NPS
- Identify most common complaint themes from comments
- Flag declining scores` : ''}
- Signal types to use: nps_decline for NPS drop, csat_decline for CSAT drop, repeat_complaint_pattern for recurring complaint themes

${templateType === 'financial' ? `
- Calculate MRR month over month change percentage
- Calculate churn rate if customer count data exists
- Calculate refund rate trend (current vs previous period)
- Flag if AOV declined more than 10%
- Flag if MRR declined or is flat (0% or negative growth)
- Signal types to use: churn_spike for revenue/MRR decline, refund_spike for refund rate, aov_decline for AOV drop` : ''}

${templateType === 'marketing' ? `
- Calculate CAC trend — percentage change from previous period
- Calculate email open rate trend — percentage change
- Calculate ROAS = total revenue / total ad spend
- Calculate CPL trend — percentage change
- Flag if paid traffic > 60% of total traffic as traffic_source_shift risk
- Signal types to use: conversion_fall for CAC/CPL increase, engagement_drop for email open rate decline, traffic_source_shift for paid dependency` : ''}

VALID SIGNAL TYPES — you must ONLY use these exact values for signal_type field:
churn_spike, ticket_volume_increase, rating_decline, velocity_drop, conversion_fall,
engagement_drop, refund_spike, response_time_increase, repeat_complaint_pattern,
bug_backlog_growth, aov_decline, repeat_purchase_drop, activation_drop,
traffic_source_shift, session_duration_drop, cycle_time_increase,
blocked_tickets_spike, nps_decline, csat_decline

Mapping guide — use the closest match:
- ROAS decline, CPL increase, CAC increase, conversion issues → conversion_fall
- Email open rate decline, engagement drop → engagement_drop
- Ticket volume, unresolved tickets, response time → ticket_volume_increase
- Repeat complaints, issue categories, complaint patterns → repeat_complaint_pattern
- NPS score decline → nps_decline
- CSAT score decline → csat_decline
- MRR decline, revenue drop → churn_spike
- Refund rate, return rate → refund_spike

CRITICAL: maximum ONE signal per signal_type. If multiple metrics point to the same type, pick the most critical value and combine the insights into one signal.

Generate 2-4 diagnostic signals based ONLY on the exact numbers you calculate from the data above. Every number in insight_summary must come from the actual data. Only generate a signal if there is a real problem.

CRITICAL: If certain data points or cells are blank/null, do not assume an error. Analyze the available data points and adapt your signals based only on the provided information.

VALUE FIELD RULES — never return null for value:
- Quantifiable Metrics: If the signal maps directly to a calculated count, amount, or percentage (e.g., ticket_volume_increase = total open tickets count, aov_decline = AOV amount, velocity_drop = sprint completion rate percentage, refund_spike = refund rate percentage), set value to that exact calculated number.
- Qualitative/Abstract Metrics: If the data points to abstract trend shifts where a clean single calculation is not present (e.g., churn_spike, traffic_source_shift, repeat_complaint_pattern), estimate an explicit, severity-based proxy score from 1 to 100 based on the volume and critical velocity of rows violating health standards (1 = minimal risk/healthy baseline, 100 = severe structural risk).
- All signals: Under no circumstances whatsoever may you output a null, undefined, or string representation for the value property. It must be a valid numeric type.

\u26a0\ufe0f CRITICAL LLM INSTRUCTION: Under no circumstances whatsoever may the \`value\` property contain a \`null\` or \`undefined\` data type. A valid numeric representation must be compiled for every single generated signal object.

Respond with JSON only — no preamble, no markdown formatting blocks, no backticks. Output a raw parsable string matching this exact shape:
{
  "signals": [
    {
      "signal_type": "ticket_volume_increase",
      "dimension": "customer",
      "insight_summary": "specific insight with exact calculated numbers from the data",
      "recommended_action": "specific action based on the actual data patterns",
      "severity": "critical|warning|watch",
      "confidence_score": 0.85,
      "value": 45,
      "change_percent": null,
      "evidence": "calculated from actual data rows"
    }
  ],
  "overall_diagnosis": "2-3 sentences with exact metrics calculated from the data"
}`

  console.log('CSV analysing:', { templateType, totalRows: rows.length, sentToGroq: rowsForAnalysis.length })

  const response = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    max_tokens: 4000,
    temperature: 0.2,
    messages: [{ role: 'user', content: prompt }]
  })

  const text = response.choices[0]?.message?.content ?? ''
  console.log('CSV AI response:', text.substring(0, 500))

  const firstBrace = text.indexOf('{')
  const lastBrace = text.lastIndexOf('}')
  const cleaned = text.substring(firstBrace, lastBrace + 1)
    .replace(/[\x00-\x1F\x7F]/g, ' ')
    .replace(/\t/g, ' ')

  try {
    return JSON.parse(cleaned)
  } catch (parseErr) {
    console.error('CSV AI parse failed:', parseErr)
    console.error('Raw text:', text.substring(0, 500))
    const unresolvedCount = rows.filter(r => r.status === 'open' || r.status === 'reopen').length
    const resolvedCount = rows.filter(r => r.status === 'resolved').length
    return {
      signals: [{
        signal_type: templateType === 'support' ? 'ticket_volume_increase' :
                     templateType === 'orders' ? 'refund_spike' :
                     templateType === 'velocity' ? 'velocity_drop' : 'csat_decline',
        dimension: templateType === 'orders' ? 'revenue' : templateType === 'velocity' ? 'team' : 'customer',
        insight_summary: templateType === 'support'
          ? `${rows.length} tickets analysed — ${unresolvedCount} unresolved, ${resolvedCount} resolved`
          : `${rows.length} records analysed from ${templateType} data`,
        recommended_action: 'Review the data and address the most critical issues immediately',
        severity: 'warning',
        confidence_score: 0.6,
        value: rows.length,
        change_percent: null,
        evidence: 'Calculated from uploaded CSV data',
      }],
      overall_diagnosis: `Analysed ${rows.length} records from your ${templateType} export. ${unresolvedCount > 0 ? `${unresolvedCount} unresolved items require attention.` : ''}`
    }
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerComponentClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    const { data: founder } = await supabase
      .from('founders')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle()

    if (!founder) return NextResponse.json({ error: 'Founder not found' }, { status: 404 })

    const formData = await request.formData()
    const file = formData.get('file') as File
    const templateType = formData.get('templateType') as string

    if (!file) return NextResponse.json({ error: 'No file uploaded' }, { status: 400 })
    if (!templateType) return NextResponse.json({ error: 'Template type required' }, { status: 400 })

    // Issue 8: Validate templateType against allowed values
    if (!VALID_TEMPLATE_TYPES.includes(templateType)) {
      return NextResponse.json({
        error: `Invalid template type. Must be one of: ${VALID_TEMPLATE_TYPES.join(', ')}`
      }, { status: 400 })
    }

    // Issue 10: File size guard — 5MB max
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: 'File too large — maximum 5MB' }, { status: 400 })
    }

    // File type guard — extension check
    const fileExtension = file.name.toLowerCase().slice(file.name.lastIndexOf('.'))
    const allowedExtensions = ['.csv', '.txt']
    if (!allowedExtensions.includes(fileExtension)) {
      return NextResponse.json({
        error: `File type not supported. Please upload a CSV file (.csv). You uploaded: ${file.name}`
      }, { status: 400 })
    }

    const text = await file.text()
    const { headers, rows } = parseCSV(text)

    if (rows.length === 0) {
      return NextResponse.json({ error: 'CSV appears to be empty or incorrectly formatted' }, { status: 400 })
    }

    // Content sniff — reject binary files renamed as .csv (Excel, Word, PDF)
    const headerStr = headers.join('')
    if (headerStr.includes('PK') || headerStr.includes('<?xml') || /[^\x20-\x7E]/.test(headerStr)) {
      return NextResponse.json({
        error: 'File content does not appear to be valid CSV. Please export your data as CSV and re-upload.'
      }, { status: 400 })
    }

    // Template validation — anchor column system
    // Case C: accept, Case A: wrong template detected, Case B: unrecognized structure
    const validation = verifyAndRejectMismatches(templateType, headers)
    if (validation.shouldReject) {
      return NextResponse.json({ error: validation.reason }, { status: 400 })
    }

    const admin = createAdminClient()

    // ── REORDERED: Upsert source BEFORE Groq call ──
    // Challenge 1: source must exist before existingMap fetch
    // Also: avoids Groq API call if source upsert fails
    const { data: existingCsvSource } = await admin
      .from('data_sources')
      .select('id')
      .eq('founder_id', founder.id)
      .eq('source_type', 'csv')
      .eq('config->>template_type', templateType)
      .maybeSingle()

    const sourceConfig = {
      template_type: templateType,
      filename: file.name,
      row_count: rows.length,
      columns: headers,
      uploaded_at: new Date().toISOString(),
    }

    if (existingCsvSource) {
      await admin.from('data_sources').update({
        status: 'active',
        config: sourceConfig,
        last_synced_at: new Date().toISOString(),
      }).eq('id', existingCsvSource.id)
    } else {
      await admin.from('data_sources').insert({
        founder_id: founder.id,
        source_type: 'csv',
        status: 'active',
        config: sourceConfig,
        last_synced_at: new Date().toISOString(),
      })
    }

    const { data: savedSource } = await admin
      .from('data_sources')
      .select('id')
      .eq('founder_id', founder.id)
      .eq('source_type', 'csv')
      .eq('config->>template_type', templateType)
      .maybeSingle()

    // Issue 1: null guard — abort if source not found
    if (!savedSource?.id) {
      return NextResponse.json({ error: 'Failed to save data source — cannot proceed' }, { status: 500 })
    }

    // Challenge 1: Fetch existing signals by source_id — NOT generic 'csv'
    // Isolates timeline per template type — prevents orders CSV stealing support CSV values
    const { data: existingSignals } = await admin
      .from('diagnostic_signals')
      .select('signal_type, value, scan_count, change_percent')
      .eq('founder_id', founder.id)
      .eq('source_id', savedSource.id)
      .in('status', ['new', 'acknowledged'])

    // Build lookup: signal_type → existing row (for previous_value + scan_count carry-forward)
    const existingMap = new Map(existingSignals?.map(s => [s.signal_type, s]) ?? [])

    // ── Groq analysis — after source confirmed, before delete ──
    const analysis = await analyseCSV(templateType, headers, rows)

    // ── Build signals with trend tracking ──
    // Issue 9 + Hybrid approach: carry previous_value from existingMap before delete
    const signalsToInsert = (analysis.signals ?? [])
      .filter((s: Record<string, unknown>) => (s.confidence_score as number) >= 0.5)
      .map((s: Record<string, unknown>) => {
        const n = normalise(s)
        const prev = existingMap.get(n.signal_type)

        const prevVal = prev?.value !== null && prev?.value !== undefined ? Number(prev.value) : null
        const currVal = n.value !== null && n.value !== undefined ? Number(n.value) : null
        const trend = prevVal !== null && currVal !== null
          ? csvTrend(n.signal_type, prevVal, currVal)
          : 'new'
        const scanCount = prev ? (prev.scan_count ?? 1) + 1 : 1

        return {
          founder_id:         founder.id,
          source_id:          savedSource.id,
          signal_type:        n.signal_type,
          dimension:          n.dimension,
          insight_summary:    (n.insight_summary as string) ?? 'Signal detected',
          recommended_action: (n.recommended_action as string) ?? 'Review and take action',
          severity:           n.severity,
          confidence_score:   (n.confidence_score as number) ?? 0.85,
          value:              n.value ?? null,
          change_percent:     n.change_percent ?? null,
          previous_value:     prev?.value ?? null,
          previous_change_percent: prev?.change_percent ?? null,
          source:             'csv',
          status:             'new',
          trend,
          scan_count:         scanCount,
          period_start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          period_end:   new Date().toISOString().split('T')[0],
          raw_data: { template_type: templateType, row_count: rows.length, evidence: n.evidence },
        }
      })

    // ── Delete old signals for this source only ──
    // source_id guard already verified above — safe to delete
    await admin
      .from('diagnostic_signals')
      .delete()
      .eq('founder_id', founder.id)
      .eq('source_id', savedSource.id)

    // Issue 2: Batch INSERT — atomic, one DB call
    // Challenge 3: .select() returns IDs for touchedSignals
    let inserted = 0
    const touchedSignals: SignalUpsertResult[] = []

    if (signalsToInsert.length > 0) {
      const { data: insertedRows, error: insertErr } = await admin
        .from('diagnostic_signals')
        .insert(signalsToInsert)
        .select('id, signal_type, value, severity, dimension, change_percent, insight_summary, previous_value, scan_count, trend')

      if (insertErr) {
        console.error('[csv] batch insert failed:', insertErr.message)
      } else if (insertedRows) {
        inserted = insertedRows.length

        // Build touchedSignals from returned rows — exact IDs for recordScan() snapshots
        for (const row of insertedRows) {
          touchedSignals.push({
            id:              row.id,
            signal_type:     row.signal_type,
            source:          'csv',
            severity:        row.severity,
            dimension:       row.dimension,
            value:           row.value,
            change_percent:  row.change_percent,
            trend:           row.trend,
            insight_summary: row.insight_summary,
            previous_value:  row.previous_value ?? null,
            scan_count:      row.scan_count,
          })
        }
      }
    }

    console.log(`CSV: ${inserted} inserted fresh (template: ${templateType}, trend tracking active)`)

    // Issue 3: recordScan() — CSV uploads now appear in measure page scan history
    // parentScanId = null — CSV uploads are direct, not via parent scan route
    // triggeredBy = 'connect' — closest equivalent to direct upload
    await recordScan(founder.id, 'csv', touchedSignals, null, 'connect')

    // ── Save health score after CSV signals inserted ──
    const { data: activeSignalsForScore } = await admin
    .from('diagnostic_signals')
    .select('severity, signal_type')
    .eq('founder_id', founder.id)
    .in('status', ['new', 'acknowledged'])
    .neq('source', 'manual')


    // F16: calculateHealthScore via utility — replaces inline loop
    // Health score is GLOBAL across all active signals, not just CSV signals
    const scoringInputs: ScoringInput[] = (activeSignalsForScore ?? []).map(s => ({
      signal_type: s.signal_type as string,
      severity:    s.severity    as string,
    }))
    const healthScore = calculateHealthScore(scoringInputs)
 
    if (healthScore !== -1) {
      await admin.from('health_score_history').insert({
        founder_id:   founder.id,
        health_score: healthScore,
        signal_count: activeSignalsForScore?.length ?? 0,
        scanned_at:   new Date().toISOString(),
      })
    }

        // F17: checkAndUpdateGoals — CSV is a standalone entry point
    // The parent scan route calls this after scrapes, but CSV upload bypasses that.
    // Must be called here directly so goal status updates fire on every upload.
    const { checkAndUpdateGoals } = await import('@/lib/goal-checker')
    await checkAndUpdateGoals(founder.id, admin)
    await resetStaleConflictPreferences(founder.id, ['csv'])

    return NextResponse.json({
      success:          true,
      signals:          inserted,
      inserted,
      updated:          0,
      rowsAnalysed:     rows.length,
      overall_diagnosis: analysis.overall_diagnosis,
    })

  } catch (err) {
    console.error('CSV upload error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}