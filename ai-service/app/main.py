import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.models.schemas import HealthResponse
from app.routers import process, certificate

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)

app = FastAPI(
    title="Civic Park AI Service",
    version="0.1.0",
    description="ALPR, duplicate detection, and Section 65B certificate generation for Civic Park.",
    docs_url="/docs" if settings.environment == "development" else None,
    redoc_url=None,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(process.router)
app.include_router(certificate.router)


@app.get("/healthz", response_model=HealthResponse)
async def healthz():
    return HealthResponse(status="ok", environment=settings.environment)
