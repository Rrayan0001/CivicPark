import logging
from datetime import timezone

import httpx
from fastapi import APIRouter, HTTPException, Header
from PIL import Image

from app.config import settings
from app.db.supabase_client import get_supabase
from app.models.schemas import ProcessReportRequest, ProcessReportResponse
from app.services.alpr import run_alpr_on_images
from app.services.duplicate import compute_phashes, find_duplicate
from app.services.tampering import check_tampering, any_flag_set

router = APIRouter()
logger = logging.getLogger(__name__)


async def _download_image(url: str) -> tuple[bytes, Image.Image]:
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.get(url)
        resp.raise_for_status()
    raw = resp.content
    img = Image.open(__import__("io").BytesIO(raw)).convert("RGB")
    return raw, img


@router.post("/process-report", response_model=ProcessReportResponse)
async def process_report(
    payload: ProcessReportRequest,
    x_service_secret: str = Header(default=""),
):
    if settings.ai_service_secret and x_service_secret != settings.ai_service_secret:
        raise HTTPException(status_code=401, detail="Unauthorized")

    sb = get_supabase()
    report_id = payload.report_id
    lng, lat = payload.location

    logger.info("Processing report %s", report_id)

    # 1. Download all photos
    try:
        downloads = [await _download_image(url) for url in payload.photo_urls]
    except Exception as exc:
        logger.error("Photo download failed for %s: %s", report_id, exc)
        raise HTTPException(status_code=502, detail="Failed to download evidence photos")

    raw_bytes_list = [d[0] for d in downloads]
    images          = [d[1] for d in downloads]

    # 2. ALPR
    detected_plate, plate_confidence = run_alpr_on_images(images)

    # 3. pHash
    phashes = compute_phashes(images)

    # 4. Tampering checks (run on all images, aggregate flags)
    combined_flags: dict = {
        "edited_image":   False,
        "no_camera_exif": False,
        "screenshot":     False,
        "low_quality":    False,
    }
    for raw, img in zip(raw_bytes_list, images):
        flags = check_tampering(raw, img)
        for k, v in flags.items():
            if v:
                combined_flags[k] = True

    # 5. Duplicate detection
    captured_at = payload.captured_at
    if captured_at.tzinfo is None:
        captured_at = captured_at.replace(tzinfo=timezone.utc)

    duplicate_of = find_duplicate(
        plate=detected_plate,
        phashes=phashes,
        lat=lat,
        lng=lng,
        captured_at=captured_at,
        report_id=report_id,
    )

    # 6. Determine final status
    if duplicate_of:
        new_status = "auto_rejected_duplicate"
    elif combined_flags.get("low_quality"):
        new_status = "auto_rejected_low_quality"
    else:
        new_status = "pending_review"

    # 7. Write back to Supabase
    update_payload: dict = {
        "status":            new_status,
        "detected_plate":    detected_plate,
        "plate_confidence":  plate_confidence if plate_confidence > 0 else None,
        "perceptual_hashes": phashes,
        "duplicate_of":      duplicate_of,
        "ai_flags":          combined_flags,
        "ai_processed_at":   captured_at.isoformat(),
    }

    try:
        sb.table("reports").update(update_payload).eq("id", report_id).execute()
    except Exception as exc:
        logger.error("Failed to update report %s: %s", report_id, exc)
        raise HTTPException(status_code=500, detail="Failed to persist AI results")

    logger.info("Report %s processed → %s (plate=%s)", report_id, new_status, detected_plate)

    return ProcessReportResponse(
        report_id=report_id,
        status=new_status,
        detected_plate=detected_plate,
        plate_confidence=plate_confidence if plate_confidence > 0 else None,
        duplicate_of=duplicate_of,
        ai_flags=combined_flags,
    )
