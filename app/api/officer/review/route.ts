import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generate65BCertificate, type ReportData } from '@/lib/ai/certificate'

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
    const challanId = `BTP-${Date.now()}`

    const { error } = await db
      .from('reports')
      .update({
        status: 'challan_issued',
        reviewer_id: user.id,
        reviewed_at: new Date().toISOString(),
        ...(detected_plate_override ? { detected_plate: detected_plate_override } : {}),
        challan_id: challanId,
        challan_issued_at: new Date().toISOString(),
        fine_amount: 1000,
      })
      .eq('id', report_id)
      .eq('status', 'pending_review')

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Credit reporter points
    const { data: reportRow } = await db
      .from('reports')
      .select('reporter_id, category, address, captured_at, created_at, detected_plate, evidence_hash, photo_urls, video_url, device_metadata')
      .eq('id', report_id)
      .single()

    const reporterRow = reportRow as (ReportData & { reporter_id: string }) | null

    if (reporterRow?.reporter_id) {
      await db
        .rpc('increment_reporter_points', {
          p_reporter_id: reporterRow.reporter_id,
          p_points: 25,
        })
        .maybeSingle()
    }

    // Generate Section 65B certificate (non-fatal if it fails)
    if (reporterRow) {
      try {
        const pdfBytes = await generate65BCertificate({ ...reporterRow, id: report_id })
        const storagePath = `certificates/${report_id}/section_65b.pdf`

        const { error: uploadErr } = await db
          .storage.from('evidence')
          .upload(storagePath, pdfBytes, { contentType: 'application/pdf', upsert: true })

        if (!uploadErr) {
          const { data: signedData } = await db
            .storage.from('evidence')
            .createSignedUrl(storagePath, 60 * 60 * 24 * 365)

          const certUrl = signedData?.signedUrl ?? storagePath
          await db.from('reports')
            .update({ section_65b_certificate_url: certUrl })
            .eq('id', report_id)
        }
      } catch (certErr) {
        console.error('[certificate] generation failed (non-fatal):', certErr)
      }
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
