from datetime import date
from typing import Optional

from pydantic import BaseModel, ConfigDict

from .models import ConfidenceTier, LicenseStatus, OutreachStatus, OwnershipType


class TargetBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    company_name: str
    metro: str
    state: str
    estimated_door_count: int
    door_count_confidence: ConfidenceTier
    door_count_sources: list[str]
    narpm_member: bool
    state_license_status: LicenseStatus
    google_review_count: int
    google_rating: float
    review_count_90d_change: int
    employee_count_linkedin: Optional[int]
    years_in_business: int
    ownership_type: OwnershipType
    contact_name: Optional[str]
    contact_title: Optional[str]
    contact_channel: Optional[str]
    outreach_status: OutreachStatus
    last_updated: date


class TargetWithScore(TargetBase):
    acquisition_fit_score: int
    score_components: dict


class OutreachUpdate(BaseModel):
    outreach_status: OutreachStatus


class StatsResponse(BaseModel):
    total_targets: int
    metros: list[str]
    by_confidence: dict[str, int]
    by_outreach_status: dict[str, int]
    average_score: float


class QueryRequest(BaseModel):
    question: str


class QueryResponse(BaseModel):
    sql: str
    results: list[dict]
    row_count: int
