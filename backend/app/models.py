import enum
from datetime import date
from typing import Optional

from sqlalchemy import JSON, Boolean, Date, Enum, Float, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from .database import Base


class ConfidenceTier(str, enum.Enum):
    verified = "verified"
    estimated = "estimated"
    unverified = "unverified"


class LicenseStatus(str, enum.Enum):
    active = "active"
    pending = "pending"
    not_found = "not_found"


class OwnershipType(str, enum.Enum):
    independent = "independent"
    franchise = "franchise"
    pe_backed = "pe_backed"


class OutreachStatus(str, enum.Enum):
    not_started = "not_started"
    researched = "researched"
    contacted = "contacted"
    responded = "responded"
    call_booked = "call_booked"


class Target(Base):
    __tablename__ = "targets"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    company_name: Mapped[str] = mapped_column(String, nullable=False)
    metro: Mapped[str] = mapped_column(String, nullable=False, index=True)
    state: Mapped[str] = mapped_column(String, nullable=False)

    estimated_door_count: Mapped[int] = mapped_column(Integer, nullable=False)
    door_count_confidence: Mapped[ConfidenceTier] = mapped_column(
        Enum(ConfidenceTier), nullable=False, index=True
    )
    door_count_sources: Mapped[list] = mapped_column(JSON, nullable=False, default=list)

    narpm_member: Mapped[bool] = mapped_column(Boolean, default=False)
    state_license_status: Mapped[LicenseStatus] = mapped_column(
        Enum(LicenseStatus), nullable=False
    )

    google_review_count: Mapped[int] = mapped_column(Integer, default=0)
    google_rating: Mapped[float] = mapped_column(Float, default=0.0)
    review_count_90d_change: Mapped[int] = mapped_column(Integer, default=0)

    employee_count_linkedin: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    years_in_business: Mapped[int] = mapped_column(Integer, default=0)
    ownership_type: Mapped[OwnershipType] = mapped_column(Enum(OwnershipType), nullable=False)

    contact_name: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    contact_title: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    contact_channel: Mapped[Optional[str]] = mapped_column(String, nullable=True)

    outreach_status: Mapped[OutreachStatus] = mapped_column(
        Enum(OutreachStatus), default=OutreachStatus.not_started
    )

    last_updated: Mapped[date] = mapped_column(Date, default=date.today)
