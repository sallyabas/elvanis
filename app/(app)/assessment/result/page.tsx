import { redirect } from 'next/navigation'
import { createServerComponentClient } from '@/lib/supabase-server'
import { getT } from '@/lib/translations'
import { getStatusLabel, getDisplaySummary } from '@/lib/assessment-status'

export default async function AssessmentResultPage() {
  const supabase = await createServerComponentClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: founder } = await supabase
    .from('founders')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle()

  const { data: score } = await supabase
    .from('scores')
    .select('*')
    .eq('founder_id', founder?.id ?? '')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!score) redirect('/assessment')

  const t    = getT((founder?.language ?? 'en') as 'en' | 'ar')

  const lang = founder?.language ?? 'en'
  const name = founder?.business_name ?? ''

  const formattedDate = new Intl.DateTimeFormat(lang === 'ar' ? 'ar-EG' : 'en-GB', {
    day: 'numeric', month: 'long', year: 'numeric',
  }).format(new Date(score.created_at))

  const reportTitle = name
    ? t('assessment.report_title_named').replace('{name}', name)
    : t('assessment.report_title')

  const dimensions = [
    { label: t('assessment.dim_revenue'),   val: score.score_revenue   as number | null },
    { label: t('assessment.dim_pmf'),       val: score.score_pmf       as number | null },
    { label: t('assessment.dim_team'),      val: score.score_team      as number | null },
    { label: t('assessment.dim_customer'),  val: score.score_customer  as number | null },
    { label: t('assessment.dim_marketing'), val: score.score_marketing as number | null },
    { label: t('assessment.dim_strategy'),  val: score.score_strategy  as number | null },
  ]
  const LANG_NAMES: Record<string, string> = {
    en: t('assessment.lang_name_en'),
    ar: t('assessment.lang_name_ar'),
  }
  const scoreLang    = (score.language as string) ?? 'en'
  const langMismatch    = scoreLang !== lang
  const canShowAlt      = langMismatch && !!score.is_translated && score.alt_language === lang
  const displaySummary  = getDisplaySummary(score as Record<string, unknown>, lang)
  const displayFindings = !langMismatch ? score.top_3_findings : (canShowAlt ? score.top_3_findings_alt : null)

  return (
    <main style={{ minHeight: '100vh', background: '#F9FAFB', fontFamily: 'Inter, sans-serif' }}>
      <div style={{ maxWidth: 960, margin: '0 auto', padding: '40px 24px' }}>

        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <p style={{ fontSize: 13, color: '#6B7280', marginBottom: 4 }}>
            {t('assessment.completed')} {formattedDate}
          </p>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: '#111827', margin: 0 }}>
            {reportTitle}
          </h1>
        </div>

        {/* Overall score */}
        <div style={{ background: '#fff', borderRadius: 20, border: '1px solid #E5E7EB', padding: '32px 36px', marginBottom: 20 }}>
          <p style={{ fontSize: 12, fontWeight: 600, color: '#6B7280', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t('assessment.overall_score')}</p>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, marginBottom: 12 }}>
            <span style={{ fontSize: 80, fontWeight: 800, color: '#111827', lineHeight: 1 }}>{score.overall_score}</span>
            <span style={{ fontSize: 24, color: '#9CA3AF', marginBottom: 8 }}>/100</span>
          </div>
          {score.overall_status && (
            <p style={{ color: '#374151', fontWeight: 600, marginBottom: 8 }}>{getStatusLabel(score.overall_status as string, t as (k: string) => string)}</p>
          )}
          {displaySummary && (
            <>
              <p style={{ color: '#6B7280', lineHeight: 1.65, fontSize: 15, margin: 0 }}>{displaySummary}</p>
              {canShowAlt && (
                <p style={{ fontSize: 11, color: '#9CA3AF', marginTop: 6, fontStyle: 'italic' }}>{t('assessment.translation_caveat')}</p>
              )}
            </>
          )}
          {typeof score.completeness_score === 'number' && (
            <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #F3F4F6' }}>
              <p style={{ fontSize: 12, color: '#9CA3AF', margin: 0 }}>
                {t('assessment.completeness_badge').replace('{n}', String(score.completeness_score))}
              </p>
              {score.completeness_score < 70 && (
                <p style={{ fontSize: 12, color: '#D97706', margin: '4px 0 0' }}>
                  {t('assessment.completeness_low')}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Primary constraint */}
        {score.primary_constraint_summary && !langMismatch && (
          <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 20, padding: '24px 28px', marginBottom: 20 }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: '#DC2626', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>{t('assessment.primary_constraint')}</p>
            <p style={{ color: '#1F2937', lineHeight: 1.65, fontSize: 15, margin: 0 }}>{score.primary_constraint_summary}</p>
          </div>
        )}

        {/* 6 dimension scores */}
        <div className="grid-3-col" style={{ marginBottom: 20 }}>
          {dimensions.map(({ label, val }) => {
            const v     = val ?? 0
            const color = v >= 66 ? '#059669' : v >= 41 ? '#D97706' : '#DC2626'
            return (
              <div key={label} style={{ background: '#F9FAFB', borderRadius: 12, padding: '14px 16px' }}>
                <p style={{ fontSize: 11, color: '#6B7280', fontWeight: 600, marginBottom: 6 }}>{label}</p>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, marginBottom: 8 }}>
                  <span style={{ fontSize: 28, fontWeight: 800, color, lineHeight: 1 }}>{val ?? '—'}</span>
                  {val !== null && <span style={{ fontSize: 12, color: '#9CA3AF', marginBottom: 2 }}>/100</span>}
                </div>
                <div style={{ height: 4, background: '#E5E7EB', borderRadius: 99 }}>
                  <div style={{ height: 4, borderRadius: 99, background: color, width: `${v}%` }} />
                </div>
              </div>
            )
          })}
        </div>
        {langMismatch && (
          <div style={{ background: '#fff', borderRadius: 20, border: '1px solid #FDE68A', padding: '32px 36px', marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 10 }}>
              <span style={{ fontSize: 22, flexShrink: 0 }}>🛡️</span>
              <p style={{ fontSize: 15, fontWeight: 700, color: '#92400E', margin: 0 }}>
                {t('assessment.native_notice_title').replace('{source}', LANG_NAMES[scoreLang])}
              </p>
            </div>
            <p style={{ color: '#6B7280', lineHeight: 1.65, fontSize: 14, marginBottom: 20 }}>
              {canShowAlt
                ? t('assessment.native_notice_explain_partial').replace(/{target}/g, LANG_NAMES[lang])
                : t('assessment.native_notice_explain')}
            </p>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <a href="/assessment" style={{ display: 'inline-block', padding: '10px 20px', background: '#D97706', color: '#fff', borderRadius: 10, textDecoration: 'none', fontWeight: 700, fontSize: 14 }}>
                {t('assessment.native_notice_cta').replace('{target}', LANG_NAMES[lang])}
              </a>
              <a href="/signals" style={{ display: 'inline-block', padding: '10px 20px', background: '#fff', color: '#92400E', border: '1px solid #FDE68A', borderRadius: 10, textDecoration: 'none', fontWeight: 700, fontSize: 14 }}>
                {t('assessment.next_signals')}
              </a>
            </div>
          </div>
        )}

        {/* Top 3 findings */}
        {displayFindings && (
          <div style={{ background: '#fff', borderRadius: 20, border: '1px solid #E5E7EB', padding: '28px 32px', marginBottom: 20 }}>
            <h3 style={{ fontSize: 17, fontWeight: 700, color: '#111827', marginBottom: 20 }}>{t('assessment.top_findings')}</h3>
            {canShowAlt && (
              <p style={{ fontSize: 11, color: '#9CA3AF', marginTop: -10, marginBottom: 16, fontStyle: 'italic' }}>{t('assessment.translation_caveat')}</p>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              {(displayFindings as Array<{ rank: number; finding: string; impact: string }>).map(item => (
                <div key={item.rank} style={{ display: 'flex', gap: 14 }}>
                  <span style={{ flexShrink: 0, width: 28, height: 28, background: '#EFF6FF', color: '#2563EB', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800 }}>
                    {item.rank}
                  </span>
                  <div>
                    <p style={{ color: '#1F2937', fontWeight: 600, fontSize: 15, margin: '0 0 4px' }}>{item.finding}</p>
                    <p style={{ color: '#6B7280', fontSize: 13, margin: 0, lineHeight: 1.5 }}>{item.impact}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Next steps */}
        <div style={{ background: '#fff', borderRadius: 20, border: '1px solid #E5E7EB', padding: '28px 32px', marginBottom: 20 }}>
          <h3 style={{ fontSize: 17, fontWeight: 700, color: '#111827', marginBottom: 16 }}>{t('assessment.next_steps')}</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
            <a href="/connect" style={{ padding: '18px', background: '#EFF6FF', borderRadius: 14, textDecoration: 'none', display: 'block' }}>
              <p style={{ fontSize: 20, marginBottom: 8 }}>🔌</p>
              <p style={{ fontSize: 14, fontWeight: 700, color: '#1D4ED8', margin: '0 0 4px' }}>{t('common.connect_tools')}</p>
              <p style={{ fontSize: 12, color: '#3B82F6', margin: 0 }}>{t('assessment.next_connect_sub')}</p>
            </a>
            <a href="/signals" style={{ padding: '18px', background: '#F0FDF4', borderRadius: 14, textDecoration: 'none', display: 'block' }}>
              <p style={{ fontSize: 20, marginBottom: 8 }}>📊</p>
              <p style={{ fontSize: 14, fontWeight: 700, color: '#15803D', margin: '0 0 4px' }}>{t('assessment.next_signals')}</p>
              <p style={{ fontSize: 12, color: '#16A34A', margin: 0 }}>{t('assessment.next_signals_sub')}</p>
            </a>
            <a href="/advisory?type=roadmap" style={{ padding: '18px', background: '#F5F3FF', borderRadius: 14, textDecoration: 'none', display: 'block' }}>
              <p style={{ fontSize: 20, marginBottom: 8 }}>🗺️</p>
              <p style={{ fontSize: 14, fontWeight: 700, color: '#6D28D9', margin: '0 0 4px' }}>{t('assessment.next_roadmap')}</p>
              <p style={{ fontSize: 12, color: '#7C3AED', margin: 0 }}>{t('assessment.next_roadmap_sub')}</p>
            </a>
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 12, justifyContent: 'space-between', alignItems: 'center' }}>
          <a href="/" style={{ padding: '12px 24px', background: '#2563EB', color: '#fff', borderRadius: 10, textDecoration: 'none', fontWeight: 600, fontSize: 14 }}>
            {t('assessment.go_dashboard')}
          </a>
          <a href="/assessment" style={{ fontSize: 13, color: '#6B7280', textDecoration: 'none', padding: '8px 16px', border: '1px solid #E5E7EB', borderRadius: 8 }}>
            {t('assessment.retake')}
          </a>
        </div>
      </div>
    </main>
  )
}
