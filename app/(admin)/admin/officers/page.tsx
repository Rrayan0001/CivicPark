import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

export const revalidate = 30

const ADMIN_NAV = [
  { href: '/admin/dashboard', label: 'Dashboard', active: false, icon: <><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></> },
  { href: '/admin/officers',  label: 'Officers',  active: true,  icon: <><circle cx="9" cy="7" r="4"/><path d="M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"/><path d="m16 3 2 2 4-4"/></> },
  { href: '/admin/zones',     label: 'Zones',     active: false, icon: <><path d="M12 22s-8-7.5-8-13a8 8 0 0 1 16 0c0 5.5-8 13-8 13Z"/><circle cx="12" cy="9" r="3"/></> },
  { href: '/admin/exports',   label: 'Exports',   active: false, icon: <><path d="M14 3v5h5M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-5Z"/><path d="M12 12v6M9 15l3 3 3-3"/></> },
]

export default async function AdminOfficersPage() {
  const supabase = await createClient()

  const [officersRes, profileRes] = await Promise.all([
    supabase.from('profiles').select('id, full_name, role, created_at').eq('role', 'officer').order('created_at', { ascending: false }),
    supabase.auth.getUser().then(r => supabase.from('profiles').select('full_name').eq('id', r.data.user?.id ?? '').maybeSingle()),
  ])

  type OfficerRow = { id: string; full_name: string | null; role: string; created_at: string }
  const officers = (officersRes.data ?? []) as OfficerRow[]
  const adminName = (profileRes.data as { full_name: string | null } | null)?.full_name ?? 'Admin'
  const adminInitials = adminName.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()

  function initials(name: string | null) {
    if (!name) return '?'
    return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
  }

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
            <span>Admin</span><span>›</span><strong style={{ color: 'var(--ink)' }}>Officers</strong>
          </div>
        </div>

        <div style={{ padding: '26px 32px 80px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 20, marginBottom: 24 }}>
            <div>
              <h1 style={{ fontSize: 26, fontWeight: 600, letterSpacing: '-0.025em', margin: 0 }}>Officers</h1>
              <div style={{ color: 'var(--ink-3)', marginTop: 4, fontSize: 14 }}>{officers.length} officer{officers.length !== 1 ? 's' : ''}</div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-primary btn-sm">+ Add officer</button>
            </div>
          </div>

          {officers.length === 0 ? (
            <div style={{ padding: '48px 0', textAlign: 'center', color: 'var(--ink-3)', fontSize: 14 }}>No officers registered yet.</div>
          ) : (
            <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 10, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr>
                    {['Officer', 'Role', 'Joined', ''].map(h => (
                      <th key={h} style={{ background: 'var(--surface-2)', textAlign: 'left', fontWeight: 500, fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ink-3)', padding: '10px 14px', borderBottom: '1px solid var(--line)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {officers.map(row => (
                    <tr key={row.id} style={{ cursor: 'pointer' }} onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-2)')} onMouseLeave={e => (e.currentTarget.style.background = '')}>
                      <td style={{ padding: '12px 14px', borderBottom: '1px solid var(--line)', verticalAlign: 'middle' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{ width: 32, height: 32, borderRadius: 999, background: 'var(--primary-soft)', color: 'var(--primary-ink)', display: 'grid', placeItems: 'center', fontWeight: 600, fontSize: 13, flexShrink: 0 }}>{initials(row.full_name)}</div>
                          <div style={{ fontWeight: 500 }}>{row.full_name ?? '—'}</div>
                        </div>
                      </td>
                      <td style={{ padding: '12px 14px', borderBottom: '1px solid var(--line)', color: 'var(--ink-3)' }}>—</td>
                      <td style={{ padding: '12px 14px', borderBottom: '1px solid var(--line)' }}>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, padding: '2px 6px', borderRadius: 4, background: 'var(--surface-2)', color: 'var(--ink-2)', border: '1px solid var(--line)' }}>{row.role.toUpperCase()}</span>
                      </td>
                      <td style={{ padding: '12px 14px', borderBottom: '1px solid var(--line)', color: 'var(--ink-3)', fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                        {new Date(row.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </td>
                      <td style={{ padding: '12px 14px', borderBottom: '1px solid var(--line)' }}>
                        <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-3)', padding: 4 }}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/></svg>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
