import logging
from typing import Optional
from datetime import datetime

import imagehash
import numpy as np
from PIL import Image

from app.db.supabase_client import get_supabase

logger = logging.getLogger(__name__)

PHASH_THRESHOLD = 5   # Hamming distance ≤ 5 means near-duplicate
RADIUS_METRES   = 50
TIME_WINDOW_SEC = 1800  # 30 minutes


def compute_phashes(images: list[Image.Image]) -> list[str]:
    return [str(imagehash.phash(img)) for img in images]


def _hamming(h1: str, h2: str) -> int:
    a = imagehash.hex_to_hash(h1)
    b = imagehash.hex_to_hash(h2)
    return a - b


def find_duplicate(
    plate: Optional[str],
    phashes: list[str],
    lat: float,
    lng: float,
    captured_at: datetime,
    report_id: Optional[str] = None,
) -> Optional[str]:
    """
    Check for duplicates via PostGIS RPC.
    Returns the duplicate report_id if found, else None.
    """
    sb = get_supabase()

    try:
        res = sb.rpc("find_potential_duplicates", {
            "p_plate":     plate or "",
            "p_lat":       lat,
            "p_lng":       lng,
            "p_captured":  captured_at.isoformat(),
            "p_report_id": report_id,
        }).execute()
    except Exception:
        logger.exception("PostGIS duplicate query failed")
        return None

    candidates = res.data or []

    # Additionally check pHash similarity against candidate reports
    for candidate in candidates:
        cid = candidate["id"]

        # Fetch candidate's stored hashes
        try:
            row = sb.table("reports").select("perceptual_hashes").eq("id", cid).single().execute()
            stored_hashes: list[str] = row.data.get("perceptual_hashes") or []
        except Exception:
            stored_hashes = []

        for ph_new in phashes:
            for ph_old in stored_hashes:
                if _hamming(ph_new, ph_old) <= PHASH_THRESHOLD:
                    logger.info("Duplicate found: %s matches %s (pHash distance ≤ %d)", report_id, cid, PHASH_THRESHOLD)
                    return cid

        # Plate-only match (no stored hashes yet) still counts
        if plate and candidate.get("detected_plate") == plate:
            logger.info("Duplicate found: %s matches %s (plate match within radius/time)", report_id, cid)
            return cid

    return None
