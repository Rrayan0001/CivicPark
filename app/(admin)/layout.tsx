'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'

const NAV_ITEMS = [
  {
    href: '/admin/dashboard',
    label: 'Dashboard',
    match: (p: string) => p.startsWith('/admin/dashboard'),
    icon: (
      <>
        <rect x="3" y="3" width="7" height="7" rx="1"/>
        <rect x="14" y="3" width="7" height="7" rx="1"/>
        <rect x="3" y="14" width="7" height="7" rx="1"/>
        <rect x="14" y="14" width="7" height="7" rx="1"/>
      </>
    ),
  },
  {
    href: '/admin/officers',
    label: 'Officers',
    match: (p: string) => p.startsWith('/admin/officers'),
    icon: (
      <>
        <circle cx="9" cy="7" r="4"/>
        <path d="M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"/>
        <path d="m16 3 2 2 4-4"/>
      </>
    ),
  },
  {
    href: '/admin/zones',
    label: 'Zones',
    match: (p: string) => p.startsWith('/admin/zones'),
    icon: (
      <>
        <path d="M12 22s-8-7.5-8-13a8 8 0 0 1 16 0c0 5.5-8 13-8 13Z"/>
        <circle cx="12" cy="9" r="3"/>
      </>
    ),
  },
  {
    href: '/admin/exports',
    label: 'Exports',
    match: (p: string) => p.startsWith('/admin/exports'),
    icon: (
      <>
        <path d="M14 3v5h5M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-5Z"/>
        <path d="M12 12v6M9 15l3 3 3-3"/>
      </>
    ),
  },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
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

  return (
    <>
      <style>{`
        .admin-bottom-nav { display: flex; }
        .admin-content-pad { padding-bottom: 64px; }
        .admin-row-hover:hover { background: var(--surface-2); }
        
        @media (min-width: 768px) {
          .admin-bottom-nav { display: none; }
          .admin-content-pad { padding-bottom: 0; }
        }
        
        @media (max-width: 767px) {
          .admin-layout-grid {
            grid-template-columns: 1fr !important;
          }
          .admin-sidebar {
            display: none !important;
          }
          .admin-topbar {
            padding: 0 16px !important;
            overflow-x: auto;
            /* Allow scrolling horizontally if items overflow */
          }
          .admin-page-content {
            padding: 20px 16px 88px !important;
          }
          .admin-kpi-grid {
            grid-template-columns: repeat(2, 1fr) !important;
          }
          .admin-row-grid {
            grid-template-columns: 1fr !important;
          }
          .admin-feed-grid {
            grid-template-columns: 1fr !important;
          }
          .admin-hide-mobile {
            display: none !important;
          }
          /* Ensure SVGs inside heatmaps scale down */
          .admin-heatmap svg {
            width: 100% !important;
            height: auto !important;
          }
        }
        
        @media (max-width: 480px) {
          .admin-kpi-grid {
            grid-template-columns: 1fr !important;
          }
          .admin-topbar-search {
            display: none !important;
          }
        }
      `}</style>

      <div className="admin-content-pad">
        {children}
      </div>

      <nav className="admin-bottom-nav" style={{
        position: 'fixed',
        bottom: 0, left: 0, right: 0,
        height: 64,
        background: 'rgba(255,255,255,0.94)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderTop: '1px solid var(--line)',
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
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={active ? 2 : 1.6}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                {item.icon}
              </svg>
              {item.label}
            </Link>
          )
        })}
      </nav>
    </>
  )
}
