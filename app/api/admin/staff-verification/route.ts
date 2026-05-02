import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { hasVerifiedStaffAccess } from '@/lib/auth/staff'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRecord = Record<string, any>

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = supabase as AnyRecord
  const { data: profile } = await db
    .from('profiles')
    .select('id, role, staff_verified, staff_suspended')
    .eq('id', user.id)
    .maybeSingle()

  if (!hasVerifiedStaffAccess(profile, ['admin'])) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await request.json()
  const staffId = typeof body.staff_id === 'string' ? body.staff_id : ''
  const staffVerified = typeof body.staff_verified === 'boolean' ? body.staff_verified : undefined
  const staffSuspended = typeof body.staff_suspended === 'boolean' ? body.staff_suspended : undefined
  const notes = typeof body.notes === 'string' ? body.notes.trim() : ''

  if (!staffId || (staffVerified === undefined && staffSuspended === undefined)) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  if (staffId === user.id && staffSuspended) {
    return NextResponse.json({ error: 'You cannot suspend your own account.' }, { status: 400 })
  }

  const { data: targetProfile } = await db
    .from('profiles')
    .select('id, role, staff_verified, staff_suspended')
    .eq('id', staffId)
    .maybeSingle()

  if (!targetProfile || targetProfile.role === 'citizen') {
    return NextResponse.json({ error: 'Staff account not found.' }, { status: 404 })
  }

  const updatePayload: Record<string, unknown> = {}
  if (staffVerified !== undefined) {
    updatePayload.staff_verified = staffVerified
    updatePayload.staff_verified_at = staffVerified ? new Date().toISOString() : null
    updatePayload.staff_verified_by = staffVerified ? user.id : null
  }
  if (staffSuspended !== undefined) {
    updatePayload.staff_suspended = staffSuspended
  }
  if (notes) {
    updatePayload.staff_verification_notes = notes
  }

  const { error } = await db.from('profiles').update(updatePayload).eq('id', staffId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
