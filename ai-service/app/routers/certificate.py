import logging

from fastapi import APIRouter, HTTPException, Header

from app.config import settings
from app.db.supabase_client import get_supabase
from app.models.schemas import CertificateRequest, CertificateResponse
from app.services.certificate import generate_65b_certificate, upload_certificate

router = APIRouter()
logger = logging.getLogger(__name__)


@router.post("/generate-65b-certificate", response_model=CertificateResponse)
async def generate_certificate(
    payload: CertificateRequest,
    x_service_secret: str = Header(default=""),
):
    if settings.ai_service_secret and x_service_secret != settings.ai_service_secret:
        raise HTTPException(status_code=401, detail="Unauthorized")

    report_id = payload.report_id
    logger.info("Generating 65B certificate for report %s", report_id)

    try:
        pdf_bytes = generate_65b_certificate(report_id)
        cert_url  = upload_certificate(report_id, pdf_bytes)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    except Exception as exc:
        logger.exception("Certificate generation failed for %s", report_id)
        raise HTTPException(status_code=500, detail="Certificate generation failed")

    # Update report with certificate URL
    sb = get_supabase()
    sb.table("reports").update({"section_65b_certificate_url": cert_url}).eq("id", report_id).execute()

    return CertificateResponse(report_id=report_id, certificate_url=cert_url)
