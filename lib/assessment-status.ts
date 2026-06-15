/**
 * lib/assessment-status.ts
 *
 * Single source of truth for assessment overall_status display.
 * overall_status is always stored in English in DB.
 * Translate at display time using this function.
 * Used by: assessment/result/page.tsx, overview/page.tsx, home/page.tsx
 */

export function getStatusLabel(
  status: string,
  t: (key: string) => string
): string {
  const map: Record<string, string> = {
    'Healthy':                           t('assessment.status_healthy'),
    'Needs Attention':                   t('assessment.status_needs_attention'),
    'At Risk':                           t('assessment.status_at_risk'),
    'Critical':                          t('assessment.status_critical'),
    'assessment.status_healthy':         t('assessment.status_healthy'),
    'assessment.status_needs_attention': t('assessment.status_needs_attention'),
    'assessment.status_at_risk':         t('assessment.status_at_risk'),
    'assessment.status_critical':        t('assessment.status_critical'),
  }
  return map[status] ?? status
}

export function getPriorityOrderAlt(
  score: Record<string, unknown>,
  lang: string
): unknown {
  const scoreLang    = (score.language as string) ?? 'en'
  const langMismatch = scoreLang !== lang
  const canShowAlt   = langMismatch && !!score.is_translated && score.alt_language === lang
  return !langMismatch ? score.priority_order : canShowAlt ? score.priority_order_alt : null
}

export function getCausalChainsAlt(
  score: Record<string, unknown>,
  lang: string
): unknown {
  const scoreLang    = (score.language as string) ?? 'en'
  const langMismatch = scoreLang !== lang
  const canShowAlt   = langMismatch && !!score.is_translated && score.alt_language === lang
  return !langMismatch ? score.causal_chains : canShowAlt ? score.causal_chains_alt : null
}

export function getClosingMessage(
  score: Record<string, unknown>,
  lang: string
): string | null {
  const scoreLang    = (score.language as string) ?? 'en'
  const langMismatch = scoreLang !== lang
  const canShowAlt   = langMismatch && !!score.is_translated && score.alt_language === lang
  return !langMismatch
    ? (score.closing_message as string ?? null)
    : canShowAlt
      ? (score.closing_message_alt as string ?? null)
      : null
}

export function getPriorityOrder(
  score: Record<string, unknown>
): Array<{ priority: number; action: string; dimension: string; reason: string; timeframe: string; effort: string; impact: string }> | null {
  return (score.priority_order as Array<{ priority: number; action: string; dimension: string; reason: string; timeframe: string; effort: string; impact: string }>) ?? null
}

export function getCausalChains(
  score: Record<string, unknown>
): Array<{ chain_name: string; cause_dimension: string; cause_signal: string; symptom_dimensions: string[]; fix_order: string }> | null {
  return (score.causal_chains as Array<{ chain_name: string; cause_dimension: string; cause_signal: string; symptom_dimensions: string[]; fix_order: string }>) ?? null
}

export function getImplementationRoadmap(
  score: Record<string, unknown>
): Array<{ priority: number; action: string; dimension: string; timeframe: string; effort: string; impact: string }> | null {
  return (score.implementation_roadmap as Array<{ priority: number; action: string; dimension: string; timeframe: string; effort: string; impact: string }>) ?? null
}

export function getDisplayFindings(
  score: Record<string, unknown>,
  lang: string
): Array<{ rank: number; finding: string; impact: string }> | null {
  const scoreLang    = (score.language as string) ?? 'en'
  const langMismatch = scoreLang !== lang
  const canShowAlt   = langMismatch && !!score.is_translated && score.alt_language === lang
  return !langMismatch
    ? (score.top_3_findings as Array<{ rank: number; finding: string; impact: string }> ?? null)
    : canShowAlt ? (score.top_3_findings_alt as Array<{ rank: number; finding: string; impact: string }> ?? null) : null
}

export function getScoreDimensions(
  score: Record<string, unknown>,
  t: (key: string) => string
): Array<{ label: string; val: number | null }> {
  return [
    { label: t('assessment.dim_revenue'),   val: score.score_revenue   as number | null },
    { label: t('assessment.dim_pmf'),       val: score.score_pmf       as number | null },
    { label: t('assessment.dim_team'),      val: score.score_team      as number | null },
    { label: t('assessment.dim_customer'),  val: score.score_customer  as number | null },
    { label: t('assessment.dim_marketing'), val: score.score_marketing as number | null },
    { label: t('assessment.dim_strategy'),  val: score.score_strategy  as number | null },
  ]
}


export function getDisplayConstraint(
  score: Record<string, unknown>,
  lang: string
): string | null {
  const scoreLang    = (score.language as string) ?? 'en'
  const langMismatch = scoreLang !== lang
  const canShowAlt   = langMismatch && !!score.is_translated && score.alt_language === lang
  return !langMismatch
    ? (score.primary_constraint_summary as string ?? null)
    : canShowAlt
      ? (score.primary_constraint_summary_alt as string ?? null)
      : null
}

export function getDisplaySummary(
  score: Record<string, unknown>,
  lang: string
): string | null {
  const scoreLang    = (score.language as string) ?? 'en'
  const langMismatch = scoreLang !== lang
  const canShowAlt   = langMismatch && !!score.is_translated && score.alt_language === lang
  return !langMismatch
    ? (score.overall_summary as string ?? null)
    : canShowAlt
      ? (score.overall_summary_alt as string ?? null)
      : null
}
