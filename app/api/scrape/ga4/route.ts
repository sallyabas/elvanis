import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import { getValidToken } from '@/lib/token-refresh'
import Groq from 'groq-sdk'
import { recordScan } from '@/lib/scan-recorder'
import type { SignalUpsertResult } from '@/lib/scan-recorder'
import { resetStaleConflictPreferences } from '@/lib/conflict-reset'

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
    if (signal_type?.includes('conver')) signal_type = 'conversion_fall'
    else if (signal_type?.includes('engag') || signal_type?.includes('bounce')) signal_type = 'engagement_drop'
    else if (signal_type?.includes('session') || signal_type?.includes('duration')) signal_type = 'session_duration_drop'
    else if (signal_type?.includes('traffic') || signal_type?.includes('source')) signal_type = 'traffic_source_shift'
    else if (signal_type?.includes('activ')) signal_type = 'activation_drop'
    else signal_type = 'engagement_drop'
  }
  let dimension = s.dimension as string
  if (!VALID_DIMENSIONS.includes(dimension)) dimension = 'marketing'
  let severity = (s.severity as string)?.toLowerCase()
  if (!VALID_SEVERITIES.includes(severity)) {
    if (severity === 'high' || severity === 'urgent') severity = 'critical'
    else if (severity === 'medium' || severity === 'moderate') severity = 'warning'
    else severity = 'watch'
  }
  return { ...s, signal_type, dimension, severity }
}

// GA4 signal direction map
const GA4_SIGNAL_DIRECTION: Record<string, 'lower_better' | 'higher_better'> = {
  conversion_fall: 'higher_better',
  engagement_drop: 'higher_better',
  session_duration_drop: 'higher_better',
  activation_drop: 'higher_better',
  traffic_source_shift: 'lower_better',
}

function ga4Trend(signalType: string, prevVal: number, currVal: number): string {
  const dir = GA4_SIGNAL_DIRECTION[signalType]
  if (!dir) return currVal > prevVal ? 'improving' : currVal < prevVal ? 'worsening' : 'unchanged'
  if (dir === 'lower_better') return currVal < prevVal ? 'improving' : currVal > prevVal ? 'worsening' : 'unchanged'
  return currVal > prevVal ? 'improving' : currVal < prevVal ? 'worsening' : 'unchanged'
}


const SEVERITY_RANK: Record<string, number> = { critical: 3, warning: 2, watch: 1 }

function mergeSignals(signals: NormalisedSignal[]): NormalisedSignal[] {
  const grouped = new Map<string, NormalisedSignal[]>()
  for (const s of signals) {
    const group = grouped.get(s.signal_type) ?? []
    group.push(s)
    grouped.set(s.signal_type, group)
  }

  const result: NormalisedSignal[] = []
  for (const [, group] of grouped) {
    if (group.length === 1) { result.push(group[0]); continue }

    // Sort: highest severity first, then highest confidence, then first encountered
    const sorted = [...group].sort((a, b) => {
      const sevDiff = (SEVERITY_RANK[b.severity] ?? 0) - (SEVERITY_RANK[a.severity] ?? 0)
      if (sevDiff !== 0) return sevDiff
      return ((b.confidence_score ?? 0) as number) - ((a.confidence_score ?? 0) as number)
    })

    const winner = sorted[0]
    const loser = sorted[1]

    const mergedSummary = loser.insight_summary
      ? `${winner.insight_summary} · ${loser.insight_summary}`.substring(0, 300)
      : winner.insight_summary

    // value: take Math.min (worst case for health score)
    const winnerVal = winner.value !== null && winner.value !== undefined ? Number(winner.value) : null
    const loserVal = loser.value !== null && loser.value !== undefined ? Number(loser.value) : null
    const mergedValue = winnerVal !== null && loserVal !== null
      ? Math.min(winnerVal, loserVal)
      : winnerVal ?? loserVal

    result.push({
      ...winner,
      insight_summary: mergedSummary,
      value: mergedValue,
    })
  }
  return result
}

export async function POST(request: NextRequest) {
  try {
    // parentScanId: set by parent scan route — links this child scan row to master row
    // triggeredBy: 'connect' when called directly from connect flow, passed through from parent route otherwise
    const { founderId, parentScanId = null, triggeredBy = 'connect', founderContext = {} } = await request.json()
    const admin = createAdminClient()

    const tokenData = await getValidToken(founderId, 'ga4')
    if (!tokenData) return NextResponse.json({ error: 'Google Analytics disconnected. Please reconnect.' }, { status: 400 })

    const { accessToken, source: ga4Source } = tokenData
    const rawPropertyId = (ga4Source.config as Record<string, string>)?.selected_property_id
    if (!rawPropertyId) return NextResponse.json({ error: 'Google Analytics disconnected. Please reconnect.' }, { status: 400 })    
    const propertyId = String(rawPropertyId).replace('properties/', '')

    const headers = {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    }

    const dateRange = { startDate: '31daysAgo', endDate: 'yesterday' }
    const prevDateRange = { startDate: '62daysAgo', endDate: '32daysAgo' }

    // Fetch 1 — Core metrics current + previous period
    const coreRes = await fetch(
      `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`,
      
      {
        method: 'POST',
        headers,
        body: JSON.stringify({
          dateRanges: [dateRange, prevDateRange],
          metrics: [
            { name: 'sessions' },
            { name: 'activeUsers' },
            { name: 'bounceRate' },
            { name: 'conversions' },
            { name: 'engagementRate' },
            { name: 'averageSessionDuration' },
            { name: 'newUsers' },
          ],
        }),
      }
    )
    if (!coreRes.ok) {
      const errorText = await coreRes.text()
      console.error('GA4 API error:', coreRes.status, errorText.substring(0, 300))
      const isAuthError = coreRes.status === 401 || coreRes.status === 403
      return NextResponse.json({
        error: isAuthError
          ? 'Google Analytics disconnected. Please reconnect.'
          : 'Could not reach Google Analytics. Try again later.'
      }, { status: 500 })
    }
    const coreData = await coreRes.json()

    // Fetch 2 — Traffic source breakdown
    const sourceRes = await fetch(
      `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify({
          dateRanges: [dateRange],
          dimensions: [{ name: 'sessionDefaultChannelGroup' }],
          metrics: [{ name: 'sessions' }, { name: 'conversions' }],
          orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
          limit: 6,
        }),
      }
    )
    const sourceData = await sourceRes.json()

    // Fetch 3 — Top exit pages
    const exitRes = await fetch(
      `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify({
          dateRanges: [dateRange],
          dimensions: [{ name: 'pagePath' }],
          metrics: [{ name: 'exits' }, { name: 'sessions' }],
          orderBys: [{ metric: { metricName: 'exits' }, desc: true }],
          limit: 5,
        }),
      }
    )
    const exitData = await exitRes.json()

    // Fetch 4 — Device breakdown
    const deviceRes = await fetch(
      `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify({
          dateRanges: [dateRange],
          dimensions: [{ name: 'deviceCategory' }],
          metrics: [{ name: 'sessions' }, { name: 'bounceRate' }, { name: 'conversions' }],
        }),
      }
    )
    const deviceData = await deviceRes.json()

    // Process core metrics
    // GA4 with 2 dateRanges returns dateRangeValues per row — NOT separate rows
    // dateRangeIndex=0 → current period, dateRangeIndex=1 → previous period
    const getMetric = (rows: Record<string, unknown>[], rowIndex: number, metricIndex: number, dateRangeIndex = 0) => {
      const r = rows?.[rowIndex] as Record<string, unknown>
      if (!r) return 0
      const dateRangeValues = r?.dateRangeValues as Array<{ values: Array<{ value: string }> }>
      if (dateRangeValues?.length > 0) {
        return parseFloat(dateRangeValues?.[dateRangeIndex]?.values?.[metricIndex]?.value ?? '0')
      }
      // Fallback for single dateRange responses
      const values = r?.metricValues as Array<{ value: string }>
      return parseFloat(values?.[metricIndex]?.value ?? '0')
    }

    const currentRows = coreData.rows ?? []

    const current = {
      sessions:           getMetric(currentRows, 0, 0, 0),
      users:              getMetric(currentRows, 0, 1, 0),
      bounceRate:         getMetric(currentRows, 0, 2, 0),
      conversions:        getMetric(currentRows, 0, 3, 0),
      engagementRate:     getMetric(currentRows, 0, 4, 0),
      avgSessionDuration: getMetric(currentRows, 0, 5, 0),
      newUsers:           getMetric(currentRows, 0, 6, 0),
    }

    // Previous period — same row, dateRangeIndex=1
    const prev = {
      sessions:           getMetric(currentRows, 0, 0, 1),
      bounceRate:         getMetric(currentRows, 0, 2, 1),
      conversions:        getMetric(currentRows, 0, 3, 1),
      engagementRate:     getMetric(currentRows, 0, 4, 1),
      avgSessionDuration: getMetric(currentRows, 0, 5, 1),
    }

    const pctChange = (curr: number, previous: number) =>
      previous > 0 ? Math.round(((curr - previous) / previous) * 100) : null

    const metrics = {
      sessions: current.sessions,
      users: current.users,
      bounceRate: Math.round(current.bounceRate * 100),
      engagementRate: Math.round(current.engagementRate * 100),
      conversions: current.conversions,
      avgSessionDuration: Math.round(current.avgSessionDuration),
      newUsers: current.newUsers,
      returningUsers: current.users - current.newUsers,
      newUserRatio: current.users > 0 ? Math.round((current.newUsers / current.users) * 100) : 0,
      sessionsChange: pctChange(current.sessions, prev.sessions),
      bounceRateChange: pctChange(current.bounceRate, prev.bounceRate),
      conversionsChange: pctChange(current.conversions, prev.conversions),
      engagementChange: pctChange(current.engagementRate, prev.engagementRate),
      sessionDurationChange: pctChange(current.avgSessionDuration, prev.avgSessionDuration),
    }

    // Process traffic sources
    const sources = (sourceData.rows ?? []).map((row: Record<string, unknown>) => {
      const dims = row.dimensionValues as Array<{ value: string }>
      const mets = row.metricValues as Array<{ value: string }>
      return {
        channel: dims?.[0]?.value ?? 'Unknown',
        sessions: parseFloat(mets?.[0]?.value ?? '0'),
        conversions: parseFloat(mets?.[1]?.value ?? '0'),
      }
    })

  

    const totalSessions = sources.reduce((sum: number, s: { sessions: number }) => sum + s.sessions, 0)
    const organicShare = sources.find((s: { channel: string }) =>
      s.channel.toLowerCase().includes('organic'))?.sessions ?? 0
    const paidShare = sources.find((s: { channel: string }) =>
      s.channel.toLowerCase().includes('paid'))?.sessions ?? 0
    const rawOrganicPct = totalSessions > 0 ? Math.round((organicShare / totalSessions) * 100) : 0
    const organicPct    = isFinite(rawOrganicPct) && !isNaN(rawOrganicPct) ? rawOrganicPct : 0
    const paidPct = totalSessions > 0 ? Math.round((paidShare / totalSessions) * 100) : 0

    // Process exit pages
    const exitPages = (exitData.rows ?? []).slice(0, 5).map((row: Record<string, unknown>) => {
      const dims = row.dimensionValues as Array<{ value: string }>
      const mets = row.metricValues as Array<{ value: string }>
      return {
        page: dims?.[0]?.value ?? '/',
        exits: parseFloat(mets?.[0]?.value ?? '0'),
        sessions: parseFloat(mets?.[1]?.value ?? '0'),
      }
    })

    // Process devices
    const devices = (deviceData.rows ?? []).map((row: Record<string, unknown>) => {
      const dims = row.dimensionValues as Array<{ value: string }>
      const mets = row.metricValues as Array<{ value: string }>
      return {
        device: dims?.[0]?.value,
        sessions: parseFloat(mets?.[0]?.value ?? '0'),
        bounceRate: Math.round(parseFloat(mets?.[1]?.value ?? '0') * 100),
        conversions: parseFloat(mets?.[2]?.value ?? '0'),
      }
    })

    const ga4Data = {
      ...metrics,
      sources,
      organicPct,
      paidPct,
      exitPages,
      devices,
      propertyId,
    }

    // Zero-bound funnel crash guard — if conversions hit 0 from a positive previous value
    // pctChange would return -100 but we force value=-100 as absolute funnel collapse signal
    const conversionFallValue = current.conversions === 0 && prev.conversions > 0
      ? -100
      : ga4Data.conversionsChange ?? 0

    console.log('GA4 data:', JSON.stringify(ga4Data))

    const prompt = `You are Elvanis, an AI business analyst. Analyse this Google Analytics 4 data and generate diagnostic signals.

METRICS (last 31 days vs previous 31 days):
- Sessions: ${ga4Data.sessions} (${ga4Data.sessionsChange !== null ? ga4Data.sessionsChange + '%' : 'no prev data'} change)
- Users: ${ga4Data.users}
- New users: ${ga4Data.newUsers} (${ga4Data.newUserRatio}% of total)
- Returning users: ${ga4Data.returningUsers}
- Bounce rate: ${ga4Data.bounceRate}% (${ga4Data.bounceRateChange !== null ? ga4Data.bounceRateChange + '%' : 'no prev data'} change)
- Engagement rate: ${ga4Data.engagementRate}% (${ga4Data.engagementChange !== null ? ga4Data.engagementChange + '%' : 'no prev data'} change)
- Conversions: ${ga4Data.conversions} (${ga4Data.conversionsChange !== null ? ga4Data.conversionsChange + '%' : 'no prev data'} change)${conversionFallValue === -100 ? ' ⚠️ ABSOLUTE ZERO — funnel collapse detected' : ''}
- Avg session duration: ${ga4Data.avgSessionDuration}s (${ga4Data.sessionDurationChange !== null ? ga4Data.sessionDurationChange + '%' : 'no prev data'} change)

TRAFFIC SOURCES:
${ga4Data.sources.map((s: { channel: string; sessions: number; conversions: number }) => `- ${s.channel}: ${s.sessions} sessions, ${s.conversions} conversions`).join('\n')}
Organic share: ${ga4Data.organicPct}% | Paid share: ${ga4Data.paidPct}%

TOP EXIT PAGES:
${ga4Data.exitPages.map((p: { page: string; exits: number }) => `- ${p.page}: ${p.exits} exits`).join('\n')}

DEVICE BREAKDOWN:
${ga4Data.devices.map((d: { device: string; sessions: number; bounceRate: number }) => `- ${d.device}: ${d.sessions} sessions, ${d.bounceRate}% bounce rate`).join('\n')}

FOUNDER CONTEXT:
- Industry: ${founderContext.industry ?? 'Not specified'}
- Market: ${founderContext.market ?? 'Not specified'}
- Stage: ${founderContext.founder_stage ?? 'Not specified'}
- Primary focus: ${founderContext.focus_metric ?? 'Not specified'}

Use this context to calibrate signal severity and recommendations. For example:
- A Gulf e-commerce founder has different benchmarks than a UK B2B SaaS founder
- An early_stage founder needs different actions than a product_customers founder
- Focus metric shapes which signals to prioritise

AVAILABLE SIGNAL TYPES:
- conversion_fall: conversions dropping
- engagement_drop: engagement or session duration dropping
- session_duration_drop: users spending less time
- traffic_source_shift: over-reliance on paid, organic declining
- activation_drop: high new user rate but low engagement suggests users not activating

THRESHOLDS:
- Bounce rate > 70% = problem
- Engagement rate < 40% = problem
- Conversions down > 15% = critical
- Sessions down > 20% = warning
- Session duration down > 20% = session_duration_drop signal
- Paid traffic > 60% of total = traffic_source_shift risk
- Organic declining while paid increasing = traffic_source_shift signal

SAMPLE SIZE RULES:
- If sessions < 100: reduce all severities by one level and add to insight_summary: "Based on limited traffic (${ga4Data.sessions} sessions) — verify trend with more data before acting."
- If sessions < 30: confidence_score must not exceed 0.65 and severity must be watch only
- Never generate critical signals from fewer than 100 sessions
- If no previous period data available (change = null): do not generate trend-based signals, only current-state signals

Generate 2-4 specific signals. Reference actual numbers.

VALUE FIELD RULES:
- conversion_fall: value = conversionsChange % (use ${conversionFallValue} — if -100 this is an absolute funnel collapse)
- engagement_drop: value = engagementRate %
- session_duration_drop: value = avgSessionDuration (seconds)
- traffic_source_shift: value = organicPct % (higher organic share = better — aligns with lowerBetter: false in SIGNAL_GOAL_MAP)
- activation_drop: value = newUserRatio % (if low engagement despite high new users)

DATA QUALITY RULES:
- Only generate signals supported by actual numbers in the data above — never infer problems not directly evidenced
- Weekend Drop Guard: do not interpret weekend drops in traffic or conversions as conversion_fall or engagement_drop for B2B profiles — weekend drop-offs are behavioral norms not operational failures
- Holiday Disruption: evaluate sharp spikes or drops during globally recognised holidays against macroeconomic context not standard health thresholds
- Tag Launch Phase: for properties with less than 30 days continuous data default all signal severities to watch — do not escalate short-term variance to critical
- Low Traffic Threshold: if sessions below SAMPLE SIZE RULES baseline suppress traffic_source_shift and session_duration_drop entirely — sample size is mathematically insufficient for stable inference
- Tracking Implementation Errors: sudden massive spike in Unassigned, Direct or (not set) traffic must be interpreted as a UTM tagging or GA4 implementation error not organic behaviour — generate traffic_source_shift warning specifically noting tracking breakdown
- Zero-Bound Funnel Crash: if conversionFallValue = -100 this is an absolute funnel collapse — set value = -100 and severity = critical regardless of session volume

⚠️ CRITICAL LLM INSTRUCTION: Under no circumstances whatsoever may the \`value\` property contain a \`null\` or \`undefined\` data type. A valid numeric representation must be compiled for every single generated signal object.

LANGUAGE REQUIREMENT:
Provide insight_summary and recommended_action as JSON objects with "en" and "ar" keys.
- "en": Professional English
- "ar": Professional Modern Standard Arabic for GCC business leaders
- Keep all metrics, numbers, percentages in international format (e.g., 18%, 1000) regardless of language
- Never translate tool names (GA4, Shopify, Jira stay as-is)

Respond with JSON only — no preamble, no markdown formatting blocks, no backticks. Output a raw parsable string matching this exact shape:

{
  "signals": [
    {
      "signal_type": "conversion_fall",
      "dimension": "marketing",
      "insight_summary": { "en": "specific insight with actual numbers", "ar": "نص عربي محدد بالأرقام الفعلية" },
      "recommended_action": { "en": "specific action", "ar": "إجراء محدد" },
      "severity": "critical|warning|watch",
      "confidence_score": 0.85,
      "value": -18,
      "change_percent": -18,
     "evidence": { "en": "from GA4 data", "ar": "من بيانات GA4" }
    }
  ],
  "overall_diagnosis": "2-3 sentences with actual metrics"
}`

    const response = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      max_tokens: 2000,
      temperature: 0.2,
      response_format: { type: 'json_object' },
      messages: [{ role: 'user', content: prompt }]
    })

    const text = response.choices[0]?.message?.content ?? ''
    // response_format guarantees valid JSON — direct parse, no lastIndexOf needed
    const firstBrace = text.indexOf('{')
    const cleaned = firstBrace > 0 ? text.substring(firstBrace) : text

    let analysis
    try {
      analysis = JSON.parse(cleaned)
    } catch {
      analysis = {
        signals: [{
          signal_type: 'engagement_drop',
          dimension: 'marketing',
          insight_summary: { en: `Engagement rate at ${ga4Data.engagementRate}% with ${ga4Data.bounceRate}% bounce rate over last 31 days`, ar: `معدل التفاعل ${ga4Data.engagementRate}% مع معدل ارتداد ${ga4Data.bounceRate}% خلال آخر 31 يوماً` },
          recommended_action: { en: 'Review top exit pages and improve page load speed and content relevance', ar: 'مراجعة أكثر صفحات الخروج زيارةً وتحسين سرعة التحميل وجودة المحتوى' },
          severity: ga4Data.bounceRate > 70 ? 'critical' : 'warning',
          confidence_score: 0.75,
          value: ga4Data.engagementRate,
          change_percent: ga4Data.engagementChange,
          evidence: { en: 'From GA4 data', ar: 'من بيانات GA4' },
        }],
        overall_diagnosis: `${ga4Data.sessions} sessions with ${ga4Data.engagementRate}% engagement rate. ${ga4Data.conversions} conversions recorded.`
      }
    }

    // Deduplication with trend tracking
    const { data: existing } = await admin
      .from('diagnostic_signals')
      .select('id, signal_type, value, change_percent, scan_count')
      .eq('founder_id', founderId)
      .eq('source', 'ga4')
      .in('status', ['new', 'acknowledged'])

    const existingMap = new Map(existing?.map(s => [s.signal_type, s]) ?? [])
    let inserted = 0
    let updated = 0
    const touchedSignals: SignalUpsertResult[] = []

    const rawSignals = (analysis.signals ?? []).filter((s: Record<string, unknown>) => ((s.confidence_score as number) ?? 0.85) >= 0.5).map((s: Record<string, unknown>) => normalise(s))
    const mergedSignals = mergeSignals(rawSignals)

    for (const n of mergedSignals) {
      const evidenceObj = typeof n.evidence === 'object' && n.evidence !== null
        ? n.evidence as Record<string, string>
        : { en: String(n.evidence ?? ''), ar: String(n.evidence ?? '') }
      const signalRow = {
        founder_id: founderId,
        source_id: ga4Source.id as string,
        signal_type: n.signal_type,
        dimension: n.dimension,
        insight_summary:       (n.insight_summary as unknown as Record<string,string>).en,
        insight_summary_ar:    (n.insight_summary as unknown as Record<string,string>).ar,
        recommended_action:    (n.recommended_action as unknown as Record<string,string>).en,
        recommended_action_ar: (n.recommended_action as unknown as Record<string,string>).ar,
        severity: n.severity,
        confidence_score: (n.confidence_score as number) ?? 0.85,
        value: n.value ?? null,
        change_percent: n.change_percent ?? null,
        source: 'ga4',
        period_start: new Date(Date.now() - 31 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        period_end: new Date().toISOString().split('T')[0],
        raw_data: { ga4Data, evidence: evidenceObj.en, evidence_ar: evidenceObj.ar },
      }

      const prev = existingMap.get(n.signal_type)

      if (prev) {
        const prevVal = prev.value !== null && prev.value !== undefined ? Number(prev.value) : null
        const currVal = signalRow.value !== null && signalRow.value !== undefined ? Number(signalRow.value) : null
        const trend = prevVal !== null && currVal !== null
          ? ga4Trend(n.signal_type, prevVal, currVal)
          : 'unchanged'
        const prevScanCount = prev.scan_count ?? 1
        await admin.from('diagnostic_signals').update({
          ...signalRow,
          previous_value: prev.value ?? null,
          previous_change_percent: prev.change_percent ?? null,
          trend,
          scan_count: prevScanCount + 1,
          updated_at: new Date().toISOString(),
        }).eq('id', prev.id)
        touchedSignals.push({
          id: prev.id,
          signal_type: n.signal_type,
          source: 'ga4',
          severity: n.severity,
          dimension: n.dimension,
          value: signalRow.value,
          change_percent: signalRow.change_percent,
          trend,
          insight_summary:       signalRow.insight_summary,
          insight_summary_ar:    signalRow.insight_summary_ar,
          recommended_action:    signalRow.recommended_action,
          recommended_action_ar: signalRow.recommended_action_ar,
          previous_value: prev.value ?? null,
          scan_count: prevScanCount + 1,
        })
        updated++
      } else {
        // FIX 3: select id after insert so new signals are included in touchedSignals
        // recordScan() snapshots touchedSignals — without this, new signals miss child row snapshot
        const { data: newRow } = await admin.from('diagnostic_signals').insert({
          ...signalRow,
          status:     'new',
          trend:      'new',
          scan_count: 1,
        }).select('id').single()

        if (newRow?.id) {
          touchedSignals.push({
            id:              newRow.id,
            signal_type:     n.signal_type,
            source:          'ga4',
            severity:        n.severity,
            dimension:       n.dimension,
            value:           signalRow.value,
            change_percent:  signalRow.change_percent,
            trend:           'new',
            insight_summary:       signalRow.insight_summary,
            insight_summary_ar:    signalRow.insight_summary_ar,
            recommended_action:    signalRow.recommended_action,
            recommended_action_ar: signalRow.recommended_action_ar,
            previous_value:  null,
            scan_count:      1,
          })
        }
        inserted++
      }
    }

    await admin.from('data_sources')
      .update({ last_synced_at: new Date().toISOString() })
      .eq('id', ga4Source.id as string)

    // FIX 2: pass parentScanId + triggeredBy to recordScan
    // parentScanId links child scan row to master row — measure page filters parent_scan_id IS NULL for master rows
    await recordScan(founderId, 'ga4', touchedSignals, parentScanId, triggeredBy)
    await resetStaleConflictPreferences(founderId, ['ga4'])
    console.log(`GA4: ${inserted} inserted, ${updated} updated | parentScanId=${parentScanId} triggeredBy=${triggeredBy}`)

    return NextResponse.json({
      success: true,
      signals: inserted + updated,
      inserted,
      updated,
      ga4Data,
      overall_diagnosis: analysis.overall_diagnosis,
    })

  } catch (err) {
    console.error('GA4 scrape error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}