import { redirect } from 'next/navigation'
import { createServerComponentClient } from '@/lib/supabase-server'
import AssessmentClient from './client'

export default async function AssessmentPage() {
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
    <AssessmentClient
      founderId={founder.id}
      language={founder.language ?? 'en'}
      founderStage={founder.founder_stage ?? 'early_stage'}
      founderMarket={founder.market ?? ''}
      founderIndustry={founder.industry ?? ''}
      founderIndustryOther={founder.industry_other ?? ''}
      founderBrandUrl={founder.brand_url ?? ''}
    />
  )
}
