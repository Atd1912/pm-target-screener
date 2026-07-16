import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getStats } from '../api.js';
import CountUp from '../components/CountUp.jsx';
import { navigateWithTransition } from '../lib/pageTransition.js';

const FEATURES = [
  {
    title: 'Confidence-scored sourcing',
    desc: 'Every door count is tagged verified, estimated, or unverified based on how many independent sources agree. Unverified targets are discounted, not hidden.',
  },
  {
    title: 'Explainable fit scoring',
    desc: 'Every acquisition-fit score breaks down into size fit, growth signal, and a confidence weight. Click into any target to see exactly how it was calculated.',
  },
  {
    title: 'Natural-language search',
    desc: 'Ask a plain-English question and get back the real SQL query and the results — no dashboard-building or filter-hunting required.',
  },
];

export default function LandingPage() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);

  useEffect(() => {
    getStats().then(setStats).catch(() => {});
  }, []);

  return (
    <>
      <section className="landing-hero">
        <p className="eyebrow landing-fade" style={{ justifyContent: 'center' }}>
          Acquisition sourcing · Internal tool
        </p>
        <h1 className="landing-fade" style={{ animationDelay: '60ms' }}>
          A fragmented industry. A <em>validated</em> path to acquire it.
        </h1>
        <p className="landing-subhead landing-fade" style={{ animationDelay: '120ms' }}>
          Sandstone's internal screener for identifying, scoring, and validating
          independent property management companies as roll-up targets.
        </p>
        <div className="landing-fade" style={{ animationDelay: '180ms' }}>
          <Link
            to="/dashboard"
            className="landing-cta"
            onClick={(e) => {
              e.preventDefault();
              navigateWithTransition(navigate, '/dashboard');
            }}
          >
            Enter the Screener →
          </Link>
        </div>

        {stats && (
          <div className="landing-stats landing-fade" style={{ animationDelay: '240ms' }}>
            <div className="landing-stat">
              <div className="value">
                <CountUp value={stats.total_targets} />
              </div>
              <div className="eyebrow">Targets tracked</div>
            </div>
            <div className="landing-stat">
              <div className="value">
                <CountUp value={stats.metros.length} />
              </div>
              <div className="eyebrow">Metros</div>
            </div>
            <div className="landing-stat">
              <div className="value">
                <CountUp value={stats.average_score} decimals={1} />
              </div>
              <div className="eyebrow">Avg. fit score</div>
            </div>
          </div>
        )}
      </section>

      <section className="landing-features">
        <p className="eyebrow" style={{ textAlign: 'center' }}>The approach</p>
        <div className="landing-feature-grid">
          {FEATURES.map((f) => (
            <div className="landing-feature-card" key={f.title}>
              <h3>{f.title}</h3>
              <p>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="landing-footer">
        Internal tool — Sandstone Capital Partners · Synthetic data for demonstration purposes
      </footer>
    </>
  );
}
