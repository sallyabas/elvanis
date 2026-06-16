import { redirect } from 'next/navigation'
import { unstable_cache } from 'next/cache'
import { createServerComponentClient, createAdminClient } from '@/lib/supabase-server'
import Sidebar from '@/components/Sidebar'
import DirProvider from '@/components/DirProvider'
import type { Lang } from '@/lib/translations'
import { LanguageProvider } from '../context/LanguageContext'


const getHelpArticles = unstable_cache(
  async () => {
    const admin = createAdminClient()
    const { data } = await admin
      .from('help_articles')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true })
    return data ?? []
  },
  ['help-articles'],
  { revalidate: 3600, tags: ['help-articles'] }
)

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

    const helpArticles = await getHelpArticles()
    const lang = (founder?.language ?? 'en') as Lang
  return (
    <LanguageProvider lang={lang}>
      <div style={{ display: 'flex', minHeight: '100vh' }}>
        <DirProvider lang={founder?.language ?? 'en'} />
        <Sidebar
          founderName={founder?.full_name ?? null}
          businessName={founder?.business_name ?? null}
          subscriptionTier={founder?.subscription_tier ?? null}
          logoUrl={founder?.logo_url ?? null}
          criticalCount={criticalCount ?? 0}
          language={founder?.language ?? 'en'}
          helpArticles={helpArticles}
        />
        <div style={{ flex: 1, overflowX: 'hidden', background: '#F9FAFB' }} className="app-main">
          {children}
        </div>
      </div>
    </LanguageProvider>
  )
}
