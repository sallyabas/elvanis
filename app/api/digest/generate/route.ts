import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import Groq from 'groq-sdk'
import { DIGEST_DIMENSIONS, DIGEST_EFFORT_LEVELS, DIGEST_CONFIDENCE_LEVELS, DIGEST_TIMEFRAMES } from '@/lib/digest-constants'

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

const SEVERITY_RANK: Record<string, number> = { critical: 3, warning: 2, watch: 1 }

const SYSTEM_PROMPT = `You are a senior business strategy consultant reviewing a founder's diagnostic signals.
Your job is to produce a clear, honest, prioritised 90-Day Action Plan — not a comprehensive strategy document, but the most important actions the founder should take across the next 12 weeks based on their live data.

PERSONALISATION RULES:
- Always refer to the business by its actual name (provided in BUSINESS context) — never say "this business" or "the company". Say "Acme Corp is..." not "This business has..."
- Reference the founder's name in the summary when appropriate
- Reference the specific tools and integrations that generated the signals — "your Shopify data shows..." not "data shows..."
- If country/region is provided, use appropriate currency symbols and regional context in recommendations

90-DAY PHASE STRUCTURE:
You must assign every action to one of three phases based on urgency and effort:
- Phase 1 — Immediate Triage (Weeks 1-4): Critical fire-fighting and operational leaks. CONFLICTED and critical severity signals go here. Use timeframe="This week".
- Phase 2 — System Stabilisation (Weeks 5-8): Process optimisation and defensive guardrails. Warning severity signals and high-effort fixes go here. Use timeframe="This month".
- Phase 3 — High-Leverage Growth (Weeks 9-12): Offensive scaling plays aligned to the founder's focus metric. Only populate if there are ZERO critical signals. If any critical signals exist, leave Phase 3 completely empty — the code will enforce this separately. Use timeframe="Weeks 9-12".

Distribute actions across phases: aim for 2-3 in Phase 1, 1-2 in Phase 2, and 1 in Phase 3 if stable. Never cluster all 6 actions in one phase.

TIMEFRAME RULES:
- timeframe="This week" = Phase 1 ONLY
- timeframe="This month" = Phase 2 ONLY
- timeframe="Weeks 9-12" = Phase 3 ONLY
- effort=high ALWAYS means Phase 2 minimum — never assign effort=high to Phase 1 (This week). This is a hard rule with no exceptions.

RULES:
- Be specific — every action must reference the actual signal and data driving it
- CRITICAL: The "how" field must NOT copy or paraphrase the signal's recommended_action. That is already shown to the founder elsewhere. The "how" must add NEW information — specific steps, exact tools, processes, and success metrics the founder can act on TODAY.
- The "how" field must contain 3-4 numbered steps. Each step must say: WHERE to go (exact tool/page/report), WHAT to do (specific action), and WHAT success looks like (measurable outcome).
- Never write "review X" or "identify Y" without saying exactly where to find it, what to look for, and what to do with what you find.
- NEVER invent tool integrations, filters, tags, or features that do not exist in the standard interface of the tool. Only reference navigation paths and features that are built into the tool by default.
- Known real navigation paths you CAN use:
  * Shopify: Admin → Orders, Admin → Analytics, Admin → Customers
  * Jira: Issues → filter by Priority, Status, Assignee (standard Jira filters only)
  * GA4: Reports → Engagement → Pages and screens; Reports → Tech → Tech overview; Reports → Acquisition
  * Intercom: Inbox → filter by Open, Snoozed, Resolved; sort by Oldest first
  * CSV data: always say "open your CSV file in Excel or Google Sheets → filter column X" — never invent app navigation
  * Trustpilot: if signal is unverified or from a blocked source, say "manually check your Trustpilot business dashboard at trustpilot.com/evaluate" — do not invent specific filter paths
- For CSV or blocked-source signals, the how must acknowledge the data source limitation and give manual verification steps only
- NEVER fabricate data, metrics, or outcomes. Only reference numbers and facts provided in the signal data above.
- Unverified signals (confidence: unverified) must ALWAYS use timeframe "This month" — never "This week". The first how step for unverified signals must be a verification step before any action.
- NEVER set percentage targets or numerical goals ANYWHERE in the how field for unverified signals. The ONLY sentence allowed as a target in unverified signal how fields is exactly: "Monitor and record the baseline metric after verification — do not set targets until you have 2 data points." This MUST be the FINAL step.
- HARD RULE: effort=high ALWAYS means timeframe="This month" — no exceptions.
- The "Connect More Tools" action is STRICTLY FORBIDDEN when confirmed signals >= 3.
- BLINDSPOT DETECTION: Cross-reference signals from different CSV templates. If support CSV shows low complaint volume but marketing CSV shows high unsubscribe rate — note this in the summary as a potential blindspot.
- CONFLICTED signals must NEVER appear as action items — they belong ONLY in conflicts_to_resolve.
- Respond with valid JSON only. No preamble. No markdown. Pure JSON starting with { and ending with }

QUALITY BAR EXAMPLES — CONFIRMED signals only:

  SHOPIFY refund spike:
  BAD: "Review refund reasons and identify patterns in returned products"
  GOOD: "1. Go to Shopify Admin → Orders → filter Status=Refunded, Date=last 30 days. 2. Export to CSV, group by product SKU — find which 1-2 products have >50% refund rate. 3. Check those product listings for misleading photos or sizing info. 4. Email refunded customers with subject 'Help us improve' — aim for 10 responses within 7 days."

  INTERCOM repeat complaint pattern:
  BAD: "Develop a solution to reduce repeat conversations"
  GOOD: "1. Go to Intercom → Inbox → filter by Open → sort by Oldest first. 2. Open the 10 oldest conversations — tag each with the root issue (billing, delivery, product defect). 3. If 3+ conversations share the same tag, create a saved reply in Intercom Settings → Inbox → Saved Replies. 4. Check Intercom → Reports → Conversations next Monday — success = repeat contact rate drops below 50% within 7 days."

  JIRA bug backlog growth:
  BAD: "Prioritize and assign critical/high bugs to team members"
  GOOD: "1. Go to Jira → Issues → filter Priority=Critical, Status=Open. 2. Assign each critical bug to a named developer — set due date = 3 business days from today. 3. Add a comment tagging the assignee with exact reproduction steps and expected vs actual behaviour. 4. Create a Jira filter saved as 'Critical open bugs' and check it daily at standup — success = 0 critical bugs older than 5 days by end of sprint."

JSON structure:
{
  "summary": "2-3 sentences on the current state of this business — use the business name, reference specific signals and sources",
  "data_quality_note": "honest note on data quality — conflicts found, unverified signals, or 'Data looks clean and consistent'",
  "actions": [
    {
      "priority": 1,
      "title": "specific action title referencing the business context",
      "why": "which signal drives this, the specific data point, and why it matters for this business",
      "how": "3-4 numbered steps with exact tool navigation, specific actions, and measurable success criteria",
      "timeframe": "This week",
      "effort": "low",
      "impact": "revenue",
      "confidence": "confirmed",
      "signal_type": "bug_backlog_growth",
      "phase": 1
    }
  ],
  "conflicts_to_resolve": [
    {
      "signal_type": "repeat_complaint_pattern",
      "sources": ["csv", "intercom"],
      "note": "specific description of the conflict and what to verify"
    }
  ],
  "consultant_hook": "one sentence on what a human strategist would add beyond this digest — make it specific to this business"
}

FIELD CONSTRAINTS (hard rules — no exceptions):
- "impact" MUST be exactly one of: ${DIGEST_DIMENSIONS.map(d => `"${d}"`).join(', ')}. No other values permitted.
- "effort" MUST be exactly one of: ${DIGEST_EFFORT_LEVELS.map(e => `"${e}"`).join(', ')}. No other values permitted.
- "confidence" MUST be exactly one of: ${DIGEST_CONFIDENCE_LEVELS.map(c => `"${c}"`).join(', ')}. No other values permitted.
- "timeframe" MUST be exactly one of: ${DIGEST_TIMEFRAMES.map(t => `"${t}"`).join(', ')}. No other values permitted.
- "phase" MUST be exactly one of: 1, 2, 3. No other values permitted.`


const TRANSLATION_PROMPT = `You are a professional Arabic business translator specialising in SaaS and e-commerce contexts.
You will receive a JSON object containing an English action plan digest. Your job is to translate specific text fields into professional Gulf/MSA Arabic.

TRANSLATION RULES:
1. Translate ALL instructional text into professional Arabic
2. Keep ALL UI navigation paths, button labels, menu items, and app names in English
3. Keep ALL technical terms as-is: CSV, SKU, API, CRM, NPS, CSAT, AOV, MRR, KPI, and similar acronyms
4. Keep ALL tool names as-is: Shopify, Intercom, GA4, Jira, Trustpilot, Google Analytics, etc.
5. Use ← instead of → for navigation paths within Arabic text (bidi-safe)
6. Keep ALL numbers, percentages, and currency symbols in their original format

EXAMPLES:
English how step: "Go to Shopify Admin → Orders → filter Status=Refunded, Date=last 30 days."
Arabic how step: "اذهب إلى Shopify Admin ← Orders ← فلتر Status=Refunded، Date=last 30 days."

English how step: "Export to CSV, group by product SKU — find which 1-2 products have >50% refund rate."
Arabic how step: "صدِّر البيانات إلى CSV، ورتِّبها حسب product SKU — ابحث عن المنتج أو المنتجَين اللذين تتجاوز نسبة استردادهما 50%."

English how step: "Go to Intercom → Inbox → filter by Open → sort by Oldest first."
Arabic how step: "اذهب إلى Intercom ← Inbox ← فلتر Open ← رتِّب حسب Oldest first."

INPUT: You will receive a JSON object with this structure:
{
  "summary": "...",
  "data_quality_note": "...",
  "consultant_hook": "...",
  "actions": [
    { "title": "...", "why": "...", "how": "..." }
  ],
  "conflicts": [
    { "note": "..." }
  ]
}

OUTPUT: Return ONLY a JSON object with this exact structure — no preamble, no markdown:
{
  "summary_ar": "...",
  "data_quality_note_ar": "...",
  "consultant_hook_ar": "...",
  "actions_ar": [
    { "title_ar": "...", "why_ar": "...", "how_ar": "..." }
  ],
  "conflicts_ar": [
    { "note_ar": "..." }
  ]
}
}`

export async function POST(request: NextRequest) {  try {
    // JSON only — digest generation is admin-controlled, not triggered by form POST
    const { founderId } = await request.json()
    if (!founderId) return NextResponse.json({ error: 'founderId required' }, { status: 400 })

    const admin = createAdminClient()

    // Fetch founder with full business profile for Groq personalisation
    const { data: founder } = await admin
      .from('founders')
      .select('id, full_name, business_name, subscription_tier, focus_metric, industry, industry_other, market, brand_url, founder_stage')
      .eq('id', founderId)
      .maybeSingle()

    if (!founder) return NextResponse.json({ error: 'Founder not found' }, { status: 404 })

// F19: Duplicate digest guard — idempotent for same-day generation
    // Prevents Vercel retries or double-calls from generating two digests
    // Only blocks if an ACTIVE digest exists today — allows retry after failure (status='stale')
    const todayStr = new Date().toISOString().split('T')[0] // YYYY-MM-DD
    const { data: existingTodayDigest } = await admin
      .from('action_digests')
      .select('id')
      .eq('founder_id', founderId)
      .eq('status', 'active')
      .gte('generated_at', todayStr)
      .maybeSingle()
 
    if (existingTodayDigest) {
      console.log(`[digest] already generated today for ${founderId} — skipping (id: ${existingTodayDigest.id})`)
      return NextResponse.json(
        { error: 'Digest already generated today.', digestId: existingTodayDigest.id },
        { status: 409 }
      )
    }
 
    // F20: Scan recency check — block digest if scan data is stale (> 35 days)
    // parent_scan_id IS NULL = master scans only, not child scrape rows
    // status = 'completed' = successful scans only
    const { data: latestScan } = await admin
      .from('scans')
      .select('scanned_at')
      .eq('founder_id', founderId)
      .is('parent_scan_id', null)
      .eq('status', 'completed')
      .order('scanned_at', { ascending: false })
      .limit(1)
      .maybeSingle()
 
    const thirtyFiveDaysAgo = new Date(Date.now() - 35 * 24 * 60 * 60 * 1000)
    const scanIsStale        = !latestScan || new Date(latestScan.scanned_at) < thirtyFiveDaysAgo
 
    if (scanIsStale) {
      const lastScanDate = latestScan?.scanned_at ?? 'never'
      console.warn(`[digest] blocked for ${founderId} — scan data stale (last: ${lastScanDate})`)
 
      // Insert system_alert for Sally to investigate
      await admin.from('system_alerts').insert({
        founder_id: founderId,
        alert_type: 'stale_scan',
        message:
          `Digest blocked for founder ${founderId} (${founder.full_name ?? 'unknown'}). ` +
          `Last scan: ${lastScanDate}. ` +
          `Scan data is more than 35 days old. ` +
          `Manual intervention required — check why auto-scan cron failed for this account.`,
      })
 
      return NextResponse.json(
        { error: `Digest blocked: last scan was ${lastScanDate}. Run a scan first.` },
        { status: 422 }
      )
    }

    // Digest is admin-controlled — no subscription tier check needed here
    // Admin calls this endpoint directly for eligible founders

    // ── Fetch active signals ──
    const { data: signals } = await admin
      .from('diagnostic_signals')
      .select('*')
      .eq('founder_id', founderId)
      .in('status', ['new', 'acknowledged'])
      .order('created_at', { ascending: false })

    if (!signals || signals.length === 0) {
      return NextResponse.json({ error: 'No signals found — connect tools first' }, { status: 400 })
    }

    // ── Fetch latest assessment score ──
    const { data: score } = await admin
      .from('scores')
      .select('overall_score, overall_summary, primary_constraint_summary, score_revenue, score_pmf, score_team, score_customer, score_marketing, score_strategy')
      .eq('founder_id', founderId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    // ── Fetch previous stale digest for history context ──
    const { data: previousDigest } = await admin
      .from('action_digests')
      .select('digest, generated_at')
      .eq('founder_id', founderId)
      .eq('status', 'stale')
      .order('generated_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    // ── Fetch CSV source template types for blindspot detection ──
    const csvSignalSourceIds = [...new Set(
      signals
        .filter(s => s.source === 'csv' && s.source_id)
        .map(s => s.source_id)
    )]

    const templateTypeMap = new Map<string, string>()
    if (csvSignalSourceIds.length > 0) {
      const { data: csvSources } = await admin
        .from('data_sources')
        .select('id, config')
        .in('id', csvSignalSourceIds)
      for (const src of (csvSources ?? [])) {
        const templateType = (src.config as Record<string, string>)?.template_type
        if (templateType) templateTypeMap.set(src.id, templateType)
      }
    }

    // Fix B: Array.isArray guard on conflictPrefs
    const { data: conflictPrefs } = await admin
      .from('conflict_resolutions')
      .select('*')
      .eq('founder_id', founderId)
      .eq('choice_type', 'founder')
      .order('created_at', { ascending: false })

    type ConflictPref = NonNullable<typeof conflictPrefs>[number]
    const prefMap = new Map<string, ConflictPref>()
    if (conflictPrefs && Array.isArray(conflictPrefs)) {
      for (const pref of conflictPrefs) {
        if (pref && !prefMap.has(pref.signal_type)) {
          prefMap.set(pref.signal_type, pref)
        }
      }
    }

    // ── Pre-plan audit ──
    const conflicts: Array<{ signal_type: string; sources: string[]; note: string }> = []
    const signalsByType = new Map<string, typeof signals>()
    for (const s of signals) {
      const group = signalsByType.get(s.signal_type) ?? []
      group.push(s)
      signalsByType.set(s.signal_type, group)
    }

    for (const [type, group] of signalsByType) {
      const nonManualGroup = group.filter(s => s.source !== 'manual')
      if (nonManualGroup.length < 2) continue
      const sources = [...new Set(nonManualGroup.map(s => s.source))]
      if (sources.length < 2) continue
      const withValues = nonManualGroup.filter(s => s.value !== null && s.value !== undefined)
      if (withValues.length >= 2) {
        const vals = withValues.map(s => Number(s.value))
        const maxVal = Math.max(...vals)
        const minVal = Math.min(...vals)
        // Relative difference: catches low-range signals (churn 8% vs 3% = 62.5% gap)
        // Old absolute threshold (maxVal>50 && minVal<50) missed signals that never exceed 50
        const relativeDiff = maxVal > 0 ? (maxVal - minVal) / maxVal : 0
        if (relativeDiff > 0.4) {
          conflicts.push({
            signal_type: type,
            sources,
            note: `${sources.join(' vs ')} — values differ significantly (${vals.join(', ')})`
          })
        }
      }
    }

    const conflictedTypes = new Set(conflicts.map(c => c.signal_type))
    const unverifiedSignals = signals.filter(s => (s.scan_count ?? 1) === 1 && s.source !== 'manual')

    // Apply preferences
    const resolvedConflicts: string[] = []
    for (const [signalType] of prefMap) {
      if (conflictedTypes.has(signalType)) {
        conflictedTypes.delete(signalType)
        resolvedConflicts.push(signalType)
      }
    }

    const confirmedSignalsAfterPrefs = signals.filter(s =>
      (
        (s.scan_count ?? 1) >= 2 ||
        resolvedConflicts.includes(s.signal_type)
      ) &&
      !conflictedTypes.has(s.signal_type) &&
      s.source !== 'manual' &&
      (
        !prefMap.has(s.signal_type) ||
        prefMap.get(s.signal_type)?.trusted_source === s.source
      )
    )

    const unverifiedForPrompt = unverifiedSignals.filter(s => !resolvedConflicts.includes(s.signal_type))
    const manualSignals = signals.filter(s => s.source === 'manual')

    // Fix 1+2: Deterministic Phase 3 gate — do not rely on LLM to count severity
    // Threshold: any critical signal blocks Phase 3. Warnings alone do not block growth thinking.
    const activeCriticalCount = signals.filter(s =>
      s.severity === 'critical' && !conflictedTypes.has(s.signal_type)
    ).length
    const isBusinessStable = activeCriticalCount === 0

    const sortedSignals = [...signals].sort((a, b) => {
      const sevA = SEVERITY_RANK[a.severity] ?? 0
      const sevB = SEVERITY_RANK[b.severity] ?? 0
      return sevB - sevA
    }).slice(0, 10)

    // ── Build Groq prompt ──
    const dataQualityContext = `
DATA QUALITY AUDIT:
- Total active signals: ${signals.length}
- Confirmed signals: ${confirmedSignalsAfterPrefs.length} ${confirmedSignalsAfterPrefs.length >= 3 ? '— DO NOT suggest connecting more tools' : '— suggest connecting more tools'}
- Unverified signals (only 1 scan): ${unverifiedForPrompt.length}
- Conflicted signals: ${conflictedTypes.size} (${resolvedConflicts.length > 0 ? `${resolvedConflicts.length} resolved by founder preference` : 'none resolved'})
${conflictedTypes.size > 0 ? `- Remaining conflicts:\n${conflicts.filter(c => conflictedTypes.has(c.signal_type)).map(c => `  * ${c.signal_type}: ${c.note}`).join('\n')}` : '- No unresolved conflicts'}
${resolvedConflicts.length > 0 ? `- Founder-resolved conflicts (treat as confirmed from preferred source):\n${resolvedConflicts.map(type => `  * ${type}: founder trusts ${prefMap.get(type)?.trusted_source}`).join('\n')}` : ''}
${unverifiedForPrompt.length > 0 ? `- Unverified (treat as tentative):\n${unverifiedForPrompt.map(s => `  * ${s.signal_type} from ${s.source}`).join('\n')}` : ''}

PHASE 3 MANDATE (deterministic — enforced by code, not your judgement):
${isBusinessStable
  ? '+ STABLE: Zero critical signals detected. You ARE permitted to populate Phase 3 (Weeks 9-12) with high-leverage growth actions aligned to the focus metric.'
  : `+ FIRES ACTIVE: ${activeCriticalCount} critical signal(s) detected. You MUST leave Phase 3 completely empty. Do NOT generate any actions with phase: 3 or timeframe: "Weeks 9-12". Focus 100% on Phase 1 and Phase 2.`
}`

    const signalsContext = sortedSignals.map(s => {
      const sourceLabel = s.source === 'csv' && s.source_id && templateTypeMap.has(s.source_id)
        ? `csv (${templateTypeMap.get(s.source_id)})`
        : s.source
      return `
Signal: ${s.signal_type}
Source: ${sourceLabel}
Severity: ${s.severity}
Insight: ${s.insight_summary}
Recommended action: ${s.recommended_action}
Value: ${s.value ?? 'N/A'}
Scan count: ${s.scan_count ?? 1}
Status: ${conflictedTypes.has(s.signal_type) ? 'CONFLICTED' : resolvedConflicts.includes(s.signal_type) ? 'CONFIRMED (founder verified)' : (s.scan_count ?? 1) === 1 ? 'UNVERIFIED' : 'CONFIRMED'}`
    }).join('\n---')

    const manualContext = manualSignals.length > 0
      ? `\nASSESSMENT SIGNALS (founder self-reported context — treat as supporting evidence):\n${manualSignals.map(s => `- ${s.signal_type}: ${s.insight_summary}`).join('\n')}`
      : ''

    const assessmentContext = score ? `
ASSESSMENT SCORES:
Overall: ${score.overall_score}/100
Summary: ${score.overall_summary}
Primary constraint: ${score.primary_constraint_summary}
Revenue: ${score.score_revenue}/100 | Product-Market Fit: ${score.score_pmf}/100 | Team: ${score.score_team}/100
Customer: ${score.score_customer}/100 | Marketing: ${score.score_marketing}/100 | Strategy: ${score.score_strategy}/100` : 'No assessment taken yet.'

    const previousDigestContext = previousDigest
      ? `
PREVIOUS DIGEST (${new Date(previousDigest.generated_at).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}):
Summary: ${(previousDigest.digest as Record<string, unknown>)?.summary ?? 'No summary'}
Data quality: ${(previousDigest.digest as Record<string, unknown>)?.data_quality_note ?? 'No note'}
Use this to acknowledge progress or flag regression. If a signal was critical last time and is now improved, note it. If still critical, escalate urgency.`
      : 'PREVIOUS DIGEST: This is the first Action Digest for this founder.'

    // Focus metric human label — Groq gets the full label not just the id
    const FOCUS_LABELS: Record<string, string> = {
      growth:    'Accelerate Top-Line Growth',
      retention: 'Maximize Customer Retention',
      ops:       'Optimize Operational / Support Costs',
      delivery:  'Boost Product / Engineering Delivery',
    }
    const focusLabel = founder.focus_metric
      ? (FOCUS_LABELS[founder.focus_metric as string] ?? founder.focus_metric)
      : null

    // Industry label — resolve 'Other' to the free-text description
    const industryLabel = founder.industry === 'Other' && founder.industry_other
      ? `Other (${founder.industry_other})`
      : founder.industry ?? null

    // Fix 3+4: founderContext with full business profile including new fields
    const founderContext = `
FOUNDER CONTEXT:
Name: ${founder.full_name ?? 'Unknown'}
Business: ${founder.business_name ?? 'Unknown'}
Industry: ${industryLabel ?? 'Not specified'}
Market: ${founder.market ?? 'Not specified'}
Stage: ${founder.founder_stage === 'product_customers' ? 'Product with paying customers' : 'Early stage / pre-revenue'}
Website: ${founder.brand_url ?? 'Not provided'}
Focus metric this quarter: ${focusLabel ?? 'Not set — infer from highest severity signals'}
Use the business name throughout the summary and actions. Structure Phase 3 actions to directly support the focus metric if set. Reference the market and industry in all recommendations — a ${industryLabel ?? 'startup'} in ${founder.market ?? 'this market'} has specific regulatory, competitive, and customer dynamics you must reflect.`

    // Fix K: sources context for personalisation
    const connectedSources = [...new Set(signals.map(s => s.source).filter(s => s !== 'manual'))]
    const sourcesContext = `CONNECTED SOURCES: ${connectedSources.join(', ')}`

    const userPrompt = `${founderContext}

${sourcesContext}

${dataQualityContext}

ACTIVE SIGNALS (sorted by severity):
${signalsContext}
${manualContext}

${assessmentContext}

${previousDigestContext}

Generate a 90-Day Action Plan for this founder. Structure actions across Phase 1 (This week), Phase 2 (This month), and Phase 3 (Weeks 9-12). Prioritise confirmed signals first. Flag conflicted and unverified signals honestly. Maximum 6 actions. Include the phase number (1, 2, or 3) in each action object.`

    // response_format confirmed supported for llama-3.3-70b-versatile on Groq
    // Requires system prompt to instruct JSON — ours already does ✓
    console.log(`[digest] Generating for founder ${founderId} (${founder.business_name ?? 'unknown'})...`)
    const response = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      max_tokens: 4000,
      temperature: 0.3,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
    })

    const text = response.choices[0]?.message?.content ?? ''

    // response_format guarantees valid JSON — strip leading prose only if present
    // lastIndexOf('}') removed — dangerous if } appears inside string values in 'how' fields
    const firstBrace = text.indexOf('{')
    if (firstBrace === -1) {
      console.error('[digest] Malformed AI response — no JSON found:', text.substring(0, 200))
      return NextResponse.json({ error: 'AI response structure invalid — try again' }, { status: 500 })
    }
    const cleaned = firstBrace > 0 ? text.substring(firstBrace) : text

    let digest: Record<string, unknown>
    try {
      digest = JSON.parse(cleaned)
    } catch (parseErr) {
      console.error('[digest] JSON parse failed:', parseErr)
      console.error('[digest] Raw cleaned text:', cleaned.substring(0, 500))
      return NextResponse.json({ error: 'AI response invalid — try again' }, { status: 500 })
    }

    // ── Validate digest has actions before saving ──
    const digestActions = Array.isArray(digest.actions) ? digest.actions : []
    if (digestActions.length === 0) {
      console.error('[digest] Groq returned empty actions array — aborting insert')
      return NextResponse.json({ error: 'Digest generated no actions — try again' }, { status: 500 })
    }

    // ── Store in action_digests — mark existing active as stale ──
    await admin
      .from('action_digests')
      .update({ status: 'stale' })
      .eq('founder_id', founderId)
      .eq('status', 'active')

    const { data: digestRow, error: digestErr } = await admin
      .from('action_digests')
      .insert({
        founder_id:           founderId,
        based_on_signal_ids:  signals.map(s => s.id),
        based_on_scan_count:  signals.length,
        data_quality: {
          conflicts:      conflicts.length,
          unverified:     unverifiedForPrompt.length,
          confirmed:      confirmedSignalsAfterPrefs.length,
          conflict_detail: conflicts,
          sources:        connectedSources,
        },
        digest,
        status:       'active',
        generated_at: new Date().toISOString(),
      })
      .select('id')
      .single()

      if (digestErr) {
        console.error('[digest] Insert failed:', digestErr.message)
        return NextResponse.json({ error: 'Failed to save digest' }, { status: 500 })
      }

          // ── Send plan-ready email immediately — does not wait for Arabic translation ──
    try {
      let founderEmailForPlan: string | null = null
      const { data: founderRow } = await admin
        .from('founders')
        .select('email, user_id')
        .eq('id', founderId)
        .maybeSingle()
      founderEmailForPlan = founderRow?.email ?? null
      if (!founderEmailForPlan && founderRow?.user_id) {
        const { data: { user } } = await admin.auth.admin.getUserById(founderRow.user_id)
        founderEmailForPlan = user?.email ?? null
      }

      if (founderEmailForPlan) {
        const { Resend } = await import('resend')
        const resendClient = new Resend(process.env.RESEND_API_KEY)
        const appUrl = process.env.NEXT_PUBLIC_APP_URL!
        const month = new Date().toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
        const planSummary = (digest.summary as string) ?? 'Your prioritised 90-day action plan has been generated based on your latest signals.'

        const { error: planEmailErr } = await resendClient.emails.send({
          from: process.env.RESEND_FROM_EMAIL ?? 'onboarding@resend.dev',
          to: founderEmailForPlan,
          subject: `${founder.full_name?.split(' ')[0] ?? 'Founder'} — your 90-Day Action Plan is ready`,
          html: `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;padding:0;background:#F9FAFB;font-family:Inter,Arial,sans-serif"><div style="max-width:600px;margin:0 auto;padding:32px 16px"><div style="text-align:center;margin-bottom:32px"><h1 style="font-size:28px;font-weight:800;color:#2563EB;margin:0">Elvanis</h1><p style="color:#6B7280;font-size:14px;margin:4px 0 0">Your 90-Day Action Plan — ${month}</p></div><div style="background:#F5F3FF;border-radius:16px;border:1px solid #DDD6FE;padding:32px;margin-bottom:20px;text-align:center"><div style="font-size:48px;margin-bottom:12px">✨</div><h2 style="font-size:20px;font-weight:800;color:#4C1D95;margin:0 0 12px">Your Action Digest is ready</h2><p style="font-size:14px;color:#6D28D9;line-height:1.65;margin:0 0 24px">${planSummary}</p><a href="${appUrl}/plan" style="display:inline-block;padding:14px 36px;background:#7C3AED;color:#fff;border-radius:12px;font-size:15px;font-weight:700;text-decoration:none">View your Plan →</a></div><div style="text-align:center;border-top:1px solid #E5E7EB;padding-top:20px"><p style="color:#9CA3AF;font-size:12px;margin:0">Elvanis · Know what to fix before you scale</p><p style="color:#9CA3AF;font-size:12px;margin:4px 0 0">${founderEmailForPlan}</p></div></div></body></html>`,
        })

        if (planEmailErr) console.error('[digest] plan-ready email failed:', planEmailErr)
        else console.log(`[digest] plan-ready email sent to ${founderEmailForPlan}`)
      }
    } catch (emailErr) {
      console.error('[digest] plan-ready email block failed (non-fatal):', emailErr)
    }

    // ── Save default conflict preferences for unresolved conflicts ──
    const chosenTypes = new Set(
      [...prefMap.entries()]
        .filter(([, pref]) => pref.used_in_digest_id === null)
        .map(([type]) => type)
    )

    for (const conflict of conflicts) {
      if (chosenTypes.has(conflict.signal_type)) continue

      const conflictingSource = conflict.sources.find(s => s !== 'csv')
      if (!conflictingSource) continue

      const defaultSignal = signals.find(s =>
        s.signal_type === conflict.signal_type && s.source === conflictingSource
      )
      if (!defaultSignal) continue

      const { error: conflictInsertErr } = await admin.from('conflict_resolutions').insert({
        founder_id:          founderId,
        signal_type:         conflict.signal_type,
        signal_insight:      defaultSignal.insight_summary ?? null,
        conflicting_sources: conflict.sources,
        conflicting_values:  Object.fromEntries(
          signals
            .filter(s => s.signal_type === conflict.signal_type && conflict.sources.includes(s.source))
            .map(s => [s.source, s.value])
        ),
        trusted_source:      conflictingSource,
        trusted_value:       defaultSignal.value ?? null,
        choice_type:         'default',
        used_in_digest_id:   digestRow.id,
        used_at:             new Date().toISOString(),
      })
      if (conflictInsertErr) {
        console.error('[digest] conflict_resolutions insert failed:', conflictInsertErr.message)
      }
    }

    console.log(`[digest] Generated: ${digestRow.id} — ${connectedSources.join(', ')} — ${signals.length} signals`)

        // ── Validate English "how" fields for complete numbered steps — before Arabic translation ──
        const { validateSteppedField } = await import('@/lib/content-validator')
        const validatedActions = await Promise.all(
          digestActions.map(async (action: Record<string, unknown>) => {
            const validatedHow = await validateSteppedField({
              admin,
              founderId,
              fieldLabel: `digest.actions[${action.title ?? '?'}].how`,
              howText: String(action.how ?? ''),
              context: String(action.title ?? ''),
            })
            return { ...action, how: validatedHow }
          })
        )
        digest.actions = validatedActions

    // ── Arabic translation call (fire-and-forget, non-blocking) ──
    // Uses llama-3.1-8b-instant — translation only, no strategic reasoning needed
    const translationInput = {
      summary:            digest.summary ?? '',
      data_quality_note:  digest.data_quality_note ?? '',
      consultant_hook:    digest.consultant_hook ?? '',
      actions: (Array.isArray(digest.actions) ? digest.actions : []).map((a: Record<string, unknown>) => ({
        title: a.title ?? '',
        why:   a.why ?? '',
        how:   a.how ?? '',
      })),
      conflicts: (Array.isArray(digest.conflicts_to_resolve) ? digest.conflicts_to_resolve : []).map((c: Record<string, unknown>) => ({
        note: c.note ?? '',
      })),
    }

    try {
      const arResponse = await groq.chat.completions.create({
        model:           'llama-3.1-8b-instant',
        max_tokens:      4000,
        temperature:     0.1,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: TRANSLATION_PROMPT },
          { role: 'user',   content: JSON.stringify(translationInput) },
        ],
      })

      const arText = arResponse.choices[0]?.message?.content ?? ''
      const arFirstBrace = arText.indexOf('{')
      if (arFirstBrace === -1) {
        console.error('[digest] Arabic translation — no JSON found')
      } else {
        let arDigest: Record<string, unknown> | null = null
        try {
          arDigest = JSON.parse(arFirstBrace > 0 ? arText.substring(arFirstBrace) : arText)
        } catch (parseErr) {
          console.error('[digest] Arabic translation parse failed:', parseErr)
        }

        if (arDigest) {
          try {
            const { validateArabicField } = await import('@/lib/content-validator')
            if (arDigest.summary_ar) {
              arDigest.summary_ar = await validateArabicField({
                admin, founderId,
                fieldLabel: 'digest.summary_ar',
                englishText: String(digest.summary ?? ''),
                arabicText: String(arDigest.summary_ar),
              })
            }
            if (Array.isArray(arDigest.actions_ar)) {
              const validatedActionsAr: Array<Record<string, unknown>> = []
              for (let i = 0; i < (arDigest.actions_ar as Array<Record<string, unknown>>).length; i++) {
                const actionAr = (arDigest.actions_ar as Array<Record<string, unknown>>)[i]
                const howAr = await validateArabicField({
                  admin, founderId,
                  fieldLabel: `digest.actions_ar[${i}].how_ar`,
                  englishText: String((validatedActions[i] as Record<string, unknown>)?.how ?? ''),
                  arabicText: String(actionAr.how_ar ?? ''),
                })
                validatedActionsAr.push({ ...actionAr, how_ar: howAr })
              }
              arDigest.actions_ar = validatedActionsAr
            }
          } catch (validationErr) {
            console.error('[digest] Arabic validation failed (non-fatal — saving unvalidated translation):', validationErr)
          }

          try {
            await admin.from('action_digests')
              .update({ digest_ar: arDigest })
              .eq('id', digestRow.id)
            console.log(`[digest] Arabic translation saved for ${digestRow.id}`)
          } catch (saveErr) {
            console.error('[digest] Arabic translation save failed:', saveErr)
          }
        }
      }
    } catch (err) {
      console.error('[digest] Arabic translation call failed:', err)
    }

    return NextResponse.json({ success: true, digestId: digestRow.id })

  } catch (err) {
    console.error('[digest] Error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}