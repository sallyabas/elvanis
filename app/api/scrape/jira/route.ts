import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import { getValidToken } from '@/lib/token-refresh'
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
    if (signal_type?.includes('velocity') || signal_type?.includes('sprint')) signal_type = 'velocity_drop'
    else if (signal_type?.includes('bug') || signal_type?.includes('backlog')) signal_type = 'bug_backlog_growth'
    else if (signal_type?.includes('response') || signal_type?.includes('resolution')) signal_type = 'response_time_increase'
    else if (signal_type?.includes('cycle') || signal_type?.includes('lead_time') || signal_type?.includes('lead')) signal_type = 'cycle_time_increase'
    else if (signal_type?.includes('block')) signal_type = 'blocked_tickets_spike'
    else if (signal_type?.includes('production') || signal_type?.includes('incident') || signal_type?.includes('outage')) signal_type = 'bug_backlog_growth'
    else signal_type = 'velocity_drop'
  }
  let dimension = s.dimension as string
  if (!VALID_DIMENSIONS.includes(dimension)) dimension = 'team'
  let severity = (s.severity as string)?.toLowerCase()
  if (!VALID_SEVERITIES.includes(severity)) {
    if (severity === 'high' || severity === 'urgent') severity = 'critical'
    else if (severity === 'medium' || severity === 'moderate') severity = 'warning'
    else severity = 'watch'
  }
  return { ...s, signal_type, dimension, severity }
}

// Jira signal direction: lower bug count = better, lower cycle time = better
const JIRA_SIGNAL_DIRECTION: Record<string, 'lower_better' | 'higher_better'> = {
  bug_backlog_growth: 'lower_better',
  velocity_drop: 'higher_better', // sprint completion — but see jiraTrend for bug:feature override
  response_time_increase: 'lower_better',
  cycle_time_increase: 'lower_better',
  blocked_tickets_spike: 'lower_better',
}

function jiraTrend(signalType: string, prevVal: number, currVal: number): string {
  // velocity_drop covers two metrics with opposite directions:
  // sprint completion % (0-100, higher_better) vs bug:feature ratio (>100, lower_better)
  // If value > 100, treat as bug:feature ratio — lower is better
  if (signalType === 'velocity_drop' && (prevVal > 100 || currVal > 100)) {
    return currVal < prevVal ? 'improving' : currVal > prevVal ? 'worsening' : 'unchanged'
  }
  const dir = JIRA_SIGNAL_DIRECTION[signalType]
  if (!dir) return currVal < prevVal ? 'improving' : currVal > prevVal ? 'worsening' : 'unchanged'
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
    // parentScanId: links this child scan row to master row inserted by parent scan route
    // triggeredBy: 'connect' default — passed through from parent route when called via full scan
    const { founderId, parentScanId = null, triggeredBy = 'connect', founderContext = {} } = await request.json()
    const admin = createAdminClient()

    const tokenData = await getValidToken(founderId, 'jira')
    if (!tokenData) return NextResponse.json({ error: 'Jira not connected' }, { status: 400 })

    const { accessToken: jiraToken, source: jiraSource } = tokenData
    const cloudId = (jiraSource.config as Record<string, string>)?.cloud_id
    const projectKey = (jiraSource.config as Record<string, string>)?.project_key
    if (!cloudId || !projectKey) return NextResponse.json({ error: 'Jira project not selected' }, { status: 400 })

    const headers = { Authorization: `Bearer ${jiraToken}`, Accept: 'application/json' }
    const base = `https://api.atlassian.com/ex/jira/${cloudId}/rest/api/3`
    const jqlProject = `project="${String(projectKey).replace(/"/g, '\\"')}"`

    const jiraSearch = async (jql: string, fields: string) => {
      const fieldList = fields.split(',').map(f => f.trim()).filter(Boolean)
      const res = await fetch(`${base}/search/jql`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ jql, maxResults: 100, fields: fieldList }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(`Jira search failed: ${data.errorMessages?.join('; ') ?? data.message ?? `HTTP ${res.status}`}`)
      return { issues: (data.issues ?? []) as Record<string, unknown>[] }
    }

    const issueTypeName = (i: Record<string, unknown>) =>
      String(((i.fields as Record<string, unknown>)?.issuetype as Record<string, unknown>)?.name ?? '')
    const isBugLike = (name: string) => { const t = name.toLowerCase(); return t.includes('bug') || t.includes('defect') }

    const { issues: openAnyType } = await jiraSearch(
      `${jqlProject} AND statusCategory != Done`,
      'priority,created,summary,status,issuetype,labels'
    )
    const openBugs = openAnyType.filter(i => isBugLike(issueTypeName(i)))

    const { issues: recentIssues } = await jiraSearch(
      `${jqlProject} AND (created >= -90d OR updated >= -90d)`,
      'issuetype,status,created,updated,resolutiondate,priority,summary,labels'
    )

    const blockedTickets = openAnyType.filter(i => {
      const fields = i.fields as Record<string, unknown>
      const labels = (fields?.labels as string[]) ?? []
      const summary = String(fields?.summary ?? '').toLowerCase()
      return labels.some((l: string) => l.toLowerCase().includes('block')) ||
             summary.includes('blocked') || summary.includes('waiting on')
    })

    const now = Date.now()
    const recentlyDone = recentIssues.filter(i => {
      const fields = i.fields as Record<string, unknown>
      return (fields?.status as Record<string, unknown>)?.name === 'Done' && fields?.resolutiondate
    })
    const criticalDone = recentlyDone.filter(i => {
      const fields = i.fields as Record<string, unknown>
      const priority = (fields?.priority as Record<string, string>)?.name ?? ''
      return ['Highest', 'High', 'P1', 'P2'].includes(priority)
    })
    const avgLeadTimeDays = recentlyDone.length > 0
      ? Math.round(recentlyDone.reduce((sum: number, i) => {
          const fields = i.fields as Record<string, unknown>
          return sum + (new Date(fields?.resolutiondate as string).getTime() - new Date(fields?.created as string).getTime()) / 86400000
        }, 0) / recentlyDone.length)
      : 0
    const avgCriticalLeadTimeDays = criticalDone.length > 0
      ? Math.round(criticalDone.reduce((sum: number, i) => {
          const fields = i.fields as Record<string, unknown>
          return sum + (new Date(fields?.resolutiondate as string).getTime() - new Date(fields?.created as string).getTime()) / 86400000
        }, 0) / criticalDone.length)
      : 0

    const productionIssues = openAnyType.filter(i => {
      const fields = i.fields as Record<string, unknown>
      const labels = (fields?.labels as string[]) ?? []
      const summary = String(fields?.summary ?? '').toLowerCase()
      return labels.some((l: string) => ['production', 'prod', 'live', 'p0', 'incident'].includes(l.toLowerCase())) ||
             summary.includes('production') || summary.includes('incident') || summary.includes('outage')
    })

    let sprintCompletion = null
    let lastSprintName = null
    try {
      const boardRes = await fetch(
        `https://api.atlassian.com/ex/jira/${cloudId}/rest/agile/1.0/board?projectKeyOrId=${projectKey}`, { headers }
      )
      if (boardRes.ok) {
        const boards = await boardRes.json()
        const boardId = boards.values?.[0]?.id
        if (boardId) {
          const sprintRes = await fetch(
            `https://api.atlassian.com/ex/jira/${cloudId}/rest/agile/1.0/board/${boardId}/sprint?state=active,closed&maxResults=3`, { headers }
          )
          if (sprintRes.ok) {
            const sprintData = await sprintRes.json()
            if (sprintData.values?.length > 0) {
              const lastSprint = sprintData.values[sprintData.values.length - 1]
              lastSprintName = lastSprint.name
              if (lastSprint.state === 'closed') {
                const siRes = await fetch(
                  `https://api.atlassian.com/ex/jira/${cloudId}/rest/agile/1.0/sprint/${lastSprint.id}/issue?maxResults=100&fields=status`, { headers }
                )
                if (siRes.ok) {
                  const si = await siRes.json()
                  const total = si.issues?.length ?? 0
                  const completed = si.issues?.filter((i: Record<string, unknown>) =>
                    ((i.fields as Record<string, unknown>)?.status as Record<string, unknown>)?.name === 'Done'
                  ).length ?? 0
                  sprintCompletion = total > 0 ? Math.round((completed / total) * 100) : null
                }
              }
            }
          }
        }
      }
    } catch { /* sprint optional */ }

    const bugsByPriority: Record<string, number> = {}
    const bugSummaries: string[] = []
    for (const bug of openBugs) {
      const fields = bug.fields as Record<string, unknown>
      const priority = (fields?.priority as Record<string, string>)?.name ?? 'Unknown'
      bugsByPriority[priority] = (bugsByPriority[priority] ?? 0) + 1
      bugSummaries.push(`[${priority}] ${String(fields?.summary ?? '')}`)
    }
    const criticalBugs = (bugsByPriority['Highest'] ?? 0) + (bugsByPriority['High'] ?? 0)
    const bugs = recentIssues.filter(i => isBugLike(issueTypeName(i)))
    const features = recentIssues.filter(i => {
      const type = (((i.fields as Record<string, unknown>)?.issuetype as Record<string, unknown>)?.name as string ?? '').toLowerCase()
      return type === 'story' || type === 'feature' || type === 'task'
    })
    const done = recentIssues.filter(i =>
      ((i.fields as Record<string, unknown>)?.status as Record<string, unknown>)?.name === 'Done'
    )
    const avgBugAgeDays = openBugs.length > 0
      ? Math.round(openBugs.reduce((sum: number, bug) => {
          return sum + (now - new Date((bug.fields as Record<string, unknown>)?.created as string).getTime()) / 86400000
        }, 0) / openBugs.length)
      : 0

    const jiraData = {
      openBugs: openBugs.length,
      openIssuesTotal: openAnyType.length,
      criticalBugs,
      bugsByPriority,
      bugSummaries: bugSummaries.slice(0, 10),
      avgBugAgeDays,
      avgLeadTimeDays,
      avgCriticalLeadTimeDays,
      productionIssues: productionIssues.length,
      blockedTickets: blockedTickets.length,
      recentIssuesTotal: recentIssues.length,
      recentBugs: bugs.length,
      recentFeatures: features.length,
      recentDone: done.length,
      bugToFeatureRatio: features.length > 0 ? Math.round((bugs.length / features.length) * 100) : 0,
      sprintCompletion,
      lastSprintName,
      projectKey,
    }

    if (jiraData.openIssuesTotal === 0 && jiraData.recentIssuesTotal === 0) {
      return NextResponse.json({ success: true, signals: 0, message: 'No issues found in project' })
    }

    const prompt = `You are Elvanis, an AI business analyst. Analyse this Jira project data and generate diagnostic signals.

PROJECT: ${projectKey}
OPEN BUGS:
${jiraData.bugSummaries.length > 0 ? jiraData.bugSummaries.join('\n') : 'None'}


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
- velocity_drop: sprint completion below 70%, low done rate, OR high bug-to-feature ratio (team is reactive, not shipping features)
- bug_backlog_growth: too many open bugs, high critical count, or production issues open
- response_time_increase: avg bug age over 7 days
- cycle_time_increase: avg lead time over 14 days for all bugs, or over 3 days for critical/high bugs
- blocked_tickets_spike: multiple blocked tickets slowing team

METRICS:
- Open issues total: ${jiraData.openIssuesTotal}
- Open bugs: ${jiraData.openBugs}
- Critical/High bugs: ${jiraData.criticalBugs}
- Average bug age: ${jiraData.avgBugAgeDays} days
- Average lead time (all resolved): ${jiraData.avgLeadTimeDays} days
- Average lead time (critical/high resolved): ${jiraData.avgCriticalLeadTimeDays} days
- Production issues open: ${jiraData.productionIssues}
- Blocked tickets: ${jiraData.blockedTickets}
- Issues created last 90 days: ${jiraData.recentIssuesTotal}
- Bugs created: ${jiraData.recentBugs}
- Features created: ${jiraData.recentFeatures}
- Issues completed (Done): ${jiraData.recentDone}
- Bug to feature ratio: ${jiraData.bugToFeatureRatio}%
${jiraData.sprintCompletion !== null ? `- Last sprint (${jiraData.lastSprintName}) completion: ${jiraData.sprintCompletion}%` : '- Sprint data: not configured'}

THRESHOLDS:
- Sprint completion < 70% = velocity_drop
- Critical/High bugs > 5 = bug_backlog_growth critical
- Avg bug age > 7 days = response_time_increase warning
- Avg lead time (all) > 14 days = cycle_time_increase warning
- Avg lead time (critical/high) > 3 days = cycle_time_increase critical
- Production issues open > 0 = bug_backlog_growth critical immediately
- Blocked tickets > 2 = blocked_tickets_spike
- Bug:feature ratio > 40% = velocity_drop warning (team is reactive) — do NOT use bug_backlog_growth for this

DATA QUALITY RULES:
- Only generate signals based on data explicitly provided above — never infer problems not supported by the numbers
- If openBugs = 0 and recentBugs = 0: do not generate bug_backlog_growth
- If sprintCompletion is null: do not generate velocity_drop based on sprint completion — only use bugToFeatureRatio if > 40%
- If recentIssuesTotal < 5: reduce severity by one level and note limited data in insight_summary

Generate 2-4 signals. Reference actual numbers.

VALUE FIELD RULES:
- bug_backlog_growth: value = openBugs count
- velocity_drop: value = sprintCompletion % if available, otherwise bugToFeatureRatio %
- response_time_increase: value = avgBugAgeDays
- cycle_time_increase: value = avgLeadTimeDays or avgCriticalLeadTimeDays (whichever is more relevant)
- blocked_tickets_spike: value = blockedTickets count

⚠️ CRITICAL LLM INSTRUCTION: Under no circumstances whatsoever may the \`value\` property contain a \`null\` or \`undefined\` data type. A valid numeric representation must be compiled for every single generated signal object.

Respond with JSON only — no preamble, no markdown formatting blocks, no backticks. Output a raw parsable string matching this exact shape:
{
  "signals": [
    {
      "signal_type": "bug_backlog_growth",
      "dimension": "product",
      "insight_summary": "specific insight with actual numbers",
      "recommended_action": "specific action this week",
      "severity": "critical|warning|watch",
      "confidence_score": 0.9,
      "value": 4,
      "change_percent": null,
      "evidence": "from Jira data"
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
          signal_type: 'bug_backlog_growth',
          dimension: 'product',
          insight_summary: `${jiraData.openBugs} open bugs (${jiraData.criticalBugs} critical/high) — avg age ${jiraData.avgBugAgeDays} days`,
          recommended_action: 'Triage and fix critical bugs this sprint',
          severity: jiraData.criticalBugs > 3 ? 'critical' : 'warning',
          confidence_score: 0.8,
          value: jiraData.openBugs,
          change_percent: null,
          evidence: jiraData.bugSummaries.join(', '),
        }],
        overall_diagnosis: `${jiraData.openBugs} open bugs, ${jiraData.recentDone} issues completed in last 90 days.`
      }
    }

    // ── Fetch existing signals including scan_count ──
    const { data: existing } = await admin
      .from('diagnostic_signals')
      .select('id, signal_type, value, change_percent, scan_count')
      .eq('founder_id', founderId)
      .eq('source', 'jira')
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
        source_id: jiraSource.id as string,
        signal_type: n.signal_type,
        dimension: n.dimension,
        insight_summary: (n.insight_summary as string) ?? 'Signal detected',
        recommended_action: (n.recommended_action as string) ?? 'Review and take action',
        severity: n.severity,
        confidence_score: (n.confidence_score as number) ?? 0.85,
        value: n.value ?? null,
        change_percent: n.change_percent ?? null,
        source: 'jira',
        period_start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        period_end: new Date().toISOString().split('T')[0],
        raw_data: { jiraData, evidence: n.evidence },
      }

      const prev = existingMap.get(n.signal_type)

      if (prev) {
        const prevVal = prev.value !== null && prev.value !== undefined ? Number(prev.value) : null
        const currVal = signalRow.value !== null && signalRow.value !== undefined ? Number(signalRow.value) : null
        const trend = prevVal !== null && currVal !== null
          ? jiraTrend(n.signal_type, prevVal, currVal)
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
          source: 'jira',
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
        // I4: select id after insert — push to touchedSignals so recordScan() snapshots new signals too
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
            source:          'jira',
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
      .eq('id', jiraSource.id as string)

    // I2: pass parentScanId + triggeredBy — links child scan row to master row
    await recordScan(founderId, 'jira', touchedSignals, parentScanId, triggeredBy)
    await resetStaleConflictPreferences(founderId, ['jira'])
    console.log(`Jira: ${inserted} inserted, ${updated} updated | parentScanId=${parentScanId} triggeredBy=${triggeredBy}`)

    return NextResponse.json({
      success: true, signals: inserted + updated,
      inserted, updated, jiraData,
      overall_diagnosis: analysis.overall_diagnosis,
    })

  } catch (err) {
    console.error('Jira scrape error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}