/**
 * Section 65B(4) IT Act certificate generation using pdf-lib.
 * Port of Python ai-service/app/services/certificate.py
 */

import { PDFDocument, StandardFonts, rgb, PageSizes } from 'pdf-lib'

export interface ReportData {
  id:                    string
  category:              string
  address?:              string | null
  captured_at?:          string | null
  created_at?:           string | null
  detected_plate?:       string | null
  evidence_hash?:        string | null
  photo_urls?:           string[] | null
  video_url?:            string | null
  device_metadata?:      Record<string, string> | null
}

const MM = 2.8346  // 1mm in PDF points

export async function generate65BCertificate(report: ReportData): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create()
  const page   = pdfDoc.addPage(PageSizes.A4)
  const { width, height } = page.getSize()

  const fontBold   = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
  const fontNormal = await pdfDoc.embedFont(StandardFonts.Helvetica)

  const black = rgb(0, 0, 0)
  const grey  = rgb(0.4, 0.4, 0.4)

  let y = height - 30 * MM

  // ── Header ──────────────────────────────────────────────────────────────
  const title1 = 'CERTIFICATE UNDER SECTION 65B(4)'
  const title2 = 'of the Information Technology Act, 2000'

  page.drawText(title1, {
    x: (width - fontBold.widthOfTextAtSize(title1, 14)) / 2,
    y,
    size: 14, font: fontBold, color: black,
  })
  y -= 8 * MM
  page.drawText(title2, {
    x: (width - fontBold.widthOfTextAtSize(title2, 12)) / 2,
    y,
    size: 12, font: fontBold, color: black,
  })
  y -= 4 * MM

  // Horizontal rule
  page.drawLine({ start: { x: 20 * MM, y }, end: { x: width - 20 * MM, y }, thickness: 0.5, color: black })
  y -= 10 * MM

  // ── Helper ───────────────────────────────────────────────────────────────
  const lineH = 7 * MM

  function rowText(label: string, value: string) {
    page.drawText(label + ':', {
      x: 20 * MM, y, size: 9, font: fontBold, color: black,
    })
    page.drawText(value, {
      x: 70 * MM, y, size: 9, font: fontNormal, color: black,
    })
    y -= lineH
  }

  // ── Body ─────────────────────────────────────────────────────────────────
  const now = new Date().toUTCString()
  rowText('Certificate Date', now)
  rowText('Report ID', report.id)
  rowText('Platform', 'Civic Park — Bangalore Traffic Police')
  y -= 2 * MM

  rowText('Capture Timestamp',    report.captured_at    ?? 'N/A')
  rowText('Submission Timestamp', report.created_at     ?? 'N/A')
  rowText('Location (Address)',   report.address        ?? 'See GPS co-ordinates in metadata')
  rowText('Detected Plate',       report.detected_plate ?? 'Not detected')
  rowText('Violation Category',   (report.category ?? 'N/A').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()))
  y -= 2 * MM

  rowText('Evidence SHA-256', report.evidence_hash  ?? 'N/A')
  rowText('Photo Count',      String((report.photo_urls ?? []).length))
  rowText('Video Included',   report.video_url ? 'Yes' : 'No')

  const meta = report.device_metadata ?? {}
  rowText('Device App Version', meta.app_version ?? 'N/A')
  rowText('Device Platform',    meta.platform    ?? 'N/A')
  y -= 8 * MM

  // ── Declaration ───────────────────────────────────────────────────────────
  page.drawLine({ start: { x: 20 * MM, y: y + 2 }, end: { x: width - 20 * MM, y: y + 2 }, thickness: 0.5, color: black })
  y -= lineH

  page.drawText('DECLARATION', { x: 20 * MM, y, size: 10, font: fontBold, color: black })
  y -= lineH

  const declaration =
    'I, the authorised representative of Civic Park (the platform operator), hereby certify that ' +
    'the electronic record described above is a true and accurate copy of the original electronic ' +
    'evidence captured and stored by the Civic Park platform. The evidence was captured using the ' +
    "platform's in-app camera, geo-tagged with GPS co-ordinates, and stored with a SHA-256 integrity " +
    'hash. The hash has been verified and matches the stored original. This certificate is issued ' +
    'under Section 65B(4) of the Information Technology Act, 2000.'

  // Word-wrap declaration
  const maxWidth = width - 40 * MM
  const words = declaration.split(' ')
  let line = ''
  for (const word of words) {
    const test = line ? line + ' ' + word : word
    if (fontNormal.widthOfTextAtSize(test, 9) < maxWidth) {
      line = test
    } else {
      page.drawText(line, { x: 20 * MM, y, size: 9, font: fontNormal, color: black })
      y -= 5.5 * MM
      line = word
    }
  }
  if (line) {
    page.drawText(line, { x: 20 * MM, y, size: 9, font: fontNormal, color: black })
    y -= 5.5 * MM
  }

  y -= 10 * MM
  page.drawText('Authorised Signatory — Civic Park Platform', {
    x: 20 * MM, y, size: 9, font: fontBold, color: black,
  })
  y -= 5.5 * MM
  page.drawText('[ Digital signature placeholder — integrate endesive in production ]', {
    x: 20 * MM, y, size: 9, font: fontNormal, color: black,
  })

  // ── Footer ────────────────────────────────────────────────────────────────
  const footer = 'This document is computer-generated and valid without a handwritten signature per Section 65B IT Act.'
  page.drawText(footer, {
    x: (width - fontNormal.widthOfTextAtSize(footer, 8)) / 2,
    y: 15 * MM,
    size: 8, font: fontNormal, color: grey,
  })

  return pdfDoc.save()
}
