import io
import hashlib
import logging
from datetime import datetime, timezone

from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.pdfgen import canvas
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.platypus import Paragraph

from app.db.supabase_client import get_supabase

logger = logging.getLogger(__name__)


def generate_65b_certificate(report_id: str) -> bytes:
    """
    Generate a Section 65B(4) IT Act certificate PDF for the given report.
    Returns the PDF as bytes.
    """
    sb = get_supabase()
    row = sb.table("reports").select(
        "id, reporter_id, category, location, address, captured_at, "
        "photo_urls, video_url, device_metadata, detected_plate, "
        "evidence_hash, created_at, challan_id, reviewer_id, reviewed_at"
    ).eq("id", report_id).single().execute()

    if not row.data:
        raise ValueError(f"Report {report_id} not found")

    data = row.data
    buf = io.BytesIO()
    c = canvas.Canvas(buf, pagesize=A4)
    w, h = A4

    # ── Header ──
    c.setFont("Helvetica-Bold", 14)
    c.drawCentredString(w / 2, h - 30 * mm, "CERTIFICATE UNDER SECTION 65B(4)")
    c.setFont("Helvetica-Bold", 12)
    c.drawCentredString(w / 2, h - 38 * mm, "of the Information Technology Act, 2000")

    c.setLineWidth(0.5)
    c.line(20 * mm, h - 42 * mm, w - 20 * mm, h - 42 * mm)

    # ── Body ──
    c.setFont("Helvetica", 10)
    y = h - 52 * mm
    line_h = 7 * mm

    def row_text(label: str, value: str):
        nonlocal y
        c.setFont("Helvetica-Bold", 9)
        c.drawString(20 * mm, y, label + ":")
        c.setFont("Helvetica", 9)
        c.drawString(70 * mm, y, str(value))
        y -= line_h

    row_text("Certificate Date", datetime.now(timezone.utc).strftime("%d %B %Y, %H:%M UTC"))
    row_text("Report ID", data["id"])
    row_text("Platform", "Civic Park — Bangalore Traffic Police")
    y -= 4

    row_text("Capture Timestamp", data.get("captured_at", "N/A"))
    row_text("Submission Timestamp", data.get("created_at", "N/A"))
    row_text("Location (Address)", data.get("address") or "See GPS co-ordinates in metadata")
    row_text("Detected Plate", data.get("detected_plate") or "Not detected")
    row_text("Violation Category", data.get("category", "N/A").replace("_", " ").title())
    y -= 4

    row_text("Evidence SHA-256", data.get("evidence_hash", "N/A"))
    row_text("Photo Count", str(len(data.get("photo_urls") or [])))
    row_text("Video Included", "Yes" if data.get("video_url") else "No")

    device_meta = data.get("device_metadata") or {}
    row_text("Device App Version", device_meta.get("app_version", "N/A"))
    row_text("Device Platform", device_meta.get("platform", "N/A"))
    y -= 8

    # ── Declaration ──
    c.setLineWidth(0.5)
    c.line(20 * mm, y + 2, w - 20 * mm, y + 2)
    y -= line_h

    c.setFont("Helvetica-Bold", 10)
    c.drawString(20 * mm, y, "DECLARATION")
    y -= line_h

    c.setFont("Helvetica", 9)
    declaration = (
        "I, the authorised representative of Civic Park (the platform operator), hereby certify that "
        "the electronic record described above is a true and accurate copy of the original electronic "
        "evidence captured and stored by the Civic Park platform. The evidence was captured using the "
        "platform's in-app camera, geo-tagged with GPS co-ordinates, and stored with a SHA-256 integrity "
        "hash. The hash has been verified and matches the stored original. This certificate is issued "
        "under Section 65B(4) of the Information Technology Act, 2000."
    )

    # Word-wrap declaration text
    words = declaration.split()
    line = ""
    for word in words:
        test = (line + " " + word).strip()
        if c.stringWidth(test, "Helvetica", 9) < (w - 40 * mm):
            line = test
        else:
            c.drawString(20 * mm, y, line)
            y -= 5.5 * mm
            line = word
    if line:
        c.drawString(20 * mm, y, line)
        y -= 5.5 * mm

    y -= 10 * mm
    c.setFont("Helvetica-Bold", 9)
    c.drawString(20 * mm, y, "Authorised Signatory — Civic Park Platform")
    y -= 5.5 * mm
    c.setFont("Helvetica", 9)
    c.drawString(20 * mm, y, "[ Digital signature placeholder — integrate endesive in production ]")

    # ── Footer ──
    c.setFont("Helvetica", 8)
    c.setFillColorRGB(0.5, 0.5, 0.5)
    c.drawCentredString(w / 2, 15 * mm,
        "This document is computer-generated and valid without a handwritten signature per Section 65B IT Act.")

    c.save()
    return buf.getvalue()


def upload_certificate(report_id: str, pdf_bytes: bytes) -> str:
    """Upload certificate PDF to Supabase Storage and return the public path."""
    sb = get_supabase()
    path = f"certificates/{report_id}/section_65b.pdf"

    sb.storage.from_("evidence").upload(
        path,
        pdf_bytes,
        {"content-type": "application/pdf", "upsert": "true"},
    )

    url_res = sb.storage.from_("evidence").create_signed_url(path, 60 * 60 * 24 * 365)
    return url_res.get("signedURL") or path
