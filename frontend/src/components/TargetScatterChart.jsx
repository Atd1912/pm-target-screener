import { useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const TIER_ORDER = ['verified', 'estimated', 'unverified'];
const TIER_COLOR = {
  verified: 'var(--verified)',
  estimated: 'var(--estimated)',
  unverified: 'var(--unverified)',
};
const TIER_LABEL = {
  verified: 'Verified',
  estimated: 'Estimated',
  unverified: 'Unverified',
};

const WIDTH = 1000;
const HEIGHT = 440;
const MARGIN = { top: 20, right: 24, bottom: 46, left: 52 };
const PLOT_W = WIDTH - MARGIN.left - MARGIN.right;
const PLOT_H = HEIGHT - MARGIN.top - MARGIN.bottom;
const DEFAULT_DOOR_RANGE = [150, 600];

export default function TargetScatterChart({ targets }) {
  const navigate = useNavigate();
  const wrapperRef = useRef(null);
  const [hovered, setHovered] = useState(null); // { target, x, y }

  const doorRange = targets[0]?.score_components?.target_door_range || DEFAULT_DOOR_RANGE;

  const xMax = useMemo(() => {
    const maxDoors = Math.max(200, ...targets.map((t) => t.estimated_door_count));
    return Math.ceil((maxDoors * 1.08) / 100) * 100;
  }, [targets]);

  const xScale = (doors) => MARGIN.left + (doors / xMax) * PLOT_W;
  const yScale = (score) => MARGIN.top + PLOT_H - (score / 100) * PLOT_H;

  const xTicks = useMemo(() => {
    const step = xMax <= 1000 ? 200 : 500;
    const ticks = [];
    for (let v = 0; v <= xMax; v += step) ticks.push(v);
    return ticks;
  }, [xMax]);
  const yTicks = [0, 25, 50, 75, 100];

  function updateHover(t, clientX, clientY) {
    const rect = wrapperRef.current.getBoundingClientRect();
    setHovered({ target: t, x: clientX - rect.left, y: clientY - rect.top });
  }

  if (targets.length === 0) {
    return <div className="empty-state">No targets match these filters.</div>;
  }

  const wrapperWidth = wrapperRef.current?.clientWidth || WIDTH;
  const tooltipOnLeft = hovered && hovered.x + 190 > wrapperWidth;

  return (
    <div className="scatter-wrapper" ref={wrapperRef}>
      <div className="scatter-legend">
        {TIER_ORDER.map((tier) => (
          <span className="scatter-legend-item" key={tier}>
            <span className={`tier-dot ${tier}`} />
            {TIER_LABEL[tier]}
          </span>
        ))}
        <span className="scatter-legend-item muted">
          <span className="scatter-legend-band" />
          Target range ({doorRange[0]}–{doorRange[1]} doors)
        </span>
      </div>

      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="scatter-svg"
        role="img"
        aria-label="Scatter plot of estimated door count versus acquisition-fit score, colored by confidence tier"
      >
        <rect
          x={xScale(doorRange[0])}
          y={MARGIN.top}
          width={xScale(doorRange[1]) - xScale(doorRange[0])}
          height={PLOT_H}
          fill="var(--gold-wash)"
        />

        {yTicks.map((v) => (
          <line
            key={`gy-${v}`}
            x1={MARGIN.left}
            x2={WIDTH - MARGIN.right}
            y1={yScale(v)}
            y2={yScale(v)}
            className="scatter-gridline"
          />
        ))}
        {xTicks.map((v) => (
          <line
            key={`gx-${v}`}
            x1={xScale(v)}
            x2={xScale(v)}
            y1={MARGIN.top}
            y2={MARGIN.top + PLOT_H}
            className="scatter-gridline"
          />
        ))}

        {yTicks.map((v) => (
          <text
            key={`ty-${v}`}
            x={MARGIN.left - 10}
            y={yScale(v)}
            className="scatter-axis-label"
            textAnchor="end"
            dominantBaseline="middle"
          >
            {v}
          </text>
        ))}
        {xTicks.map((v) => (
          <text
            key={`tx-${v}`}
            x={xScale(v)}
            y={HEIGHT - MARGIN.bottom + 22}
            className="scatter-axis-label"
            textAnchor="middle"
          >
            {v.toLocaleString()}
          </text>
        ))}

        <text x={MARGIN.left + PLOT_W / 2} y={HEIGHT - 8} className="scatter-axis-title" textAnchor="middle">
          Estimated door count
        </text>
        <text
          transform={`translate(16, ${MARGIN.top + PLOT_H / 2}) rotate(-90)`}
          className="scatter-axis-title"
          textAnchor="middle"
        >
          Acquisition-fit score
        </text>

        {targets.map((t) => {
          const cx = xScale(t.estimated_door_count);
          const cy = yScale(t.acquisition_fit_score);
          const tier = t.door_count_confidence;
          const isHovered = hovered?.target.id === t.id;
          return (
            <g
              key={t.id}
              className="scatter-point"
              tabIndex={0}
              onMouseEnter={(e) => updateHover(t, e.clientX, e.clientY)}
              onMouseMove={(e) => updateHover(t, e.clientX, e.clientY)}
              onMouseLeave={() => setHovered(null)}
              onFocus={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                updateHover(t, rect.left, rect.top);
              }}
              onBlur={() => setHovered(null)}
              onClick={() => navigate(`/targets/${t.id}`)}
            >
              <circle cx={cx} cy={cy} r={12} fill="transparent" />
              <circle
                cx={cx}
                cy={cy}
                r={isHovered ? 6 : 4}
                fill={TIER_COLOR[tier]}
                stroke="var(--bg-panel)"
                strokeWidth={2}
              />
            </g>
          );
        })}
      </svg>

      {hovered && (
        <div
          className="scatter-tooltip"
          style={
            tooltipOnLeft
              ? { right: wrapperWidth - hovered.x + 14, top: hovered.y + 14 }
              : { left: hovered.x + 14, top: hovered.y + 14 }
          }
        >
          <div className="scatter-tooltip-name">{hovered.target.company_name}</div>
          <div className="scatter-tooltip-row">
            <span>Fit score</span>
            <strong>{hovered.target.acquisition_fit_score}</strong>
          </div>
          <div className="scatter-tooltip-row">
            <span>Doors</span>
            <strong>{hovered.target.estimated_door_count.toLocaleString()}</strong>
          </div>
          <div className="scatter-tooltip-tier">
            <span className={`tier-dot ${hovered.target.door_count_confidence}`} />
            {TIER_LABEL[hovered.target.door_count_confidence]}
          </div>
        </div>
      )}
    </div>
  );
}
