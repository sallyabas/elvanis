import { createServerComponentClient } from '@/lib/supabase-server'
import { LanguageProvider } from '../context/LanguageContext'
import { redirect } from 'next/navigation'
import type { Lang } from '@/lib/translations'

export default async function OnboardingLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createServerComponentClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  let lang: Lang = 'en'
  if (user) {
    const { data: founder } = await supabase
      .from('founders')
      .select('language, onboarding_completed')
      .eq('user_id', user.id)
      .maybeSingle()
    if (founder?.onboarding_completed) redirect('/')
    lang = (founder?.language ?? 'en') as Lang
  }
  return <LanguageProvider lang={lang}>{children}</LanguageProvider>
}