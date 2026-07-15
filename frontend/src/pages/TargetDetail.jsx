import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getTarget, updateOutreachStatus } from '../api.js';
import ConfidenceBadge from '../components/ConfidenceBadge.jsx';
import OutreachSelect from '../components/OutreachSelect.jsx';

const OWNERSHIP_LABELS = {
  independent: 'Independent',
  franchise: 'Franchise',
  pe_backed: 'PE-backed',
};

const LICENSE_LABELS = {
  active: 'Active',
  pending: 'Pending',
  not_found: 'Not found',
};

function buildRiskFlags(t) {
  const flags = [];
  if (t.door_count_confidence === 'unverified') {
    flags.push('Door count is unverified — sources disagree on true size.');
  }
  if (t.review_count_90d_change < 0) {
    flags.push(`Review volume declining: ${t.review_count_90d_change} reviews over 90 days.`);
  }
  if (t.google_rating < 3.7) {
    flags.push(`Below-average rating: ${t.google_rating.toFixed(1)} stars.`);
  }
  if (t.ownership_type === 'pe_backed') {
    flags.push('Already PE-backed — likely a competing bidder, not an open target.');
  }
  if (t.state_license_status !== 'active') {
    flags.push(`State license is ${LICENSE_LABELS[t.state_license_status].toLowerCase()}.`);
  }
  if (t.estimated_door_count < 150 || t.estimated_door_count > 600) {
    flags.push('Door count falls outside the target acquisition range.');
  }
  return flags;
}

export default function TargetDetail() {
  const { id } = useParams();
  const [target, setTarget] = useState(null);
  const [error, setError] = useState(null);
  const [savingStatus, setSavingStatus] = useState(false);

  useEffect(() => {
    getTarget(id)
      .then(setTarget)
      .catch((err) => setError(err.message));
  }, [id]);

  async function handleOutreachChange(newStatus) {
    setSavingStatus(true);
    try {
      const updated = await updateOutreachStatus(id, newStatus);
      setTarget(updated);
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingStatus(false);
    }
  }

  if (error) return <div className="error-state">{error}</div>;
  if (!target) return <div className="loading-state">Loading target…</div>;

  const { score_components: sc } = target;
  const isVerified = target.door_count_confidence === 'verified';
  const riskFlags = buildRiskFlags(target);

  return (
    <>
      <div className="detail-hero">
        <Link to="/" className="back-link">
          ← Back to all targets
        </Link>
        <div className="metro-tag">
          {target.metro}, {target.state} · {OWNERSHIP_LABELS[target.ownership_type]}
        </div>
        <h1>{target.company_name}</h1>

        <div className="detail-score-row">
          <span className={`detail-score ${isVerified ? 'verified-score' : ''}`}>
            {target.acquisition_fit_score}
          </span>
          <span className="detail-score-label">Acquisition-fit score / 100</span>
          <ConfidenceBadge tier={target.door_count_confidence} />
        </div>

        <div className="detail-meta-row">
          <span>
            <strong>{target.estimated_door_count.toLocaleString()}</strong> estimated doors
          </span>
          <span>
            <strong>{target.years_in_business}</strong> years in business
          </span>
          <span>
            License: <strong>{LICENSE_LABELS[target.state_license_status]}</strong>
          </span>
          <span>
            NARPM member: <strong>{target.narpm_member ? 'Yes' : 'No'}</strong>
          </span>
          <span>
            Last updated: <strong>{target.last_updated}</strong>
          </span>
        </div>

        <div className="outreach-control">
          <span className="muted" style={{ fontSize: '0.85rem' }}>
            Outreach status
          </span>
          <OutreachSelect
            value={target.outreach_status}
            onChange={handleOutreachChange}
            disabled={savingStatus}
          />
        </div>
      </div>

      <div className="detail-body">
        <div className="detail-section">
          <div className="eyebrow">Size signals</div>
          <div className="detail-row">
            <span className="label">Estimated door count</span>
            <span className="value">{target.estimated_door_count.toLocaleString()}</span>
          </div>
          <div className="detail-row">
            <span className="label">Confidence tier</span>
            <span className="value">
              <ConfidenceBadge tier={target.door_count_confidence} />
            </span>
          </div>
          <div className="detail-row">
            <span className="label">LinkedIn employee count</span>
            <span className="value">{target.employee_count_linkedin ?? '—'}</span>
          </div>
          <div className="detail-row">
            <span className="label">Target door range</span>
            <span className="value">
              {sc.target_door_range[0]}–{sc.target_door_range[1]}
            </span>
          </div>
        </div>

        <div className="detail-section">
          <div className="eyebrow">Validation sources</div>
          {target.door_count_sources.length > 0 ? (
            <ul className="source-list">
              {target.door_count_sources.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ul>
          ) : (
            <p className="no-flags">No sources on file.</p>
          )}
        </div>

        <div className="detail-section">
          <div className="eyebrow">Growth trend</div>
          <div className="detail-row">
            <span className="label">Google review count</span>
            <span className="value">{target.google_review_count}</span>
          </div>
          <div className="detail-row">
            <span className="label">Google rating</span>
            <span className="value">{target.google_rating.toFixed(1)}</span>
          </div>
          <div className="detail-row">
            <span className="label">90-day review change</span>
            <span className="value">
              {target.review_count_90d_change > 0 ? '+' : ''}
              {target.review_count_90d_change}
            </span>
          </div>
        </div>

        <div className="detail-section">
          <div className="eyebrow">Risk flags</div>
          {riskFlags.length > 0 ? (
            riskFlags.map((flag, i) => (
              <div className="risk-flag" key={i}>
                {flag}
              </div>
            ))
          ) : (
            <p className="no-flags">No red flags identified.</p>
          )}
        </div>

        <div className="detail-section full-width">
          <div className="eyebrow">Score breakdown</div>
          <ul className="score-breakdown-list">
            <li>
              <span className="bd-label">
                Size fit score ({Math.round(sc.size_fit_weight * 100)}% weight)
              </span>
              <span className="bd-value">{sc.size_fit_score}</span>
            </li>
            <li>
              <span className="bd-label">
                Growth score ({Math.round(sc.growth_weight * 100)}% weight)
              </span>
              <span className="bd-value">{sc.growth_score}</span>
            </li>
            <li>
              <span className="bd-label">— review trend component</span>
              <span className="bd-value">{sc.growth_breakdown.review_trend_score}</span>
            </li>
            <li>
              <span className="bd-label">— rating component</span>
              <span className="bd-value">{sc.growth_breakdown.rating_score}</span>
            </li>
            <li>
              <span className="bd-label">Weighted base score</span>
              <span className="bd-value">{sc.base_score}</span>
            </li>
            <li className={sc.confidence_multiplier < 1 ? 'highlight' : ''}>
              <span className="bd-label">
                Confidence multiplier ({sc.confidence_tier}, ×{sc.confidence_multiplier})
              </span>
              <span className="bd-value">{sc.score_after_confidence}</span>
            </li>
            <li>
              <span className="bd-label">
                Geographic concentration bonus ({sc.metro_target_count} targets in {target.metro})
              </span>
              <span className="bd-value">+{sc.geo_bonus}</span>
            </li>
            <li className="highlight">
              <span className="bd-label">Final acquisition-fit score</span>
              <span className="bd-value">{target.acquisition_fit_score}</span>
            </li>
          </ul>
        </div>

        <div className="detail-section full-width">
          <div className="eyebrow">Contact</div>
          <div className="detail-row">
            <span className="label">Name</span>
            <span className="value">{target.contact_name ?? 'Not yet identified'}</span>
          </div>
          <div className="detail-row">
            <span className="label">Title</span>
            <span className="value">{target.contact_title ?? '—'}</span>
          </div>
          <div className="detail-row">
            <span className="label">Channel</span>
            <span className="value">{target.contact_channel ?? '—'}</span>
          </div>
        </div>
      </div>
    </>
  );
}
