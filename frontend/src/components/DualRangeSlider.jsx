export default function DualRangeSlider({ min, max, step = 10, valueMin, valueMax, onChange }) {
  const pct = (v) => ((v - min) / (max - min)) * 100;

  function handleMinChange(e) {
    const next = Math.min(Number(e.target.value), valueMax - step);
    onChange(next, valueMax);
  }

  function handleMaxChange(e) {
    const next = Math.max(Number(e.target.value), valueMin + step);
    onChange(valueMin, next);
  }

  return (
    <div className="range-slider">
      <div className="range-slider-track" />
      <div
        className="range-slider-fill"
        style={{ left: `${pct(valueMin)}%`, width: `${pct(valueMax) - pct(valueMin)}%` }}
      />
      <input
        type="range"
        className="range-slider-input"
        min={min}
        max={max}
        step={step}
        value={valueMin}
        onChange={handleMinChange}
        aria-label="Minimum door count"
      />
      <input
        type="range"
        className="range-slider-input range-slider-input-max"
        min={min}
        max={max}
        step={step}
        value={valueMax}
        onChange={handleMaxChange}
        aria-label="Maximum door count"
      />
    </div>
  );
}
