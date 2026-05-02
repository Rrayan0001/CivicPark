import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

export default async function OfficerHistoryPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: rows } = await supabase
    .from('reports')
    .select('id, detected_plate, category, address, status, fine_amount, reviewed_at')
    .eq('reviewer_id', user?.id ?? '')
    .not('reviewed_at', 'is', null)
    .order('reviewed_at', { ascending: false })
    .limit(50)

  type Row = { id: string; detected_plate: string | null; category: string | null; address: string | null; status: string; fine_amount: number | null; reviewed_at: string | null }
  const allReviewed = (rows ?? []) as Row[]
  const approved = allReviewed.filter(r => r.status === 'approved')
  const approvalRate = allReviewed.length > 0 ? Math.round((approved.length / allReviewed.length) * 100) : 0

  const { count: totalCount } = await supabase
    .from('reports')
    .select('id', { count: 'exact', head: true })
    .eq('reviewer_id', user?.id ?? '')
    .not('reviewed_at', 'is', null)

  function formatDate(iso: string | null) {
    if (!iso) return '—'
    return new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="officer-layout-grid" style={{ display: 'grid', gridTemplateColumns: '244px 1fr', minHeight: '100vh', background: 'var(--bg)' }}>
      {/* Sidebar */}
      <aside className="officer-sidebar" style={{ background: 'var(--surface)', borderRight: '1px solid var(--line)', padding: '18px 14px', display: 'flex', flexDirection: 'column', gap: 4, height: '100vh', position: 'sticky', top: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 8px 18px', borderBottom: '1px solid var(--line)', marginBottom: 14 }}>
          <div style={{ width: 30, height: 30, borderRadius: 7, background: 'var(--primary)', color: 'var(--on-primary)', display: 'grid', placeItems: 'center', fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 14 }}>CP</div>
          <div>
            <div style={{ fontWeight: 600, fontSize: 15, letterSpacing: '-0.02em' }}>Civic Park</div>
            <div style={{ fontSize: 10.5, color: 'var(--ink-3)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Officer portal</div>
          </div>
        </div>
        <div style={{ fontSize: 10.5, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--ink-4)', padding: '14px 10px 6px', fontWeight: 600 }}>Review</div>
        {[
          { href: '/officer/queue', label: 'Queue', icon: <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/> },
          { href: '/officer/history', label: 'History', active: true, icon: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/></> },
        ].map(item => (
          <Link key={item.href} href={item.href} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 8, fontSize: 13.5, color: (item as any).active ? 'var(--primary-ink)' : 'var(--ink-2)', fontWeight: 500, background: (item as any).active ? 'var(--primary-soft)' : 'transparent', textDecoration: 'none' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">{item.icon}</svg>
            {item.label}
          </Link>
        ))}
        <div style={{ marginTop: 'auto', borderTop: '1px solid var(--line)', padding: '12px 10px 4px' }}>
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
            <span>Officer</span><span>›</span><strong style={{ color: 'var(--ink)' }}>Review history</strong>
          </div>
        </div>

        <div className="officer-page-content" style={{ padding: '26px 32px 80px' }}>
          {/* Page header */}
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 20, marginBottom: 24 }}>
            <div>
              <h1 style={{ fontSize: 26, fontWeight: 600, letterSpacing: '-0.025em', margin: 0 }}>Review history</h1>
              <div style={{ color: 'var(--ink-3)', marginTop: 4, fontSize: 14 }}>
                All reports you have reviewed{totalCount != null ? ` · ${totalCount.toLocaleString()} total` : ''}
              </div>
            </div>
            <button className="btn btn-secondary btn-sm">Export CSV</button>
          </div>

          {/* Stats */}
          <div className="officer-stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 22 }}>
            {[
              { lbl: 'Total reviewed', num: (totalCount ?? 0).toLocaleString() },
              { lbl: 'Approved', num: approved.length.toLocaleString() },
              { lbl: 'Approval rate', num: `${approvalRate}%` },
            ].map(s => (
              <div key={s.lbl} style={{ padding: '14px 16px', background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 10 }}>
                <div style={{ fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ink-3)', fontWeight: 600 }}>{s.lbl}</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 24, fontWeight: 600, letterSpacing: '-0.02em', marginTop: 4, fontVariantNumeric: 'tabular-nums' }}>{s.num}</div>
              </div>
            ))}
          </div>

          {/* Table */}
          {allReviewed.length === 0 ? (
            <div style={{ padding: '48px 0', textAlign: 'center', color: 'var(--ink-3)', fontSize: 14 }}>
              No reviewed reports yet.
            </div>
          ) : (
            <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 10, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr>
                    {['ID', 'Plate', 'Category', 'Location', 'Decision', 'Fine', 'Reviewed'].map(h => (
                      <th key={h} style={{ background: 'var(--surface-2)', textAlign: 'left', fontWeight: 500, fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ink-3)', padding: '10px 14px', borderBottom: '1px solid var(--line)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {allReviewed.map(row => (
                    <tr key={row.id}>
                      <td style={{ padding: '12px 14px', borderBottom: '1px solid var(--line)', fontFamily: 'var(--font-mono)', color: 'var(--ink-3)', fontSize: 11.5 }}>{row.id.slice(0, 8).toUpperCase()}</td>
                      <td style={{ padding: '12px 14px', borderBottom: '1px solid var(--line)' }}>
                        <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, fontSize: 12, background: '#F8E55C', color: '#1A1A1A', padding: '2px 6px', borderRadius: 4, border: '1px solid #C9B83E' }}>{row.detected_plate ?? '—'}</span>
                      </td>
                      <td style={{ padding: '12px 14px', borderBottom: '1px solid var(--line)' }}>{row.category ?? '—'}</td>
                      <td style={{ padding: '12px 14px', borderBottom: '1px solid var(--line)', color: 'var(--ink-3)' }}>{row.address ?? '—'}</td>
                      <td style={{ padding: '12px 14px', borderBottom: '1px solid var(--line)' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 999, fontSize: 11, fontWeight: 600, background: row.status === 'approved' ? 'var(--status-approved-bg)' : 'var(--status-rejected-bg)', color: row.status === 'approved' ? 'var(--status-approved)' : 'var(--status-rejected)' }}>
                          <span style={{ width: 5, height: 5, borderRadius: 999, background: 'currentColor' }} />
                          {row.status === 'approved' ? 'Approved' : 'Rejected'}
                        </span>
                      </td>
                      <td style={{ padding: '12px 14px', borderBottom: '1px solid var(--line)', fontFamily: 'var(--font-mono)', fontSize: 13 }}>
                        {row.fine_amount ? `₹${row.fine_amount.toLocaleString()}` : '—'}
                      </td>
                      <td style={{ padding: '12px 14px', borderBottom: '1px solid var(--line)', color: 'var(--ink-3)', fontSize: 12, fontFamily: 'var(--font-mono)' }}>{formatDate(row.reviewed_at)}</td>
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
