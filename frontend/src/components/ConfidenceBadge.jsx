const LABELS = {
  verified: 'Verified',
  estimated: 'Estimated',
  unverified: 'Unverified',
};

export default function ConfidenceBadge({ tier }) {
  return (
    <span className={`confidence-badge ${tier}`}>
      <span className={`tier-dot ${tier}`} />
      {LABELS[tier] || tier}
    </span>
  );
}
