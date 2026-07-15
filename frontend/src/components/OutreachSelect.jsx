const OPTIONS = [
  ['not_started', 'Not started'],
  ['researched', 'Researched'],
  ['contacted', 'Contacted'],
  ['responded', 'Responded'],
  ['call_booked', 'Call booked'],
];

export default function OutreachSelect({ value, onChange, disabled }) {
  return (
    <select
      className="outreach-select"
      value={value}
      disabled={disabled}
      onClick={(e) => e.stopPropagation()}
      onChange={(e) => onChange(e.target.value)}
    >
      {OPTIONS.map(([val, label]) => (
        <option key={val} value={val}>
          {label}
        </option>
      ))}
    </select>
  );
}
