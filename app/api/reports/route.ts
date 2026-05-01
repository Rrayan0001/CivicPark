import { createHash } from 'crypto'
import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

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

  // Upload photos and collect their raw bytes for hashing
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

  // evidence_hash: SHA-256 of all photo bytes concatenated (satisfies NOT NULL)
  const evidenceHash = createHash('sha256')
    .update(Buffer.concat(photoBuffers.length ? photoBuffers : [Buffer.from(capturedAt)]))
    .digest('hex')

  const { data: reportRaw, error } = await (supabase as AnyRecord)
    .from('reports')
    .insert({
      reporter_id:    user.id,
      category:       CATEGORY_MAP[category] ?? category,
      address:        address || null,
      location:       lat && lng ? `POINT(${lng} ${lat})` : `POINT(0 0)`,
      description:    note || null,
      photo_urls:     photoUrls,
      captured_at:    capturedAt,
      evidence_hash:  evidenceHash,
      status:         'pending_ai',
    })
    .select('id')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const reportId = (reportRaw as { id: string }).id

  // Fire-and-forget: kick the AI service so the citizen doesn't wait
  const aiUrl    = process.env.AI_SERVICE_URL
  const aiSecret = process.env.AI_SERVICE_SECRET
  if (aiUrl && photoUrls.length > 0) {
    fetch(`${aiUrl}/process-report`, {
      method: 'POST',
      headers: {
        'Content-Type':    'application/json',
        'x-service-secret': aiSecret ?? '',
      },
      body: JSON.stringify({
        report_id:   reportId,
        photo_urls:  photoUrls,
        captured_at: capturedAt,
        location:    [parseFloat(lng ?? '0'), parseFloat(lat ?? '0')],
      }),
    }).catch(err => console.error('[ai-service] call failed:', err))
  }

  return NextResponse.json({ ok: true, report_id: reportId })
}
