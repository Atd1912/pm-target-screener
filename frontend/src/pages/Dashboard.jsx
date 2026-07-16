import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getTargets, getStats, getScoringConfig, updateOutreachStatus } from '../api.js';
import ConfidenceBadge from '../components/ConfidenceBadge.jsx';
import OutreachSelect from '../components/OutreachSelect.jsx';
import NaturalLanguageSearch from '../components/NaturalLanguageSearch.jsx';
import CountUp from '../components/CountUp.jsx';
import TargetScatterChart from '../components/TargetScatterChart.jsx';
import DualRangeSlider from '../components/DualRangeSlider.jsx';

const DOOR_SLIDER_BOUNDS = { min: 0, max: 2200, step: 10 };
const DEBOUNCE_MS = 250;

const OUTREACH_LABELS = {
  not_started: 'Not started',
  researched: 'Researched',
  contacted: 'Contacted',
  responded: 'Responded',
  call_booked: 'Call booked',
};

// Score pills read as flat gold at any value today; scale the wash intensity
// and weight with the score so a 95 visibly outweighs a 45 at a glance.
function scorePillStyle(score) {
  const alpha = 0.08 + Math.min(1, Math.max(0, score / 100)) * 0.34;
  return {
    background: `rgba(166, 129, 63, ${alpha.toFixed(2)})`,
    color: score >= 60 ? 'var(--ink)' : 'var(--ink-muted)',
    fontWeight: score >= 85 ? 700 : 600,
  };
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [targets, setTargets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [initialLoad, setInitialLoad] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);

  const [metro, setMetro] = useState('');
  const [confidence, setConfidence] = useState('');
  const [outreachStatus, setOutreachStatus] = useState('');
  const [minScore, setMinScore] = useState('');
  const [maxScore, setMaxScore] = useState('');
  const [sortBy, setSortBy] = useState('acquisition_fit_score');
  const [sortDir, setSortDir] = useState('desc');
  const [view, setView] = useState('table');

  const [defaultDoorRange, setDefaultDoorRange] = useState([150, 600]);
  const [doorRange, setDoorRange] = useState([150, 600]);
  const [debouncedDoorRange, setDebouncedDoorRange] = useState([150, 600]);

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
        door_min: debouncedDoorRange[0],
        door_max: debouncedDoorRange[1],
        sort_by: sortBy,
        sort_dir: sortDir,
      });
      setTargets(data);
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
      setInitialLoad(false);
    }
  }, [metro, confidence, outreachStatus, minScore, maxScore, debouncedDoorRange, sortBy, sortDir]);

  useEffect(() => {
    getStats().then(setStats).catch((err) => setErrorMsg(err.message));
    getScoringConfig()
      .then((cfg) => {
        const range = [cfg.target_door_min, cfg.target_door_max];
        setDefaultDoorRange(range);
        setDoorRange(range);
        setDebouncedDoorRange(range);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedDoorRange(doorRange), DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [doorRange]);

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
      {stats && (
        <div className="stat-section">
          <div className="eyebrow">
            By confidence tier
            {confidence && (
              <button className="eyebrow-clear" onClick={() => setConfidence('')} type="button">
                clear
              </button>
            )}
          </div>
          <div className="stat-grid">
            {['verified', 'estimated', 'unverified'].map((tier) => (
              <button
                className={`stat-card stat-card-button ${tier} ${confidence === tier ? 'active' : ''}`}
                key={tier}
                type="button"
                aria-pressed={confidence === tier}
                onClick={() => setConfidence(confidence === tier ? '' : tier)}
              >
                <div className="tier-label">
                  <span className={`tier-dot ${tier}`} />
                  {tier[0].toUpperCase() + tier.slice(1)}
                </div>
                <div className="stat-number">
                  <CountUp value={stats.by_confidence[tier] || 0} />
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="whatif-section">
        <div className="eyebrow">What-if: target door range</div>
        <div className="whatif-panel">
          <p className="whatif-desc">
            Every acquisition-fit score is computed against this range. Drag either
            handle to see the whole pipeline re-rank in real time.
          </p>
          <div className="whatif-control">
            <DualRangeSlider
              min={DOOR_SLIDER_BOUNDS.min}
              max={DOOR_SLIDER_BOUNDS.max}
              step={DOOR_SLIDER_BOUNDS.step}
              valueMin={doorRange[0]}
              valueMax={doorRange[1]}
              onChange={(lo, hi) => setDoorRange([lo, hi])}
            />
            <div className="whatif-values">
              <span className="whatif-range-text">
                {doorRange[0].toLocaleString()} – {doorRange[1].toLocaleString()} doors
              </span>
              {(doorRange[0] !== defaultDoorRange[0] || doorRange[1] !== defaultDoorRange[1]) && (
                <button
                  type="button"
                  className="whatif-reset"
                  onClick={() => setDoorRange(defaultDoorRange)}
                >
                  Reset to default ({defaultDoorRange[0]}–{defaultDoorRange[1]})
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

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

      <div className="result-row">
        <p className="result-count">
          {initialLoad && loading ? (
            'Loading…'
          ) : (
            <>
              <CountUp value={targets.length} /> target{targets.length === 1 ? '' : 's'}
            </>
          )}
        </p>
        <div className="view-toggle" role="group" aria-label="Result view">
          <button
            type="button"
            className={view === 'table' ? 'active' : ''}
            onClick={() => setView('table')}
          >
            Table
          </button>
          <button
            type="button"
            className={view === 'chart' ? 'active' : ''}
            onClick={() => setView('chart')}
          >
            Chart
          </button>
        </div>
      </div>

      {errorMsg && <p className="query-error" style={{ padding: '0 40px' }}>{errorMsg}</p>}

      <div className="table-panel">
        {initialLoad && loading ? (
          <div className="loading-state">Loading targets…</div>
        ) : targets.length === 0 ? (
          <div className="empty-state">No targets match these filters.</div>
        ) : view === 'chart' ? (
          <TargetScatterChart targets={targets} />
        ) : (
          <table className={`targets-table ${loading ? 'is-refreshing' : ''}`}>
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
                    <span className="score-pill" style={scorePillStyle(t.acquisition_fit_score)}>
                      {t.acquisition_fit_score}
                    </span>
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
