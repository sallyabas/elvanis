import { redirect } from 'next/navigation'
import { createServerComponentClient } from '@/lib/supabase-server'
import Sidebar from '@/components/Sidebar'
import { HelpPanel } from '@/components/HelpPanel'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createServerComponentClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: founder } = await supabase
    .from('founders')
    .select('id, full_name, business_name, subscription_tier, logo_url')
    .eq('user_id', user.id)
    .maybeSingle()

  // Fetch critical signal count for badge
  const { count: criticalCount } = await supabase
    .from('diagnostic_signals')
    .select('*', { count: 'exact', head: true })
    .eq('founder_id', founder?.id ?? '')
    .eq('severity', 'critical')
    .in('status', ['new', 'acknowledged'])

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <Sidebar
        founderName={founder?.full_name ?? null}
        businessName={founder?.business_name ?? null}
        subscriptionTier={founder?.subscription_tier ?? null}
        logoUrl={founder?.logo_url ?? null}
        criticalCount={criticalCount ?? 0}
      />
      <div style={{ flex: 1, overflowY: 'auto', background: '#F9FAFB' }}>
        {children}
      </div>
      <HelpPanel onRestartTour={() => {}} />
    </div>
  )
}
