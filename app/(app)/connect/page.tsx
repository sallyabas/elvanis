import { redirect } from 'next/navigation'
import { createServerComponentClient } from '@/lib/supabase-server'
import { getT } from '@/lib/translations'

const STRIPE_PAYMENT_LINK = process.env.NEXT_PUBLIC_STRIPE_PAYMENT_LINK

export default async function ConnectPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; error?: string }>
}) {
  const supabase = await createServerComponentClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { success, error: authError } = await searchParams

  const { data: founder } = await supabase
    .from('founders')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle()

  const t    = getT((founder?.language ?? 'en') as 'en' | 'ar')
  const lang = founder?.language ?? 'en'

  const { data: sources } = await supabase
    .from('data_sources')
    .select('*')
    .eq('founder_id', founder?.id ?? '')
    .in('status', ['active', 'token_expired'])

  const connected = (type: string) => sources?.find(s => s.source_type === type)
  const csvSources = sources?.filter(s => s.source_type === 'csv') ?? []

  const activeSources = sources?.filter(s => s.status === 'active') ?? []
  const connectedCount = activeSources.length

  const isFreeTier = !founder || founder.subscription_tier === 'free'
  const name = founder?.full_name?.split(' ')[0] ?? ''
  const hour = new Date().getHours()
  const greeting = hour < 12 ? t('greeting.morning') : hour < 17 ? t('greeting.afternoon') : t('greeting.evening')

  const liveIntegrationCount = activeSources.filter(s => s.source_type !== 'csv').length
  const hasCsvUploads = activeSources.some(s => s.source_type === 'csv')
  const effectiveSourceCount = liveIntegrationCount + (hasCsvUploads ? 1 : 0)
  const isAtLimit = isFreeTier && effectiveSourceCount >= 3

  const CSV_TEMPLATES = [
    { id: 'support',   name: 'Customer Support',   icon: '🎫', color: '#D97706', bg: '#FFFBEB' },
    { id: 'orders',    name: 'Orders & Revenue',    icon: '💰', color: '#2563EB', bg: '#EFF6FF' },
    { id: 'velocity',  name: 'Team Velocity',       icon: '⚙️', color: '#7C3AED', bg: '#F5F3FF' },
    { id: 'financial', name: 'Financial Snapshot',  icon: '💵', color: '#059669', bg: '#ECFDF5' },
    { id: 'marketing', name: 'Marketing Metrics',   icon: '📣', color: '#D97706', bg: '#FFFBEB' },
  ]

  const integrations = [
    {
      id: 'jira',
      name: 'Jira',
      description: 'Sprint velocity, bug backlog, open issues. Diagnose team and product delivery problems automatically.',
      icon: '🔧',
      color: '#0052CC',
      bg: '#E6F0FF',
      authUrl: '/api/auth/jira',
      signals: ['velocity_drop', 'bug_backlog_growth', 'response_time_increase'],
      dimensions: ['team', 'product'],
      config: connected('jira')?.config as Record<string, string> | undefined,
    },
    {
      id: 'ga4',
      name: 'Google Analytics',
      description: 'Traffic trends, conversion funnel, acquisition channels, device performance.',
      icon: '📊',
      color: '#E37400',
      bg: '#FFF3E0',
      authUrl: '/api/auth/google',
      signals: ['conversion_fall', 'engagement_drop'],
      dimensions: ['marketing', 'customer'],
      config: connected('ga4')?.config as Record<string, string> | undefined,
    },
    {
      id: 'trustpilot',
      name: 'Trustpilot',
      description: 'Review rating trends, sentiment analysis, recurring complaint patterns.',
      icon: '⭐',
      color: '#00B67A',
      bg: '#E6F9F1',
      authUrl: null,
      signals: ['rating_decline', 'repeat_complaint_pattern'],
      dimensions: ['customer'],
      config: connected('trustpilot')?.config as Record<string, string> | undefined,
    },
    {
      id: 'shopify',
      name: 'Shopify',
      description: 'Revenue trends, refund rate, AOV, repeat purchase rate, customer retention.',
      icon: '🛍️',
      color: '#96BF48',
      bg: '#F3F9E8',
      authUrl: '/connect/shopify',
      signals: ['refund_spike', 'aov_decline', 'repeat_purchase_drop', 'churn_spike', 'conversion_fall'],
      dimensions: ['revenue', 'customer'],
      config: connected('shopify')?.config as Record<string, string> | undefined,
    },
    {
      id: 'intercom',
      name: 'Intercom',
      description: 'Conversation volume, response times, repeat contacts, CSAT scores, activation issues.',
      icon: '💬',
      color: '#1F8EFF',
      bg: '#EFF6FF',
      authUrl: '/connect/intercom',
      signals: ['ticket_volume_increase', 'response_time_increase', 'repeat_complaint_pattern', 'activation_drop', 'csat_decline'],
      dimensions: ['customer', 'product'],
      config: connected('intercom')?.config as Record<string, string> | undefined,
    },
  ]

  const getSuccessTitle = (s: string) => {
    if (s === 'shopify')  return t('connect.success_shopify')
    if (s === 'intercom') return t('connect.success_intercom')
    if (s === 'ga4')      return t('connect.success_ga4')
    if (s === 'jira')     return t('connect.success_jira')
    return t('connect.success_default')
  }

  return (
    <main style={{ minHeight: '100vh', background: '#F9FAFB', fontFamily: 'Inter, sans-serif' }}>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '36px 24px' }}>
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: '#111827', margin: '0 0 4px' }}>
            {name ? `${greeting}, ${name}` : t('signals.your_command')}
          </h1>
          <p style={{ fontSize: 14, color: '#6B7280', margin: 0 }}>
            {new Date().toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>

        <div style={{ maxWidth: 960, margin: '0 auto', padding: '40px 24px' }}>

          {/* Page title */}
          <div style={{ marginBottom: 28 }}>
            <h1 style={{ fontSize: 28, fontWeight: 800, color: '#111827', marginBottom: 6 }}>{t('connect.title')}</h1>
            <p style={{ color: '#6B7280', fontSize: 15, margin: 0 }}>{t('connect.subtitle')}</p>
          </div>

          {/* Free tier limit banner */}
          {isAtLimit && (
            <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 12, padding: '14px 20px', marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 18 }}>🔒</span>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 700, color: '#92400E', margin: '0 0 2px' }}>
                    {t('connect.limit_title')}
                  </p>
                  <p style={{ fontSize: 13, color: '#B45309', margin: 0 }}>
                    {t('connect.limit_sub')}
                  </p>
                </div>
              </div>
              {STRIPE_PAYMENT_LINK && (
                <a
                  href={STRIPE_PAYMENT_LINK}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ padding: '8px 18px', background: '#D97706', color: '#fff', borderRadius: 9, fontSize: 13, fontWeight: 700, textDecoration: 'none', whiteSpace: 'nowrap', flexShrink: 0 }}
                >
                  {t('overview.upgrade')}
                </a>
              )}
            </div>
          )}

          {/* Success banner */}
          {success && (
            <div style={{ background: '#ECFDF5', border: '1px solid #A7F3D0', borderRadius: 12, padding: '14px 20px', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 18 }}>✅</span>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 14, color: '#065F46', fontWeight: 700, margin: '0 0 2px' }}>
                  {getSuccessTitle(success)}
                </p>
                <p style={{ fontSize: 13, color: '#059669', margin: 0 }}>
                  {t('connect.success_sub')}
                </p>
              </div>
              <a href="/signals" style={{ fontSize: 13, color: '#059669', fontWeight: 600, textDecoration: 'none', flexShrink: 0 }}>
                {t('common.view_signals')}
              </a>
            </div>
          )}

          {/* Error banner */}
          {authError && (
            <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 12, padding: '14px 20px', marginBottom: 24 }}>
              <p style={{ fontSize: 14, color: '#DC2626', fontWeight: 600, margin: 0 }}>
                {t('connect.error_prefix')} {authError === 'token_failed' ? 'could not get access token' : authError}. {t('connect.try_again')}
              </p>
            </div>
          )}

          {/* Connected count summary */}
          {connectedCount > 0 && (
            <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 14, padding: '16px 20px', marginBottom: 28, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: '#ECFDF5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>✅</div>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 700, color: '#111827', margin: 0 }}>
                    {connectedCount} {t('connect.sources_active').replace('{s}', connectedCount > 1 ? 's' : '')}
                    {isFreeTier && ` · ${effectiveSourceCount}/3 ${t('connect.slots_used')}`}
                  </p>
                  <p style={{ fontSize: 13, color: '#6B7280', margin: 0 }}>
                    {activeSources.map(s => s.source_type === 'csv' ? `CSV (${(s.config as Record<string, string>)?.template_type ?? 'unknown'})` : s.source_type).join(' · ')}
                  </p>
                </div>
              </div>
              <a href="/signals" style={{ fontSize: 13, color: '#2563EB', fontWeight: 600, textDecoration: 'none' }}>
                {t('common.view_signals')}
              </a>
            </div>
          )}

          {/* API integrations */}
          <h2 style={{ fontSize: 16, fontWeight: 700, color: '#374151', marginBottom: 14 }}>{t('connect.live_integrations')}</h2>
          <div className="grid-2-col" style={{ marginBottom: 32 }}>
            {integrations.map(integration => {
              const isConnected = !!connected(integration.id)
              const isExpired   = connected(integration.id)?.status === 'token_expired'
              const isBlocked   = isAtLimit && !isConnected

              return (
                <div key={integration.id} style={{
                  background: '#fff', borderRadius: 16,
                  border: isConnected ? (isExpired ? '1.5px solid #FDE68A' : '1.5px solid #A7F3D0') : '1px solid #E5E7EB',
                  padding: '22px', position: 'relative',
                  opacity: isBlocked ? 0.7 : 1,
                }}>
                  {isConnected && (
                    <div style={{ position: 'absolute', top: 14, right: 14, background: isExpired ? '#FFFBEB' : '#ECFDF5', color: isExpired ? '#D97706' : '#059669', fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20 }}>
                      {isExpired ? t('connect.token_expired') : t('connect.connected')}
                    </div>
                  )}

                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                    <div style={{ width: 44, height: 44, borderRadius: 11, background: integration.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>
                      {integration.icon}
                    </div>
                    <div>
                      <h3 style={{ fontSize: 16, fontWeight: 700, color: '#111827', margin: '0 0 3px' }}>{integration.name}</h3>
                      <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                        {integration.dimensions.map(d => (
                          <span key={d} style={{ fontSize: 10, padding: '1px 7px', borderRadius: 20, background: '#F3F4F6', color: '#6B7280', fontWeight: 600, textTransform: 'uppercase' }}>
                            {d}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <p style={{ fontSize: 13, color: '#6B7280', lineHeight: 1.6, marginBottom: 12 }}>
                    {integration.description}
                  </p>

                  {isConnected && integration.config && (
                    <div style={{ background: '#F9FAFB', borderRadius: 8, padding: '8px 12px', marginBottom: 12, fontSize: 12, color: '#6B7280' }}>
                      {integration.id === 'ga4' && integration.config.selected_property_id && (
                        <span>Property: {integration.config.selected_property_id}</span>
                      )}
                      {integration.id === 'jira' && integration.config.project_name && (
                        <span>Project: {integration.config.project_name} ({integration.config.project_key})</span>
                      )}
                      {integration.id === 'trustpilot' && integration.config.domain && (
                        <span>Domain: {integration.config.domain}</span>
                      )}
                      {integration.id === 'intercom' && integration.config?.app_name && (
                        <span>Workspace: {integration.config.app_name}</span>
                      )}
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: 8 }}>
                    {isBlocked ? (
                      STRIPE_PAYMENT_LINK ? (
                        <a
                          href={STRIPE_PAYMENT_LINK}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ flex: 1, display: 'block', padding: '10px', background: '#7C3AED', color: '#fff', borderRadius: 10, fontSize: 13, fontWeight: 600, textDecoration: 'none', textAlign: 'center' }}
                        >
                          {t('connect.upgrade_connect')}
                        </a>
                      ) : (
                        <a href="/advisory?type=upgrade" style={{ flex: 1, display: 'block', padding: '10px', background: '#7C3AED', color: '#fff', borderRadius: 10, fontSize: 13, fontWeight: 600, textDecoration: 'none', textAlign: 'center' }}>
                          {t('connect.upgrade_connect')}
                        </a>
                      )
                    ) : integration.id === 'trustpilot' ? (
                      isConnected ? (
                        <>
                          <a href="/signals?filter=trustpilot" style={{ flex: 1, padding: '9px', background: '#EFF6FF', color: '#2563EB', borderRadius: 9, fontSize: 12, fontWeight: 600, textDecoration: 'none', textAlign: 'center' }}>
                            {t('connect.view_signals')}
                          </a>
                          <a href="/api/auth/disconnect/trustpilot" style={{ padding: '9px 14px', background: '#FEF2F2', color: '#DC2626', borderRadius: 9, fontSize: 12, fontWeight: 600, textDecoration: 'none' }}>
                            {t('connect.disconnect')}
                          </a>
                        </>
                      ) : (
                        <a href="/connect/trustpilot" style={{ flex: 1, display: 'block', padding: '10px', background: integration.color, color: '#fff', borderRadius: 10, fontSize: 13, fontWeight: 600, textDecoration: 'none', textAlign: 'center' }}>
                          {t('connect.connect_cta').replace('{name}', integration.name)}
                        </a>
                      )
                    ) : isConnected ? (
                      <>
                        <a href={`/signals?filter=${integration.id}`} style={{ flex: 1, padding: '9px', background: '#EFF6FF', color: '#2563EB', borderRadius: 9, fontSize: 12, fontWeight: 600, textDecoration: 'none', textAlign: 'center' }}>
                          {t('connect.view_signals')}
                        </a>
                        {isExpired ? (
                          <a href={integration.authUrl!} style={{ padding: '9px 14px', background: '#FFFBEB', color: '#D97706', borderRadius: 9, fontSize: 12, fontWeight: 600, textDecoration: 'none', border: '1px solid #FDE68A' }}>
                            {t('common.reconnect_cta')}
                          </a>
                        ) : (
                          <a href={`/api/auth/disconnect/${integration.id}`} style={{ padding: '9px 14px', background: '#FEF2F2', color: '#DC2626', borderRadius: 9, fontSize: 12, fontWeight: 600, textDecoration: 'none' }}>
                            {t('connect.disconnect')}
                          </a>
                        )}
                      </>
                    ) : (
                      <a href={integration.authUrl!} style={{ flex: 1, display: 'block', padding: '10px', background: integration.color, color: '#fff', borderRadius: 10, fontSize: 13, fontWeight: 600, textDecoration: 'none', textAlign: 'center' }}>
                        {t('connect.connect_cta').replace('{name}', integration.name)}
                      </a>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {/* CSV uploads */}
          <h2 style={{ fontSize: 16, fontWeight: 700, color: '#374151', marginBottom: 6 }}>{t('connect.csv_title')}</h2>
          <p style={{ fontSize: 13, color: '#9CA3AF', marginBottom: 14 }}>{t('connect.csv_sub')}</p>
          <div className="grid-3-col-csv" style={{ marginBottom: 32 }}>
            {CSV_TEMPLATES.map(tmpl => {
              const uploadedSource = csvSources.find(s => (s.config as Record<string, string>)?.template_type === tmpl.id)
              const isUploaded     = !!uploadedSource
              const uploadedConfig = uploadedSource?.config as Record<string, string> | undefined
              const csvBlocked     = isAtLimit && !hasCsvUploads && !isUploaded

              return (
                <div key={tmpl.id} style={{
                  background: '#fff', borderRadius: 14,
                  border: isUploaded ? '1.5px solid #A7F3D0' : '1px solid #E5E7EB',
                  padding: '18px', position: 'relative',
                  opacity: csvBlocked ? 0.7 : 1,
                }}>
                  {isUploaded && (
                    <div style={{ position: 'absolute', top: 12, right: 12, background: '#ECFDF5', color: '#059669', fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20 }}>
                      {t('connect.uploaded')}
                    </div>
                  )}
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: tmpl.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, marginBottom: 10 }}>
                    {tmpl.icon}
                  </div>
                  <p style={{ fontSize: 14, fontWeight: 700, color: '#111827', margin: '0 0 4px' }}>{tmpl.name}</p>

                  {isUploaded && uploadedConfig && (
                    <p style={{ fontSize: 11, color: '#6B7280', margin: '0 0 10px' }}>
                      {uploadedConfig.filename ?? 'File uploaded'} · {uploadedConfig.row_count ?? '?'} rows
                    </p>
                  )}

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 10 }}>
                    {csvBlocked ? (
                      STRIPE_PAYMENT_LINK ? (
                        <a
                          href={STRIPE_PAYMENT_LINK}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ display: 'block', padding: '8px', background: '#7C3AED', color: '#fff', borderRadius: 8, fontSize: 12, fontWeight: 600, textDecoration: 'none', textAlign: 'center' }}
                        >
                          {t('connect.upgrade_upload')}
                        </a>
                      ) : (
                        <a href="/advisory?type=upgrade" style={{ display: 'block', padding: '8px', background: '#7C3AED', color: '#fff', borderRadius: 8, fontSize: 12, fontWeight: 600, textDecoration: 'none', textAlign: 'center' }}>
                          {t('connect.upgrade_upload')}
                        </a>
                      )
                    ) : (
                      <>
                        <a href={`/connect/csv?template=${tmpl.id}`} style={{ display: 'block', padding: '8px', background: isUploaded ? '#F3F4F6' : tmpl.color, color: isUploaded ? '#374151' : '#fff', borderRadius: 8, fontSize: 12, fontWeight: 600, textDecoration: 'none', textAlign: 'center' }}>
                          {isUploaded ? t('connect.reupload') : t('connect.upload_csv')}
                        </a>
                        {isUploaded && (
                          <a href="/signals?filter=csv" style={{ display: 'block', padding: '8px', background: '#EFF6FF', color: '#2563EB', borderRadius: 8, fontSize: 12, fontWeight: 600, textDecoration: 'none', textAlign: 'center' }}>
                            {t('connect.view_signals')}
                          </a>
                        )}
                      </>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Coming soon */}
          <div>
            <p style={{ fontSize: 12, color: '#9CA3AF', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>{t('connect.coming_soon')}</p>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {['Gorgias', 'Linear', 'HubSpot', 'Klaviyo', 'Stripe', 'Xero'].map(tool => (
                <div key={tool} style={{ padding: '7px 14px', background: '#fff', border: '1px solid #E5E7EB', borderRadius: 10, fontSize: 13, color: '#9CA3AF' }}>
                  {tool}
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </main>
  )
}
