import { redirect } from 'next/navigation'
import { createServerComponentClient } from '@/lib/supabase-server'
import GlobalHeader from '@/components/GlobalHeader'
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

  return (
    <main style={{ minHeight: '100vh', background: '#F9FAFB', fontFamily: 'Inter, sans-serif' }}>
      <GlobalHeader founder={founder} />
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
      />
    </main>
  )
}
