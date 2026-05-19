import { NextResponse } from 'next/server'
import { createServerComponentClient } from '@/lib/supabase-server'

export async function GET() {
  const supabase = await createServerComponentClient()
  await supabase.auth.signOut()
  return NextResponse.redirect(new URL('/login', process.env.NEXT_PUBLIC_APP_URL!))
}
