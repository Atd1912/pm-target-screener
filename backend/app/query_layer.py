"""Natural-language -> SQL query layer.

Claude only ever proposes a query; this module decides whether it's safe to
run. Nothing the model returns touches the database until it passes every
check in `_validate_select`.
"""

import os
import re

from anthropic import Anthropic
from sqlalchemy import text
from sqlalchemy.orm import Session

MODEL = "claude-sonnet-5"
ALLOWED_TABLE = "targets"
DEFAULT_LIMIT = 200

SCHEMA_DESCRIPTION = """
Table: targets
Columns:
  id                        INTEGER
  company_name              TEXT
  metro                     TEXT              -- e.g. 'Dallas-Fort Worth', 'Austin', 'Phoenix'
  state                     TEXT              -- e.g. 'TX', 'AZ'
  estimated_door_count      INTEGER           -- size proxy, number of managed units
  door_count_confidence     TEXT              -- one of: 'verified', 'estimated', 'unverified'
  door_count_sources        JSON (list[str])  -- which sources back the door count
  narpm_member               BOOLEAN
  state_license_status      TEXT              -- one of: 'active', 'pending', 'not_found'
  google_review_count       INTEGER
  google_rating             FLOAT
  review_count_90d_change   INTEGER           -- signed, review growth/decline over 90 days
  employee_count_linkedin   INTEGER (nullable)
  years_in_business         INTEGER
  ownership_type            TEXT              -- one of: 'independent', 'franchise', 'pe_backed'
  contact_name              TEXT (nullable)
  contact_title             TEXT (nullable)
  contact_channel           TEXT (nullable)
  outreach_status           TEXT              -- one of: 'not_started', 'researched', 'contacted', 'responded', 'call_booked'
  last_updated              DATE
""".strip()

SYSTEM_PROMPT = f"""You translate a natural-language question about acquisition targets into a
single read-only SQLite SQL query.

{SCHEMA_DESCRIPTION}

Rules:
- Output ONLY the SQL query. No markdown code fences, no explanation, no trailing semicolon commentary.
- The query MUST be a single SELECT statement against the `targets` table only.
- Never use INSERT, UPDATE, DELETE, DROP, ALTER, ATTACH, PRAGMA, or any other non-SELECT statement.
- Never reference any table other than `targets`.
- If the question implies a row limit, include it; otherwise omit LIMIT and one will be added automatically.
"""

_FORBIDDEN_KEYWORDS = re.compile(
    r"\b(INSERT|UPDATE|DELETE|DROP|ALTER|ATTACH|DETACH|PRAGMA|CREATE|REPLACE|TRUNCATE|VACUUM|GRANT|REVOKE)\b",
    re.IGNORECASE,
)
_SELECT_PREFIX = re.compile(r"^\s*SELECT\b", re.IGNORECASE)
_LIMIT_SUFFIX = re.compile(r"\bLIMIT\s+\d+\s*;?\s*$", re.IGNORECASE)


class UnsafeQueryError(ValueError):
    pass


def _strip_markdown_fence(sql: str) -> str:
    sql = sql.strip()
    if sql.startswith("```"):
        sql = re.sub(r"^```(sql)?\s*", "", sql, flags=re.IGNORECASE)
        sql = re.sub(r"\s*```$", "", sql)
    return sql.strip()


def _validate_select(sql: str) -> str:
    sql = _strip_markdown_fence(sql)

    # Reject multiple statements outright (strip one optional trailing semicolon first).
    body = sql[:-1] if sql.rstrip().endswith(";") else sql
    if ";" in body:
        raise UnsafeQueryError("Multiple statements are not allowed.")

    if not _SELECT_PREFIX.match(body):
        raise UnsafeQueryError("Only SELECT statements are allowed.")

    if _FORBIDDEN_KEYWORDS.search(body):
        raise UnsafeQueryError("Query contains a forbidden keyword.")

    if not re.search(rf"\bFROM\s+{ALLOWED_TABLE}\b", body, re.IGNORECASE):
        raise UnsafeQueryError(f"Query must select from the `{ALLOWED_TABLE}` table.")

    # Reject any other table name showing up after FROM/JOIN.
    for match in re.finditer(r"\b(?:FROM|JOIN)\s+([a-zA-Z_][a-zA-Z0-9_]*)", body, re.IGNORECASE):
        if match.group(1).lower() != ALLOWED_TABLE:
            raise UnsafeQueryError(f"Query references a disallowed table: {match.group(1)}")

    if not _LIMIT_SUFFIX.search(body):
        body = body.rstrip().rstrip(";") + f" LIMIT {DEFAULT_LIMIT}"

    return body.strip()


def generate_sql(question: str) -> str:
    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key:
        raise RuntimeError("ANTHROPIC_API_KEY is not set.")

    client = Anthropic(api_key=api_key)
    response = client.messages.create(
        model=MODEL,
        max_tokens=500,
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": question}],
    )
    raw_sql = "".join(
        block.text for block in response.content if getattr(block, "type", None) == "text"
    )
    return _validate_select(raw_sql)


def run_query(db: Session, question: str) -> dict:
    sql = generate_sql(question)
    result = db.execute(text(sql))
    rows = [dict(row._mapping) for row in result.fetchall()]
    return {"sql": sql, "results": rows, "row_count": len(rows)}
