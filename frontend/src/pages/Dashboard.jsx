import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getTargets, getStats, updateOutreachStatus } from '../api.js';
import ConfidenceBadge from '../components/ConfidenceBadge.jsx';
import OutreachSelect from '../components/OutreachSelect.jsx';
import NaturalLanguageSearch from '../components/NaturalLanguageSearch.jsx';

const OUTREACH_LABELS = {
  not_started: 'Not started',
  researched: 'Researched',
  contacted: 'Contacted',
  responded: 'Responded',
  call_booked: 'Call booked',
};

export default function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [targets, setTargets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);

  const [metro, setMetro] = useState('');
  const [confidence, setConfidence] = useState('');
  const [outreachStatus, setOutreachStatus] = useState('');
  const [minScore, setMinScore] = useState('');
  const [maxScore, setMaxScore] = useState('');
  const [sortBy, setSortBy] = useState('acquisition_fit_score');
  const [sortDir, setSortDir] = useState('desc');

  const loadTargets = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const data = await getTargets({
        metro: metro || undefined,
        confidence: confidence || undefined,
        outreach_status: outreachStatus || undefined,
        min_score: minScore || undefined,
        max_score: maxScore || undefined,
        sort_by: sortBy,
        sort_dir: sortDir,
      });
      setTargets(data);
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  }, [metro, confidence, outreachStatus, minScore, maxScore, sortBy, sortDir]);

  useEffect(() => {
    getStats().then(setStats).catch((err) => setErrorMsg(err.message));
  }, []);

  useEffect(() => {
    loadTargets();
  }, [loadTargets]);

  function handleSort(column) {
    if (sortBy === column) {
      setSortDir(sortDir === 'desc' ? 'asc' : 'desc');
    } else {
      setSortBy(column);
      setSortDir('desc');
    }
  }

  function clearFilters() {
    setMetro('');
    setConfidence('');
    setOutreachStatus('');
    setMinScore('');
    setMaxScore('');
  }

  async function handleOutreachChange(targetId, newStatus) {
    const previous = targets;
    setTargets((cur) =>
      cur.map((t) => (t.id === targetId ? { ...t, outreach_status: newStatus } : t))
    );
    try {
      await updateOutreachStatus(targetId, newStatus);
    } catch (err) {
      setTargets(previous);
      setErrorMsg(err.message);
    }
  }

  const sortArrow = (col) => (sortBy === col ? (sortDir === 'desc' ? ' ↓' : ' ↑') : '');

  return (
    <>
      <div className="summary-strip">
        <h1>
          {stats ? (
            <>
              <em>{stats.total_targets}</em> targets tracked across{' '}
              <em>{stats.metros.length}</em> metros
            </>
          ) : (
            'Loading targets…'
          )}
        </h1>
        <p className="subline">
          {stats ? `Average acquisition-fit score: ${stats.average_score}` : ''}
        </p>
      </div>

      <hr className="hairline" style={{ margin: '28px 40px', maxWidth: 1180 }} />

      {stats && (
        <div className="stat-section">
          <div className="eyebrow">By confidence tier</div>
          <div className="stat-grid">
            {['verified', 'estimated', 'unverified'].map((tier) => (
              <div className="stat-card" key={tier}>
                <div className="tier-label">
                  <span className={`tier-dot ${tier}`} />
                  {tier[0].toUpperCase() + tier.slice(1)}
                </div>
                <div className="stat-number">{stats.by_confidence[tier] || 0}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <NaturalLanguageSearch />

      <div className="filter-bar">
        <label>
          Metro
          <select value={metro} onChange={(e) => setMetro(e.target.value)}>
            <option value="">All metros</option>
            {stats?.metros.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </label>

        <label>
          Confidence
          <select value={confidence} onChange={(e) => setConfidence(e.target.value)}>
            <option value="">All tiers</option>
            <option value="verified">Verified</option>
            <option value="estimated">Estimated</option>
            <option value="unverified">Unverified</option>
          </select>
        </label>

        <label>
          Outreach status
          <select value={outreachStatus} onChange={(e) => setOutreachStatus(e.target.value)}>
            <option value="">All statuses</option>
            {Object.entries(OUTREACH_LABELS).map(([val, label]) => (
              <option key={val} value={val}>
                {label}
              </option>
            ))}
          </select>
        </label>

        <label>
          Score range
          <div className="score-range">
            <input
              type="number"
              min="0"
              max="100"
              placeholder="min"
              value={minScore}
              onChange={(e) => setMinScore(e.target.value)}
            />
            <span>–</span>
            <input
              type="number"
              min="0"
              max="100"
              placeholder="max"
              value={maxScore}
              onChange={(e) => setMaxScore(e.target.value)}
            />
          </div>
        </label>

        <button className="filter-clear" onClick={clearFilters} type="button">
          Clear filters
        </button>
      </div>

      <p className="result-count">
        {loading ? 'Loading…' : `${targets.length} target${targets.length === 1 ? '' : 's'}`}
      </p>

      {errorMsg && <p className="query-error" style={{ padding: '0 40px' }}>{errorMsg}</p>}

      <div className="table-panel">
        {loading ? (
          <div className="loading-state">Loading targets…</div>
        ) : targets.length === 0 ? (
          <div className="empty-state">No targets match these filters.</div>
        ) : (
          <table className="targets-table">
            <thead>
              <tr>
                <th className={sortBy === 'company_name' ? 'active' : ''} onClick={() => handleSort('company_name')}>
                  Company{sortArrow('company_name')}
                </th>
                <th>Confidence</th>
                <th className={sortBy === 'estimated_door_count' ? 'active' : ''} onClick={() => handleSort('estimated_door_count')}>
                  Doors{sortArrow('estimated_door_count')}
                </th>
                <th className={sortBy === 'google_rating' ? 'active' : ''} onClick={() => handleSort('google_rating')}>
                  Rating{sortArrow('google_rating')}
                </th>
                <th className={sortBy === 'years_in_business' ? 'active' : ''} onClick={() => handleSort('years_in_business')}>
                  Years{sortArrow('years_in_business')}
                </th>
                <th className={sortBy === 'acquisition_fit_score' ? 'active' : ''} onClick={() => handleSort('acquisition_fit_score')}>
                  Fit score{sortArrow('acquisition_fit_score')}
                </th>
                <th>Outreach</th>
              </tr>
            </thead>
            <tbody>
              {targets.map((t) => (
                <tr key={t.id} onClick={() => navigate(`/targets/${t.id}`)}>
                  <td className="company-cell">
                    {t.company_name}
                    <span className="metro-sub">{t.metro}, {t.state}</span>
                  </td>
                  <td>
                    <ConfidenceBadge tier={t.door_count_confidence} />
                  </td>
                  <td>{t.estimated_door_count.toLocaleString()}</td>
                  <td>{t.google_rating.toFixed(1)}</td>
                  <td>{t.years_in_business}</td>
                  <td>
                    <span className="score-pill">{t.acquisition_fit_score}</span>
                  </td>
                  <td>
                    <OutreachSelect
                      value={t.outreach_status}
                      onChange={(val) => handleOutreachChange(t.id, val)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
