import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import { recordScan } from '@/lib/scan-recorder'
import type { SignalUpsertResult } from '@/lib/scan-recorder'
import Groq from 'groq-sdk'
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
    if (signal_type?.includes('ticket') || signal_type?.includes('conversation') || signal_type?.includes('volume')) signal_type = 'ticket_volume_increase'
    else if (signal_type?.includes('response') || signal_type?.includes('resolution') || signal_type?.includes('wait')) signal_type = 'response_time_increase'
    else if (signal_type?.includes('repeat') || signal_type?.includes('complaint') || signal_type?.includes('pattern')) signal_type = 'repeat_complaint_pattern'
    else if (signal_type?.includes('churn') || signal_type?.includes('cancel')) signal_type = 'churn_spike'
    else if (signal_type?.includes('activ') || signal_type?.includes('onboard')) signal_type = 'activation_drop'
    else if (signal_type?.includes('csat') || signal_type?.includes('satisfaction')) signal_type = 'csat_decline'
    else signal_type = 'ticket_volume_increase'
  }
  let dimension = s.dimension as string
  if (!VALID_DIMENSIONS.includes(dimension)) {
    if (dimension?.includes('customer') || dimension?.includes('support') || dimension?.includes('cs')) dimension = 'customer'
    else if (dimension?.includes('product') || dimension?.includes('feature') || dimension?.includes('onboard')) dimension = 'product'
    else if (dimension?.includes('team') || dimension?.includes('eng')) dimension = 'team'
    else dimension = 'customer'
  }
  let severity = (s.severity as string)?.toLowerCase()
  if (!VALID_SEVERITIES.includes(severity)) {
    if (severity === 'high' || severity === 'urgent') severity = 'critical'
    else if (severity === 'medium' || severity === 'moderate') severity = 'warning'
    else severity = 'watch'
  }
  return { ...s, signal_type, dimension, severity }
}

const INTERCOM_DIRECTION: Record<string, 'lower_better' | 'higher_better'> = {
  ticket_volume_increase: 'lower_better',
  response_time_increase: 'lower_better',
  repeat_complaint_pattern: 'lower_better',
  churn_spike: 'lower_better',
  activation_drop: 'higher_better',
  csat_decline: 'higher_better',
}

function computeTrend(signalType: string, prevVal: number, currVal: number): 'improving' | 'worsening' | 'unchanged' {
  if (prevVal === currVal) return 'unchanged'
  const dir = INTERCOM_DIRECTION[signalType] ?? 'lower_better'
  if (dir === 'lower_better') return currVal < prevVal ? 'improving' : 'worsening'
  return currVal > prevVal ? 'improving' : 'worsening'
}

async function fetchIntercomData(accessToken: string) {
  const headers = {
    Authorization: `Bearer ${accessToken}`,
    Accept: 'application/json',
    'Intercom-Version': '2.11',
  }

  const now = Math.floor(Date.now() / 1000)
  const thirtyDaysAgo = now - 30 * 24 * 60 * 60
  const sixtyDaysAgo = now - 60 * 24 * 60 * 60

  const convsRes = await fetch(
    `https://api.intercom.io/conversations?started_after=${thirtyDaysAgo}&per_page=150`,
    { headers }
  )
  const convsData = await convsRes.json()
  const conversations = (convsData.conversations ?? []) as Record<string, unknown>[]

  const prevConvsRes = await fetch(
    `https://api.intercom.io/conversations?started_after=${sixtyDaysAgo}&started_before=${thirtyDaysAgo}&per_page=150`,
    { headers }
  )
  const prevConvsData = await prevConvsRes.json()
  const prevConversations = (prevConvsData.conversations ?? []) as Record<string, unknown>[]

  const totalConversations = conversations.length
  const prevTotalConversations = prevConversations.length

  const openConversations = conversations.filter(c => (c.state as string) === 'open')
  const resolvedConversations = conversations.filter(c =>
    (c.state as string) === 'closed' || (c.state as string) === 'resolved'
  )

  const responseTimes = conversations
    .map(c => Number((c.statistics as Record<string, unknown>)?.first_response_time ?? 0))
    .filter(t => t > 0)
  const avgFirstResponseHours = responseTimes.length > 0
    ? parseFloat((responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length / 3600).toFixed(1))
    : 0

  const prevResponseTimes = prevConversations
    .map(c => Number((c.statistics as Record<string, unknown>)?.first_response_time ?? 0))
    .filter(t => t > 0)
  const prevAvgFirstResponseHours = prevResponseTimes.length > 0
    ? parseFloat((prevResponseTimes.reduce((a, b) => a + b, 0) / prevResponseTimes.length / 3600).toFixed(1))
    : 0

  const resolutionTimes = resolvedConversations
    .map(c => Number((c.statistics as Record<string, unknown>)?.time_to_resolution ?? 0))
    .filter(t => t > 0)
  const avgResolutionHours = resolutionTimes.length > 0
    ? parseFloat((resolutionTimes.reduce((a, b) => a + b, 0) / resolutionTimes.length / 3600).toFixed(1))
    : 0

  const csatRatings = conversations
    .map(c => Number((c.conversation_rating as Record<string, unknown>)?.rating ?? 0))
    .filter(r => r > 0)
  const avgCsat = csatRatings.length > 0
    ? parseFloat((csatRatings.reduce((a, b) => a + b, 0) / csatRatings.length).toFixed(1))
    : null

  const contactCounts: Record<string, number> = {}
  for (const conv of conversations) {
    const contacts = (conv.contacts as Record<string, unknown[]>)?.contacts ?? []
    const firstContact = contacts[0] as Record<string, unknown> | undefined
    const contactId = String(firstContact?.id ?? '')
    if (contactId && contactId !== '' && contactId !== 'undefined') {
      contactCounts[contactId] = (contactCounts[contactId] ?? 0) + 1
    }
  }
  const uniqueContacts = Object.keys(contactCounts).length
  const repeatContacts = Object.values(contactCounts).filter(c => c > 1).length
  const repeatContactRate = uniqueContacts > 0
    ? parseFloat(((repeatContacts / uniqueContacts) * 100).toFixed(1))
    : 0

  const longOpenConversations = openConversations.filter(c => {
    const createdAt = Number(c.created_at ?? 0)
    return (now - createdAt) > 48 * 3600
  })

  const pctChange = (curr: number, prev: number) =>
    prev > 0 ? Math.round(((curr - prev) / prev) * 100) : null

  return {
    totalConversations,
    prevTotalConversations,
    conversationsChange: pctChange(totalConversations, prevTotalConversations),
    openConversations: openConversations.length,
    resolvedConversations: resolvedConversations.length,
    avgFirstResponseHours,
    prevAvgFirstResponseHours,
    responseTimeChange: pctChange(
      Math.round(avgFirstResponseHours * 10),
      Math.round(prevAvgFirstResponseHours * 10)
    ),
    avgResolutionHours,
    repeatContactRate,
    repeatContacts,
    uniqueContacts,
    longOpenConversations: longOpenConversations.length,
    avgCsat,
    csatRatingsCount: csatRatings.length,
  }
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
    // parentScanId: links child scan row to master row
    // triggeredBy: 'connect' default — passed through from parent route when called via full scan
    const { founderId, parentScanId = null, triggeredBy = 'connect', founderContext = {} } = await request.json()
    const admin = createAdminClient()

    const { data: source } = await admin
      .from('data_sources')
      .select('*')
      .eq('founder_id', founderId)
      .eq('source_type', 'intercom')
      .eq('status', 'active')
      .maybeSingle()

      if (!source?.access_token) {
        return NextResponse.json({ error: 'Intercom disconnected. Please reconnect.' }, { status: 400 })
      }

    console.log('Fetching Intercom data...')

    let intercomData
    try {
      intercomData = await fetchIntercomData(source.access_token)
    } catch (err) {
      const raw = String(err)
      const isAuthError = raw.includes('401') || raw.includes('403') || raw.includes('Unauthorized') || raw.includes('unauthorized')
      return NextResponse.json({
        error: isAuthError
          ? 'Intercom disconnected. Please reconnect.'
          : 'Could not reach Intercom. Try again later.'
      }, { status: 500 })
    }

    console.log('Intercom data:', JSON.stringify(intercomData))

    if (intercomData.totalConversations === 0 && intercomData.prevTotalConversations === 0) {
      return NextResponse.json({ success: true, signals: 0, message: 'No conversations found' })
    }

    const prompt = `You are Elvanis, an AI business analyst. Analyse this Intercom customer support data and generate diagnostic signals.

METRICS — current 30 days vs previous 30 days:
- Total conversations: ${intercomData.totalConversations} now vs ${intercomData.prevTotalConversations} previous (${intercomData.conversationsChange !== null ? intercomData.conversationsChange + '%' : 'no comparison'} change)
- Open conversations: ${intercomData.openConversations}
- Resolved conversations: ${intercomData.resolvedConversations}
- Avg first response time: ${intercomData.avgFirstResponseHours}h now vs ${intercomData.prevAvgFirstResponseHours}h previous (${intercomData.responseTimeChange !== null ? intercomData.responseTimeChange + '%' : 'no comparison'} change)
- Avg resolution time: ${intercomData.avgResolutionHours}h
- Conversations open more than 48h: ${intercomData.longOpenConversations}
- Repeat contact rate: ${intercomData.repeatContactRate}% (${intercomData.repeatContacts} of ${intercomData.uniqueContacts} contacts opened multiple conversations)
${intercomData.avgCsat !== null ? `- Avg CSAT: ${intercomData.avgCsat}/5 from ${intercomData.csatRatingsCount} ratings` : '- CSAT: not configured'}

FOUNDER CONTEXT:
- Industry: ${(founderContext as Record<string,string>).industry ?? 'Not specified'}
- Market: ${(founderContext as Record<string,string>).market ?? 'Not specified'}
- Stage: ${(founderContext as Record<string,string>).founder_stage ?? 'Not specified'}
- Primary focus: ${(founderContext as Record<string,string>).focus_metric ?? 'Not specified'}

Use this context to calibrate signal severity and recommendations:
- Gulf e-commerce founders have different support and revenue benchmarks than UK B2B SaaS founders
- Early stage founders need validation-focused actions; product_customers founders need operational fixes
- Primary focus metric shapes which signals to escalate vs monitor

AVAILABLE SIGNAL TYPES:
- ticket_volume_increase: conversation volume rising significantly
- response_time_increase: first response or resolution time too high
- repeat_complaint_pattern: high repeat contact rate — unresolved root issues
- activation_drop: users stuck in onboarding or getting started
- csat_decline: CSAT score low or declining
- churn_spike: conversations about cancellation or leaving

THRESHOLDS:
- Conversations up > 30% = ticket_volume_increase warning
- Conversations up > 60% = ticket_volume_increase critical
- First response > 4h = response_time_increase warning
- First response > 24h = response_time_increase critical
- Resolution time > 24h = response_time_increase warning
- Open > 48h count > 10 = response_time_increase critical
- Repeat contact rate > 25% = repeat_complaint_pattern warning
- Repeat contact rate > 40% = repeat_complaint_pattern critical
- CSAT < 3.5 = csat_decline warning
- CSAT < 2.5 = csat_decline critical

DATA QUALITY RULES:
- Only generate signals where there is a real problem supported by the numbers above
- Do not generate positive signals
- If totalConversations < 5: reduce all severities by one level and note "Based on limited conversations (N) — verify with more data"
- If avgCsat is null: do not generate csat_decline signal
- Never infer problems not directly supported by the metrics provided

CSAT SCALE DETECTION:
- If avgCsat is between -1 and 2: this is a thumbs scale (1=positive, -1=negative)
  → Do NOT apply star-rating thresholds
  → Generate csat_decline only if avgCsat < 0 (net negative sentiment)
  → For value field: use normalised score ((avgCsat + 1) / 2) * 5 to convert thumbs to 0-5 scale
- If avgCsat is between 2 and 5: this is a star scale — apply standard CSAT thresholds above

VALUE FIELD RULES:
- ticket_volume_increase: value = totalConversations
- response_time_increase: value = avgFirstResponseHours
- repeat_complaint_pattern: value = repeatContactRate (percentage)
- csat_decline: value = avgCsat (normalised to 0-5 if thumbs scale per CSAT SCALE DETECTION above)
- activation_drop: if exact activation percentage unavailable, estimate a severity-based proxy score from 1 to 100 based on onboarding and engagement indicators in the context (1=healthy activation, 100=severe activation problem). Never return null for the value field.
- churn_spike: if exact churn percentage unavailable, estimate a severity-based proxy score from 1 to 100 based on the volume and velocity of churning indicators in the context (1=minimal churn risk, 100=severe churn risk). Never return null for the value field.

⚠️ CRITICAL LLM INSTRUCTION: Under no circumstances whatsoever may the \`value\` property contain a \`null\` or \`undefined\` data type. A valid numeric representation must be compiled for every single generated signal object.

LANGUAGE REQUIREMENT:
Provide insight_summary and recommended_action as JSON objects with "en" and "ar" keys.
- "en": Professional English
- "ar": Professional Modern Standard Arabic for GCC business leaders
- Keep all metrics, numbers, percentages in international format (e.g., 18%, 1000) regardless of language
- Never translate tool names (GA4, Shopify, Jira, Intercom stay as-is)

Respond with JSON only — no preamble, no markdown formatting blocks, no backticks. Output a raw parsable string matching this exact shape:

{
  "signals": [
    {
      "signal_type": "response_time_increase",
      "dimension": "customer",
      "insight_summary": { "en": "specific insight with exact numbers from the data", "ar": "نص عربي محدد بالأرقام الفعلية" },
      "recommended_action": { "en": "specific action this week", "ar": "إجراء محدد هذا الأسبوع" },
      "severity": "critical|warning|watch",
      "confidence_score": 0.85,
      "value": 6.5,
      "change_percent": 42,
      "evidence": { "en": "from Intercom conversation data", "ar": "من بيانات محادثات Intercom" }    }
  ],
  "overall_diagnosis": "2-3 sentences with actual metrics"
}`

    const response = await groq.chat.completions.create({
      model: 'openai/gpt-oss-20b',
      max_tokens: 2000,
      temperature: 0.2,
      response_format: { type: 'json_object' },
      messages: [{ role: 'user', content: prompt }]
    })

    const text = response.choices[0]?.message?.content ?? ''
    console.log('Intercom AI response:', text.substring(0, 300))

    // response_format guarantees valid JSON — direct parse, no lastIndexOf needed
    const firstBrace = text.indexOf('{')
    const cleaned = firstBrace > 0 ? text.substring(firstBrace) : text
      .replace(/\t/g, ' ')

    let analysis
    try {
      analysis = JSON.parse(cleaned)
    } catch (parseErr) {
      console.error('Intercom AI parse failed:', parseErr)
      analysis = {
        signals: [{
          signal_type: intercomData.avgFirstResponseHours > 4
            ? 'response_time_increase'
            : intercomData.repeatContactRate > 25
            ? 'repeat_complaint_pattern'
            : 'ticket_volume_increase',
          dimension: 'customer',
          insight_summary:    { en: `${intercomData.totalConversations} conversations with ${intercomData.avgFirstResponseHours}h avg first response and ${intercomData.repeatContactRate}% repeat contact rate`, ar: `${intercomData.totalConversations} محادثة بمتوسط وقت استجابة أول ${intercomData.avgFirstResponseHours} ساعة ومعدل تواصل متكرر ${intercomData.repeatContactRate}%` },
          recommended_action: { en: 'Review open conversations older than 48 hours and identify recurring complaint themes', ar: 'مراجعة المحادثات المفتوحة منذ أكثر من 48 ساعة وتحديد أنماط الشكاوى المتكررة' },
          confidence_score: 0.75,
          value: intercomData.avgFirstResponseHours,
          change_percent: intercomData.responseTimeChange,
          evidence: { en: 'From Intercom conversation data', ar: 'من بيانات محادثات Intercom' },        }],
        overall_diagnosis: `${intercomData.totalConversations} conversations in last 30 days. Avg first response ${intercomData.avgFirstResponseHours}h. ${intercomData.openConversations} currently open.`
      }
    }

    // Fetch existing signals including scan_count
    const { data: existing } = await admin
      .from('diagnostic_signals')
      .select('id, signal_type, value, change_percent, scan_count')
      .eq('founder_id', founderId)
      .eq('source', 'intercom')
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
        source_id: source.id as string,
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
        source: 'intercom',
        period_start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        period_end: new Date().toISOString().split('T')[0],
        raw_data: { intercomData, evidence: evidenceObj.en, evidence_ar: evidenceObj.ar },
      }

      const prev = existingMap.get(n.signal_type)

      if (prev) {
        const prevVal = prev.value !== null && prev.value !== undefined ? Number(prev.value) : null
        const currVal = signalRow.value !== null && signalRow.value !== undefined ? Number(signalRow.value) : null
        const trend = prevVal !== null && currVal !== null
          ? computeTrend(n.signal_type, prevVal, currVal)
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
          source: 'intercom',
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
        // I4: select id after insert — new signals included in child row snapshots via recordScan()
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
            source:          'intercom',
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
      .eq('id', source.id as string)

    // I2: pass parentScanId + triggeredBy — links child scan row to master row
    await recordScan(founderId, 'intercom', touchedSignals, parentScanId, triggeredBy)
    await resetStaleConflictPreferences(founderId, ['intercom'])
    console.log(`Intercom: ${inserted} inserted, ${updated} updated | parentScanId=${parentScanId} triggeredBy=${triggeredBy}`)

    return NextResponse.json({
      success: true,
      signals: inserted + updated,
      inserted,
      updated,
      intercomData,
      overall_diagnosis: analysis.overall_diagnosis,
    })

  } catch (err) {
    console.error('Intercom scrape error:', err)
    return NextResponse.json({ error: 'Analysis temporarily unavailable. Your data was saved. Try again in a few minutes.' }, { status: 500 })
  }
}