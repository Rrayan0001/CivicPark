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

  const { data: reports } = await query
  const { count: total } = await supabase
    .from('reports')
    .select('id', { count: 'exact', head: true })
    .eq('reporter_id', user.id)

  const { data: profileRaw } = await supabase
    .from('profiles')
    .select('full_name, approved_reports, reward_points, tier')
    .eq('id', user.id)
    .single()

  const profile = profileRaw as { full_name: string | null; approved_reports: number; reward_points: number; tier: string } | null

  const approvalRate = total && profile?.approved_reports
    ? Math.round((profile.approved_reports / total) * 100)
    : 0

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>

      {/* Header */}
      <div style={{ padding: '16px 18px 0', background: 'var(--bg)', borderBottom: '1px solid var(--line)', position: 'sticky', top: 0, zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div>
            <h1 style={{ fontSize: 26, fontWeight: 600, letterSpacing: '-0.025em', color: 'var(--ink)' }}>
              {total ?? 0} reports filed
            </h1>
            <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 3 }}>
              {approvalRate}% approval rate · {profile?.tier ?? 'bronze'} tier · {profile?.reward_points ?? 0} pts
            </p>
          </div>
          <Link href="/citizen/report/new" className="btn btn-primary btn-sm">+ Report</Link>
        </div>

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
