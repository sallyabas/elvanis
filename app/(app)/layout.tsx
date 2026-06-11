import { redirect } from 'next/navigation'
import { createServerComponentClient } from '@/lib/supabase-server'
import Sidebar from '@/components/Sidebar'
import DirProvider from '@/components/DirProvider'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createServerComponentClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: founder } = await supabase
    .from('founders')
    .select('id, full_name, business_name, subscription_tier, logo_url, language')
    .eq('user_id', user.id)
    .maybeSingle()

  const { count: criticalCount } = await supabase
    .from('diagnostic_signals')
    .select('*', { count: 'exact', head: true })
    .eq('founder_id', founder?.id ?? '')
    .eq('severity', 'critical')
    .in('status', ['new', 'acknowledged'])

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <DirProvider lang={founder?.language ?? 'en'} />
      <div style={{ position: 'sticky', top: 0, height: '100vh', flexShrink: 0 }}>
        <Sidebar
          founderName={founder?.full_name ?? null}
          businessName={founder?.business_name ?? null}
          subscriptionTier={founder?.subscription_tier ?? null}
          logoUrl={founder?.logo_url ?? null}
          criticalCount={criticalCount ?? 0}
        />
      </div>
      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', background: '#F9FAFB' }} className="app-main">
        {children}
      </div>
    </div>
  )
}