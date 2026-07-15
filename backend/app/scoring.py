"""acquisition_fit_score: a 0-100 score with a fully explainable breakdown.

The score is deliberately NOT just "bigger door count = better." A target with
attractive raw numbers but an unverified door count is discounted hard by the
confidence multiplier -- that discount, not the raw size, is the point of this
tool. Every number below is surfaced to the UI so a user can see exactly why a
target scored the way it did.
"""

from . import config
from .models import Target


def _clamp(value: float, lo: float = 0.0, hi: float = 100.0) -> float:
    return max(lo, min(hi, value))


def _size_fit_score(door_count: int) -> float:
    """100 inside [MIN, MAX], linearly fading to 0 at the falloff boundary on either side."""
    lo, hi = config.TARGET_DOOR_MIN, config.TARGET_DOOR_MAX
    if lo <= door_count <= hi:
        return 100.0

    width = hi - lo
    falloff = width * config.SIZE_FALLOFF_RATIO

    if door_count < lo:
        distance = lo - door_count
    else:
        distance = door_count - hi

    return _clamp(100.0 * (1 - distance / falloff))


def _normalize(value: float, lo: float, hi: float) -> float:
    if hi == lo:
        return 0.0
    return _clamp(100.0 * (value - lo) / (hi - lo))


def _growth_score(target: Target) -> dict:
    review_trend = _normalize(
        target.review_count_90d_change, config.REVIEW_TREND_MIN, config.REVIEW_TREND_MAX
    )
    rating = _normalize(target.google_rating or 0.0, config.RATING_MIN, config.RATING_MAX)
    combined = (
        review_trend * config.REVIEW_TREND_WEIGHT + rating * config.RATING_WEIGHT
    )
    return {
        "review_trend_score": round(review_trend, 1),
        "rating_score": round(rating, 1),
        "combined": round(combined, 1),
    }


def compute_score(target: Target, metro_counts: dict[str, int]) -> dict:
    size_fit = _size_fit_score(target.estimated_door_count)
    growth = _growth_score(target)

    base_score = (
        size_fit * config.SIZE_FIT_WEIGHT + growth["combined"] * config.GROWTH_WEIGHT
    )

    confidence_key = (
        target.door_count_confidence.value
        if hasattr(target.door_count_confidence, "value")
        else target.door_count_confidence
    )
    confidence_multiplier = config.CONFIDENCE_MULTIPLIERS[confidence_key]
    score_after_confidence = base_score * confidence_multiplier

    max_metro_count = max(metro_counts.values()) if metro_counts else 1
    this_metro_count = metro_counts.get(target.metro, 1)
    geo_bonus = config.GEO_BONUS_MAX_POINTS * (this_metro_count / max_metro_count)

    final_score = round(_clamp(score_after_confidence + geo_bonus))

    return {
        "final_score": final_score,
        "components": {
            "size_fit_score": round(size_fit, 1),
            "size_fit_weight": config.SIZE_FIT_WEIGHT,
            "growth_score": growth["combined"],
            "growth_weight": config.GROWTH_WEIGHT,
            "growth_breakdown": {
                "review_trend_score": growth["review_trend_score"],
                "rating_score": growth["rating_score"],
            },
            "base_score": round(base_score, 1),
            "confidence_tier": confidence_key,
            "confidence_multiplier": confidence_multiplier,
            "score_after_confidence": round(score_after_confidence, 1),
            "geo_bonus": round(geo_bonus, 1),
            "geo_bonus_max": config.GEO_BONUS_MAX_POINTS,
            "metro_target_count": this_metro_count,
            "target_door_range": [config.TARGET_DOOR_MIN, config.TARGET_DOOR_MAX],
        },
    }


def build_metro_counts(targets: list[Target]) -> dict[str, int]:
    counts: dict[str, int] = {}
    for t in targets:
        counts[t.metro] = counts.get(t.metro, 0) + 1
    return counts
