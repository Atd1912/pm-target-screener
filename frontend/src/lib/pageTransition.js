import { flushSync } from 'react-dom';

function prefersReducedMotion() {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

// Wraps a react-router navigate() call in the View Transitions API so the
// outgoing and incoming page cross-fade instead of hard-swapping. Falls back
// to a plain navigate() on browsers without support, or when the user has
// asked for reduced motion.
export function navigateWithTransition(navigate, to) {
  if (prefersReducedMotion() || typeof document.startViewTransition !== 'function') {
    navigate(to);
    return;
  }
  document.startViewTransition(() => {
    flushSync(() => navigate(to));
  });
}
