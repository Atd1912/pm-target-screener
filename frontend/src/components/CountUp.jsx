import { useEffect, useRef, useState } from 'react';

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export default function CountUp({ value, duration = 600, decimals = 0 }) {
  const [display, setDisplay] = useState(value);
  const prevValue = useRef(value);
  const rafRef = useRef(null);

  useEffect(() => {
    const from = prevValue.current;
    const to = value;

    if (prefersReducedMotion() || from === to) {
      setDisplay(to);
      prevValue.current = to;
      return;
    }

    const start = performance.now();
    cancelAnimationFrame(rafRef.current);

    function tick(now) {
      const elapsed = now - start;
      const progress = Math.min(1, elapsed / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(from + (to - from) * eased);
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        prevValue.current = to;
      }
    }
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [value, duration]);

  return decimals > 0 ? display.toFixed(decimals) : Math.round(display).toLocaleString();
}
