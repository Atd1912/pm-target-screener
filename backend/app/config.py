"""Scoring configuration. Tune these to change how acquisition_fit_score behaves
without touching scoring logic.
"""

# Size fit: the door-count range this roll-up is actively targeting.
TARGET_DOOR_MIN = 150
TARGET_DOOR_MAX = 600

# How far outside [MIN, MAX] the fit score fades to zero, as a multiple of the range width.
SIZE_FALLOFF_RATIO = 1.2

# Confidence multiplier applied to the size+growth base score. This is the mechanism
# that keeps an attractive-looking but unverified target from outscoring a smaller,
# fully-verified one.
CONFIDENCE_MULTIPLIERS = {
    "verified": 1.0,
    "estimated": 0.82,
    "unverified": 0.6,
}

# Weights for the two base-score components (must sum to 1.0).
SIZE_FIT_WEIGHT = 0.55
GROWTH_WEIGHT = 0.45

# Growth sub-weights (must sum to 1.0).
REVIEW_TREND_WEIGHT = 0.6
RATING_WEIGHT = 0.4

# Review trend normalization bounds (90-day change in review count).
REVIEW_TREND_MIN = -30
REVIEW_TREND_MAX = 30

# Google rating normalization bounds.
RATING_MIN = 3.0
RATING_MAX = 5.0

# Geographic concentration bonus: max points added for being in the most
# represented metro in the current result set.
GEO_BONUS_MAX_POINTS = 10
