import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'
import { createServerClient } from '@supabase/ssr'
import type { Database } from '@/types/database'

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
      .select('role')
      .eq('id', user.id)
      .maybeSingle()

    const role = (profileRes.data as { role: Database['public']['Enums']['user_role'] } | null)?.role ?? 'citizen'

    if (isAdminRoute && role !== 'admin') {
      if (isAdminLoginRoute) {
        return supabaseResponse
      }

      const url = request.nextUrl.clone()
      url.pathname = '/admin/login'
      url.searchParams.set('redirect', pathname)
      return NextResponse.redirect(url)
    }

    if (isOfficerRoute && role === 'citizen') {
      return NextResponse.redirect(new URL('/citizen/my-reports', request.url))
    }

    if (pathname === '/admin/login' && role === 'admin') {
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
