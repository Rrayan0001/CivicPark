import Link from 'next/link'
import Image from 'next/image'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { Report } from '@/types/database'

const CATEGORY_LABELS: Record<string, string> = {
  no_parking:       'No parking',
  wrong_parking:    'Wrong parking',
  footpath_parking: 'Footpath parking',
  blocking_traffic: 'Blocking traffic',
  double_parking:   'Double parking',
}

const NAV = [
  { href: '/officer/queue',   label: 'Queue',   icon: <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/> },
  { href: '/officer/history', label: 'History', icon: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/></> },
]

function formatAge(iso: string): { label: string; cls: string } {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (mins < 60)  return { label: `${mins}m`, cls: '' }
  const hrs = Math.floor(mins / 60)
  if (hrs < 3)    return { label: `${hrs}h ${mins % 60}m`, cls: 'mid' }
  return { label: `${hrs}h ${mins % 60}m`, cls: 'old' }
}

const AGE_COLORS: Record<string, string> = { old: '#B43338', mid: '#B5851B' }

export default async function OfficerQueuePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profileRaw } = await supabase
    .from('profiles')
    .select('full_name, role')
    .eq('id', user.id)
    .single()

  const profile = profileRaw as { full_name: string | null; role: string } | null
  if (profile?.role === 'citizen') redirect('/citizen/my-reports')

  const { data: reportsRaw, count } = await supabase
    .from('reports')
    .select('id, category, detected_plate, address, created_at, photo_urls, ai_flags', { count: 'exact' })
    .eq('status', 'pending_review')
    .order('created_at', { ascending: true })
    .limit(50)

  const reports = reportsRaw as import('@/types/database').Report[] | null

  const initials = (name: string | null) => name?.trim().split(/\s+/).map(w => w[0]).join('').toUpperCase().slice(0, 2) ?? 'RV'

  return (
  return (
    <div className="officer-layout-grid" style={{ display: 'grid', gridTemplateColumns: '244px 1fr', minHeight: '100vh', background: 'var(--bg)' }}>

      {/* Sidebar */}
      <aside className="officer-sidebar" style={{ background: 'var(--surface)', borderRight: '1px solid var(--line)', padding: '18px 14px', display: 'flex', flexDirection: 'column', gap: 4, height: '100vh', position: 'sticky', top: 0, width: 244 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 8px 18px', borderBottom: '1px solid var(--line)', marginBottom: 14 }}>
          <div style={{ width: 30, height: 30, borderRadius: 7, background: 'var(--primary)', color: 'var(--on-primary)', display: 'grid', placeItems: 'center', fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 14 }}>CP</div>
          <div>
            <div style={{ fontWeight: 600, fontSize: 15, letterSpacing: '-0.02em' }}>Civic Park</div>
            <div style={{ fontSize: 10.5, color: 'var(--ink-3)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Officer portal</div>
          </div>
        </div>
        <div style={{ fontSize: 10.5, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--ink-4)', padding: '14px 10px 6px', fontWeight: 600 }}>Review</div>
        {NAV.map(item => (
          <Link key={item.href} href={item.href} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 8, fontSize: 13.5, color: item.href.includes('queue') ? 'var(--primary-ink)' : 'var(--ink-2)', fontWeight: 500, background: item.href.includes('queue') ? 'var(--primary-soft)' : 'transparent', textDecoration: 'none' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">{item.icon}</svg>
            {item.label}
            {item.href.includes('queue') && count != null && count > 0 && (
              <span style={{ marginLeft: 'auto', background: 'var(--primary)', color: 'var(--on-primary)', fontFamily: 'var(--font-mono)', fontSize: 10.5, fontWeight: 600, padding: '1px 6px', borderRadius: 999 }}>{count}</span>
            )}
          </Link>
        ))}
        <div style={{ marginTop: 'auto', borderTop: '1px solid var(--line)', padding: '12px 10px 4px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
            <div style={{ width: 28, height: 28, borderRadius: 999, background: 'var(--primary-soft)', color: 'var(--primary-ink)', display: 'grid', placeItems: 'center', fontWeight: 600, fontSize: 12 }}>
              {initials(profile?.full_name ?? null)}
            </div>
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{profile?.full_name ?? user.email}</span>
          </div>
          <form action="/auth/signout" method="post">
            <button type="submit" style={{ display: 'flex', alignItems: 'center', gap: 7, width: '100%', padding: '7px 8px', borderRadius: 7, border: '1px solid var(--line)', background: 'transparent', cursor: 'pointer', fontSize: 12.5, color: 'var(--ink-3)', fontFamily: 'var(--font-sans)', fontWeight: 500 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
              Sign out
            </button>
          </form>
        </div>
      </aside>

      <main style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* Top bar */}
        <div className="officer-topbar" style={{ height: 56, borderBottom: '1px solid var(--line)', background: 'var(--surface)', display: 'flex', alignItems: 'center', padding: '0 24px', gap: 16, position: 'sticky', top: 0, zIndex: 4 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--ink-3)' }}>
            <span>Officer</span><span>›</span><strong style={{ color: 'var(--ink)' }}>Review queue</strong>
          </div>
        </div>

        <div className="officer-page-content" style={{ padding: '26px 32px 80px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 20, marginBottom: 24 }}>
            <div>
              <h1 style={{ fontSize: 26, fontWeight: 600, letterSpacing: '-0.025em', margin: 0 }}>Review queue</h1>
              <div style={{ color: 'var(--ink-3)', marginTop: 4, fontSize: 14 }}>
                {count ?? 0} report{count !== 1 ? 's' : ''} awaiting review · oldest first
              </div>
            </div>
            {reports && reports.length > 0 && (
              <Link href={`/officer/review/${reports[0].id}`} className="btn btn-primary btn-sm">
                Open next in queue →
              </Link>
            )}
          </div>

          {!reports?.length ? (
            <div style={{ padding: '80px 30px', textAlign: 'center', color: 'var(--muted)', background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 10 }}>
              <p style={{ fontSize: 16, fontWeight: 500, color: 'var(--ink)' }}>Queue is empty</p>
              <p style={{ fontSize: 14, marginTop: 6 }}>All reports have been reviewed. Check back shortly.</p>
            </div>
          ) : (
            <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 10, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr>
                    {['Evidence', 'ID', 'Plate', 'Category', 'Location', 'AI Flags', 'Age', ''].map((h, i) => (
                      <th key={i} style={{ background: 'var(--surface-2)', textAlign: 'left', fontWeight: 500, fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ink-3)', padding: '10px 14px', borderBottom: '1px solid var(--line)', width: h === 'Evidence' ? 80 : h === '' ? 40 : undefined }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(reports as Report[]).map(row => {
                    const { label: ageLabel, cls: ageCls } = formatAge(row.created_at)
                    const flags = row.ai_flags as Record<string, unknown> | null
                    const flagLabel = flags?.duplicate ? 'DUPLICATE' : flags?.low_quality ? 'LOW QUALITY' : flags?.edited_exif ? 'EDITED EXIF' : 'OK'
                    const flagStyle = flagLabel === 'OK'
                      ? { bg: '#DCEEDF', color: '#1F7A4A' }
                      : flagLabel.includes('DUPLICATE')
                        ? { bg: '#F8DCDC', color: '#B43338' }
                        : { bg: '#FBF1D9', color: '#B5851B' }

                    return (
                      <tr key={row.id} style={{ cursor: 'pointer' }} onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-2)')} onMouseLeave={e => (e.currentTarget.style.background = '')}>
                        <td style={{ padding: '12px 14px', borderBottom: '1px solid var(--line)', verticalAlign: 'middle' }}>
                          <div style={{ width: 56, height: 42, borderRadius: 5, overflow: 'hidden', border: '1px solid var(--line)', position: 'relative' }}>
                            {row.photo_urls?.[0] ? (
                              <Image src={row.photo_urls[0]} alt="Evidence" fill style={{ objectFit: 'cover' }} unoptimized />
                            ) : (
                              <Image src="/images/1.png" alt="Evidence" fill style={{ objectFit: 'cover' }} />
                            )}
                          </div>
                        </td>
                        <td style={{ padding: '12px 14px', borderBottom: '1px solid var(--line)', verticalAlign: 'middle', fontFamily: 'var(--font-mono)', color: 'var(--ink-3)', fontSize: 11.5 }}>{row.id.slice(0, 8).toUpperCase()}</td>
                        <td style={{ padding: '12px 14px', borderBottom: '1px solid var(--line)', verticalAlign: 'middle' }}>
                          {row.detected_plate ? (
                            <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, fontSize: 12.5, background: '#F8E55C', color: '#1A1A1A', padding: '2px 6px', borderRadius: 4, border: '1px solid #C9B83E' }}>{row.detected_plate}</span>
                          ) : (
                            <span style={{ color: 'var(--ink-4)', fontSize: 12 }}>—</span>
                          )}
                        </td>
                        <td style={{ padding: '12px 14px', borderBottom: '1px solid var(--line)', verticalAlign: 'middle' }}>{CATEGORY_LABELS[row.category] ?? row.category}</td>
                        <td style={{ padding: '12px 14px', borderBottom: '1px solid var(--line)', verticalAlign: 'middle', color: 'var(--ink-3)', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.address ?? '—'}</td>
                        <td style={{ padding: '12px 14px', borderBottom: '1px solid var(--line)', verticalAlign: 'middle' }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 7px', borderRadius: 4, fontSize: 10.5, fontWeight: 600, fontFamily: 'var(--font-mono)', background: flagStyle.bg, color: flagStyle.color }}>{flagLabel}</span>
                        </td>
                        <td style={{ padding: '12px 14px', borderBottom: '1px solid var(--line)', verticalAlign: 'middle', fontFamily: 'var(--font-mono)', color: AGE_COLORS[ageCls] ?? 'var(--ink)', fontWeight: ageCls ? 600 : 400 }}>{ageLabel}</td>
                        <td style={{ padding: '12px 14px', borderBottom: '1px solid var(--line)', verticalAlign: 'middle' }}>
                          <Link href={`/officer/review/${row.id}`} style={{ color: 'var(--ink-3)' }}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="m9 6 6 6-6 6"/></svg>
                          </Link>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
