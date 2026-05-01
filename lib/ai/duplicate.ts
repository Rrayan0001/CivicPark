/**
 * Duplicate report detection via Supabase PostGIS RPC + pHash comparison.
 * Port of Python ai-service/app/services/duplicate.py
 */

import { type SupabaseClient } from '@supabase/supabase-js'
import { hammingDistance } from './phash'

const PHASH_THRESHOLD = 5   // Hamming distance ≤ 5 = near-duplicate
const RADIUS_METRES   = 50
const TIME_WINDOW_SEC = 1800 // 30 minutes

interface DuplicateParams {
  supabase:   SupabaseClient
  plate:      string | null
  phashes:    string[]
  lat:        number
  lng:        number
  capturedAt: string   // ISO 8601
  reportId:   string
}

/**
 * Returns the ID of a duplicate report if one exists, otherwise null.
 */
export async function findDuplicate({
  supabase,
  plate,
  phashes,
  lat,
  lng,
  capturedAt,
  reportId,
}: DuplicateParams): Promise<string | null> {

  // 1. PostGIS spatial + time + plate RPC
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: candidates, error } = await (supabase as any).rpc('find_potential_duplicates', {
    p_plate:     plate ?? '',
    p_lat:       lat,
    p_lng:       lng,
    p_captured:  capturedAt,
    p_report_id: reportId,
  })

  if (error || !candidates?.length) return null

  // 2. pHash comparison for each candidate
  for (const candidate of candidates as Array<{ id: string; detected_plate?: string; perceptual_hashes?: string[] }>) {
    const storedHashes: string[] = candidate.perceptual_hashes ?? []

    for (const newHash of phashes) {
      for (const oldHash of storedHashes) {
        if (hammingDistance(newHash, oldHash) <= PHASH_THRESHOLD) {
          return candidate.id
        }
      }
    }

    // Plate-only match counts too (even without stored hashes)
    if (plate && candidate.detected_plate === plate) {
      return candidate.id
    }
  }

  return null
}
