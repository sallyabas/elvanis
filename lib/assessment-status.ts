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
