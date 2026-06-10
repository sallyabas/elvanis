'use server'

import { createServerComponentClient } from '@/lib/supabase-server'

export async function dismissGuide() {
  const supabase = await createServerComponentClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  await supabase
    .from('founders')
    .update({ guide_dismissed: true })
    .eq('user_id', user.id)
  // No revalidatePath — client handles refresh to avoid flash
}