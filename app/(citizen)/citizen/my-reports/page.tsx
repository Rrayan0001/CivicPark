import Link from 'next/link'
import Image from 'next/image'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { Report } from '@/types/database'

const STATUS_LABELS: Record<string, string> = {
  pending_ai:                'Processing',
  pending_review:            'Under review',
  approved:                  'Approved',
  rejected:                  'Rejected',
  challan_issued:            'Challan issued',
  auto_rejected_duplicate:   'Duplicate',
  auto_rejected_low_quality: 'Low quality',
  disputed:                  'Disputed',
}

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  pending_ai:                { bg: '#EBE0F7', color: '#6B3FB0' },
  pending_review:            { bg: '#DEEAFB', color: '#1F5BB5' },
  approved:                  { bg: '#DCEEDF', color: '#1F7A4A' },
  rejected:                  { bg: '#F8DCDC', color: '#B43338' },
  challan_issued:            { bg: '#DCEEDF', color: '#1F7A4A' },
  auto_rejected_duplicate:   { bg: '#F8DCDC', color: '#B43338' },
  auto_rejected_low_quality: { bg: '#F8DCDC', color: '#B43338' },
  disputed:                  { bg: '#EBE0F7', color: '#6B3FB0' },
}

const CATEGORY_LABELS: Record<string, string> = {
  no_parking:       'No parking',
  wrong_parking:    'Wrong parking',
  footpath_parking: 'Footpath parking',
  blocking_traffic: 'Blocking traffic',
  double_parking:   'Double parking',
}

const TABS = [
  { key: 'all',                                                        label: 'All' },
  { key: 'pending_review,pending_ai',                                  label: 'Pending' },
  { key: 'challan_issued,approved',                                    label: 'Approved' },
  { key: 'rejected,auto_rejected_duplicate,auto_rejected_low_quality', label: 'Rejected' },
]

function StatusPill({ status }: { status: string }) {
  const c = STATUS_COLORS[status] ?? { bg: '#F4F4EF', color: '#5B6878' }
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '2px 9px', borderRadius: 999, fontSize: 11.5, fontWeight: 600, background: c.bg, color: c.color, whiteSpace: 'nowrap' }}>
      <span style={{ width: 6, height: 6, borderRadius: 999, background: 'currentColor', flexShrink: 0 }} />
      {STATUS_LABELS[status] ?? status}
    </span>
  )
}

function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1)  return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24)  return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 7)  return `${days}d ago`
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

function previewImage(url: string | undefined) {
  if (!url) return null
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      alt="Evidence preview"
      style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
    />
  )
}

export default async function MyReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const params = await searchParams
  const activeTab = params.tab ?? 'all'

  let query = supabase
    .from('reports')
    .select('id, category, status, detected_plate, address, created_at, photo_urls, fine_amount')
    .eq('reporter_id', user.id)
    .order('created_at', { ascending: false })

  if (activeTab !== 'all') {
    query = query.in('status', activeTab.split(','))
  }

  const [{ data: reports }, { count: totalCount }, { data: profileRaw }, approvedRes, pendingRes] = await Promise.all([
    query,
    supabase.from('reports').select('id', { count: 'exact', head: true }).eq('reporter_id', user.id),
    supabase.from('profiles').select('full_name, points, tier').eq('id', user.id).maybeSingle(),
    supabase.from('reports').select('id', { count: 'exact', head: true }).eq('reporter_id', user.id).in('status', ['approved', 'challan_issued']),
    supabase.from('reports').select('id', { count: 'exact', head: true }).eq('reporter_id', user.id).in('status', ['pending_ai', 'pending_review']),
  ])

  type ProfileRow = { full_name: string | null; tier: string | null; points: number | null }
  const profile = profileRaw as ProfileRow | null
  const firstName = profile?.full_name?.split(' ')[0] ?? 'there'
  const tier = profile?.tier ?? 'bronze'
  const points = profile?.points ?? 0
  
  const approvedCount = approvedRes.count ?? 0
  const pendingCount  = pendingRes.count  ?? 0
  const total = totalCount ?? 0
  const approvalRate  = total > 0 ? Math.round((approvedCount / total) * 100) : 0

  const now = new Date()
  const greeting = now.getHours() < 12 ? 'Good morning' : now.getHours() < 17 ? 'Good afternoon' : 'Good evening'

  const TIER_CONFIG: Record<string, { color: string; bg: string; label: string }> = {
    bronze:   { color: '#92400E', bg: '#FEF3C7', label: 'Bronze' },
    silver:   { color: '#374151', bg: '#F3F4F6', label: 'Silver' },
    gold:     { color: '#B45309', bg: '#FEF9C3', label: 'Gold'   },
    platinum: { color: '#1E3A8A', bg: '#EFF6FF', label: 'Platinum' },
  }
  const tierCfg = TIER_CONFIG[tier] ?? TIER_CONFIG.bronze

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .dash-card { animation: fadeUp 0.35s ease both; }
      ` }} />

      {/* ── Top header ── */}
      <header style={{
        padding: '20px 20px 0',
        background: 'var(--bg)',
        position: 'relative', zIndex: 10,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--muted)' }}>
            Civic Park · BLR
          </span>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            padding: '3px 10px', borderRadius: 999,
            background: tierCfg.bg, color: tierCfg.color,
            fontSize: 10.5, fontWeight: 700, fontFamily: 'var(--font-mono)',
            textTransform: 'uppercase', letterSpacing: '0.08em',
          }}>
            ★ {tierCfg.label}
          </div>
        </div>
        <div style={{ paddingBottom: 16, borderBottom: '1px solid var(--line)' }}>
          <p style={{ fontSize: 12, color: 'var(--muted)', margin: 0 }}>{greeting},</p>
          <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.03em', margin: '2px 0 0', color: 'var(--ink)' }}>
            {firstName} 👋
          </h1>
        </div>
      </header>

      <div style={{ padding: '20px 20px 0' }}>
        {/* ── KPI strip ── */}
        <div className="dash-card citizen-dashboard-grid" style={{ marginBottom: 22, animationDelay: '0ms' }}>
          {[
            { label: 'Filed',    value: total,         color: 'var(--ink)' },
            { label: 'Approved', value: approvedCount, color: '#1F7A4A'   },
            { label: 'Pending',  value: pendingCount,  color: '#1F5BB5'   },
          ].map(s => (
            <div key={s.label} style={{
              background: 'var(--surface)', border: '1px solid var(--line)',
              borderRadius: 12, padding: '14px 12px', textAlign: 'center',
            }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 26, fontWeight: 700, color: s.color, letterSpacing: '-0.04em' }}>
                {s.value}
              </div>
              <div style={{ fontSize: 10.5, color: 'var(--muted)', marginTop: 2, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>
                {s.label}
              </div>
            </div>
          ))}
        </div>

        {/* ── Approval progress bar ── */}
        {total > 0 && (
          <div className="dash-card" style={{
            background: 'var(--surface)', border: '1px solid var(--line)',
            borderRadius: 12, padding: '14px 16px', marginBottom: 22, animationDelay: '60ms',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink)' }}>Approval rate</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 700, color: '#1F7A4A' }}>{approvalRate}%</span>
            </div>
            <div style={{ height: 6, background: 'var(--surface-2)', borderRadius: 999, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${approvalRate}%`, background: '#1F7A4A', borderRadius: 999, transition: 'width 1s ease' }} />
            </div>
            <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 6 }}>{approvedCount} of {total} reports actioned</div>
          </div>
        )}

        {/* ── Points card ── */}
        <div className="dash-card" style={{
          background: 'linear-gradient(135deg, #0E1A2B 0%, #1E3A8A 100%)',
          borderRadius: 14, padding: '18px 20px', marginBottom: 22,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          color: '#fff', animationDelay: '100ms',
        }}>
          <div>
            <div style={{ fontSize: 11, opacity: 0.7, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>
              Civic Points
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 34, fontWeight: 800, letterSpacing: '-0.04em' }}>
              {points.toLocaleString()}
            </div>
            <div style={{ fontSize: 11, opacity: 0.6, marginTop: 4 }}>
              {tier === 'bronze' ? `${Math.max(50 - points, 0)} pts to Silver` : `${tierCfg.label} tier`}
            </div>
          </div>
          <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
          </svg>
        </div>

        {/* ── Quick actions ── */}
        <div className="dash-card" style={{ marginBottom: 22, animationDelay: '130ms' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <h2 style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)', letterSpacing: '-0.01em', margin: 0 }}>
              Quick actions
            </h2>
          </div>
          <Link href="/citizen/report/new" style={{
            background: 'var(--ink)', color: '#fff',
            borderRadius: 12, padding: '16px 14px',
            textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 10,
            fontSize: 13, fontWeight: 600, width: '100%'
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 8a2 2 0 0 1 2-2h2.5l1.5-2h6l1.5 2H19a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8Z"/>
              <circle cx="12" cy="13" r="4"/>
            </svg>
            File new report
          </Link>
        </div>
      </div>

      {/* Reports Section Header */}
      <div style={{ padding: '16px 18px 0', background: 'var(--bg)', position: 'sticky', top: 0, zIndex: 10, borderBottom: '1px solid var(--line)' }}>
        <h2 style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)', letterSpacing: '-0.01em', marginBottom: 12 }}>My reports</h2>


        {/* Tabs */}
        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', scrollbarWidth: 'none' }}>
          {TABS.map(tab => (
            <Link
              key={tab.key}
              href={`/citizen/my-reports?tab=${tab.key}`}
              style={{
                flexShrink: 0, padding: '7px 14px', borderRadius: 999,
                fontSize: 12.5, fontWeight: 500, textDecoration: 'none',
                display: 'inline-flex', alignItems: 'center', marginBottom: 12,
                background: activeTab === tab.key ? 'var(--ink)' : 'var(--bg)',
                color: activeTab === tab.key ? 'var(--bg)' : 'var(--muted)',
                border: `1px solid ${activeTab === tab.key ? 'var(--ink)' : 'var(--line)'}`,
              }}
            >
              {tab.label}
            </Link>
          ))}
        </div>
      </div>

      {/* List */}
      <div style={{ flex: 1, padding: '14px 16px 88px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {!reports?.length ? (
          <div style={{ padding: '60px 30px', textAlign: 'center', color: 'var(--muted)' }}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" style={{ margin: '0 auto 12px', display: 'block', opacity: 0.3 }}>
              <path d="M3 8a2 2 0 0 1 2-2h2.5l1.5-2h6l1.5 2H19a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8Z"/>
              <circle cx="12" cy="13" r="4"/>
            </svg>
            <p style={{ fontSize: 15, fontWeight: 500, color: 'var(--ink)' }}>No reports yet</p>
            <p style={{ fontSize: 13, marginTop: 6 }}>
              {activeTab === 'all' ? 'Tap "+ Report" to file your first report.' : 'No reports in this category.'}
            </p>
          </div>
        ) : (reports as Report[]).map(r => (
          <Link
            key={r.id}
            href={`/citizen/report/${r.id}`}
            style={{
              background: 'var(--bg)',
              border: '1px solid var(--line)',
              borderRadius: 14,
              padding: 12,
              display: 'flex',
              gap: 14,
              textDecoration: 'none',
              color: 'inherit',
              alignItems: 'stretch',
              boxShadow: '0 1px 2px rgba(14,26,43,0.03)',
            }}
          >
            <div style={{ width: 96, height: 96, borderRadius: 12, flexShrink: 0, border: '1px solid var(--line)', overflow: 'hidden', position: 'relative', background: 'var(--surface-2)' }}>
              {r.photo_urls?.[0] ? (
                <>
                  {previewImage(r.photo_urls[0])}
                  <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(0,0,0,0) 40%, rgba(0,0,0,0.28) 100%)' }} />
                  <div style={{
                    position: 'absolute', left: 8, bottom: 8,
                    display: 'inline-flex', alignItems: 'center', gap: 5,
                    background: 'rgba(255,255,255,0.92)', border: '1px solid rgba(255,255,255,0.8)',
                    borderRadius: 999, padding: '3px 7px',
                    fontFamily: 'var(--font-mono)', fontSize: 10.5, color: 'var(--ink)',
                  }}>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                      <circle cx="12" cy="13" r="4"/>
                    </svg>
                    {r.photo_urls.length}
                  </div>
                </>
              ) : (
                <div style={{ width: '100%', height: '100%', display: 'grid', placeItems: 'center', background: 'var(--surface-3)' }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.5 }}>
                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                    <circle cx="12" cy="13" r="4"/>
                    <line x1="3" y1="3" x2="21" y2="21"/>
                  </svg>
                </div>
              )}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--ink)' }}>
                  {CATEGORY_LABELS[r.category] ?? r.category}
                </span>
                <StatusPill status={r.status} />
              </div>
              {r.detected_plate && (
                <div style={{ marginTop: 4 }}>
                  <span style={{ display: 'inline-flex', fontFamily: 'var(--font-mono)', fontWeight: 600, fontSize: 12.5, letterSpacing: '0.04em', background: '#F8E55C', color: '#1A1A1A', padding: '2px 7px', borderRadius: 4, border: '1px solid #C9B83E' }}>
                    {r.detected_plate}
                  </span>
                </div>
              )}
              <p style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {r.address ?? 'Location not recorded'}
              </p>
              <p style={{ fontSize: 11.5, color: 'var(--ink-3)', marginTop: 7, lineHeight: 1.45 }}>
                {r.photo_urls?.length ? 'Evidence attached. Tap to review full report.' : 'No photo preview saved for this report.'}
              </p>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 11.5, color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>
                <span>{formatRelative(r.created_at)}</span>
                <span style={{ opacity: 0.6 }}>{r.id.slice(0, 8).toUpperCase()}</span>
              </div>
            </div>
          </Link>
        ))}
      </div>

    </div>
  )
}
