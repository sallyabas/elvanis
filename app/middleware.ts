import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Routes that require authentication
const PROTECTED_ROUTES = [
  '/focus',
  '/overview',
  '/signals',
  '/plan',
  '/connect',
  '/measure',
  '/health-tracker',
  '/assessment',
  '/profile',
  '/service-request',
  '/onboarding',
  '/admin',
]

// Routes always accessible without auth
const PUBLIC_ROUTES = [
  '/',
  '/login',
  '/signup',
  '/forgot-password',
  '/reset-password',
  '/callback',
  '/suspended',
  '/terms',
  '/privacy',
]
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Always allow public routes and API routes
  const isPublic = PUBLIC_ROUTES.some(r => pathname === r || pathname.startsWith(r + '/'))
  const isApi    = pathname.startsWith('/api/')
  const isStatic = pathname.startsWith('/_next/') || pathname.includes('.')

  if (isPublic || isApi || isStatic) {
    return NextResponse.next()
  }

  // Check if route needs protection
  const isProtected = PROTECTED_ROUTES.some(r => pathname === r || pathname.startsWith(r + '/'))
  if (!isProtected) return NextResponse.next()

  // Create Supabase SSR client to read session from cookies
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll:  () => request.cookies.getAll(),
        setAll:  (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  // No session — redirect to login
  if (!user) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('next', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Session exists — check onboarding for non-onboarding routes
  if (pathname !== '/onboarding' && !pathname.startsWith('/onboarding/')) {
    const { data: founder } = await supabase
      .from('founders')
      .select('onboarding_completed, account_status')
      .eq('user_id', user.id)
      .maybeSingle()
      
      if (!founder || !founder.onboarding_completed) {
        return NextResponse.redirect(new URL('/onboarding', request.url))
      }
      
      if (founder.account_status === 'suspended' && pathname !== '/suspended') {
        return NextResponse.redirect(new URL('/suspended', request.url))
      }
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}