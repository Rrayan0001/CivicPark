'use client'

import { useState } from 'react'

type Props = {
  staffId: string
  initialVerified: boolean
  initialSuspended: boolean
}

export function StaffVerificationActions({ staffId, initialVerified, initialSuspended }: Props) {
  const [verified, setVerified] = useState(initialVerified)
  const [suspended, setSuspended] = useState(initialSuspended)
  const [submitting, setSubmitting] = useState<'verify' | 'suspend' | null>(null)
  const [error, setError] = useState('')

  async function updateStaff(next: { staff_verified?: boolean; staff_suspended?: boolean }, mode: 'verify' | 'suspend') {
    setSubmitting(mode)
    setError('')

    const res = await fetch('/api/admin/staff-verification', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        staff_id: staffId,
        ...next,
      }),
    })

    const json = await res.json().catch(() => ({}))
    if (!res.ok) {
      setError(json.error ?? 'Unable to update staff access.')
      setSubmitting(null)
      return
    }

    if (typeof next.staff_verified === 'boolean') setVerified(next.staff_verified)
    if (typeof next.staff_suspended === 'boolean') setSuspended(next.staff_suspended)
    setSubmitting(null)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 6 }}>
      <div style={{ display: 'flex', gap: 6 }}>
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          disabled={!!submitting || suspended}
          onClick={() => updateStaff({ staff_verified: !verified }, 'verify')}
          style={{ minWidth: 92, opacity: suspended ? 0.6 : 1 }}
        >
          {submitting === 'verify' ? 'Saving…' : verified ? 'Unverify' : 'Verify'}
        </button>
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          disabled={!!submitting}
          onClick={() => updateStaff({ staff_suspended: !suspended }, 'suspend')}
          style={{ minWidth: 92 }}
        >
          {submitting === 'suspend' ? 'Saving…' : suspended ? 'Restore' : 'Suspend'}
        </button>
      </div>
      {error ? <span style={{ fontSize: 11, color: 'var(--status-rejected)' }}>{error}</span> : null}
    </div>
  )
}
