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
            style={{ background: 'var(--bg)', border: '1px solid var(--line)', borderRadius: 10, padding: 12, display: 'flex', gap: 12, textDecoration: 'none', color: 'inherit' }}
          >
            <div style={{ width: 76, height: 76, borderRadius: 8, flexShrink: 0, border: '1px solid var(--line)', overflow: 'hidden', position: 'relative', background: 'var(--surface-2)' }}>
              {r.photo_urls?.[0] ? (
                <Image src={r.photo_urls[0]} alt="Evidence" fill style={{ objectFit: 'cover' }} unoptimized />
              ) : (
                <Image src="/images/1.png" alt="Evidence" fill style={{ objectFit: 'cover' }} />
              )}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>
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
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 11.5, color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>
                <span>{formatRelative(r.created_at)}</span>
                <span style={{ opacity: 0.6 }}>{r.id.slice(0, 8).toUpperCase()}</span>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Bottom nav */}
      <nav style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: 'var(--bg)', borderTop: '1px solid var(--line)', display: 'flex', height: 64, zIndex: 20 }}>
        {[
          { href: '/',                   label: 'Home',    active: false, icon: <path d="m3 11 9-7 9 7v9a2 2 0 0 1-2 2h-4v-7H9v7H5a2 2 0 0 1-2-2v-9Z"/> },
          { href: '/citizen/my-reports', label: 'Reports', active: true,  icon: <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/> },
          { href: '/citizen/report/new', label: 'Report',  active: false, icon: <><path d="M3 8a2 2 0 0 1 2-2h2.5l1.5-2h6l1.5 2H19a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8Z"/><circle cx="12" cy="13" r="4"/></> },
          { href: '/citizen/profile',    label: 'Profile', active: false, icon: <><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></> },
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
