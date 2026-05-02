import type { SupabaseClient } from '@supabase/supabase-js'
import { AI_SERVICE_URL } from '@/lib/constants'
import { computePHashes } from '@/lib/ai/phash'
import { checkTampering } from '@/lib/ai/tampering'
import { findDuplicate } from '@/lib/ai/duplicate'
import type { Database } from '@/types/database'

type ReportAiInput = {
  supabase: SupabaseClient<Database>
  reportId: string
  photoBuffers: Buffer[]
  photoUrls: string[]
  lat: number
  lng: number
  capturedAt: string
}

const AI_SERVICE_SECRET = process.env.AI_SERVICE_SECRET ?? ''

async function updateReportStatus(supabase: SupabaseClient<Database>, reportId: string, payload: Record<string, unknown>) {
  await (supabase as unknown as Record<string, any>).from('reports').update(payload).eq('id', reportId)
}

async function processReportInline({
  supabase,
  reportId,
  photoBuffers,
  lat,
  lng,
  capturedAt,
}: Omit<ReportAiInput, 'photoUrls'> & { photoUrls?: string[] }) {
  const phashes = await computePHashes(photoBuffers)

  const combinedFlags = {
    edited_image: false,
    no_camera_exif: false,
    screenshot: false,
    low_quality: false,
  }

  for (const buf of photoBuffers) {
    const flags = await checkTampering(buf)
    for (const key of Object.keys(combinedFlags) as Array<keyof typeof combinedFlags>) {
      if (flags[key]) combinedFlags[key] = true
    }
  }

  const duplicateOf = await findDuplicate({
    supabase,
    plate: null,
    phashes,
    lat,
    lng,
    capturedAt,
    reportId,
  })

  const newStatus = duplicateOf
    ? 'auto_rejected_duplicate'
    : combinedFlags.low_quality
      ? 'auto_rejected_low_quality'
      : 'pending_review'

  await updateReportStatus(supabase, reportId, {
    status: newStatus,
    detected_plate: null,
    plate_confidence: null,
    perceptual_hashes: phashes,
    duplicate_of: duplicateOf,
    ai_flags: combinedFlags,
    ai_processed_at: new Date().toISOString(),
  })
}

async function tryProcessReportViaService({
  reportId,
  photoUrls,
  lat,
  lng,
  capturedAt,
}: Pick<ReportAiInput, 'reportId' | 'photoUrls' | 'lat' | 'lng' | 'capturedAt'>) {
  if (!AI_SERVICE_URL || photoUrls.length === 0) return false

  const res = await fetch(`${AI_SERVICE_URL}/process-report`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(AI_SERVICE_SECRET ? { 'x-service-secret': AI_SERVICE_SECRET } : {}),
    },
    body: JSON.stringify({
      report_id: reportId,
      photo_urls: photoUrls,
      captured_at: capturedAt,
      location: [lng, lat],
    }),
  })

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`AI service failed (${res.status}): ${body || 'no response body'}`)
  }

  return true
}

export async function processReportAi(input: ReportAiInput) {
  const { supabase, reportId, photoBuffers, photoUrls } = input

  if (photoBuffers.length === 0) {
    await updateReportStatus(supabase, reportId, {
      status: 'pending_review',
      ai_processed_at: new Date().toISOString(),
    })
    return
  }

  try {
    const processedByService = await tryProcessReportViaService(input)
    if (!processedByService) {
      await processReportInline(input)
    }
  } catch (serviceError) {
    console.error('[ai-service] falling back to inline processing for report', reportId, serviceError)
    await processReportInline(input)
  }
}
