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
