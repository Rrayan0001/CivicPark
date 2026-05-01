import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRecord = Record<string, any>

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profileRaw } = await (supabase as AnyRecord)
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const profile = profileRaw as { role: string } | null

  if (!profile || profile.role === 'citizen') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await request.json()
  const { report_id, action, detected_plate_override, rejection_reason, reviewer_notes } = body

  if (!report_id || !action) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  const db = supabase as AnyRecord

  if (action === 'approve') {
    const { error } = await db
      .from('reports')
      .update({
        status: 'challan_issued',
        reviewer_id: user.id,
        reviewed_at: new Date().toISOString(),
        ...(detected_plate_override ? { detected_plate: detected_plate_override } : {}),
        challan_id: `BTP-${Date.now()}`,
        challan_issued_at: new Date().toISOString(),
        fine_amount: 1000,
      })
      .eq('id', report_id)
      .eq('status', 'pending_review')

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Credit reporter points
    const { data: reportRow } = await db
      .from('reports')
      .select('reporter_id')
      .eq('id', report_id)
      .single()

    const reporterRow = reportRow as { reporter_id: string } | null

    if (reporterRow?.reporter_id) {
      // Increment via RPC (function must exist in DB) — failure is non-fatal
      await db
        .rpc('increment_reporter_points', {
          p_reporter_id: reporterRow.reporter_id,
          p_points: 25,
        })
        .maybeSingle()
    }

    return NextResponse.json({ ok: true, status: 'challan_issued' })
  }

  if (action === 'reject') {
    const { error } = await db
      .from('reports')
      .update({
        status: 'rejected',
        reviewer_id: user.id,
        reviewed_at: new Date().toISOString(),
        rejection_reason: rejection_reason ?? 'other',
        reviewer_notes: reviewer_notes ?? null,
      })
      .eq('id', report_id)
      .eq('status', 'pending_review')

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true, status: 'rejected' })
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
}
