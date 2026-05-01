import Link from 'next/link'
import Image from 'next/image'
import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { Report, AuditLog } from '@/types/database'

const CATEGORY_LABELS: Record<string, string> = {
  no_parking:       'No parking',
  wrong_parking:    'Wrong parking',
  footpath_parking: 'Footpath parking',
  blocking_traffic: 'Blocking traffic',
  double_parking:   'Double parking',
}

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

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('en-IN', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
    hour12: true, timeZone: 'Asia/Kolkata',
  })
}

export default async function ReportDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: report } = await supabase
    .from('reports')
    .select('*')
    .eq('id', id)
    .eq('reporter_id', user.id)
    .single()

  if (!report) notFound()

  const r = report as Report

  const { data: auditLogs } = await supabase
    .from('report_audit_log')
    .select('*')
    .eq('report_id', id)
    .order('created_at', { ascending: true })

  const statusColor = STATUS_COLORS[r.status] ?? { bg: '#F4F4EF', color: '#5B6878' }
  const isChallan = r.status === 'challan_issued' || r.status === 'approved'

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>

      {/* Header */}
      <div style={{ padding: '0 18px', height: 52, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--line)', background: 'var(--bg)', position: 'sticky', top: 0, zIndex: 10 }}>
        <Link href="/citizen/my-reports" style={{ display: 'grid', placeItems: 'center', width: 32, height: 32, borderRadius: 8, border: '1px solid var(--line)', color: 'var(--ink)' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="m15 6-6 6 6 6"/></svg>
        </Link>
        <span style={{ fontSize: 15, fontWeight: 600 }}>Report detail</span>
        <div style={{ width: 32 }} />
      </div>

      <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 32 }}>

        {/* Hero */}
        <section style={{ background: 'var(--bg)', borderBottom: '1px solid var(--line)', padding: '14px 18px 18px' }}>
          <p style={{ fontFamily: 'var(--font-mono)', color: 'var(--muted)', fontSize: 11.5, letterSpacing: '0.06em' }}>
            {r.id.slice(0, 8).toUpperCase()} · {formatDate(r.created_at)}
          </p>
          <h1 style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-0.025em', marginTop: 4 }}>
            {CATEGORY_LABELS[r.category] ?? r.category}
            {r.address && <> · <span style={{ fontWeight: 400, color: 'var(--muted)' }}>{r.address}</span></>}
          </h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 12, flexWrap: 'wrap' }}>
            {r.detected_plate && (
              <span style={{ display: 'inline-flex', fontFamily: 'var(--font-mono)', fontWeight: 600, fontSize: 16, letterSpacing: '0.05em', background: '#F8E55C', color: '#1A1A1A', padding: '5px 11px', borderRadius: 4, border: '1px solid #C9B83E' }}>
                {r.detected_plate}
              </span>
            )}
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '2px 9px', borderRadius: 999, fontSize: 11.5, fontWeight: 600, background: statusColor.bg, color: statusColor.color }}>
              <span style={{ width: 6, height: 6, borderRadius: 999, background: 'currentColor' }} />
              {STATUS_LABELS[r.status] ?? r.status}
            </span>
          </div>
        </section>

        {/* Photos */}
        {r.photo_urls?.length > 0 && (
          <section style={{ padding: '16px 0 8px' }}>
            <div style={{ display: 'flex', gap: 8, padding: '0 18px', overflowX: 'auto', scrollSnapType: 'x mandatory', scrollbarWidth: 'none' }}>
              {r.photo_urls.map((url, i) => (
                <div key={i} style={{ flexShrink: 0, width: 240, height: 180, borderRadius: 10, border: '1px solid var(--line)', overflow: 'hidden', scrollSnapAlign: 'center', position: 'relative' }}>
                  <Image src={url} alt={`Photo ${i + 1}`} fill style={{ objectFit: 'cover' }} unoptimized />
                  <span style={{ position: 'absolute', bottom: 8, left: 8, fontFamily: 'var(--font-mono)', fontSize: 10, background: 'rgba(255,255,255,0.88)', padding: '3px 7px', borderRadius: 4 }}>
                    {i + 1} / {r.photo_urls.length}
                  </span>
                </div>
              ))}
            </div>
            <p style={{ textAlign: 'center', paddingTop: 10, fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--muted)' }}>
              {r.photo_urls.length} photo{r.photo_urls.length !== 1 ? 's' : ''} · GPS-locked
            </p>
          </section>
        )}

        {/* Challan card */}
        {isChallan && r.challan_id && (
          <>
            <div style={{ padding: '4px 18px 0' }}>
              <h3 style={{ fontSize: 13.5, fontWeight: 600, marginBottom: 10 }}>Challan</h3>
            </div>
            <div style={{ margin: '0 18px', padding: 16, background: '#DCEEDF', border: '1px solid #7FC99A', borderRadius: 10, position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', inset: 0, opacity: 0.07, pointerEvents: 'none' }}>
                <Image src="/images/9.png" alt="" fill style={{ objectFit: 'cover' }} />
              </div>
              <div style={{ position: 'relative', zIndex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 38, height: 38, borderRadius: 8, background: '#1F7A4A', color: 'white', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6l-8-3Z"/><path d="m9 12 2 2 4-4"/></svg>
                  </div>
                  <div>
                    <h3 style={{ fontSize: 15, color: '#1F7A4A', fontWeight: 600 }}>Challan #{r.challan_id}</h3>
                    <p style={{ fontSize: 12, color: 'var(--muted)' }}>Issued by Bangalore Traffic Police</p>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginTop: 14 }}>
                  {[
                    { lbl: 'Issued on', val: r.challan_issued_at ? formatDate(r.challan_issued_at) : '—' },
                    { lbl: 'Status',    val: r.fine_paid ? 'Paid' : 'Unpaid' },
                  ].map(f => (
                    <div key={f.lbl}>
                      <div style={{ fontSize: 11, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--muted)', fontWeight: 600 }}>{f.lbl}</div>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 14.5, color: 'var(--ink)', marginTop: 3 }}>{f.val}</div>
                    </div>
                  ))}
                  {r.fine_amount && (
                    <div style={{ gridColumn: '1 / -1' }}>
                      <div style={{ fontSize: 11, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--muted)', fontWeight: 600 }}>Fine</div>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 22, fontWeight: 600, letterSpacing: '-0.02em', color: 'var(--ink)', marginTop: 3 }}>
                        ₹{r.fine_amount.toLocaleString('en-IN')}.00
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </>
        )}

        {/* Rejection note */}
        {(r.status === 'rejected' || r.status.startsWith('auto_rejected')) && (
          <div style={{ margin: '12px 18px 0', padding: 14, background: '#F8DCDC', border: '1px solid #F2A8A8', borderRadius: 10 }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: '#B43338' }}>Report rejected</p>
            {r.reviewer_notes && <p style={{ fontSize: 13, color: 'var(--ink)', marginTop: 4 }}>{r.reviewer_notes}</p>}
            {r.rejection_reason && <p style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 4, fontFamily: 'var(--font-mono)' }}>{r.rejection_reason.replace(/_/g, ' ')}</p>}
          </div>
        )}

        {/* Audit log */}
        {auditLogs && auditLogs.length > 0 && (
          <>
            <div style={{ padding: '18px 18px 6px' }}>
              <h3 style={{ fontSize: 13.5, fontWeight: 600, marginBottom: 10 }}>Audit log</h3>
            </div>
            <div style={{ margin: '0 18px', background: 'var(--bg)', border: '1px solid var(--line)', borderRadius: 10, padding: '6px 16px' }}>
              {(auditLogs as AuditLog[]).map((entry, i) => (
                <div key={entry.id} style={{ display: 'flex', gap: 12, padding: '10px 0' }}>
                  <div style={{ width: 18, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <span style={{ width: 9, height: 9, borderRadius: 999, background: '#1F7A4A', border: '2px solid #1F7A4A', flexShrink: 0, marginTop: 4 }} />
                    {i < auditLogs.length - 1 && <span style={{ flex: 1, width: 1, background: 'var(--line)', marginTop: 4 }} />}
                  </div>
                  <div style={{ paddingBottom: i === auditLogs.length - 1 ? 4 : 0 }}>
                    <h4 style={{ fontSize: 13.5, fontWeight: 600, textTransform: 'capitalize' }}>{entry.action.replace(/_/g, ' ')}</h4>
                    {entry.to_status && (
                      <p style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.45, marginTop: 1 }}>
                        Status → {STATUS_LABELS[entry.to_status] ?? entry.to_status}
                      </p>
                    )}
                    <p style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, color: 'var(--muted)', marginTop: 4 }}>
                      {formatDate(entry.created_at)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Anonymity note */}
        <div style={{ display: 'flex', gap: 10, padding: 12, margin: '12px 18px 18px', background: 'var(--surface-2)', border: '1px solid var(--line)', borderRadius: 10 }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--primary)', flexShrink: 0, marginTop: 1 }}>
            <path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6l-8-3Z"/>
          </svg>
          <p style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }}>
            The vehicle owner sees this challan as issued by <strong style={{ color: 'var(--ink)' }}>"City of Bangalore"</strong>. Your name and number are never shared.
          </p>
        </div>
      </div>
    </div>
  )
}
