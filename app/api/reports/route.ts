import { createHash } from 'crypto'
import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { computePHashes } from '@/lib/ai/phash'
import { checkTampering } from '@/lib/ai/tampering'
import { findDuplicate } from '@/lib/ai/duplicate'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRecord = Record<string, any>

const CATEGORY_MAP: Record<string, string> = {
  'no-parking':   'no_parking',
  'footpath':     'footpath_parking',
  'blocking':     'blocking_traffic',
  'wrong-side':   'wrong_parking',
  'double':       'double_parking',
  'disabled-bay': 'no_parking',
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await request.formData()
  const category = formData.get('category') as string | null
  const address  = formData.get('address')  as string | null
  const lat      = formData.get('lat')      as string | null
  const lng      = formData.get('lng')      as string | null
  const note     = formData.get('note')     as string | null
  const photos   = formData.getAll('photos') as File[]

  if (!category) return NextResponse.json({ error: 'Category is required' }, { status: 400 })

  const capturedAt = new Date().toISOString()

  // ── 1. Upload photos ──────────────────────────────────────────────────────
  const photoUrls: string[] = []
  const photoBuffers: Buffer[] = []

  for (const photo of photos) {
    const ext  = photo.name.split('.').pop() ?? 'jpg'
    const path = `reports/${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
    const buf  = Buffer.from(await photo.arrayBuffer())
    photoBuffers.push(buf)

    const { error: uploadError } = await (supabase as AnyRecord)
      .storage.from('evidence')
      .upload(path, buf, { contentType: photo.type, upsert: false })

    if (!uploadError) {
      const { data: urlData } = (supabase as AnyRecord)
        .storage.from('evidence').getPublicUrl(path)
      if (urlData?.publicUrl) photoUrls.push(urlData.publicUrl)
    }
  }

  // ── 2. Evidence hash (SHA-256 of all photo bytes) ─────────────────────────
  const evidenceHash = createHash('sha256')
    .update(Buffer.concat(photoBuffers.length ? photoBuffers : [Buffer.from(capturedAt)]))
    .digest('hex')

  // ── 3. Insert report (status: pending_ai while AI runs) ───────────────────
  const { data: reportRaw, error: insertError } = await (supabase as AnyRecord)
    .from('reports')
    .insert({
      reporter_id:   user.id,
      category:      CATEGORY_MAP[category] ?? category,
      address:       address || null,
      location:      lat && lng ? `POINT(${lng} ${lat})` : `POINT(0 0)`,
      description:   note || null,
      photo_urls:    photoUrls,
      captured_at:   capturedAt,
      evidence_hash: evidenceHash,
      status:        'pending_ai',
    })
    .select('id')
    .single()

  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 })
  const reportId = (reportRaw as { id: string }).id

  // ── 4. AI processing (inline — we already have buffers in memory) ─────────
  // Run async so the citizen gets a fast response; Vercel waitUntil keeps it alive
  const aiWork = async () => {
    try {
      if (photoBuffers.length === 0) {
        await (supabase as AnyRecord).from('reports')
          .update({ status: 'pending_review', ai_processed_at: new Date().toISOString() })
          .eq('id', reportId)
        return
      }

      // 4a. pHash
      const phashes = await computePHashes(photoBuffers)

      // 4b. Tampering (aggregate flags across all images)
      const combinedFlags = {
        edited_image:   false,
        no_camera_exif: false,
        screenshot:     false,
        low_quality:    false,
      }
      for (const buf of photoBuffers) {
        const flags = await checkTampering(buf)
        for (const key of Object.keys(combinedFlags) as Array<keyof typeof combinedFlags>) {
          if (flags[key]) combinedFlags[key] = true
        }
      }

      // 4c. Duplicate detection via PostGIS RPC
      const duplicateOf = await findDuplicate({
        supabase,
        plate:      null,   // No ALPR — plate detection skipped (officers check manually)
        phashes,
        lat:        parseFloat(lat ?? '0'),
        lng:        parseFloat(lng ?? '0'),
        capturedAt,
        reportId,
      })

      // 4d. Determine final status
      let newStatus: string
      if (duplicateOf) {
        newStatus = 'auto_rejected_duplicate'
      } else if (combinedFlags.low_quality) {
        newStatus = 'auto_rejected_low_quality'
      } else {
        newStatus = 'pending_review'
      }

      // 4e. Write back to Supabase
      await (supabase as AnyRecord).from('reports').update({
        status:           newStatus,
        detected_plate:   null,
        plate_confidence: null,
        perceptual_hashes: phashes,
        duplicate_of:     duplicateOf,
        ai_flags:         combinedFlags,
        ai_processed_at:  new Date().toISOString(),
      }).eq('id', reportId)

    } catch (err) {
      console.error('[ai-inline] processing failed for report', reportId, err)
      // Fall back to pending_review so the report is not lost
      await (supabase as AnyRecord).from('reports')
        .update({ status: 'pending_review', ai_processed_at: new Date().toISOString() })
        .eq('id', reportId)
    }
  }

  // Use waitUntil if available (Vercel edge runtime), otherwise fire-and-forget
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ctx = (request as any)[Symbol.for('NextRequestContext')]
  if (ctx?.waitUntil) {
    ctx.waitUntil(aiWork())
  } else {
    aiWork() // fire-and-forget (works on free tier for short tasks)
  }

  return NextResponse.json({ ok: true, report_id: reportId })
}
