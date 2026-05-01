import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

const ADMIN_NAV = [
  { href: '/admin/dashboard', label: 'Dashboard', active: true,  icon: <><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></> },
  { href: '/admin/officers',  label: 'Officers',  active: false, icon: <><circle cx="9" cy="7" r="4"/><path d="M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"/><path d="m16 3 2 2 4-4"/></> },
  { href: '/admin/zones',     label: 'Zones',     active: false, icon: <><path d="M12 22s-8-7.5-8-13a8 8 0 0 1 16 0c0 5.5-8 13-8 13Z"/><circle cx="12" cy="9" r="3"/></> },
  { href: '/admin/exports',   label: 'Exports',   active: false, icon: <><path d="M14 3v5h5M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-5Z"/><path d="M12 12v6M9 15l3 3 3-3"/></> },
]

export default async function AdminDashboardPage() {
  const supabase = await createClient()

  const [reportsRes, approvedRes, citizensRes, officersRes, profileRes, recentRes] = await Promise.all([
    supabase.from('reports').select('id', { count: 'exact', head: true }),
    supabase.from('reports').select('id', { count: 'exact', head: true }).eq('status', 'approved'),
    supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'citizen'),
    supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'officer'),
    supabase.auth.getUser().then(r => supabase.from('profiles').select('full_name').eq('id', r.data.user?.id ?? '').maybeSingle()),
    supabase.from('reports').select('id, status, category, address, fine_amount, created_at').order('created_at', { ascending: false }).limit(5),
  ])

  const totalReports = reportsRes.count ?? 0
  const totalApproved = approvedRes.count ?? 0
  const totalCitizens = citizensRes.count ?? 0
  const totalOfficers = officersRes.count ?? 0
  const approvalRate = totalReports > 0 ? Math.round((totalApproved / totalReports) * 100) : 0
  const adminName = (profileRes.data as { full_name: string | null } | null)?.full_name ?? 'Admin'
  const adminInitials = adminName.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()
  type RecentRow = { id: string; status: string; category: string | null; address: string | null; fine_amount: number | null; created_at: string }
  const recentReports = (recentRes.data ?? []) as RecentRow[]

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '244px 1fr', minHeight: '100vh', background: 'var(--bg)' }}>
      {/* Sidebar */}
      <aside style={{ background: 'var(--surface)', borderRight: '1px solid var(--line)', padding: '18px 14px', display: 'flex', flexDirection: 'column', gap: 4, height: '100vh', position: 'sticky', top: 0 }}>
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
        <div style={{ height: 56, borderBottom: '1px solid var(--line)', background: 'var(--surface)', display: 'flex', alignItems: 'center', padding: '0 24px', gap: 16, position: 'sticky', top: 0, zIndex: 4 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--ink-3)' }}>
            <span>Admin</span><span>›</span><strong style={{ color: 'var(--ink)' }}>Dashboard</strong>
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 28, height: 28, borderRadius: 999, background: 'var(--primary-soft)', color: 'var(--primary-ink)', display: 'grid', placeItems: 'center', fontWeight: 600, fontSize: 12 }}>{adminInitials}</div>
            <span style={{ fontSize: 13 }}>{adminName}</span>
          </div>
        </div>

        <div style={{ padding: '26px 32px 80px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 20, marginBottom: 24 }}>
            <div>
              <h1 style={{ fontSize: 26, fontWeight: 600, letterSpacing: '-0.025em', margin: 0 }}>Operations dashboard</h1>
              <div style={{ color: 'var(--ink-3)', marginTop: 4, fontSize: 14 }}>Bangalore · all time</div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-primary btn-sm">+ Add officer</button>
            </div>
          </div>

          {/* KPI grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 22 }}>
            {[
              { lbl: 'Reports filed', num: totalReports.toLocaleString() },
              { lbl: 'Approved', num: totalApproved.toLocaleString(), sub: `${approvalRate}% rate` },
              { lbl: 'Active citizens', num: totalCitizens.toLocaleString() },
              { lbl: 'Officers', num: totalOfficers.toLocaleString() },
            ].map(s => (
              <div key={s.lbl} style={{ padding: 16, background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 10 }}>
                <div style={{ fontSize: 10.5, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ink-3)', fontWeight: 600 }}>{s.lbl}</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 26, fontWeight: 600, letterSpacing: '-0.025em', marginTop: 6, fontVariantNumeric: 'tabular-nums' }}>{s.num}</div>
                {s.sub && <div style={{ fontSize: 11.5, marginTop: 4, color: 'var(--ink-3)' }}>{s.sub}</div>}
              </div>
            ))}
          </div>

          {/* Recent activity */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 10, padding: 18 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 14 }}>
              <h3 style={{ fontSize: 14, margin: 0 }}>Recent reports</h3>
              <Link href="/admin/officers" style={{ fontSize: 11.5, color: 'var(--primary)', fontWeight: 500 }}>View all →</Link>
            </div>
            {recentReports.length === 0 ? (
              <p style={{ fontSize: 13, color: 'var(--ink-3)', margin: 0 }}>No reports yet.</p>
            ) : (
              recentReports.map(item => (
                <div key={item.id} style={{ display: 'flex', gap: 10, padding: '10px 0', borderBottom: '1px dashed var(--line)' }}>
                  <div style={{ width: 26, height: 26, borderRadius: 6, display: 'grid', placeItems: 'center', flexShrink: 0, background: item.status === 'approved' ? 'var(--status-approved-bg)' : item.status === 'rejected' ? 'var(--status-rejected-bg)' : 'var(--primary-soft)', color: item.status === 'approved' ? 'var(--status-approved)' : item.status === 'rejected' ? 'var(--status-rejected)' : 'var(--primary-ink)' }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      {item.status === 'approved' ? <path d="m9 12 2 2 4-4"/> : item.status === 'rejected' ? <path d="m15 9-6 6M9 9l6 6"/> : <path d="M12 5v14M5 12h14"/>}
                    </svg>
                  </div>
                  <div>
                    <div style={{ fontSize: 12.5, lineHeight: 1.4 }}>
                      <strong>{item.id.slice(0, 8).toUpperCase()}</strong>
                      {' — '}{item.category ?? 'Unknown category'}
                      {item.fine_amount ? ` · ₹${item.fine_amount.toLocaleString()} fine` : ''}
                    </div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, color: 'var(--ink-4)', marginTop: 2 }}>
                      {item.address ?? '—'} · {new Date(item.created_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
