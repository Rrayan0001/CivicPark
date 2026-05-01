/**
 * Image tampering / authenticity checks.
 * Port of Python ai-service/app/services/tampering.py using exifr.
 */

import ExifReader from 'exifr'

export interface TamperingFlags {
  edited_image:   boolean
  no_camera_exif: boolean
  screenshot:     boolean
  low_quality:    boolean
}

const COMMON_SCREEN_WIDTHS = new Set([
  360, 390, 393, 412, 414, 430, 768, 1080, 1280, 1440, 1920, 2560,
])

export async function checkTampering(imageBuffer: Buffer): Promise<TamperingFlags> {
  const flags: TamperingFlags = {
    edited_image:   false,
    no_camera_exif: false,
    screenshot:     false,
    low_quality:    false,
  }

  // 1. EXIF check
  try {
    const exif = await ExifReader.parse(imageBuffer, { tiff: true, exif: true })
    const hasCameraMake = !!(exif?.Make || exif?.Model)
    const hasDatetime   = !!(exif?.DateTimeOriginal || exif?.DateTime)
    if (!hasCameraMake || !hasDatetime) flags.no_camera_exif = true
  } catch {
    flags.no_camera_exif = true
  }

  // 2. Dimensions via sharp (imported lazily to keep bundle lean)
  try {
    const sharp = (await import('sharp')).default
    const meta  = await sharp(imageBuffer).metadata()
    const w = meta.width  ?? 0
    const h = meta.height ?? 0

    // Screenshot detection: known screen width + no EXIF
    if (COMMON_SCREEN_WIDTHS.has(w) && flags.no_camera_exif) {
      flags.screenshot = true
    }

    // Low quality: very small image
    if (w < 640 || h < 480) {
      flags.low_quality = true
    }
  } catch {
    flags.low_quality = true
  }

  // 3. Aggregate
  if (flags.screenshot || flags.no_camera_exif) {
    flags.edited_image = true
  }

  return flags
}

export function anyFlagSet(flags: TamperingFlags): boolean {
  return Object.values(flags).some(Boolean)
}
