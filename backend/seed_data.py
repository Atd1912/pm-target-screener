"""Generates the synthetic PM-company dataset used by the screener.

Not a scraper. NARPM, state licensing boards, and Google/Yelp all restrict
automated collection of their data -- pulling this for real would be a data
licensing conversation, not a code change. This script produces realistic
stand-in data with the same shape a real pipeline would produce, so the rest
of the app (scoring, filtering, the query layer) can be built and demoed
against something real-looking. Swap this file for a real ingestion pipeline
later; nothing downstream needs to change.

Run with: python seed_data.py
"""

import random
from datetime import date, timedelta

from app.database import Base, SessionLocal, engine
from app.models import ConfidenceTier, LicenseStatus, OutreachStatus, OwnershipType, Target

# --- one-line edit to point this at a different set of metros -------------
METROS = ["Dallas-Fort Worth", "Austin", "Phoenix"]

# How many targets to place in each metro (must sum to TOTAL_TARGETS below).
# DFW is the largest of the three markets, so it gets the largest slice --
# this also makes the geo-concentration bonus in the scoring engine visible.
METRO_WEIGHTS = {"Dallas-Fort Worth": 24, "Austin": 18, "Phoenix": 18}

STATE_BY_METRO = {
    "Dallas-Fort Worth": "TX",
    "Austin": "TX",
    "Phoenix": "AZ",
}

TOTAL_TARGETS = 60
SEED = 42

NAME_STEMS = [
    "Lonestar", "Cedar Creek", "Bluebonnet", "Trinity", "Silver Oak", "Pecan Grove",
    "Red River", "Mesquite", "Hill Country", "Brazos", "Sabine", "Guadalupe",
    "Sonoran", "Saguaro", "Camelback", "South Mountain", "Papago", "Superstition",
    "Desert Ridge", "Ocotillo", "Copper State", "Salt River", "Chandler Point",
    "Barton Springs", "Zilker", "Colorado River", "Live Oak", "Longhorn",
    "Capitol View", "Rio Bravo", "Prickly Pear", "Verde Valley", "Canyon Gate",
    "Bell Ridge", "Frisco Crossing", "Denton Fields", "Plano Heights", "Arlington Row",
    "Grapevine Lake", "White Rock", "Turtle Creek", "Katy Trail", "Lakeway",
    "Westlake", "Round Rock", "Cypress Bend", "Piney Woods", "Comal", "Nueces",
]
SUFFIXES = [
    "Property Management", "Realty & Management", "Property Group",
    "Rental Solutions", "PM Partners", "Residential Management",
    "Home Management Co.", "Leasing & Management", "Property Partners",
    "Management Group",
]

FIRST_NAMES = [
    "Maria", "James", "Ashley", "Robert", "Linda", "Carlos", "Jennifer", "Michael",
    "Patricia", "David", "Sandra", "Kevin", "Laura", "Brian", "Monica", "Steven",
    "Rachel", "Tom", "Priya", "Derek",
]
LAST_NAMES = [
    "Alvarez", "Whitfield", "Nguyen", "Sullivan", "Ramirez", "Cook", "Patel",
    "Bennett", "Ortiz", "Harmon", "Delgado", "Franklin", "Reyes", "Marsh",
    "Castillo", "Boone", "Vasquez", "Pratt", "Salinas", "Locke",
]
TITLES = [
    "Owner/Broker", "Managing Broker", "President", "Founder & CEO",
    "Director of Operations", "Principal Broker", "General Manager",
]
CONTACT_CHANNELS = ["LinkedIn", "public email"]

SOURCE_POOL = [
    "NARPM roster",
    "LinkedIn headcount proxy",
    "Google Maps listing count",
    "State license filing",
    "Company website portfolio page",
    "Local news / press mention",
]


def _make_names(count: int) -> list[str]:
    names = set()
    while len(names) < count:
        stem = random.choice(NAME_STEMS)
        suffix = random.choice(SUFFIXES)
        names.add(f"{stem} {suffix}")
    return list(names)


def _contact():
    if random.random() < 0.12:
        # Some targets have no identified contact yet -- realistic for early-stage sourcing.
        return None, None, None
    name = f"{random.choice(FIRST_NAMES)} {random.choice(LAST_NAMES)}"
    return name, random.choice(TITLES), random.choice(CONTACT_CHANNELS)


def _recent_date(max_days_ago: int) -> date:
    return date.today() - timedelta(days=random.randint(0, max_days_ago))


def _metro_sequence() -> list[str]:
    seq = []
    for metro in METROS:
        seq.extend([metro] * METRO_WEIGHTS[metro])
    random.shuffle(seq)
    return seq


def _base_fields(name: str, metro: str) -> dict:
    contact_name, contact_title, contact_channel = _contact()
    return dict(
        company_name=name,
        metro=metro,
        state=STATE_BY_METRO[metro],
        narpm_member=random.random() < 0.45,
        state_license_status=random.choices(
            [LicenseStatus.active, LicenseStatus.pending, LicenseStatus.not_found],
            weights=[0.8, 0.1, 0.1],
        )[0],
        google_review_count=random.randint(8, 420),
        google_rating=round(random.uniform(3.4, 4.9), 1),
        review_count_90d_change=random.randint(-8, 35),
        years_in_business=random.randint(2, 34),
        ownership_type=OwnershipType.independent,
        contact_name=contact_name,
        contact_title=contact_title,
        contact_channel=contact_channel,
        outreach_status=OutreachStatus.not_started,
        last_updated=_recent_date(45),
    )


def build_verified(names: list[str], metros: list[str]) -> list[dict]:
    """~15: cross-validated across 2+ agreeing sources. High confidence, the
    numbers hang together, this is what a fully-diligenced target looks like."""
    out = []
    for name, metro in zip(names, metros):
        row = _base_fields(name, metro)
        door_count = random.randint(120, 750)
        sources = random.sample(SOURCE_POOL, k=random.choice([2, 3]))
        row.update(
            estimated_door_count=door_count,
            door_count_confidence=ConfidenceTier.verified,
            door_count_sources=sources,
            employee_count_linkedin=max(2, round(door_count / random.uniform(28, 45))),
        )
        out.append(row)
    return out


def build_estimated(names: list[str], metros: list[str]) -> list[dict]:
    """~25: a single source only. This is where the tool's confidence discount
    actually matters -- several of these will look like great targets on raw
    numbers alone, and the score has to say "not yet verified" anyway."""
    out = []
    for name, metro in zip(names, metros):
        row = _base_fields(name, metro)
        door_count = random.randint(90, 820)
        source = [random.choice(SOURCE_POOL)]
        row.update(
            estimated_door_count=door_count,
            door_count_confidence=ConfidenceTier.estimated,
            door_count_sources=source,
            employee_count_linkedin=(
                max(2, round(door_count / random.uniform(28, 45)))
                if random.random() < 0.6
                else None
            ),
        )
        out.append(row)
    return out


def build_conflicting(names: list[str], metros: list[str]) -> list[dict]:
    """~10 near-misses: two sources exist, but they imply different sizes.
    door_count_sources records what each source actually implied so a reviewer
    can see the disagreement, not just a single averaged-away number."""
    out = []
    for name, metro in zip(names, metros):
        row = _base_fields(name, metro)
        roster_estimate = random.randint(110, 500)
        skew = random.uniform(1.4, 2.3) * random.choice([-1, 1])
        linkedin_implied = max(20, round(roster_estimate + skew * 80))
        employees = max(3, round(linkedin_implied / random.uniform(28, 40)))

        row.update(
            estimated_door_count=roster_estimate,
            door_count_confidence=ConfidenceTier.unverified,
            door_count_sources=[
                f"NARPM roster (implies ~{roster_estimate} doors)",
                f"LinkedIn headcount proxy (~{employees} employees, implies ~{linkedin_implied} doors)",
            ],
            employee_count_linkedin=employees,
        )
        out.append(row)
    return out


def build_out_of_range(names: list[str], metros: list[str]) -> list[dict]:
    """~10 clear non-fits: too small to move the needle, or too large to be a
    tuck-in. These exist so filtering has something real to filter out."""
    out = []
    for name, metro in zip(names, metros):
        row = _base_fields(name, metro)
        too_small = random.random() < 0.5
        door_count = random.randint(18, 95) if too_small else random.randint(950, 2100)
        confidence = random.choices(
            [ConfidenceTier.verified, ConfidenceTier.estimated],
            weights=[0.4, 0.6],
        )[0]
        sources = (
            random.sample(SOURCE_POOL, k=2)
            if confidence == ConfidenceTier.verified
            else [random.choice(SOURCE_POOL)]
        )
        row.update(
            estimated_door_count=door_count,
            door_count_confidence=confidence,
            door_count_sources=sources,
            employee_count_linkedin=max(1, round(door_count / random.uniform(28, 45))),
        )
        out.append(row)
    return out


def _apply_red_flags(rows: list[dict]) -> None:
    """Sprinkle realistic red flags across the dataset in place: negative
    review trends and recent PE-backed ownership changes. These aren't a
    separate bucket -- they're the kind of thing that shows up inside an
    otherwise-normal-looking target and should visibly hurt its growth score
    or warrant a second look regardless of size fit."""
    negative_trend_targets = random.sample(rows, k=6)
    for row in negative_trend_targets:
        row["review_count_90d_change"] = random.randint(-22, -3)
        row["google_rating"] = round(random.uniform(2.8, 3.6), 1)

    pe_backed_targets = random.sample([r for r in rows if r not in negative_trend_targets], k=4)
    for row in pe_backed_targets:
        row["ownership_type"] = OwnershipType.pe_backed


def build_targets() -> list[dict]:
    random.seed(SEED)
    metro_seq = _metro_sequence()

    counts = [15, 25, 10, 10]
    assert sum(counts) == TOTAL_TARGETS == len(metro_seq)

    all_names = _make_names(TOTAL_TARGETS)
    idx = 0
    slices = []
    for c in counts:
        slices.append((all_names[idx : idx + c], metro_seq[idx : idx + c]))
        idx += c

    rows = []
    rows += build_verified(*slices[0])
    rows += build_estimated(*slices[1])
    rows += build_conflicting(*slices[2])
    rows += build_out_of_range(*slices[3])

    _apply_red_flags(rows)
    return rows


def seed():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        db.query(Target).delete()
        for row in build_targets():
            db.add(Target(**row))
        db.commit()
        count = db.query(Target).count()
        print(f"Seeded {count} targets across {len(METROS)} metros: {', '.join(METROS)}")
    finally:
        db.close()


if __name__ == "__main__":
    seed()
