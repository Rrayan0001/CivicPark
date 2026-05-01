import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/server'

const ADMIN_NAV = [
  { href: '/admin/dashboard', label: 'Dashboard', active: false, icon: <><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></> },
  { href: '/admin/officers',  label: 'Officers',  active: false, icon: <><circle cx="9" cy="7" r="4"/><path d="M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"/><path d="m16 3 2 2 4-4"/></> },
  { href: '/admin/zones',     label: 'Zones',     active: true,  icon: <><path d="M12 22s-8-7.5-8-13a8 8 0 0 1 16 0c0 5.5-8 13-8 13Z"/><circle cx="12" cy="9" r="3"/></> },
  { href: '/admin/exports',   label: 'Exports',   active: false, icon: <><path d="M14 3v5h5M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-5Z"/><path d="M12 12v6M9 15l3 3 3-3"/></> },
]

export default async function AdminZonesPage() {
  const supabase = await createClient()

  const [zonesRes, profileRes] = await Promise.all([
    supabase.from('no_parking_zones').select('id, name, active').order('name'),
    supabase.auth.getUser().then(r => supabase.from('profiles').select('full_name').eq('id', r.data.user?.id ?? '').maybeSingle()),
  ])

  const zones = (zonesRes.data ?? []) as { id: string; name: string | null; active: boolean }[]
  const activeCount = zones.filter(z => z.active).length
  const adminName = (profileRes.data as { full_name: string | null } | null)?.full_name ?? 'Admin'
  const adminInitials = adminName.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()

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
            <span>Admin</span><span>›</span><strong style={{ color: 'var(--ink)' }}>Zones</strong>
          </div>
        </div>

        <div style={{ padding: '26px 32px 80px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 20, marginBottom: 24 }}>
            <div>
              <h1 style={{ fontSize: 26, fontWeight: 600, letterSpacing: '-0.025em', margin: 0 }}>No-parking zones</h1>
              <div style={{ color: 'var(--ink-3)', marginTop: 4, fontSize: 14 }}>
                {zones.length} zone{zones.length !== 1 ? 's' : ''}{zones.length > 0 ? ` · ${activeCount} active` : ''}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-secondary btn-sm">Export GeoJSON</button>
              <button className="btn btn-primary btn-sm">+ Add zone</button>
            </div>
          </div>

          {zones.length === 0 ? (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 10, overflow: 'hidden' }}>
                <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--line)' }}>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>Map editor</span>
                </div>
                <div style={{ height: 380, position: 'relative' }}>
                  <Image src="/images/5.png" alt="Zone map" fill style={{ objectFit: 'cover' }} />
                  <div style={{ position: 'absolute', top: 12, right: 12, display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {['+', '−'].map(c => (
                      <button key={c} style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid var(--line)', background: 'white', fontSize: 16, cursor: 'pointer', display: 'grid', placeItems: 'center' }}>{c}</button>
                    ))}
                  </div>
                </div>
              </div>
              <div style={{ padding: '48px 24px', textAlign: 'center', color: 'var(--ink-3)', fontSize: 14 }}>
                No zones configured yet. Use the map to draw the first no-parking zone.
              </div>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 16, alignItems: 'start' }}>
              {/* Zone list */}
              <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 10, overflow: 'hidden' }}>
                <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>Zones</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-3)' }}>{zones.length}</span>
                </div>
                {zones.map((zone, i) => (
                  <div key={zone.id} style={{ padding: '12px 14px', borderBottom: i < zones.length - 1 ? '1px solid var(--line)' : 'none', cursor: 'pointer' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 13, fontWeight: 500 }}>{zone.name ?? zone.id}</span>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10.5, fontWeight: 600, color: zone.active ? 'var(--status-approved)' : 'var(--ink-3)' }}>
                        <span style={{ width: 5, height: 5, borderRadius: 999, background: 'currentColor' }} />
                        {zone.active ? 'Active' : 'Draft'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Map */}
              <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 10, overflow: 'hidden' }}>
                <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>Map editor</span>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {['Select', 'Draw', 'Edit'].map((tool, i) => (
                      <button key={tool} style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid var(--line)', background: i === 0 ? 'var(--ink)' : 'transparent', color: i === 0 ? 'var(--bg)' : 'var(--ink-3)', fontSize: 12, cursor: 'pointer' }}>{tool}</button>
                    ))}
                  </div>
                </div>
                <div style={{ height: 480, position: 'relative' }}>
                  <Image src="/images/5.png" alt="Zone map" fill style={{ objectFit: 'cover' }} />
                  <div style={{ position: 'absolute', top: 12, right: 12, display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {['+', '−'].map(c => (
                      <button key={c} style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid var(--line)', background: 'white', fontSize: 16, cursor: 'pointer', display: 'grid', placeItems: 'center' }}>{c}</button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
