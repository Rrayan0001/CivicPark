'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'

const NAV_ITEMS = [
  {
    href: '/officer/queue',
    label: 'Queue',
    match: (p: string) => p.startsWith('/officer/queue') || p.startsWith('/officer/review'),
    icon: (
      <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>
    ),
  },
  {
    href: '/officer/history',
    label: 'History',
    match: (p: string) => p.startsWith('/officer/history'),
    icon: (
      <>
        <circle cx="12" cy="12" r="9"/>
        <path d="M12 7v5l3 3"/>
      </>
    ),
  },
]

export default function OfficerLayout({ children }: { children: React.ReactNode }) {
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
    const id = setTimeout(warmRoutes, 350)
    return () => clearTimeout(id)
  }, [router])

  return (
    <>
      <style>{`
        .officer-bottom-nav { display: flex; }
        .officer-content-pad { padding-bottom: 64px; }
        
        @media (min-width: 768px) {
          .officer-bottom-nav { display: none; }
          .officer-content-pad { padding-bottom: 0; }
        }
        
        @media (max-width: 767px) {
          .officer-layout-grid {
            grid-template-columns: 1fr !important;
          }
          .officer-sidebar {
            display: none !important;
          }
          .officer-topbar {
            padding: 0 16px !important;
          }
          .officer-page-content {
            padding: 20px 16px 88px !important;
          }
          .officer-stats-grid, .officer-row-grid {
            grid-template-columns: 1fr !important;
          }
          .officer-table-container {
            overflow-x: auto;
          }
        }
      `}</style>

      <div className="officer-content-pad">
        {children}
      </div>

      <nav className="officer-bottom-nav" style={{
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
              onClick={() => setPendingHref(item.href)}
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
              }}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2 : 1.6} strokeLinecap="round" strokeLinejoin="round">
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
