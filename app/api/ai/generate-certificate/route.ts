import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generate65BCertificate, type ReportData } from '@/lib/ai/certificate'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRecord = Record<string, any>

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Only officers and admins can generate certificates
  const { data: profileRaw } = await (supabase as AnyRecord)
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const profile = profileRaw as { role: string } | null
  if (!profile || profile.role === 'citizen') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { report_id } = await request.json()
  if (!report_id) return NextResponse.json({ error: 'Missing report_id' }, { status: 400 })

  const db = supabase as AnyRecord

  // Fetch the report
  const { data: row, error: fetchError } = await db
    .from('reports')
    .select(
      'id, category, address, captured_at, created_at, ' +
      'detected_plate, evidence_hash, photo_urls, video_url, device_metadata'
    )
    .eq('id', report_id)
    .single()

  if (fetchError || !row) {
    return NextResponse.json({ error: 'Report not found' }, { status: 404 })
  }

  // Generate PDF
  let pdfBytes: Uint8Array
  try {
    pdfBytes = await generate65BCertificate(row as ReportData)
  } catch (err) {
    console.error('[certificate] generation failed:', err)
    return NextResponse.json({ error: 'Certificate generation failed' }, { status: 500 })
  }

  // Upload to Supabase Storage
  const storagePath = `certificates/${report_id}/section_65b.pdf`
  const { error: uploadError } = await db
    .storage.from('evidence')
    .upload(storagePath, pdfBytes, {
      contentType: 'application/pdf',
      upsert: true,
    })

  if (uploadError) {
    console.error('[certificate] upload failed:', uploadError)
    return NextResponse.json({ error: 'Certificate upload failed' }, { status: 500 })
  }

  // Get signed URL (1 year)
  const { data: signedData } = await db
    .storage.from('evidence')
    .createSignedUrl(storagePath, 60 * 60 * 24 * 365)

  const certificateUrl = signedData?.signedUrl ?? storagePath

  // Persist URL on the report
  await db
    .from('reports')
    .update({ section_65b_certificate_url: certificateUrl })
    .eq('id', report_id)

  return NextResponse.json({ ok: true, report_id, certificate_url: certificateUrl })
}
