'use client'

import { useState, useEffect, use } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const CATEGORY_LABELS: Record<string, string> = {
  no_parking:       'No parking',
  wrong_parking:    'Wrong parking',
  footpath_parking: 'Footpath parking',
  blocking_traffic: 'Blocking traffic',
  double_parking:   'Double parking',
}

const REJECTION_REASONS = [
  { value: 'plate_not_visible',     label: 'Plate not visible' },
  { value: 'no_violation_visible',  label: 'No violation visible' },
  { value: 'duplicate',             label: 'Duplicate report' },
  { value: 'edited_image',          label: 'Edited / tampered image' },
  { value: 'wrong_location',        label: 'Wrong location' },
  { value: 'insufficient_evidence', label: 'Insufficient evidence' },
  { value: 'other',                 label: 'Other' },
]

type Report = {
  id: string
  category: string
  status: string
  detected_plate: string | null
  plate_confidence: number | null
  address: string | null
  captured_at: string
  created_at: string
  photo_urls: string[]
  description: string | null
  ai_flags: Record<string, unknown> | null
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('en-IN', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
    hour12: true, timeZone: 'Asia/Kolkata',
  })
}

export default function OfficerReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [report, setReport] = useState<Report | null>(null)
  const [loading, setLoading] = useState(true)
  const [plateOverride, setPlateOverride] = useState('')
  const [rejectionReason, setRejectionReason] = useState('plate_not_visible')
  const [reviewerNotes, setReviewerNotes] = useState('')
  const [activePhoto, setActivePhoto] = useState(0)
  const [submitting, setSubmitting] = useState<'approve' | 'reject' | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    const supabase = createClient()
    supabase
      .from('reports')
      .select('id, category, status, detected_plate, plate_confidence, address, captured_at, created_at, photo_urls, description, ai_flags')
      .eq('id', id)
      .single()
      .then(({ data }) => {
        if (data) {
          setReport(data as Report)
          setPlateOverride((data as Report).detected_plate ?? '')
        }
        setLoading(false)
      })
  }, [id])

  async function handleAction(action: 'approve' | 'reject') {
    setSubmitting(action)
    setError('')
    const res = await fetch('/api/officer/review', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        report_id: id,
        action,
        detected_plate_override: plateOverride || undefined,
        rejection_reason: action === 'reject' ? rejectionReason : undefined,
        reviewer_notes: reviewerNotes || undefined,
      }),
    })
    const json = await res.json()
    if (!res.ok) {
      setError(json.error ?? 'Failed to submit decision')
      setSubmitting(null)
      return
    }
    router.push('/officer/queue')
    router.refresh()
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: 'var(--muted)' }}>Loading report…</p>
      </div>
    )
  }

  if (!report) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12 }}>
        <p style={{ fontSize: 16, fontWeight: 500 }}>Report not found or access denied</p>
        <Link href="/officer/queue" className="btn btn-secondary btn-sm">Back to queue</Link>
      </div>
    )
  }

  const aiConfidence = [
    { name: 'Plate legibility',        pct: report.plate_confidence ? Math.round(report.plate_confidence * 100) : 0 },
    { name: 'No-parking sign visible', pct: (report.ai_flags?.sign_visible as number) ? 91 : 45 },
    { name: 'Vehicle on footpath',     pct: (report.ai_flags?.on_footpath as number) ? 88 : 60 },
    { name: 'No duplicate',            pct: (report.ai_flags?.duplicate as boolean) ? 12 : 98 },
  ]

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
          { href: '/officer/queue',   label: 'Queue',   icon: <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/> },
          { href: '/officer/history', label: 'History', icon: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/></> },
        ].map(item => (
          <Link key={item.href} href={item.href} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 8, fontSize: 13.5, color: 'var(--ink-2)', fontWeight: 500, background: 'transparent', textDecoration: 'none' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">{item.icon}</svg>
            {item.label}
          </Link>
        ))}
      </aside>

      <main style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* Top bar */}
        <div className="officer-topbar" style={{ height: 56, borderBottom: '1px solid var(--line)', background: 'var(--surface)', display: 'flex', alignItems: 'center', padding: '0 24px', gap: 16, position: 'sticky', top: 0, zIndex: 4 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--ink-3)' }}>
            <Link href="/officer/queue" style={{ color: 'var(--ink-3)' }}>Queue</Link>
            <span>›</span>
            <strong style={{ color: 'var(--ink)' }}>Review {id.slice(0, 8).toUpperCase()}</strong>
          </div>
        </div>

        <div className="officer-page-content" style={{ padding: '26px 32px 80px' }}>
          {/* Hero */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 18 }}>
            <div>
              <div style={{ fontFamily: 'var(--font-mono)', color: 'var(--ink-3)', fontSize: 12 }}>{id}</div>
              <h1 style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-0.025em', margin: '4px 0 0' }}>
                {CATEGORY_LABELS[report.category] ?? report.category}
                {report.address && <span style={{ fontWeight: 400, color: 'var(--muted)' }}> · {report.address}</span>}
              </h1>
            </div>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 9px', borderRadius: 999, fontSize: 11.5, fontWeight: 600, background: 'var(--status-pending-bg)', color: 'var(--status-pending)', whiteSpace: 'nowrap' }}>
              <span style={{ width: 6, height: 6, borderRadius: 999, background: 'currentColor' }} />
              Pending review
            </span>
          </div>

          {error && (
            <div style={{ marginBottom: 16, padding: '10px 14px', background: '#F8DCDC', border: '1px solid #F2A8A8', borderRadius: 8, color: '#B43338', fontSize: 13 }}>{error}</div>
          )}

          <div className="officer-row-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 20, alignItems: 'start' }}>
            {/* LEFT — evidence */}
            <div>
              {/* Main photo */}
              <div style={{ background: '#0A0F19', borderRadius: 12, overflow: 'hidden', aspectRatio: '4/3', position: 'relative' }}>
                {report.photo_urls?.[activePhoto] ? (
                  <Image src={report.photo_urls[activePhoto]} alt="Evidence" fill style={{ objectFit: 'cover' }} priority unoptimized />
                ) : (
                  <Image src="/images/1.png" alt="Evidence placeholder" fill style={{ objectFit: 'cover' }} priority />
                )}
                {report.detected_plate && (
                  <div style={{ position: 'absolute', left: '32%', top: '56%', width: '14%', height: '7%', border: '2px solid #F8E55C', borderRadius: 4, pointerEvents: 'none' }}>
                    <span style={{ position: 'absolute', top: -22, left: -2, background: '#F8E55C', color: '#1A1A1A', fontFamily: 'var(--font-mono)', fontSize: 10, padding: '2px 6px', borderRadius: 3, fontWeight: 600, whiteSpace: 'nowrap' }}>PLATE</span>
                  </div>
                )}
                <div style={{ position: 'absolute', left: 12, right: 12, bottom: 12, display: 'flex', justifyContent: 'space-between', background: 'rgba(0,0,0,0.55)', border: '1px solid rgba(255,255,255,0.12)', padding: '6px 10px', borderRadius: 8, fontFamily: 'var(--font-mono)', fontSize: 10.5, color: 'rgba(255,255,255,0.85)' }}>
                  <span>{formatDate(report.captured_at)}</span>
                  <span>Photo {activePhoto + 1} of {report.photo_urls.length}</span>
                </div>
              </div>

              {/* Strip */}
              {report.photo_urls.length > 1 && (
                <div style={{ display: 'flex', gap: 8, marginTop: 10, overflowX: 'auto' }}>
                  {report.photo_urls.map((url, i) => (
                    <div key={i} onClick={() => setActivePhoto(i)} style={{ flexShrink: 0, width: 100, height: 76, borderRadius: 6, border: `1px solid ${i === activePhoto ? 'var(--primary)' : 'var(--line)'}`, overflow: 'hidden', cursor: 'pointer', position: 'relative', outline: i === activePhoto ? '2px solid var(--primary)' : 'none', outlineOffset: 1 }}>
                      <Image src={url} alt={`Photo ${i + 1}`} fill style={{ objectFit: 'cover' }} unoptimized />
                    </div>
                  ))}
                </div>
              )}

              {/* Map */}
              <div style={{ marginTop: 18, background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 12, overflow: 'hidden' }}>
                <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 style={{ fontSize: 13, margin: 0 }}>Location</h3>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-3)' }}>{report.address ?? 'No address'}</span>
                </div>
                <div style={{ height: 200, position: 'relative' }}>
                  <Image src="/images/5.png" alt="Map" fill style={{ objectFit: 'cover' }} />
                </div>
              </div>
            </div>

            {/* RIGHT — metadata + actions */}
            <div>
              {/* Metadata */}
              <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 12, padding: 18 }}>
                <div style={{ fontSize: 12, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ink-3)', marginBottom: 14, fontWeight: 600 }}>Report details</div>
                {[
                  { k: 'Report ID',   v: id.slice(0, 8).toUpperCase() },
                  { k: 'Category',    v: CATEGORY_LABELS[report.category] ?? report.category },
                  { k: 'Plate (AI)',  v: report.detected_plate ?? 'Not detected' },
                  { k: 'Confidence',  v: report.plate_confidence ? `${Math.round(report.plate_confidence * 100)}%` : '—' },
                  { k: 'Captured',    v: formatDate(report.captured_at) },
                  { k: 'Photos',      v: `${report.photo_urls.length}` },
                ].map(row => (
                  <div key={row.k} style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 0', borderBottom: '1px solid var(--line)', fontSize: 13 }}>
                    <span style={{ color: 'var(--ink-3)' }}>{row.k}</span>
                    <span style={{ color: 'var(--ink)', fontWeight: 500, textAlign: 'right' }}>{row.v}</span>
                  </div>
                ))}
              </div>

              {/* AI confidence */}
              <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 12, padding: 18, marginTop: 14 }}>
                <div style={{ fontSize: 12, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ink-3)', marginBottom: 14, fontWeight: 600 }}>AI assessment</div>
                {aiConfidence.map(row => (
                  <div key={row.name} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0' }}>
                    <span style={{ flex: 1, fontSize: 13 }}>{row.name}</span>
                    <div style={{ width: 90, height: 5, background: 'var(--surface-2)', borderRadius: 999, overflow: 'hidden' }}>
                      <span style={{ display: 'block', height: '100%', width: `${row.pct}%`, background: row.pct >= 70 ? 'var(--status-approved)' : 'var(--status-rejected)', borderRadius: 999 }} />
                    </div>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--ink-3)', width: 34, textAlign: 'right' }}>{row.pct}%</span>
                  </div>
                ))}
              </div>

              {/* Plate override */}
              <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 12, padding: 18, marginTop: 14 }}>
                <div style={{ fontSize: 12, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ink-3)', marginBottom: 10, fontWeight: 600 }}>Confirm plate</div>
                <input
                  value={plateOverride}
                  onChange={e => setPlateOverride(e.target.value.toUpperCase())}
                  style={{ width: '100%', height: 44, padding: '0 14px', fontFamily: 'var(--font-mono)', fontWeight: 600, fontSize: 16, letterSpacing: '0.06em', background: '#F8E55C', color: '#1A1A1A', border: '1px solid #C9B83E', borderRadius: 6, outline: 'none', boxSizing: 'border-box' }}
                />
                <p style={{ fontSize: 11.5, color: 'var(--ink-3)', marginTop: 8 }}>Edit if AI extraction is wrong.</p>
              </div>

              {/* Rejection controls */}
              <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 12, padding: 18, marginTop: 14 }}>
                <div style={{ fontSize: 12, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ink-3)', marginBottom: 10, fontWeight: 600 }}>If rejecting</div>
                <select
                  value={rejectionReason}
                  onChange={e => setRejectionReason(e.target.value)}
                  style={{ width: '100%', height: 38, padding: '0 10px', fontSize: 13, color: 'var(--ink)', background: 'var(--bg)', border: '1px solid var(--line)', borderRadius: 8, outline: 'none', boxSizing: 'border-box' }}
                >
                  {REJECTION_REASONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
                <textarea
                  value={reviewerNotes}
                  onChange={e => setReviewerNotes(e.target.value)}
                  placeholder="Optional note to the reporter…"
                  rows={2}
                  style={{ width: '100%', marginTop: 8, padding: '10px 12px', fontFamily: 'inherit', fontSize: 13, color: 'var(--ink)', background: 'var(--bg)', border: '1px solid var(--line)', borderRadius: 8, outline: 'none', resize: 'vertical', lineHeight: 1.5, boxSizing: 'border-box' }}
                />
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
                <button
                  onClick={() => handleAction('approve')}
                  disabled={!!submitting}
                  style={{ flex: 1, height: 48, borderRadius: 10, border: '1px solid #7FC99A', background: '#DCEEDF', color: '#1F7A4A', fontWeight: 600, fontSize: 14, cursor: submitting ? 'default' : 'pointer', opacity: submitting === 'reject' ? 0.5 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                >
                  {submitting === 'approve' ? '…' : (
                    <><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 12 2 2 4-4"/><circle cx="12" cy="12" r="9"/></svg> Approve</>
                  )}
                </button>
                <button
                  onClick={() => handleAction('reject')}
                  disabled={!!submitting}
                  style={{ flex: 1, height: 48, borderRadius: 10, border: '1px solid #F2A8A8', background: '#F8DCDC', color: '#B43338', fontWeight: 600, fontSize: 14, cursor: submitting ? 'default' : 'pointer', opacity: submitting === 'approve' ? 0.5 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                >
                  {submitting === 'reject' ? '…' : (
                    <><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><path d="m15 9-6 6M9 9l6 6"/></svg> Reject</>
                  )}
                </button>
              </div>
              <div style={{ marginTop: 10 }}>
                <Link href="/officer/queue" style={{ display: 'block', textAlign: 'center', height: 36, lineHeight: '36px', borderRadius: 8, border: '1px solid var(--line)', color: 'var(--ink-3)', fontSize: 13, textDecoration: 'none' }}>
                  Skip — back to queue
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
