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
    if (signal_type?.includes('refund') || signal_type?.includes('return')) signal_type = 'refund_spike'
    else if (signal_type?.includes('aov') || signal_type?.includes('order_value') || signal_type?.includes('average_order')) signal_type = 'aov_decline'
    else if (signal_type?.includes('repeat') || signal_type?.includes('retention') || signal_type?.includes('loyal')) signal_type = 'repeat_purchase_drop'
    else if (signal_type?.includes('churn') || signal_type?.includes('cancel') || signal_type?.includes('lost')) signal_type = 'churn_spike'
    else if (signal_type?.includes('conver') || signal_type?.includes('checkout') || signal_type?.includes('order_drop')) signal_type = 'conversion_fall'
    else if (signal_type?.includes('engag')) signal_type = 'engagement_drop'
    else signal_type = 'refund_spike'
  }
  let dimension = s.dimension as string
  if (!VALID_DIMENSIONS.includes(dimension)) {
    if (dimension?.includes('revenue') || dimension?.includes('order') || dimension?.includes('finance') || dimension?.includes('sales')) dimension = 'revenue'
    else if (dimension?.includes('customer') || dimension?.includes('retention') || dimension?.includes('churn')) dimension = 'customer'
    else if (dimension?.includes('product')) dimension = 'product'
    else dimension = 'revenue'
  }
  let severity = (s.severity as string)?.toLowerCase()
  if (!VALID_SEVERITIES.includes(severity)) {
    if (severity === 'high' || severity === 'urgent') severity = 'critical'
    else if (severity === 'medium' || severity === 'moderate') severity = 'warning'
    else severity = 'watch'
  }
  return { ...s, signal_type, dimension, severity }
}

// Shopify signal directions
const SHOPIFY_DIRECTION: Record<string, 'lower_better' | 'higher_better'> = {
  refund_spike: 'lower_better',
  aov_decline: 'higher_better',
  repeat_purchase_drop: 'higher_better',
  churn_spike: 'lower_better',
  conversion_fall: 'higher_better',
}

function computeTrend(signalType: string, prevVal: number, currVal: number): 'improving' | 'worsening' | 'unchanged' {
  if (prevVal === currVal) return 'unchanged'
  const dir = SHOPIFY_DIRECTION[signalType] ?? 'lower_better'
  if (dir === 'lower_better') return currVal < prevVal ? 'improving' : 'worsening'
  return currVal > prevVal ? 'improving' : 'worsening'
}

async function fetchShopifyData(shop: string, accessToken: string) {
  const headers = {
    'X-Shopify-Access-Token': accessToken,
    'Content-Type': 'application/json',
  }
  const base = `https://${shop}/admin/api/2026-04`

  const now = new Date()
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  // Current period orders
  const ordersRes = await fetch(
    `${base}/orders.json?status=any&created_at_min=${thirtyDaysAgo}&limit=250&fields=id,created_at,total_price,financial_status,customer,line_items,cancel_reason`,
    { headers }
  )
  if (!ordersRes.ok) throw new Error(`SHOPIFY_${ordersRes.status}`)
    const ordersData = await ordersRes.json()
  const orders = (ordersData.orders ?? []) as Record<string, unknown>[]

  // Previous period orders for comparison
  const prevOrdersRes = await fetch(
    `${base}/orders.json?status=any&created_at_min=${sixtyDaysAgo}&created_at_max=${thirtyDaysAgo}&limit=250&fields=id,created_at,total_price,financial_status,customer`,
    { headers }
  )
  if (!prevOrdersRes.ok) throw new Error(`SHOPIFY_${prevOrdersRes.status}`)  
  const prevOrdersData = await prevOrdersRes.json()
  const prevOrders = (prevOrdersData.orders ?? []) as Record<string, unknown>[]

  // New customers this period
  const customersRes = await fetch(
    `${base}/customers.json?created_at_min=${thirtyDaysAgo}&limit=250&fields=id,created_at,orders_count,total_spent`,
    { headers }
  )
  const customersData = await customersRes.json()
  const newCustomers = (customersData.customers ?? []) as Record<string, unknown>[]

  // Process metrics
  const totalOrders = orders.length
  const prevTotalOrders = prevOrders.length

  const totalRevenue = orders.reduce((sum: number, o) =>
    sum + parseFloat(o.total_price as string ?? '0'), 0)
  const prevRevenue = prevOrders.reduce((sum: number, o) =>
    sum + parseFloat(o.total_price as string ?? '0'), 0)

  const refundedOrders = orders.filter(o =>
    o.financial_status === 'refunded' || o.financial_status === 'partially_refunded'
  )
  const prevRefundedOrders = prevOrders.filter(o =>
    o.financial_status === 'refunded' || o.financial_status === 'partially_refunded'
  )

  const aov = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0
  const prevAov = prevTotalOrders > 0 ? Math.round(prevRevenue / prevTotalOrders) : 0

  const refundRate = totalOrders > 0
    ? parseFloat(((refundedOrders.length / totalOrders) * 100).toFixed(1))
    : 0
  const prevRefundRate = prevTotalOrders > 0
    ? parseFloat(((prevRefundedOrders.length / prevTotalOrders) * 100).toFixed(1))
    : 0

  // Repeat purchase analysis
  const customerOrderCounts: Record<string, number> = {}
  for (const order of orders) {
    const customerId = String((order.customer as Record<string, unknown>)?.id ?? '')
    if (customerId && customerId !== 'undefined') {
      customerOrderCounts[customerId] = (customerOrderCounts[customerId] ?? 0) + 1
    }
  }
  const uniqueCustomers = Object.keys(customerOrderCounts).length
  const repeatCustomers = Object.values(customerOrderCounts).filter(c => c > 1).length
  const repeatPurchaseRate = uniqueCustomers > 0
    ? parseFloat(((repeatCustomers / uniqueCustomers) * 100).toFixed(1))
    : 0

  // Cancel reasons
  const cancelReasons = orders
    .filter(o => o.cancel_reason)
    .map(o => o.cancel_reason as string)
  const topCancelReason = cancelReasons.length > 0
    ? cancelReasons.reduce((a, b) =>
        cancelReasons.filter(v => v === a).length >= cancelReasons.filter(v => v === b).length ? a : b
      )
    : null

  const pctChange = (curr: number, prev: number) =>
    prev > 0 ? Math.round(((curr - prev) / prev) * 100) : null

  return {
    totalOrders,
    prevTotalOrders,
    ordersChange: pctChange(totalOrders, prevTotalOrders),
    totalRevenue: Math.round(totalRevenue),
    prevRevenue: Math.round(prevRevenue),
    revenueChange: pctChange(totalRevenue, prevRevenue),
    aov,
    prevAov,
    aovChange: pctChange(aov, prevAov),
    refundRate,
    prevRefundRate,
    refundRateChange: pctChange(refundRate, prevRefundRate),
    refundedOrders: refundedOrders.length,
    repeatPurchaseRate,
    repeatCustomers,
    uniqueCustomers,
    newCustomers: newCustomers.length,
    topCancelReason,
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
      .eq('source_type', 'shopify')
      .eq('status', 'active')
      .maybeSingle()

      if (!source?.access_token) {
        return NextResponse.json({ error: 'Could not reach your Shopify store. Check your connection.' }, { status: 400 })
      }

    const shop = (source.config as Record<string, string>)?.shop
    if (!shop) return NextResponse.json({ error: 'Shop not configured' }, { status: 400 })

    console.log(`Fetching Shopify data for: ${shop}`)

    let shopifyData
    try {
      shopifyData = await fetchShopifyData(shop, source.access_token)
    } catch (err) {
      const raw = String(err)
      const isAuthError = raw.includes('401') || raw.includes('403')
      return NextResponse.json({
        error: isAuthError
          ? 'Shopify disconnected. Please reconnect.'
          : 'Could not reach your Shopify store. Check your connection.'
      }, { status: 500 })
    }

    console.log('Shopify data:', JSON.stringify(shopifyData))

    if (shopifyData.totalOrders === 0 && shopifyData.prevTotalOrders === 0) {
      return NextResponse.json({ success: true, signals: 0, message: 'No orders found in last 60 days' })
    }

    const prompt = `You are Elvanis, an AI business analyst. Analyse this Shopify store data and generate diagnostic signals.

METRICS — current 30 days vs previous 30 days:
- Total orders: ${shopifyData.totalOrders} now vs ${shopifyData.prevTotalOrders} previous (${shopifyData.ordersChange !== null ? shopifyData.ordersChange + '%' : 'no comparison'} change)
- Total revenue: £${shopifyData.totalRevenue} now vs £${shopifyData.prevRevenue} previous (${shopifyData.revenueChange !== null ? shopifyData.revenueChange + '%' : 'no comparison'} change)
- Average order value: £${shopifyData.aov} now vs £${shopifyData.prevAov} previous (${shopifyData.aovChange !== null ? shopifyData.aovChange + '%' : 'no comparison'} change)
- Refund rate: ${shopifyData.refundRate}% now vs ${shopifyData.prevRefundRate}% previous (${shopifyData.refundRateChange !== null ? shopifyData.refundRateChange + '%' : 'no comparison'} change)
- Refunded orders: ${shopifyData.refundedOrders} out of ${shopifyData.totalOrders}
- Repeat purchase rate: ${shopifyData.repeatPurchaseRate}% (${shopifyData.repeatCustomers} of ${shopifyData.uniqueCustomers} customers ordered more than once)
- New customers acquired: ${shopifyData.newCustomers}
${shopifyData.topCancelReason ? `- Top cancellation reason: ${shopifyData.topCancelReason}` : ''}

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
- refund_spike: refund rate high or increasing
- aov_decline: average order value dropping
- repeat_purchase_drop: repeat purchase rate declining or below 20%
- churn_spike: customers not returning, retention declining
- conversion_fall: order volume declining significantly

THRESHOLDS:
- Refund rate > 5% = refund_spike warning
- Refund rate > 10% = refund_spike critical
- Refund rate increased > 50% vs previous = refund_spike critical
- AOV declined > 10% = aov_decline warning
- AOV declined > 20% = aov_decline critical
- Repeat purchase rate < 20% = repeat_purchase_drop warning
- Repeat purchase rate < 10% = repeat_purchase_drop critical
- Orders declined > 20% = conversion_fall warning
- Orders declined > 40% = conversion_fall critical
- New customers < 5 with low repeat rate = churn_spike watch

SAMPLE SIZE RULES:
- If totalOrders < 10: reduce all severities by one level (critical → warning, warning → watch) and add to insight_summary: "Based on limited data (${shopifyData.totalOrders} orders) — verify trend with more transactions before acting."
- If totalOrders < 5: confidence_score must not exceed 0.65 and severity must be watch only
- Never generate critical signals from fewer than 10 orders

Generate 2-4 signals. Use exact numbers from the data. Only generate a signal if there is a real problem.

VALUE FIELD RULES — never return null for value:
- refund_spike: value = refundRate (percentage)
- aov_decline: value = aov (£ amount)
- repeat_purchase_drop: value = repeatPurchaseRate (percentage)
- conversion_fall: value = ordersChange (percentage change) if available, otherwise totalOrders (order count)
- churn_spike: if exact churn percentage cannot be calculated, estimate a severity-based proxy score from 1 to 100 based on the volume and velocity of churning indicators in the context (1=minimal churn risk, 100=severe churn risk). Never return null for the value field.
- All signals: never return null for the value field under any circumstance

⚠️ CRITICAL LLM INSTRUCTION: Under no circumstances whatsoever may the \`value\` property contain a \`null\` or \`undefined\` data type. A valid numeric representation must be compiled for every single generated signal object.

Respond with JSON only — no preamble, no markdown formatting blocks, no backticks. Output a raw parsable string matching this exact shape:
{
  "signals": [
    {
      "signal_type": "refund_spike",
      "dimension": "revenue",
      "insight_summary": "specific insight with exact numbers",
      "recommended_action": "specific action this week",
      "severity": "critical|warning|watch",
      "confidence_score": 0.85,
      "value": 8.5,
      "change_percent": 42,
      "evidence": "from Shopify order data"
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
    console.log('Shopify AI response:', text.substring(0, 300))

    // response_format guarantees valid JSON — direct parse, no lastIndexOf needed
    const firstBrace = text.indexOf('{')
    const cleaned = firstBrace > 0 ? text.substring(firstBrace) : text

    let analysis
    try {
      analysis = JSON.parse(cleaned)
    } catch (parseErr) {
      console.error('Shopify AI parse failed:', parseErr)
      analysis = {
        signals: [{
          signal_type: shopifyData.refundRate > 5 ? 'refund_spike'
            : shopifyData.repeatPurchaseRate < 20 ? 'repeat_purchase_drop'
            : 'conversion_fall',
          dimension: 'revenue',
          insight_summary: `${shopifyData.totalOrders} orders with £${shopifyData.aov} AOV and ${shopifyData.refundRate}% refund rate in last 30 days`,
          recommended_action: 'Review refund reasons and identify patterns in returned products',
          severity: shopifyData.refundRate > 10 ? 'critical' : 'warning',
          confidence_score: 0.75,
          value: shopifyData.refundRate,
          change_percent: shopifyData.refundRateChange,
          evidence: 'From Shopify order data',
        }],
        overall_diagnosis: `${shopifyData.totalOrders} orders generating £${shopifyData.totalRevenue} with ${shopifyData.refundRate}% refund rate and ${shopifyData.repeatPurchaseRate}% repeat purchase rate.`
      }
    }

    // Fetch existing signals including scan_count for trend tracking
    const { data: existing } = await admin
      .from('diagnostic_signals')
      .select('id, signal_type, value, change_percent, scan_count')
      .eq('founder_id', founderId)
      .eq('source', 'shopify')
      .in('status', ['new', 'acknowledged'])

    const existingMap = new Map(existing?.map(s => [s.signal_type, s]) ?? [])
    let inserted = 0
    let updated = 0
    const touchedSignals: SignalUpsertResult[] = []

    const rawSignals = (analysis.signals ?? []).filter((s: Record<string, unknown>) => ((s.confidence_score as number) ?? 0.85) >= 0.5).map((s: Record<string, unknown>) => normalise(s))
    const mergedSignals = mergeSignals(rawSignals)

    for (const n of mergedSignals) {

      const signalRow = {
        founder_id: founderId,
        source_id: source.id as string,
        signal_type: n.signal_type,
        dimension: n.dimension,
        insight_summary: (n.insight_summary as string) ?? 'Signal detected',
        recommended_action: (n.recommended_action as string) ?? 'Review and take action',
        severity: n.severity,
        confidence_score: (n.confidence_score as number) ?? 0.85,
        value: n.value ?? null,
        change_percent: n.change_percent ?? null,
        source: 'shopify',
        period_start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        period_end: new Date().toISOString().split('T')[0],
        raw_data: { shopifyData, evidence: n.evidence },
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
          source: 'shopify',
          severity: n.severity,
          dimension: n.dimension,
          value: signalRow.value,
          change_percent: signalRow.change_percent,
          trend,
          insight_summary: signalRow.insight_summary,
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
            source:          'shopify',
            severity:        n.severity,
            dimension:       n.dimension,
            value:           signalRow.value,
            change_percent:  signalRow.change_percent,
            trend:           'new',
            insight_summary: signalRow.insight_summary,
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
    await recordScan(founderId, 'shopify', touchedSignals, parentScanId, triggeredBy)
    await resetStaleConflictPreferences(founderId, ['shopify'])
    console.log(`Shopify: ${inserted} inserted, ${updated} updated | parentScanId=${parentScanId} triggeredBy=${triggeredBy}`)

    return NextResponse.json({
      success: true,
      signals: inserted + updated,
      inserted,
      updated,
      shopifyData,
      overall_diagnosis: analysis.overall_diagnosis,
    })

  } catch (err) {
    console.error('Shopify scrape error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}