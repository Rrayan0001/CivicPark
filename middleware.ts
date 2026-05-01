import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'
import { createServerClient } from '@supabase/ssr'
import type { Database } from '@/types/database'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const { supabaseResponse, user } = await updateSession(request)

  const isAuthRoute    = pathname.startsWith('/auth')
  const isCitizenRoute = pathname.startsWith('/citizen') || pathname.startsWith('/report')
  const isOfficerRoute = pathname.startsWith('/officer')
  const isAdminRoute   = pathname.startsWith('/admin')
  const isProtected    = isCitizenRoute || isOfficerRoute || isAdminRoute

  // Not logged in — redirect to login
  if (isProtected && !user) {
    const url = request.nextUrl.clone()
    url.pathname = '/auth/login'
    url.searchParams.set('redirect', pathname)
    return NextResponse.redirect(url)
  }

  // Logged in — check role for privileged routes
  if (user && (isOfficerRoute || isAdminRoute)) {
    const supabase = createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => request.cookies.getAll(),
          setAll: () => {},
        },
      },
    )

    const profileRes = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle()

    const role = (profileRes.data as { role: string } | null)?.role ?? 'citizen'

    if (isAdminRoute && role !== 'admin') {
      return NextResponse.redirect(new URL('/citizen/my-reports', request.url))
    }

    if (isOfficerRoute && role === 'citizen') {
      return NextResponse.redirect(new URL('/citizen/my-reports', request.url))
    }
  }

  // Logged in, visiting auth pages — redirect to dashboard
  if (user && isAuthRoute && pathname !== '/auth/callback') {
    return NextResponse.redirect(new URL('/citizen/my-reports', request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
