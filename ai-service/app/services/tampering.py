import io
import logging
from typing import Optional

import exifread
import numpy as np
from PIL import Image

logger = logging.getLogger(__name__)


def check_tampering(raw_bytes: bytes, image: Image.Image) -> dict:
    """
    Basic image tampering / authenticity checks.
    Returns a dict of flags.
    """
    flags: dict = {
        "edited_image":     False,
        "no_camera_exif":   False,
        "screenshot":       False,
        "low_quality":      False,
    }

    # 1. EXIF presence check
    try:
        tags = exifread.process_file(io.BytesIO(raw_bytes), stop_tag="UNDEF", details=False)
        has_camera_make = "Image Make" in tags or "Image Model" in tags
        has_datetime    = "EXIF DateTimeOriginal" in tags or "Image DateTime" in tags

        if not has_camera_make:
            flags["no_camera_exif"] = True
        if not has_datetime:
            flags["no_camera_exif"] = True
    except Exception:
        flags["no_camera_exif"] = True

    # 2. Screenshot detection: typical screen resolutions, no EXIF
    w, h = image.size
    common_screen_widths = {360, 390, 393, 412, 414, 430, 768, 1080, 1280, 1440, 1920, 2560}
    if w in common_screen_widths and flags["no_camera_exif"]:
        flags["screenshot"] = True

    # 3. Low quality: very small image
    if w < 640 or h < 480:
        flags["low_quality"] = True

    # 4. JPEG quantization anomaly (basic — screenshots often use default quantization)
    # Skip full DCT analysis for v1; rely on EXIF + size signals
    if flags["screenshot"] or flags["no_camera_exif"]:
        flags["edited_image"] = True

    return flags


def any_flag_set(flags: dict) -> bool:
    return any(flags.values())
