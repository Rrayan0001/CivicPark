import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/server'

export const metadata: Metadata = {
  title: 'Civic Park — Bangalore Illegal Parking Reporting',
}

export default async function HomePage() {
  const supabase = await createClient()
  const [{ data: { user } }, reportsRes, approvedRes, citizensRes] = await Promise.all([
    supabase.auth.getUser(),
    supabase.from('reports').select('id', { count: 'exact', head: true }),
    supabase.from('reports').select('id', { count: 'exact', head: true }).eq('status', 'approved'),
    supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'citizen'),
  ])
  const totalReports = reportsRes.count ?? 0
  const totalApproved = approvedRes.count ?? 0
  const totalCitizens = citizensRes.count ?? 0

  return (
    <main style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>

      {/* ── Nav ── */}
      <nav style={{
        height: 'var(--header-height)',
        borderBottom: '1px solid var(--line)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 var(--pad-x)',
        position: 'sticky',
        top: 0,
        background: 'var(--bg)',
        zIndex: 'var(--z-sticky)' as string,
      }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
          <Image src="/images/Logo.png" alt="Civic Park" width={28} height={28} style={{ borderRadius: 6 }} />
          <span style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 'var(--text-xs)',
            fontWeight: 500,
            textTransform: 'uppercase',
            letterSpacing: '0.22em',
            color: 'var(--ink)',
          }}>
            Civic Park
          </span>
          <span className="nav-dot" style={{
            width: 4,
            height: 4,
            borderRadius: '50%',
            background: 'var(--line)',
            display: 'inline-block',
            flexShrink: 0,
          }} />
          <span style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 'var(--text-xs)',
            color: 'var(--muted)',
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
          }}>BLR</span>
        </Link>

        {/* Desktop nav */}
        <div className="nav-desktop" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Link href="/stats" className="btn btn-ghost btn-sm">Stats</Link>
          <Link href="/leaderboard" className="btn btn-ghost btn-sm">Leaderboard</Link>
          {!user && <Link href="/auth/login" className="btn btn-secondary btn-sm">Sign In</Link>}
          {user
            ? <Link href="/citizen/report/new" className="btn btn-primary btn-sm">Report Now</Link>
            : <Link href="/auth/signup" className="btn btn-primary btn-sm">Report Now</Link>
          }
        </div>

        {/* Mobile nav — just two actions */}
        <div className="nav-mobile" style={{ display: 'none', alignItems: 'center', gap: 8 }}>
          {!user && <Link href="/auth/login" className="btn btn-secondary btn-sm">Sign In</Link>}
          {user
            ? <Link href="/citizen/report/new" className="btn btn-primary btn-sm">Report</Link>
            : <Link href="/auth/signup" className="btn btn-primary btn-sm">Report</Link>
          }
        </div>
      </nav>

      {/* ── Hero ── */}
      <section style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'clamp(40px, 8vh, 96px) var(--pad-x)',
        textAlign: 'center',
        gap: 'clamp(20px, 4vh, 32px)',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Aerial Bangalore background */}
        <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
          <Image src="/images/6.png" alt="" fill style={{ objectFit: 'cover', objectPosition: 'center', opacity: 0.12 }} priority />
        </div>
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, var(--bg) 0%, rgba(250,250,247,0.85) 50%, var(--bg) 100%)', zIndex: 1 }} />
        <div style={{ position: 'relative', zIndex: 2, display: 'flex', flexDirection: 'column', gap: 'clamp(20px, 4vh, 32px)', alignItems: 'center', width: '100%' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, width: '100%', maxWidth: 600 }}>
          <p className="eyebrow">Civic Park · Bangalore</p>
          <h1 style={{
            fontFamily: 'var(--font-sans)',
            fontWeight: 600,
            fontSize: 'clamp(28px, 6vw, 48px)',
            letterSpacing: '-0.03em',
            lineHeight: 1.1,
            color: 'var(--ink)',
          }}>
            Illegal parking,<br />
            <span style={{ color: 'var(--muted)' }}>reported by citizens.</span>
          </h1>
          <p style={{
            fontSize: 'clamp(14px, 2.5vw, 16px)',
            color: 'var(--muted)',
            lineHeight: 1.7,
            maxWidth: 440,
            margin: '0 auto',
          }}>
            Photograph vehicles in no-parking zones and submit evidence directly
            to Bangalore Traffic Police for challan issuance.
          </p>
        </div>

        {/* CTA buttons — stack on mobile */}
        <div style={{
          display: 'flex',
          gap: 12,
          flexWrap: 'wrap',
          justifyContent: 'center',
          width: '100%',
          maxWidth: 400,
        }}>
          <Link href={user ? '/citizen/report/new' : '/auth/signup'} className="btn btn-primary btn-lg" style={{
            flex: '1 1 160px',
            minWidth: 140,
          }}>
            Submit a Report
          </Link>
          <Link href="/stats" className="btn btn-secondary btn-lg" style={{
            flex: '1 1 160px',
            minWidth: 140,
          }}>
            View Hotspots
          </Link>
        </div>

        {/* Stats strip */}
        <div style={{
          display: 'flex',
          gap: 'clamp(24px, 6vw, 48px)',
          marginTop: 'clamp(16px, 4vh, 32px)',
          paddingTop: 'clamp(16px, 4vh, 32px)',
          borderTop: '1px solid var(--line)',
          flexWrap: 'wrap',
          justifyContent: 'center',
          width: '100%',
          maxWidth: 480,
        }}>
          {[
            { label: 'Reports Filed', value: totalReports.toLocaleString() },
            { label: 'Challans Issued', value: totalApproved.toLocaleString() },
            { label: 'Reporters', value: totalCitizens.toLocaleString() },
          ].map(({ label, value }) => (
            <div key={label} style={{ textAlign: 'center', minWidth: 80 }}>
              <div style={{
                fontSize: 'clamp(20px, 4vw, 28px)',
                fontWeight: 500,
                letterSpacing: '-0.03em',
                fontVariantNumeric: 'tabular-nums',
                color: 'var(--ink)',
              }}>{value}</div>
              <div className="eyebrow" style={{ marginTop: 4 }}>{label}</div>
            </div>
          ))}
        </div>
        </div>{/* end z-index wrapper */}
      </section>

      {/* ── How it works ── */}
      <section style={{
        borderTop: '1px solid var(--line)',
        padding: 'clamp(32px, 6vh, 64px) var(--pad-x)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 32,
      }}>
        <p className="eyebrow" style={{ textAlign: 'center' }}>How it works</p>
        {/* Citizen reporter photos */}
        <div style={{ display: 'flex', gap: 16, justifyContent: 'center', width: '100%', maxWidth: 720 }}>
          {['/images/7.png', '/images/8.png'].map((src, i) => (
            <div key={i} style={{ flex: 1, maxWidth: 280, borderRadius: 'var(--radius-lg)', overflow: 'hidden', border: '1px solid var(--line)', aspectRatio: '4/3', position: 'relative' }}>
              <Image src={src} alt="Citizen reporting a parking violation" fill style={{ objectFit: 'cover' }} />
            </div>
          ))}
        </div>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 'clamp(16px, 3vw, 24px)',
          width: '100%',
          maxWidth: 720,
        }}>
          {[
            { num: '01', title: 'Capture', desc: 'Use the in-app camera to photograph the violation. GPS is auto-tagged.' },
            { num: '02', title: 'Submit', desc: 'Fill in the violation category and submit. AI verifies the evidence.' },
            { num: '03', title: 'Reviewed', desc: 'BTP officers review and issue an e-challan to the vehicle owner.' },
          ].map(({ num, title, desc }) => (
            <div key={num} style={{
              padding: 'clamp(16px, 3vw, 24px)',
              border: '1px solid var(--line)',
              borderRadius: 'var(--radius-lg)',
            }}>
              <span style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 'var(--text-xs)',
                color: 'var(--muted-2)',
                letterSpacing: '0.1em',
              }}>{num}</span>
              <h3 style={{
                fontSize: 'var(--text-md)',
                fontWeight: 600,
                margin: '8px 0 6px',
                color: 'var(--ink)',
              }}>{title}</h3>
              <p style={{ fontSize: 'var(--text-sm)', color: 'var(--muted)', lineHeight: 1.6 }}>{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Footer ── */}
      <footer style={{
        borderTop: '1px solid var(--line)',
        padding: 'clamp(16px, 3vh, 20px) var(--pad-x)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 8,
      }}>
        <span className="eyebrow">© {new Date().getFullYear()} Civic Park</span>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
          <Link href="/stats" style={{ fontSize: 'var(--text-xs)', color: 'var(--muted)' }}>Stats</Link>
          <Link href="/leaderboard" style={{ fontSize: 'var(--text-xs)', color: 'var(--muted)' }}>Leaderboard</Link>
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--muted-2)' }}>For Bangalore Traffic Police</span>
        </div>
      </footer>

      {/* Mobile nav visibility toggle via CSS */}
      <style>{`
        @media (max-width: 540px) {
          .nav-desktop { display: none !important; }
          .nav-mobile  { display: flex !important; }
          .nav-dot     { display: none !important; }
        }
      `}</style>
    </main>
  )
}
