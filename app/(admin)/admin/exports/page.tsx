import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

const ADMIN_NAV = [
  { href: '/admin/dashboard', label: 'Dashboard', active: false, icon: <><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></> },
  { href: '/admin/officers',  label: 'Officers',  active: false, icon: <><circle cx="9" cy="7" r="4"/><path d="M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"/><path d="m16 3 2 2 4-4"/></> },
  { href: '/admin/zones',     label: 'Zones',     active: false, icon: <><path d="M12 22s-8-7.5-8-13a8 8 0 0 1 16 0c0 5.5-8 13-8 13Z"/><circle cx="12" cy="9" r="3"/></> },
  { href: '/admin/exports',   label: 'Exports',   active: true,  icon: <><path d="M14 3v5h5M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-5Z"/><path d="M12 12v6M9 15l3 3 3-3"/></> },
]

export default async function AdminExportsPage() {
  const supabase = await createClient()

  const [reportsRes, approvedRes, officersRes, zonesRes, profileRes] = await Promise.all([
    supabase.from('reports').select('id', { count: 'exact', head: true }),
    supabase.from('reports').select('id', { count: 'exact', head: true }).eq('status', 'approved'),
    supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'officer'),
    supabase.from('no_parking_zones').select('id', { count: 'exact', head: true }),
    supabase.auth.getUser().then(r => supabase.from('profiles').select('full_name').eq('id', r.data.user?.id ?? '').maybeSingle()),
  ])

  const adminName = (profileRes.data as { full_name: string | null } | null)?.full_name ?? 'Admin'
  const adminInitials = adminName.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()

  const EXPORT_TYPES = [
    { title: 'Reports CSV', desc: 'All reports with status, location, plate, officer decisions', rows: `${(reportsRes.count ?? 0).toLocaleString()} rows`, icon: <path d="M14 3v5h5M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-5Z"/> },
    { title: 'Officers CSV', desc: 'Officer roster with review stats and approval rates', rows: `${(officersRes.count ?? 0).toLocaleString()} rows`, icon: <><circle cx="9" cy="7" r="4"/><path d="M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"/></> },
    { title: 'Challans CSV', desc: 'Issued challans with fine amounts, payment status', rows: `${(approvedRes.count ?? 0).toLocaleString()} rows`, icon: <><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 10h18"/></> },
    { title: 'Zones GeoJSON', desc: 'All no-parking zone polygons with section metadata', rows: `${(zonesRes.count ?? 0).toLocaleString()} polygons`, icon: <><path d="M12 22s-8-7.5-8-13a8 8 0 0 1 16 0c0 5.5-8 13-8 13Z"/><circle cx="12" cy="9" r="3"/></> },
  ]

  return (
    <div className="admin-layout-grid" style={{ display: 'grid', gridTemplateColumns: '244px 1fr', minHeight: '100vh', background: 'var(--bg)' }}>
      {/* Sidebar */}
      <aside className="admin-sidebar" style={{ background: 'var(--surface)', borderRight: '1px solid var(--line)', padding: '18px 14px', display: 'flex', flexDirection: 'column', gap: 4, height: '100vh', position: 'sticky', top: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 8px 18px', borderBottom: '1px solid var(--line)', marginBottom: 14 }}>
          <div style={{ width: 30, height: 30, borderRadius: 7, background: 'var(--primary)', color: 'var(--on-primary)', display: 'grid', placeItems: 'center', fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 14 }}>CP</div>
          <div>
            <div style={{ fontWeight: 600, fontSize: 15, letterSpacing: '-0.02em' }}>Civic Park</div>
            <div style={{ fontSize: 10.5, color: 'var(--ink-3)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Admin</div>
          </div>
        </div>
        <div style={{ fontSize: 10.5, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--ink-4)', padding: '14px 10px 6px', fontWeight: 600 }}>Operations</div>
        {ADMIN_NAV.map(item => (
          <Link key={item.href} href={item.href} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 8, fontSize: 13.5, color: item.active ? 'var(--primary-ink)' : 'var(--ink-2)', fontWeight: 500, background: item.active ? 'var(--primary-soft)' : 'transparent', textDecoration: 'none' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">{item.icon}</svg>
            {item.label}
          </Link>
        ))}
        <div style={{ marginTop: 'auto', borderTop: '1px solid var(--line)', display: 'flex', alignItems: 'center', gap: 8, padding: '12px 10px 0', fontSize: 13 }}>
          <div style={{ width: 28, height: 28, borderRadius: 999, background: 'var(--primary-soft)', color: 'var(--primary-ink)', display: 'grid', placeItems: 'center', fontWeight: 600, fontSize: 12 }}>{adminInitials}</div>
          {adminName} · Admin
        </div>
      </aside>

      <main style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* Top bar */}
        <div className="admin-topbar" style={{ height: 56, borderBottom: '1px solid var(--line)', background: 'var(--surface)', display: 'flex', alignItems: 'center', padding: '0 24px', position: 'sticky', top: 0, zIndex: 4 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--ink-3)' }}>
            <span>Admin</span><span>›</span><strong style={{ color: 'var(--ink)' }}>Exports</strong>
          </div>
        </div>

        <div className="admin-page-content" style={{ padding: '26px 32px 80px' }}>
          <div style={{ marginBottom: 24 }}>
            <h1 style={{ fontSize: 26, fontWeight: 600, letterSpacing: '-0.025em', margin: 0 }}>Data exports</h1>
            <div style={{ color: 'var(--ink-3)', marginTop: 4, fontSize: 14 }}>Download datasets as CSV or GeoJSON · Updated nightly</div>
          </div>

          <div className="admin-row-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
            {EXPORT_TYPES.map(ex => (
              <div key={ex.title} style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 10, padding: 20 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                  <div style={{ width: 38, height: 38, borderRadius: 9, background: 'var(--primary-soft)', color: 'var(--primary-ink)', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">{ex.icon}</svg>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 15, fontWeight: 600 }}>{ex.title}</div>
                    <div style={{ fontSize: 12.5, color: 'var(--ink-3)', marginTop: 3, lineHeight: 1.5 }}>{ex.desc}</div>
                    <div style={{ marginTop: 10, fontSize: 11.5, fontFamily: 'var(--font-mono)', color: 'var(--ink-3)' }}>
                      {ex.rows}
                    </div>
                  </div>
                </div>
                <button className="btn btn-secondary btn-sm" style={{ marginTop: 16, width: '100%' }}>Download</button>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}
