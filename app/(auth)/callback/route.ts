export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/onboarding'

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=missing_code`)
  }

  const cookieStore = await cookies()
  const response = NextResponse.redirect(`${origin}${next}`)

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  const { data: { user }, error: sessionError } = 
    await supabase.auth.exchangeCodeForSession(code)

  if (sessionError || !user) {
    console.error('Auth callback error:', sessionError?.message)
    return NextResponse.redirect(`${origin}/login?error=confirmation_failed`)
  }

  const admin = createAdminClient()
  const { data: existingFounder } = await admin
    .from('founders')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!existingFounder) {
    const fullName = (user.user_metadata?.full_name as string | undefined)?.trim() ?? ''
    const businessName = (user.user_metadata?.business_name as string | undefined)?.trim() ?? ''

    const { error: founderError } = await admin
      .from('founders')
      .insert({
        user_id:              user.id,
        email:                user.email ?? '',
        full_name:            fullName,
        business_name:        businessName,
        language:             'en',
        subscription_tier:    'free',
        subscription_status:  'active',
        account_status:       'active',
        onboarding_completed: false,
      })

    if (founderError) {
      console.error('Founder creation error:', founderError.message)
    }
  }

  return response
}