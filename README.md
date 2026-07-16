# Sandstone | PM Target Screener

An internal sourcing tool for identifying, scoring, and validating property
management companies as acquisition targets. Built as a portfolio artifact —
the synthetic dataset stands in for a real diligence pipeline, but the
scoring, filtering, and query logic are built the way they'd work in
production.

## Stack

- **Backend**: FastAPI + SQLAlchemy + SQLite (swap to Postgres with one env var)
- **NL query layer**: Anthropic API (`claude-sonnet-5`), text-to-SQL with a SELECT-only safety layer
- **Frontend**: React + Vite

## Setup

### Backend

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env          # fill in ANTHROPIC_API_KEY to enable /api/query
python seed_data.py           # generates pm_targets.db with 60 synthetic targets
uvicorn app.main:app --reload --port 8000
```

API docs at `http://localhost:8000/docs`.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Opens at `http://localhost:5173` (Vite dev server proxies `/api` to
`http://localhost:8000` — see `vite.config.js`). Adjust the proxy target,
or set `VITE_API_BASE` for a deployed backend.

## How the confidence-tier logic works

Every target's door count carries a `door_count_confidence` tier:
`verified` (2+ agreeing sources), `estimated` (a single source), or
`unverified` (sources exist but disagree on size). This tier isn't just a
label — it's a multiplier baked directly into `acquisition_fit_score`
(see `backend/app/scoring.py`):

1. **Size fit** (0–100): how well the door count sits inside the target
   acquisition range (default 150–600 doors, configurable in `app/config.py`).
2. **Growth signal** (0–100): a blend of 90-day review-count trend and Google
   rating.
3. Steps 1 and 2 combine into a **weighted base score**.
4. The base score is then multiplied by the **confidence multiplier**
   (verified ×1.0, estimated ×0.82, unverified ×0.6) — this is the mechanism
   that keeps an attractive-looking but unverified target from outscoring a
   smaller, fully-verified one.
5. A small **geographic concentration bonus** (up to +10) is added based on
   how many other tracked targets share the same metro, since that reduces
   integration cost for a roll-up.

The breakdown (not just the final number) is returned by the API on every
target and rendered in full on the target detail page, under "Score
breakdown" — click into any score to see exactly why it landed where it did.

## Synthetic dataset

`backend/seed_data.py` generates 60 companies across 3 metros (Dallas-Fort
Worth, Austin, Phoenix — edit the `METROS` list at the top of the file to
change this). The distribution is intentional, not random:

- ~15 cross-validated across 2+ sources (verified)
- ~25 single-source estimates (estimated) — this is where the confidence
  discount actually matters
- ~10 with conflicting signals between sources (unverified "near-misses")
- ~10 clearly too small or too large to be a fit
- A handful sprinkled with negative review trends or PE-backed ownership as
  realistic red flags

This is **not a scraper**. NARPM, state licensing boards, and Google/Yelp all
restrict automated collection — pulling this data for real is a licensing
conversation, not a code change. `seed_data.py` is structured so a real
ingestion pipeline could replace it later without touching the rest of the
app (the `Target` model, scoring engine, and API are all pipeline-agnostic).

## Swapping SQLite for Postgres

Set the `DATABASE_URL` environment variable (`backend/.env` locally, or the
platform's env var settings when deployed):

```
DATABASE_URL=postgresql://user:password@host:5432/pm_target_screener
```

`backend/app/database.py` reads this directly — no code changes needed.
Re-run `python seed_data.py` once pointed at the new database to seed it.

## Deployment

- **Backend → Render/Railway**: `render.yaml` (repo root, with `rootDir: backend`
  so Render's Blueprint auto-detection finds it) is ready to import on Render
  (installs deps, seeds the DB, starts `uvicorn` on `$PORT`). Set
  `ANTHROPIC_API_KEY` in the Render dashboard.
- **Frontend → Netlify/Vercel**: `frontend/netlify.toml` and
  `frontend/vercel.json` are both present. Set `VITE_API_BASE` to your
  deployed backend's URL as a build-time env var.

## Out of scope

No live scraping, no auth/login. See the top of `seed_data.py` for why the
data pipeline stops at synthetic generation.
