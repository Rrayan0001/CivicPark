import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/server'

export const revalidate = 60

export default async function StatsPage() {
  const supabase = await createClient()

  const [reportsRes, approvedRes, citizensRes] = await Promise.all([
    supabase.from('reports').select('id', { count: 'exact', head: true }),
    supabase.from('reports').select('id', { count: 'exact', head: true }).eq('status', 'approved'),
    supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'citizen'),
  ])

  const totalReports  = reportsRes.count  ?? 0
  const totalApproved = approvedRes.count ?? 0
  const totalCitizens = citizensRes.count ?? 0
  const approvalRate  = totalReports > 0 ? Math.round((totalApproved / totalReports) * 100) : 0

  return (
    <>
      <style>{`
        .stats-nav-inner {
          max-width: 1200px;
          height: 100%;
          margin: 0 auto;
          padding: 0 20px;
          display: flex;
          align-items: center;
          gap: 14px;
        }
        .stats-brand-sub {
          display: block;
        }
        .stats-nav-links {
          margin-left: auto;
          display: flex;
          align-items: center;
          gap: 16px;
        }
        .stats-nav-links .nav-text-link {
          font-size: 13px;
          color: var(--ink-2);
          text-decoration: none;
        }
        .stats-kpi-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          margin: 48px 0;
          border: 1px solid var(--line);
          border-radius: 12px;
          overflow: hidden;
        }
        .stats-kpi-cell {
          padding: 28px 24px;
          border-right: 1px solid var(--line);
        }
        .stats-kpi-cell:last-child {
          border-right: none;
        }
        .stats-download-card {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 16px 18px;
          background: var(--surface-2);
          border: 1px dashed var(--line);
          border-radius: 10px;
        }
        .stats-download-card-body {
          flex: 1;
          min-width: 0;
        }
        .stats-download-formats {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          flex-shrink: 0;
        }
        .stats-footer {
          margin-top: 72px;
          padding-top: 28px;
          border-top: 1px solid var(--line);
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          flex-wrap: wrap;
          gap: 16px;
          font-size: 12px;
          color: var(--ink-3);
        }
        .stats-footer-links {
          display: flex;
          gap: 18px;
        }
        @media (max-width: 640px) {
          .stats-brand-sub {
            display: none;
          }
          .stats-nav-links .nav-text-link {
            display: none;
          }
          .stats-kpi-grid {
            grid-template-columns: 1fr;
            margin: 32px 0;
          }
          .stats-kpi-cell {
            border-right: none;
            border-bottom: 1px solid var(--line);
            padding: 22px 20px;
          }
          .stats-kpi-cell:last-child {
            border-bottom: none;
          }
          .stats-download-card {
            flex-wrap: wrap;
            gap: 12px;
          }
          .stats-download-formats {
            width: 100%;
          }
          .stats-footer {
            flex-direction: column;
            gap: 12px;
            margin-top: 48px;
          }
        }
        @media (min-width: 641px) and (max-width: 900px) {
          .stats-kpi-grid {
            grid-template-columns: 1fr 1fr;
          }
          .stats-kpi-cell:nth-child(2) {
            border-right: none;
          }
          .stats-kpi-cell:nth-child(3) {
            border-right: none;
            border-top: 1px solid var(--line);
            grid-column: 1 / -1;
          }
        }
      `}</style>

      <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>

        {/* Nav */}
        <div style={{ height: 60, borderBottom: '1px solid var(--line)', background: 'var(--surface)', position: 'sticky', top: 0, zIndex: 5 }}>
          <div className="stats-nav-inner">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
              <Image src="/images/Logo.png" alt="Civic Park" width={34} height={34} style={{ borderRadius: 8, flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: 15, fontWeight: 600, letterSpacing: '-0.02em', lineHeight: 1.2 }}>Civic Park · Open data</div>
                <div className="stats-brand-sub" style={{ fontSize: 10.5, color: 'var(--ink-3)', fontFamily: 'var(--font-mono)', letterSpacing: '0.06em' }}>BANGALORE TRAFFIC POLICE · BBMP</div>
              </div>
            </div>
            <div className="stats-nav-links">
              <Link href="/stats" className="nav-text-link" style={{ fontWeight: 600, color: 'var(--ink)', background: 'var(--surface-2)', padding: '5px 12px', borderRadius: 7, border: '1px solid var(--line)' }}>Stats</Link>
              <Link href="/leaderboard" className="nav-text-link">Leaderboard</Link>
              <Link href="/auth/login" className="btn btn-primary btn-sm">Sign in</Link>
            </div>
          </div>
        </div>

        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '28px 20px 80px' }}>

          {/* Hero */}
          <section>
            <h1 style={{ fontSize: 'clamp(32px, 6vw, 72px)', fontWeight: 600, letterSpacing: '-0.03em', lineHeight: 1.05, margin: 0 }}>
              {totalReports > 0 ? (
                <>Bangalore has filed{' '}
                <em style={{ fontStyle: 'normal', color: 'var(--accent-ink)' }}>{totalReports.toLocaleString()}</em>{' '}
                reports.</>
              ) : (
                <>No reports yet — be the first to file one.</>
              )}
            </h1>
            <p style={{ fontSize: 'clamp(14px, 2vw, 17px)', color: 'var(--ink-2)', marginTop: 18, maxWidth: 680, lineHeight: 1.6 }}>
              Every approved report becomes an officer-issued challan, recorded in the public ledger below.
              Updated daily, downloadable as CSV / GeoJSON. Personal data is never published.
            </p>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11.5, color: 'var(--ink-3)', letterSpacing: '0.05em', marginTop: 24, display: 'flex', gap: 20, flexWrap: 'wrap' }}>
              <span><strong style={{ color: 'var(--ink)' }}>Source</strong> Civic Park ledger</span>
              <span><strong style={{ color: 'var(--ink)' }}>License</strong> CC BY 4.0</span>
            </div>
          </section>

          {/* KPI grid */}
          <div className="stats-kpi-grid">
            {[
              { lbl: 'Reports filed',   num: totalReports.toLocaleString() },
              { lbl: 'Approved',        num: totalApproved.toLocaleString(), sub: `${approvalRate}% approval rate` },
              { lbl: 'Active citizens', num: totalCitizens.toLocaleString() },
            ].map(s => (
              <div key={s.lbl} className="stats-kpi-cell">
                <div style={{ fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-3)', fontWeight: 600, fontFamily: 'var(--font-mono)' }}>{s.lbl}</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'clamp(32px, 5vw, 48px)', fontWeight: 600, letterSpacing: '-0.025em', marginTop: 10, fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>{s.num}</div>
                {s.sub && <div style={{ fontSize: 12.5, color: 'var(--ink-3)', marginTop: 8 }}>{s.sub}</div>}
              </div>
            ))}
          </div>

          {/* Downloads */}
          <div style={{ margin: '48px 0 0' }}>
            <h2 style={{ fontSize: 'clamp(22px, 4vw, 28px)', fontWeight: 600, letterSpacing: '-0.02em', margin: 0 }}>Take the data with you</h2>
            <p style={{ fontSize: 14, color: 'var(--ink-3)', marginTop: 6 }}>Open formats. Re-distribute, build on top, audit us.</p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 18 }}>
              {[
                {
                  title: 'Approved reports',
                  desc: 'One row per challan · plate, category, ward, fine, ISO timestamp',
                  formats: ['CSV', 'PARQUET', 'GEOJSON'],
                  icon: <path d="M14 3v5h5M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-5Z"/>,
                },
                {
                  title: 'No-parking zones — current',
                  desc: 'Zone polygons across wards, with section & fine · refreshed live',
                  formats: ['GEOJSON', 'SHP'],
                  icon: <path d="M12 22s7-7.5 7-13a7 7 0 1 0-14 0c0 5.5 7 13 7 13Z"/>,
                },
                {
                  title: 'Live API',
                  desc: 'Read-only REST & GraphQL · auth via API key · 100 req/min free tier',
                  formats: ['REST', 'GRAPHQL'],
                  icon: <><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/></>,
                },
              ].map(item => (
                <div key={item.title} className="stats-download-card">
                  <div style={{ width: 40, height: 40, borderRadius: 9, background: 'var(--surface)', border: '1px solid var(--line)', display: 'grid', placeItems: 'center', color: 'var(--ink-2)', flexShrink: 0 }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">{item.icon}</svg>
                  </div>
                  <div className="stats-download-card-body">
                    <h4 style={{ fontSize: 13.5, margin: 0, fontWeight: 600 }}>{item.title}</h4>
                    <p style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 2, margin: '2px 0 0' }}>{item.desc}</p>
                  </div>
                  <div className="stats-download-formats">
                    {item.formats.map(fmt => (
                      <span key={fmt} style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, padding: '4px 8px', border: '1px solid var(--line)', background: 'var(--surface)', borderRadius: 5, color: 'var(--ink-2)', whiteSpace: 'nowrap' }}>{fmt}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="stats-footer">
            <div>Civic Park is operated by Bangalore Traffic Police, in partnership with BBMP. © 2026.</div>
            <div className="stats-footer-links">
              <a href="#" style={{ color: 'var(--ink-3)', textDecoration: 'none' }}>Privacy</a>
              <a href="#" style={{ color: 'var(--ink-3)', textDecoration: 'none' }}>Terms</a>
              <a href="#" style={{ color: 'var(--ink-3)', textDecoration: 'none' }}>Contact BTP</a>
            </div>
          </div>

        </div>
      </div>
    </>
  )
}
