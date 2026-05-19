import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import { getValidToken } from '@/lib/token-refresh'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const returnFilter = request.nextUrl.searchParams.get('return')
  const redirectUrl = returnFilter ? `/signals?filter=${returnFilter}` : '/signals'
  const supabase = createAdminClient()

  const { data: signal } = await supabase
    .from('diagnostic_signals')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (!signal) return NextResponse.redirect(new URL(redirectUrl, request.url))

  // Already has a Jira ticket
  if (signal.jira_issue_key) return NextResponse.redirect(new URL(redirectUrl, request.url))

  try {
    const tokenResult = await getValidToken(signal.founder_id, 'jira')
    if (tokenResult) {
      const { accessToken, source: jiraSource } = tokenResult
      const cloudId = (jiraSource.config as Record<string, string>)?.cloud_id
      const projectKey = (jiraSource.config as Record<string, string>)?.project_key
      const siteUrl = (jiraSource.config as Record<string, string>)?.site_url ?? ''

      if (cloudId && projectKey) {
        const jiraRes = await fetch(
          `https://api.atlassian.com/ex/jira/${cloudId}/rest/api/3/issue`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${accessToken}`,
              Accept: 'application/json',
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              fields: {
                project: { key: projectKey },
                summary: `[Elvanis] ${signal.insight_summary}`,
                description: {
                  type: 'doc',
                  version: 1,
                  content: [{
                    type: 'paragraph',
                    content: [{ type: 'text', text: `Recommended action: ${signal.recommended_action}\n\nSource: ${signal.source} | Severity: ${signal.severity}` }]
                  }]
                },
                issuetype: { name: 'Task' },
                priority: {
                  name: signal.severity === 'critical' ? 'High' : signal.severity === 'warning' ? 'Medium' : 'Low'
                },
                labels: ['elvanis'],
              }
            }),
          }
        )

        if (jiraRes.ok) {
          const issue = await jiraRes.json()
          await supabase
            .from('diagnostic_signals')
            .update({
              jira_issue_key: issue.key,
              jira_issue_url: `${siteUrl}/browse/${issue.key}`,
              jira_created_at: new Date().toISOString(),
            })
            .eq('id', id)

          await supabase.from('jira_actions').insert({
            signal_id: id,
            founder_id: signal.founder_id,
            source_id: signal.source_id,
            jira_issue_key: issue.key,
            jira_issue_url: `${siteUrl}/browse/${issue.key}`,
            jira_project_key: projectKey,
            summary: `[Elvanis] ${signal.insight_summary}`,
            description: signal.recommended_action,
            status: 'created',
          })
        }
      }
    }
  } catch (err) {
    console.error('Jira ticket creation error:', err)
  }

  return NextResponse.redirect(new URL(redirectUrl, request.url))
}
