import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

export default async function StatsPage() {
  const supabase = await createClient()

  const [reportsRes, approvedRes, citizensRes] = await Promise.all([
    supabase.from('reports').select('id', { count: 'exact', head: true }),
    supabase.from('reports').select('id', { count: 'exact', head: true }).eq('status', 'approved'),
    supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'citizen'),
  ])

  const totalReports = reportsRes.count ?? 0
  const totalApproved = approvedRes.count ?? 0
  const totalCitizens = citizensRes.count ?? 0
  const approvalRate = totalReports > 0 ? Math.round((totalApproved / totalReports) * 100) : 0

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      {/* Nav */}
      <div style={{ height: 64, borderBottom: '1px solid var(--line)', background: 'var(--surface)', position: 'sticky', top: 0, zIndex: 5 }}>
        <div style={{ maxWidth: 1200, height: '100%', margin: '0 auto', padding: '0 28px', display: 'flex', alignItems: 'center', gap: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 8, background: 'var(--ink)', color: 'var(--bg)', fontWeight: 700, display: 'grid', placeItems: 'center', letterSpacing: '-0.04em', fontFamily: 'var(--font-mono)', fontSize: 14 }}>CP</div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 600, letterSpacing: '-0.02em' }}>Civic Park · Open data</div>
              <div style={{ fontSize: 11.5, color: 'var(--ink-3)', fontFamily: 'var(--font-mono)', letterSpacing: '0.06em' }}>BANGALORE TRAFFIC POLICE · BBMP</div>
            </div>
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 18 }}>
            <Link href="/stats" style={{ fontSize: 13, color: 'var(--ink)', fontWeight: 600, textDecoration: 'none' }}>Stats</Link>
            <Link href="/leaderboard" style={{ fontSize: 13, color: 'var(--ink-2)', textDecoration: 'none' }}>Leaderboard</Link>
            <Link href="/auth/login" className="btn btn-primary btn-sm">Sign in</Link>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '28px 28px 80px' }}>
        {/* Hero */}
        <section>
          <h1 style={{ fontSize: 'clamp(40px, 6vw, 72px)', fontWeight: 600, letterSpacing: '-0.03em', lineHeight: 1, margin: 0 }}>
            {totalReports > 0 ? (
              <>Bangalore has filed{' '}
              <em style={{ fontStyle: 'normal', color: 'var(--accent-ink)' }}>{totalReports.toLocaleString()}</em>{' '}
              reports.</>
            ) : (
              <>No reports yet — be the first to file one.</>
            )}
          </h1>
          <p style={{ fontSize: 17, color: 'var(--ink-2)', marginTop: 18, maxWidth: 720, lineHeight: 1.55 }}>
            Every approved report becomes an officer-issued challan, recorded in the public ledger below. Updated daily, downloadable as CSV / GeoJSON. Personal data is never published.
          </p>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11.5, color: 'var(--ink-3)', letterSpacing: '0.05em', marginTop: 28, display: 'flex', gap: 24, flexWrap: 'wrap' }}>
            <span><strong style={{ color: 'var(--ink)' }}>Source</strong> Civic Park ledger</span>
            <span><strong style={{ color: 'var(--ink)' }}>License</strong> CC BY 4.0</span>
          </div>
        </section>

        {/* Big numbers */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', margin: '56px 0', borderTop: '1px solid var(--line)', borderBottom: '1px solid var(--line)' }}>
          {[
            { lbl: 'Reports filed', num: totalReports.toLocaleString() },
            { lbl: 'Approved', num: totalApproved.toLocaleString(), sub: `${approvalRate}% approval rate` },
            { lbl: 'Active citizens', num: totalCitizens.toLocaleString() },
          ].map((s, i) => (
            <div key={s.lbl} style={{ padding: '32px 24px', borderRight: i < 2 ? '1px solid var(--line)' : 'none' }}>
              <div style={{ fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-3)', fontWeight: 600 }}>{s.lbl}</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 44, fontWeight: 600, letterSpacing: '-0.025em', marginTop: 10, fontVariantNumeric: 'tabular-nums' }}>{s.num}</div>
              {s.sub && <div style={{ fontSize: 12.5, color: 'var(--ink-3)', marginTop: 6 }}>{s.sub}</div>}
            </div>
          ))}
        </div>

        {/* Downloads */}
        <div style={{ margin: '56px 0' }}>
          <h2 style={{ fontSize: 28, fontWeight: 600, letterSpacing: '-0.02em', margin: 0 }}>Take the data with you</h2>
          <p style={{ fontSize: 14, color: 'var(--ink-3)', marginTop: 6 }}>Open formats. Re-distribute, build on top, audit us.</p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 18 }}>
            {[
              { title: 'Approved reports', desc: 'One row per challan · plate, category, ward, fine, ISO timestamp', formats: ['CSV', 'PARQUET', 'GEOJSON'], icon: <path d="M14 3v5h5M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-5Z"/> },
              { title: 'No-parking zones — current', desc: 'Zone polygons across wards, with section & fine · refreshed live', formats: ['GEOJSON', 'SHP'], icon: <path d="M12 22s7-7.5 7-13a7 7 0 1 0-14 0c0 5.5 7 13 7 13Z"/> },
              { title: 'Live API', desc: 'Read-only REST & GraphQL · auth via API key · 100 req/min free tier', formats: ['REST', 'GRAPHQL'], icon: <><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/></> },
            ].map(item => (
              <div key={item.title} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '16px 18px', background: 'var(--surface-2)', border: '1px dashed var(--line)', borderRadius: 10 }}>
                <div style={{ width: 40, height: 40, borderRadius: 9, background: 'var(--surface)', border: '1px solid var(--line)', display: 'grid', placeItems: 'center', color: 'var(--ink-2)', flexShrink: 0 }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">{item.icon}</svg>
                </div>
                <div style={{ flex: 1 }}>
                  <h4 style={{ fontSize: 13.5, margin: 0, fontWeight: 600 }}>{item.title}</h4>
                  <p style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 2 }}>{item.desc}</p>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  {item.formats.map(fmt => (
                    <span key={fmt} style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, padding: '4px 8px', border: '1px solid var(--line)', background: 'var(--surface)', borderRadius: 5, color: 'var(--ink-2)' }}>{fmt}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div style={{ marginTop: 72, paddingTop: 28, borderTop: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--ink-3)' }}>
          <div>Civic Park is operated by Bangalore Traffic Police, in partnership with BBMP. © 2026.</div>
          <div style={{ display: 'flex', gap: 18 }}>
            <a href="#" style={{ color: 'var(--ink-3)', textDecoration: 'none' }}>Privacy</a>
            <a href="#" style={{ color: 'var(--ink-3)', textDecoration: 'none' }}>Terms</a>
            <a href="#" style={{ color: 'var(--ink-3)', textDecoration: 'none' }}>Contact BTP</a>
          </div>
        </div>
      </div>
    </div>
  )
}
