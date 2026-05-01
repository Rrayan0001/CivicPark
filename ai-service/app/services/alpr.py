import re
import logging
from pathlib import Path
from typing import Optional

import numpy as np
from PIL import Image

logger = logging.getLogger(__name__)

# Indian license plate pattern: e.g. KA 01 AB 1234
_PLATE_RE = re.compile(
    r'^[A-Z]{2}\s?\d{1,2}\s?[A-Z]{1,3}\s?\d{1,4}$',
    re.IGNORECASE,
)

_yolo_model = None
_ocr_reader = None


def _load_yolo():
    global _yolo_model
    if _yolo_model is None:
        from ultralytics import YOLO
        # Using YOLOv8n as base; swap to a plate-specific checkpoint when available
        _yolo_model = YOLO("yolov8n.pt")
        logger.info("YOLOv8 model loaded")
    return _yolo_model


def _load_ocr():
    global _ocr_reader
    if _ocr_reader is None:
        import easyocr
        _ocr_reader = easyocr.Reader(["en"], gpu=False, verbose=False)
        logger.info("EasyOCR reader loaded")
    return _ocr_reader


def _normalize_plate(raw: str) -> str:
    return re.sub(r'[^A-Z0-9]', '', raw.upper())


def _validate_plate(text: str) -> bool:
    cleaned = re.sub(r'\s+', ' ', text.strip().upper())
    return bool(_PLATE_RE.match(cleaned))


def detect_plate(image: Image.Image) -> tuple[Optional[str], float, Optional[Image.Image]]:
    """
    Run YOLO detection + EasyOCR on a PIL image.
    Returns (plate_text, confidence, cropped_region).
    """
    model = _load_yolo()
    img_array = np.array(image)

    results = model.predict(img_array, conf=0.25, verbose=False)
    best_conf = 0.0
    best_crop: Optional[Image.Image] = None

    for result in results:
        for box in result.boxes:
            conf = float(box.conf[0])
            if conf > best_conf:
                x1, y1, x2, y2 = map(int, box.xyxy[0].tolist())
                # Padding
                pad = 4
                x1 = max(0, x1 - pad)
                y1 = max(0, y1 - pad)
                x2 = min(image.width, x2 + pad)
                y2 = min(image.height, y2 + pad)
                best_crop = image.crop((x1, y1, x2, y2))
                best_conf = conf

    if best_crop is None:
        return None, 0.0, None

    reader = _load_ocr()
    ocr_results = reader.readtext(np.array(best_crop), detail=1)
    if not ocr_results:
        return None, best_conf, best_crop

    # Pick the highest-confidence OCR result that matches the plate pattern
    for (_, text, ocr_conf) in sorted(ocr_results, key=lambda x: x[2], reverse=True):
        normalized = _normalize_plate(text)
        # Reformat with spaces: AA 00 AA 0000
        formatted = _reformat_plate(normalized)
        if _validate_plate(formatted):
            return formatted, round(best_conf * ocr_conf, 3), best_crop

    # Return best OCR text even if not matching regex
    best_text = sorted(ocr_results, key=lambda x: x[2], reverse=True)[0][1]
    return _normalize_plate(best_text) or None, best_conf, best_crop


def _reformat_plate(raw: str) -> str:
    """Add canonical spaces to a normalized plate string."""
    m = re.match(r'^([A-Z]{2})(\d{1,2})([A-Z]{1,3})(\d{1,4})$', raw)
    if m:
        return f"{m.group(1)} {m.group(2)} {m.group(3)} {m.group(4)}"
    return raw


def run_alpr_on_images(images: list[Image.Image]) -> tuple[Optional[str], float]:
    """
    Run ALPR across multiple images, return the best plate + confidence.
    """
    best_plate: Optional[str] = None
    best_conf = 0.0

    for img in images:
        plate, conf, _ = detect_plate(img)
        if plate and conf > best_conf:
            best_plate = plate
            best_conf = conf

    return best_plate, best_conf
