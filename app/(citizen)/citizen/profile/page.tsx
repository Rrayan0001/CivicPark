import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

const TIER_CONFIG: Record<string, { label: string; abbr: string; bg: string; color: string; border: string; next: string; nextPts: number }> = {
  bronze:   { label: 'Bronze Reporter',   abbr: 'BRZ', bg: '#FDF0E0', color: '#8C5A2B', border: '#D4A07A', next: 'Silver', nextPts: 500 },
  silver:   { label: 'Silver Reporter',   abbr: 'SLV', bg: '#FAF1DD', color: '#6E7480', border: '#B8C0CC', next: 'Gold',   nextPts: 2000 },
  gold:     { label: 'Gold Reporter',     abbr: 'GLD', bg: '#FAF1DD', color: '#6B4914', border: '#E8CC90', next: 'Platinum', nextPts: 5000 },
  platinum: { label: 'Platinum Reporter', abbr: 'PLT', bg: '#E8ECF6', color: '#0F1F4A', border: '#B8C8E8', next: '',       nextPts: 0 },
}

function initials(name: string | null): string {
  if (!name) return '?'
  return name.trim().split(/\s+/).map(w => w[0]).join('').toUpperCase().slice(0, 2)
}

function formatJoined(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })
}

export default async function ProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profileRaw } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  const profile = profileRaw as import('@/types/database').Profile | null

  const { data: leaderboardRaw } = await supabase
    .from('leaderboard')
    .select('rank')
    .eq('id', user.id)
    .maybeSingle()

  const leaderboardRow = leaderboardRaw as { rank: number | null } | null

  const { count: totalReports } = await supabase
    .from('reports')
    .select('id', { count: 'exact', head: true })
    .eq('reporter_id', user.id)

  const tier = profile?.tier ?? 'bronze'
  const tierCfg = TIER_CONFIG[tier] ?? TIER_CONFIG.bronze
  const points = profile?.reward_points ?? 0
  const approved = profile?.approved_reports ?? 0
  const approvalRate = totalReports ? Math.round((approved / totalReports) * 100) : 0
  const progressPct = tierCfg.nextPts ? Math.min(100, Math.round((points / tierCfg.nextPts) * 100)) : 100
  const rank = leaderboardRow?.rank

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>

      {/* Header */}
      <div style={{ padding: '0 18px', height: 52, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--line)' }}>
        <span style={{ fontSize: 16, fontWeight: 600, letterSpacing: '-0.01em' }}>Profile</span>
        <form action="/auth/signout" method="post">
          <button type="submit" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', fontSize: 13, padding: 6 }}>
            Sign out
          </button>
        </form>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 80 }}>

        {/* Hero */}
        <section style={{ padding: '20px 22px 22px', background: 'linear-gradient(180deg, #FAF1DD 0%, var(--bg) 80%)', borderBottom: '1px solid var(--line)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 64, height: 64, borderRadius: 999, border: `2px solid ${tierCfg.border}`, background: tierCfg.bg, color: tierCfg.color, display: 'grid', placeItems: 'center', fontWeight: 600, fontSize: 22, letterSpacing: '-0.02em' }}>
              {initials(profile?.full_name ?? null)}
            </div>
            <div>
              <h1 style={{ fontSize: 20, fontWeight: 600, letterSpacing: '-0.02em' }}>{profile?.full_name ?? 'Anonymous'}</h1>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: 11.5, color: 'var(--muted)', marginTop: 2 }}>
                {user.email} · joined {formatJoined(profile?.created_at ?? user.created_at)}
              </p>
              {profile?.aadhaar_verified && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 5, padding: '2px 7px', borderRadius: 999, background: 'var(--bg)', border: '1px solid var(--line)', fontSize: 10.5, fontWeight: 600, color: '#1F7A4A' }}>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6l-8-3Z"/><path d="m9 12 2 2 4-4"/></svg>
                  Aadhaar verified
                </span>
              )}
            </div>
          </div>

          {/* Tier card */}
          <div style={{ marginTop: 18, padding: 18, background: 'var(--bg)', border: '1px solid var(--line)', borderRadius: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 44, height: 44, borderRadius: 11, background: tierCfg.bg, border: `1px solid ${tierCfg.border}`, display: 'grid', placeItems: 'center', color: tierCfg.color, fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 12 }}>
                  {tierCfg.abbr}
                </div>
                <div>
                  <p style={{ fontSize: 11.5, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--muted)', fontWeight: 600 }}>Tier</p>
                  <h3 style={{ fontSize: 18, fontWeight: 600, letterSpacing: '-0.01em' }}>{tierCfg.label}</h3>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 22, fontWeight: 600, letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>{points.toLocaleString('en-IN')}</div>
                <div style={{ fontSize: 11, color: 'var(--muted)', letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 600 }}>points</div>
              </div>
            </div>

            {tierCfg.nextPts > 0 && (
              <div style={{ marginTop: 14 }}>
                <div style={{ height: 8, background: 'var(--surface-2)', borderRadius: 999, overflow: 'hidden' }}>
                  <div style={{ width: `${progressPct}%`, height: '100%', background: 'linear-gradient(90deg, #C28A2C, #E0AB55)', borderRadius: 999 }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5, color: 'var(--muted)', marginTop: 8, fontFamily: 'var(--font-mono)' }}>
                  <span>{tier.charAt(0).toUpperCase() + tier.slice(1)} · {points.toLocaleString('en-IN')}</span>
                  <span>{tierCfg.next} · {tierCfg.nextPts.toLocaleString('en-IN')}</span>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Stats grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, padding: '18px 22px 6px' }}>
          {[
            { num: (totalReports ?? 0).toString(), lbl: 'Reports' },
            { num: `${approvalRate}%`,             lbl: 'Approved' },
            { num: rank ? `#${rank}` : '—',        lbl: 'Rank' },
          ].map(s => (
            <div key={s.lbl} style={{ background: 'var(--bg)', border: '1px solid var(--line)', borderRadius: 10, padding: '14px 12px', textAlign: 'center' }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 20, fontWeight: 600, letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>{s.num}</div>
              <div style={{ fontSize: 10.5, color: 'var(--muted)', letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 600, marginTop: 4 }}>{s.lbl}</div>
            </div>
          ))}
        </div>

        {/* Rank card */}
        {rank && (
          <section style={{ padding: '18px 22px 6px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
              <h3 style={{ fontSize: 14, fontWeight: 600 }}>Your rank</h3>
              <Link href="/leaderboard" style={{ fontSize: 12, color: 'var(--primary)', fontWeight: 500 }}>Leaderboard →</Link>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: 16, background: 'var(--bg)', border: '1px solid var(--line)', borderRadius: 10 }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 28, fontWeight: 600, letterSpacing: '-0.02em', whiteSpace: 'nowrap' }}>
                #{rank}
              </div>
              <div>
                <h4 style={{ fontSize: 13.5, fontWeight: 600 }}>Bangalore leaderboard</h4>
                <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{points.toLocaleString('en-IN')} points · {approved} approved reports</p>
              </div>
            </div>
          </section>
        )}

        {/* Account details */}
        <section style={{ padding: '18px 22px 22px' }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 10 }}>Account</h3>
          <div style={{ background: 'var(--bg)', border: '1px solid var(--line)', borderRadius: 10, overflow: 'hidden' }}>
            {[
              { lbl: 'Name', val: profile?.full_name ?? '—' },
              { lbl: 'Email', val: user.email ?? '—' },
              { lbl: 'Phone', val: profile?.phone ?? 'Not set' },
              { lbl: 'Joined', val: formatJoined(profile?.created_at ?? user.created_at) },
            ].map((row, i, arr) => (
              <div key={row.lbl} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 14px', borderBottom: i < arr.length - 1 ? '1px solid var(--line)' : 'none', fontSize: 13 }}>
                <span style={{ color: 'var(--muted)' }}>{row.lbl}</span>
                <span style={{ color: 'var(--ink)', fontWeight: 500 }}>{row.val}</span>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Bottom nav */}
      <nav style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: 'var(--bg)', borderTop: '1px solid var(--line)', display: 'flex', height: 64, zIndex: 20 }}>
        {[
          { href: '/',                   label: 'Home',    active: false, icon: <path d="m3 11 9-7 9 7v9a2 2 0 0 1-2 2h-4v-7H9v7H5a2 2 0 0 1-2-2v-9Z"/> },
          { href: '/citizen/my-reports', label: 'Reports', active: false, icon: <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/> },
          { href: '/citizen/report/new', label: 'Report',  active: false, icon: <><path d="M3 8a2 2 0 0 1 2-2h2.5l1.5-2h6l1.5 2H19a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8Z"/><circle cx="12" cy="13" r="4"/></> },
          { href: '/citizen/profile',    label: 'Profile', active: true,  icon: <><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></> },
        ].map(item => (
          <Link key={item.href} href={item.href} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3, fontSize: 10.5, fontWeight: 500, textDecoration: 'none', color: item.active ? 'var(--ink)' : 'var(--muted)' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={item.active ? 2 : 1.6} strokeLinecap="round" strokeLinejoin="round">{item.icon}</svg>
            {item.label}
          </Link>
        ))}
      </nav>
    </div>
  )
}
