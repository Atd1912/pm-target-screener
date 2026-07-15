from datetime import date
from typing import Optional

from fastapi import Depends, FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from . import config
from .database import Base, SessionLocal, engine, get_db
from .models import ConfidenceTier, OutreachStatus, Target
from .query_layer import UnsafeQueryError, run_query
from .schemas import (
    OutreachUpdate,
    QueryRequest,
    QueryResponse,
    StatsResponse,
    TargetBase,
    TargetWithScore,
)
from .scoring import build_metro_counts, compute_score

Base.metadata.create_all(bind=engine)

app = FastAPI(title="PM Target Screener API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


def _with_score(target: Target, metro_counts: dict) -> TargetWithScore:
    scored = compute_score(target, metro_counts)
    base = TargetBase.model_validate(target).model_dump()
    return TargetWithScore(
        **base,
        acquisition_fit_score=scored["final_score"],
        score_components=scored["components"],
    )


@app.get("/api/targets", response_model=list[TargetWithScore])
def list_targets(
    db: Session = Depends(get_db),
    metro: Optional[str] = None,
    confidence: Optional[ConfidenceTier] = None,
    outreach_status: Optional[OutreachStatus] = None,
    min_score: Optional[int] = Query(None, ge=0, le=100),
    max_score: Optional[int] = Query(None, ge=0, le=100),
    sort_by: str = Query("acquisition_fit_score", pattern="^(acquisition_fit_score|estimated_door_count|google_rating|company_name|years_in_business)$"),
    sort_dir: str = Query("desc", pattern="^(asc|desc)$"),
):
    all_targets = db.query(Target).all()
    metro_counts = build_metro_counts(all_targets)

    filtered = all_targets
    if metro:
        filtered = [t for t in filtered if t.metro == metro]
    if confidence:
        filtered = [t for t in filtered if t.door_count_confidence == confidence]
    if outreach_status:
        filtered = [t for t in filtered if t.outreach_status == outreach_status]

    scored = [_with_score(t, metro_counts) for t in filtered]

    if min_score is not None:
        scored = [t for t in scored if t.acquisition_fit_score >= min_score]
    if max_score is not None:
        scored = [t for t in scored if t.acquisition_fit_score <= max_score]

    reverse = sort_dir == "desc"
    scored.sort(key=lambda t: getattr(t, sort_by), reverse=reverse)

    return scored


@app.get("/api/targets/{target_id}", response_model=TargetWithScore)
def get_target(target_id: int, db: Session = Depends(get_db)):
    target = db.query(Target).filter(Target.id == target_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="Target not found")
    metro_counts = build_metro_counts(db.query(Target).all())
    return _with_score(target, metro_counts)


@app.patch("/api/targets/{target_id}/outreach", response_model=TargetWithScore)
def update_outreach_status(target_id: int, update: OutreachUpdate, db: Session = Depends(get_db)):
    target = db.query(Target).filter(Target.id == target_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="Target not found")
    target.outreach_status = update.outreach_status
    target.last_updated = date.today()
    db.commit()
    db.refresh(target)
    metro_counts = build_metro_counts(db.query(Target).all())
    return _with_score(target, metro_counts)


@app.get("/api/stats", response_model=StatsResponse)
def get_stats(db: Session = Depends(get_db)):
    all_targets = db.query(Target).all()
    metro_counts = build_metro_counts(all_targets)
    scores = [compute_score(t, metro_counts)["final_score"] for t in all_targets]

    by_confidence: dict[str, int] = {}
    by_outreach: dict[str, int] = {}
    for t in all_targets:
        key = t.door_count_confidence.value
        by_confidence[key] = by_confidence.get(key, 0) + 1
        ostatus = t.outreach_status.value
        by_outreach[ostatus] = by_outreach.get(ostatus, 0) + 1

    return StatsResponse(
        total_targets=len(all_targets),
        metros=sorted(metro_counts.keys()),
        by_confidence=by_confidence,
        by_outreach_status=by_outreach,
        average_score=round(sum(scores) / len(scores), 1) if scores else 0.0,
    )


@app.get("/api/config")
def get_scoring_config():
    return {
        "target_door_min": config.TARGET_DOOR_MIN,
        "target_door_max": config.TARGET_DOOR_MAX,
        "confidence_multipliers": config.CONFIDENCE_MULTIPLIERS,
    }


@app.post("/api/query", response_model=QueryResponse)
def natural_language_query(payload: QueryRequest, db: Session = Depends(get_db)):
    try:
        result = run_query(db, payload.question)
    except UnsafeQueryError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))
    return result


@app.get("/api/health")
def health():
    return {"status": "ok"}
