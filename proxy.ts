import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'
import { createServerClient } from '@supabase/ssr'
import type { Database } from '@/types/database'
import { hasVerifiedStaffAccess } from '@/lib/auth/staff'

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const { supabaseResponse, user } = await updateSession(request)

  const isAuthRoute    = pathname.startsWith('/auth')
  const isCitizenRoute = pathname.startsWith('/citizen') || pathname.startsWith('/report')
  const isOfficerRoute = pathname.startsWith('/officer')
  const isAdminRoute   = pathname.startsWith('/admin')
  const isAdminLoginRoute = pathname === '/admin/login'
  const isProtected    = isCitizenRoute || isOfficerRoute || (isAdminRoute && !isAdminLoginRoute)

  if (isProtected && !user) {
    const url = request.nextUrl.clone()
    url.pathname = isAdminRoute ? '/admin/login' : '/auth/login'
    url.searchParams.set('redirect', pathname)
    return NextResponse.redirect(url)
  }

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
      .select('id, role, staff_verified, staff_suspended')
      .eq('id', user.id)
      .maybeSingle()

    const profile = profileRes.data as {
      id: string
      role: Database['public']['Enums']['user_role']
      staff_verified: boolean
      staff_suspended: boolean
    } | null
    const role = profile?.role ?? 'citizen'
    const hasOfficerAccess = hasVerifiedStaffAccess(profile, ['officer', 'admin'])
    const hasAdminAccess = hasVerifiedStaffAccess(profile, ['admin'])

    if (isAdminRoute && !hasAdminAccess) {
      if (isAdminLoginRoute) {
        return supabaseResponse
      }

      const url = request.nextUrl.clone()
      url.pathname = '/admin/login'
      url.searchParams.set('redirect', pathname)
      return NextResponse.redirect(url)
    }

    if (isOfficerRoute && !hasOfficerAccess) {
      return NextResponse.redirect(new URL('/citizen/my-reports', request.url))
    }

    if (pathname === '/admin/login' && hasAdminAccess) {
      return NextResponse.redirect(new URL('/admin/dashboard', request.url))
    }
  }

  if (user && isAuthRoute && pathname !== '/auth/callback') {
    return NextResponse.redirect(new URL('/citizen/my-reports', request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!api|_next/|__nextjs_font|favicon.ico|sitemap.xml|robots.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp|woff|woff2|ttf|otf)$).*)',
  ],
}
