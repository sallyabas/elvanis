import { redirect } from 'next/navigation'
import { createServerComponentClient } from '@/lib/supabase-server'
import ProfileClient from './client'

export default async function ProfilePage() {
  const supabase = await createServerComponentClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: founder } = await supabase
    .from('founders')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!founder) redirect('/login')

  // Service requests
  const { data: serviceRequests } = await supabase
    .from('service_requests')
    .select('id, type, status, created_at, notes')
    .eq('founder_id', founder.id)
    .order('created_at', { ascending: false })
    .limit(10)

  // Payment history
  const { data: payments, error: paymentsError } = await supabase
    .from('payments')
    .select('id, amount, currency, status, payment_method, reference, period_start, period_end, cancelled_at, created_at')    .eq('founder_id', founder.id)
    .order('created_at', { ascending: false })
    .limit(24)
    console.log('payments query:', payments?.length, paymentsError?.message)

  return (
    <main style={{ minHeight: '100vh', background: '#F9FAFB', fontFamily: 'Inter, sans-serif' }}>
      <ProfileClient
        founderId={founder.id}
        initialEmail={user.email ?? ''}
        initialFullName={founder.full_name ?? ''}
        initialBusinessName={founder.business_name ?? ''}
        initialLogoUrl={founder.logo_url ?? null}
        initialIndustry={founder.industry ?? ''}
        initialIndustryOther={founder.industry_other ?? ''}
        initialMarket={founder.market ?? ''}
        initialBrandUrl={founder.brand_url ?? ''}
        initialFocusMetric={founder.focus_metric ?? ''}
        subscriptionTier={founder.subscription_tier ?? 'free'}
        subscriptionStatus={founder.subscription_status ?? 'inactive'}
        subscriptionStartedAt={founder.subscription_started_at ?? null}
        subscriptionEndsAt={founder.subscription_ends_at ?? null}
        serviceRequests={serviceRequests ?? []}
        payments={payments ?? []}
       initialLanguage={founder.language ?? 'en'}
      />
    </main>
  )
}
