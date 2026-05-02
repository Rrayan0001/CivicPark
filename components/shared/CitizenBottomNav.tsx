'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const NAV_ITEMS = [
  {
    href: '/',
    label: 'Home',
    match: (p: string) => p === '/',
    icon: (
      <>
        <path d="M3 9.5 12 3l9 6.5V20a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V9.5Z"/>
        <path d="M9 21V12h6v9"/>
      </>
    ),
  },
  {
    href: '/citizen/my-reports',
    label: 'Reports',
    match: (p: string) => p.startsWith('/citizen/my-reports') || (p.startsWith('/citizen/report/') && p !== '/citizen/report/new'),
    icon: (
      <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>
    ),
  },
  {
    href: '/citizen/report/new',
    label: 'Report',
    match: (p: string) => p === '/citizen/report/new',
    icon: (
      <>
        <path d="M3 8a2 2 0 0 1 2-2h2.5l1.5-2h6l1.5 2H19a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8Z"/>
        <circle cx="12" cy="13" r="4"/>
      </>
    ),
  },
  {
    href: '/citizen/profile',
    label: 'Profile',
    match: (p: string) => p.startsWith('/citizen/profile'),
    icon: (
      <>
        <circle cx="12" cy="8" r="4"/>
        <path d="M4 21a8 8 0 0 1 16 0"/>
      </>
    ),
  },
]

export function CitizenBottomNav() {
  const pathname = usePathname()
  const router   = useRouter()
  const [pendingHref, setPendingHref] = useState<string | null>(null)

  useEffect(() => {
    setPendingHref(null)
  }, [pathname])

  useEffect(() => {
    const warmRoutes = () => {
      for (const item of NAV_ITEMS) {
        router.prefetch(item.href)
      }
    }

    const requestIdleCallback = window.requestIdleCallback
    if (typeof requestIdleCallback === 'function') {
      const id = requestIdleCallback(warmRoutes, { timeout: 1200 })
      return () => window.cancelIdleCallback(id)
    }

    const id = globalThis.setTimeout(warmRoutes, 350)
    return () => globalThis.clearTimeout(id)
  }, [router])

  function warmRoute(href: string) {
    router.prefetch(href)
  }

  async function handleSignOut() {
    setPendingHref('/')
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  return (
    <nav style={{
      position: 'fixed',
      bottom: 0, left: 0, right: 0,
      height: 64,
      background: 'rgba(250,250,247,0.94)',
      backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)',
      borderTop: '1px solid var(--line)',
      display: 'flex',
      zIndex: 50,
    }}>
      {NAV_ITEMS.map(item => {
        const active = item.match(pathname)
        return (
          <Link
            key={item.href}
            href={item.href}
            className="nav-link-surface"
            data-pending={pendingHref === item.href}
            onClick={() => setPendingHref(item.href)}
            onMouseEnter={() => warmRoute(item.href)}
            onTouchStart={() => warmRoute(item.href)}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 3,
              fontSize: 10.5,
              fontWeight: active ? 600 : 500,
              textDecoration: 'none',
              color: active ? 'var(--ink)' : 'var(--muted)',
              transition: 'color 0.15s ease',
              zIndex: 0,
            }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2 : 1.6} strokeLinecap="round" strokeLinejoin="round">
              {item.icon}
            </svg>
            {item.label}
          </Link>
        )
      })}

      {/* Sign out */}
      <button
        onClick={handleSignOut}
        className="nav-link-surface"
        data-pending={pendingHref === '/'}
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 3,
          fontSize: 10.5,
          fontWeight: 500,
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: 'var(--muted)',
          transition: 'color 0.15s ease',
          padding: 0,
          zIndex: 0,
        }}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
          <polyline points="16 17 21 12 16 7"/>
          <line x1="21" y1="12" x2="9" y2="12"/>
        </svg>
        Sign Out
      </button>
    </nav>
  )
}
