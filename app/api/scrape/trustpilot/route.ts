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
  signal_type: string; dimension: string; severity: string
  insight_summary?: string; recommended_action?: string
  confidence_score?: number; value?: number | null
  change_percent?: number | null; evidence?: string
}

function normalise(s: Record<string, unknown>): NormalisedSignal {
  let signal_type = s.signal_type as string
  if (!VALID_SIGNAL_TYPES.includes(signal_type)) {
    if (signal_type?.includes('delivery') || signal_type?.includes('return') || signal_type?.includes('refund')) signal_type = 'refund_spike'
    else if (signal_type?.includes('service') || signal_type?.includes('support') || signal_type?.includes('ticket')) signal_type = 'ticket_volume_increase'
    else if (signal_type?.includes('rating') || signal_type?.includes('review')) signal_type = 'rating_decline'
    else if (signal_type?.includes('churn') || signal_type?.includes('retention')) signal_type = 'churn_spike'
    else if (signal_type?.includes('nps') || signal_type?.includes('net_promoter')) signal_type = 'nps_decline'
    else if (signal_type?.includes('csat') || signal_type?.includes('satisfaction')) signal_type = 'csat_decline'
    else signal_type = 'repeat_complaint_pattern'
  }
  let dimension = s.dimension as string
  if (!VALID_DIMENSIONS.includes(dimension)) {
    if (dimension?.includes('logistic') || dimension?.includes('deliver') || dimension?.includes('support') || dimension?.includes('return')) dimension = 'customer'
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

// Trustpilot: rating signals — higher is better; complaint signals — lower is better
const TP_SIGNAL_DIRECTION: Record<string, 'lower_better' | 'higher_better'> = {
  rating_decline: 'higher_better',
  repeat_complaint_pattern: 'lower_better',
  churn_spike: 'lower_better',
  refund_spike: 'lower_better',
  response_time_increase: 'lower_better',
  nps_decline: 'higher_better',
  csat_decline: 'higher_better',
}

function tpTrend(signalType: string, prevVal: number, currVal: number): string {
  const dir = TP_SIGNAL_DIRECTION[signalType] ?? 'higher_better'
  if (dir === 'lower_better') return currVal < prevVal ? 'improving' : currVal > prevVal ? 'worsening' : 'unchanged'
  return currVal > prevVal ? 'improving' : currVal < prevVal ? 'worsening' : 'unchanged'
}

async function scrapeTrustpilot(domain: string) {
  const targetUrl = `https://www.trustpilot.com/review/${domain}`;
  
  if (!process.env.FIRECRAWL_API_KEY) {
    throw new Error("Missing FIRECRAWL_API_KEY in environment variables");
  }

  // Firecrawl unblocks the page and converts it directly to clean text/markdown for your LLM
  const res = await fetch('https://api.firecrawl.dev/v1/scrape', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.FIRECRAWL_API_KEY}`
    },
    body: JSON.stringify({
      url: targetUrl,
      formats: ['markdown']
    })
  });

  if (!res.ok) throw new Error(`Firecrawl request failed with status: ${res.status}`);
  const data = await res.json();
  const markdownText = data.data?.markdown || '';

  // Parse metrics using resilient regex matches from the structured text
  const ratingMatch = markdownText.match(/([1-5](\.\d)?)\s*out of 5/i) || markdownText.match(/TrustScore\s*([1-5](\.\d)?)/i);
  const rating = ratingMatch ? parseFloat(ratingMatch[1]) : null;

  const countMatch = markdownText.match(/([\d,]+)\s*total reviews/i) || markdownText.match(/([\d,]+)\s*reviews/i);
  const reviewCount = countMatch ? parseInt(countMatch[1].replace(/,/g, '')) : null;

  // Grab blocks of sentences to feed your existing recent reviews array
  const cleanReviews = markdownText.split('\n')
    .filter((line: string) => line.length > 40 && !line.includes('http') && !line.includes('|'))
    .slice(0, 15);

  return {
    targetUrl,
    domain,
    rating,
    reviewCount,
    reviews: cleanReviews,
    oneStar: null, // Let your LLM calculate themes from text if percentages miss
    fiveStar: null,
    scrapedAt: new Date().toISOString(),
  };
}

async function generateSignals(data: { domain: string; rating: number | null; reviewCount: number | null; reviews: string[]; oneStar: number | null; fiveStar: number | null }) {
  // B1: sanitize reviews before prompt assembly — prevents double quotes corrupting prompt string
  const safeReviews = data.reviews.slice(0, 15).map(review =>
    review.replace(/["\\]/g, '').replace(/[\n\r]+/g, ' ')
  )
  const reviewSample = safeReviews.join('\n---\n')

  const prompt = `You are Elvanis, an AI business analyst. Analyse this Trustpilot data for ${data.domain} and generate diagnostic signals.

TRUSTPILOT DATA:
- Overall rating: ${data.rating}/5
- Total reviews: ${data.reviewCount}
- 1-star percentage: ${data.oneStar ?? 'unknown'}%
- 5-star percentage: ${data.fiveStar ?? 'unknown'}%

RECENT REVIEWS:
${reviewSample}

AVAILABLE SIGNAL TYPES:
- rating_decline: overall rating is low or dropping
- repeat_complaint_pattern: same complaint appears across multiple reviews
- churn_spike: reviews mention cancelling, leaving, switching
- refund_spike: reviews mention refund issues or delivery failures
- response_time_increase: reviews mention slow support or no response

SAMPLE SIZE RULES:
- If reviewCount < 50: reduce all severities by one level and add to insight_summary: "Based on limited reviews (${data.reviewCount}) — verify trend as more reviews come in."
- If reviewCount < 20: confidence_score must not exceed 0.65 and severity must be watch only
- Only generate signals directly evidenced by the review text above — never infer problems not mentioned

Generate 2-4 diagnostic signals based on actual patterns in the reviews. Only generate a signal if there is a real problem.

DATA QUALITY RULES:
- Plain text only in all string fields. No double quotes, no apostrophes, no backslashes inside JSON string values.
- Never output an undefined, null, or non-numeric value for the value property.

VALUE FIELD RULES:
- rating_decline: value = overall rating (raw float 1.0-5.0)
- repeat_complaint_pattern: if 1-star percentage is known value = oneStar % (integer), otherwise estimate proxy score 1-100 based on complaint theme volume in reviews (1=isolated mentions, 100=dominant pattern)
- churn_spike: estimate severity-based proxy score 1-100 based on volume and velocity of cancellation or switching mentions in reviews (1=minimal mentions, 100=severe churn patterns)
- refund_spike: estimate severity-based proxy score 1-100 based on volume and velocity of refund or delivery failure mentions in reviews (1=minimal mentions, 100=severe fulfillment collapse)
- response_time_increase: estimate severity-based proxy score 1-100 based on volume and velocity of slow or no support response mentions in reviews (1=isolated issue, 100=total support backlog)

⚠️ CRITICAL LLM INSTRUCTION: Under no circumstances whatsoever may the \`value\` property contain a \`null\` or \`undefined\` data type. A valid numeric representation must be compiled for every single generated signal object.

Respond with JSON only — no preamble, no markdown formatting blocks, no backticks. Output a raw parsable string matching this exact shape:
{
  "signals": [
    {
      "signal_type": "repeat_complaint_pattern",
      "dimension": "customer",
      "insight_summary": "specific insight referencing actual review themes with exact data parameters",
      "recommended_action": "specific actionable next step",
      "severity": "critical|warning|watch",
      "confidence_score": 0.85,
      "value": 14,
      "change_percent": null,
      "evidence": "clean descriptive pattern text extracted from the reviews without special characters"
    }
  ],
  "overall_diagnosis": "2-3 sentence summary with actual metrics"
}`

  const response = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    max_tokens: 2000,
    temperature: 0.2,
    response_format: { type: 'json_object' },
    messages: [{ role: 'user', content: prompt }]
  })
  const text = response.choices[0]?.message?.content ?? ''
  // response_format guarantees valid JSON — strip leading prose only if needed
  let cleaned = text.trim()
  const firstBrace = cleaned.indexOf('{')
  if (firstBrace > 0) cleaned = cleaned.substring(firstBrace)
  cleaned = cleaned.replace(/[\x00-\x1F\x7F]/g, ' ').replace(/\t/g, ' ').replace(/\n/g, ' ').replace(/\r/g, ' ')
  try {
    return JSON.parse(cleaned)
  } catch {
    // If rating is null (scraper blocked or failed), return empty — don't save garbage data
    if (data.rating === null) {
      console.warn('Trustpilot: rating null + JSON parse failed — skipping signal to preserve data integrity')
      return { signals: [], overall_diagnosis: 'Scraper returned no usable data — scan skipped.' }
    }
    return {
      signals: [{
        signal_type: 'rating_decline', dimension: 'customer',
        insight_summary: `${data.domain} has a ${data.rating}/5 rating with ${data.oneStar ?? 'unknown'}% one-star reviews`,
        recommended_action: 'Review recent customer feedback and identify top complaint themes to address immediately',
        severity: data.rating !== null && data.rating < 3.5 ? 'critical' : 'warning',
        confidence_score: 0.7, value: data.rating, change_percent: null,
        evidence: 'Based on overall Trustpilot rating analysis',
      }],
      overall_diagnosis: `${data.domain} has a ${data.rating}/5 rating across ${data.reviewCount} reviews.`
    }
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
    const { domain, founderId, parentScanId = null, triggeredBy = 'connect' } = await request.json()
    if (!domain) return NextResponse.json({ error: 'Domain required' }, { status: 400 })

    const supabase = createAdminClient()

    const { data: job } = await supabase.from('scrape_jobs').insert({
      founder_id: founderId, source_type: 'trustpilot',
      target_url: `https://www.trustpilot.com/review/${domain}`,
      status: 'running', started_at: new Date().toISOString(),
    }).select().single()

    const { data: existingSource } = await supabase
      .from('data_sources').select('id')
      .eq('founder_id', founderId).eq('source_type', 'trustpilot').maybeSingle()

    const sourcePayload = {
      founder_id: founderId, source_type: 'trustpilot', status: 'active',
      config: { domain, url: `https://www.trustpilot.com/review/${domain}` },
      last_synced_at: new Date().toISOString(),
    }
    let source = existingSource
    if (existingSource) {
      await supabase.from('data_sources').update(sourcePayload).eq('id', existingSource.id)
    } else {
      const { data: newSource } = await supabase.from('data_sources').insert(sourcePayload).select().single()
      source = newSource
    }

    let scraped
    try {
      scraped = await scrapeTrustpilot(domain)
    } catch (err) {
      await supabase.from('scrape_jobs').update({ status: 'failed', error_message: String(err), completed_at: new Date().toISOString() }).eq('id', job?.id)
      return NextResponse.json({ error: `Scraping failed: ${err}` }, { status: 500 })
    }
    console.log(`Scraped: rating=${scraped.rating}, reviewCount=${scraped.reviewCount}, reviews=${scraped.reviews.length}`)
    if (scraped.rating === null) console.warn('WARNING: rating is null — scraper regex did not match')
    if (scraped.reviews.length === 0) console.warn('WARNING: no reviews extracted — HTML structure may have changed')

    console.log('Calling generateSignals with:', JSON.stringify({ rating: scraped.rating, reviewCount: scraped.reviewCount, reviewsCount: scraped.reviews.length }))
    let analysis
    try {
      analysis = await generateSignals(scraped)
    } catch (err) {
      return NextResponse.json({ error: `AI analysis failed: ${err}` }, { status: 500 })
    }

    // ── Fetch existing signals including scan_count ──
    console.log('Groq signals returned:', JSON.stringify((analysis.signals ?? []).map((s: Record<string,unknown>) => ({ type: s.signal_type, value: s.value, severity: s.severity, confidence: s.confidence_score }))))

    const { data: existing } = await supabase
      .from('diagnostic_signals')
      .select('id, signal_type, value, change_percent, scan_count')
      .eq('founder_id', founderId)
      .eq('source', 'trustpilot')
      .in('status', ['new', 'acknowledged'])

    const existingMap = new Map(existing?.map(s => [s.signal_type, s]) ?? [])
    let inserted = 0
    let updated = 0
    const touchedSignals: SignalUpsertResult[] = []

    const rawSignals = (analysis.signals ?? []).filter((s: Record<string, unknown>) => ((s.confidence_score as number) ?? 0.85) >= 0.5).map((s: Record<string, unknown>) => normalise(s))
    const mergedSignals = mergeSignals(rawSignals)

    for (const n of mergedSignals) {
      // B8: status removed from signalRow — set explicitly in INSERT/UPDATE paths only
      const signalRow = {
        founder_id: founderId, source_id: source?.id ?? null,
        signal_type: n.signal_type, dimension: n.dimension,
        insight_summary: (n.insight_summary as string) ?? 'Signal detected',
        recommended_action: (n.recommended_action as string) ?? 'Review and take action',
        severity: n.severity, confidence_score: (n.confidence_score as number) ?? 0.85,
        value: n.value ?? null, change_percent: n.change_percent ?? null,
        source: 'trustpilot',
        period_start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        period_end: new Date().toISOString().split('T')[0],
        raw_data: { scraped, evidence: n.evidence },
      }

      const prev = existingMap.get(n.signal_type)

      if (prev) {
        const prevVal = prev.value !== null && prev.value !== undefined ? Number(prev.value) : null
        const currVal = signalRow.value !== null && signalRow.value !== undefined ? Number(signalRow.value) : null
        const trend = prevVal !== null && currVal !== null
          ? tpTrend(n.signal_type, prevVal, currVal)
          : 'unchanged'
        const prevScanCount = prev.scan_count ?? 1

        // B7: use supabase client consistent with scrape_jobs — admin for RLS safety
        await supabase.from('diagnostic_signals').update({
          ...signalRow, previous_value: prev.value ?? null,
          previous_change_percent: prev.change_percent ?? null,
          trend, scan_count: prevScanCount + 1,
          updated_at: new Date().toISOString(),
        }).eq('id', prev.id)

        touchedSignals.push({
          id: prev.id, signal_type: n.signal_type, source: 'trustpilot',
          severity: n.severity, dimension: n.dimension,
          value: signalRow.value, change_percent: signalRow.change_percent,
          trend, insight_summary: signalRow.insight_summary,
          previous_value: prev.value ?? null, scan_count: prevScanCount + 1,
        })
        updated++
      } else {
        // I4: select id after insert — push to touchedSignals so recordScan() snapshots new signals
        const { data: newRow } = await supabase.from('diagnostic_signals').insert({
          ...signalRow,
          status:     'new',
          trend:      'new',
          scan_count: 1,
        }).select('id').single()

        if (newRow?.id) {
          touchedSignals.push({
            id:              newRow.id,
            signal_type:     n.signal_type,
            source:          'trustpilot',
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

    const totalSignals = inserted + updated

    await supabase.from('scrape_jobs').update({
      status: 'completed',
      signals_generated: totalSignals,
      raw_output: { scraped, analysis },
      completed_at: new Date().toISOString(),
    }).eq('id', job?.id)

    // I2: pass parentScanId + triggeredBy — links child scan row to master row
    await recordScan(founderId, 'trustpilot', touchedSignals, parentScanId, triggeredBy)
    await resetStaleConflictPreferences(founderId, ['trustpilot'])
    console.log(`Trustpilot: ${inserted} inserted, ${updated} updated | parentScanId=${parentScanId} triggeredBy=${triggeredBy}`)

    return NextResponse.json({
      success: true, domain, rating: scraped.rating,
      reviewCount: scraped.reviewCount,
      signals: inserted + updated,
      inserted,
      updated,
      overall_diagnosis: analysis.overall_diagnosis,
    })

  } catch (err) {
    console.error('Trustpilot error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}