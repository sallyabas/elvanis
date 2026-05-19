'use server'

import { redirect } from 'next/navigation'
import { createServerComponentClient } from '@/lib/supabase-server'

export async function signOut() {
  const supabase = await createServerComponentClient()
  await supabase.auth.signOut()
  redirect('/login')
}