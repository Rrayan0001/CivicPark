from pydantic import BaseModel, field_validator
from typing import Optional
from datetime import datetime


class ProcessReportRequest(BaseModel):
    report_id: str
    photo_urls: list[str]
    captured_at: datetime
    location: tuple[float, float]  # [lng, lat]

    @field_validator("photo_urls")
    @classmethod
    def at_least_one_photo(cls, v: list[str]) -> list[str]:
        if not v:
            raise ValueError("At least one photo URL is required")
        return v


class ProcessReportResponse(BaseModel):
    report_id: str
    status: str
    detected_plate: Optional[str] = None
    plate_confidence: Optional[float] = None
    duplicate_of: Optional[str] = None
    ai_flags: dict = {}


class CertificateRequest(BaseModel):
    report_id: str


class CertificateResponse(BaseModel):
    report_id: str
    certificate_url: str


class HealthResponse(BaseModel):
    status: str
    version: str = "0.1.0"
    environment: str
