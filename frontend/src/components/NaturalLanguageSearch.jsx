import { useState } from 'react';
import { runNaturalLanguageQuery } from '../api.js';

export default function NaturalLanguageSearch() {
  const [question, setQuestion] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!question.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const data = await runNaturalLanguageQuery(question.trim());
      setResult(data);
    } catch (err) {
      setError(err.message);
      setResult(null);
    } finally {
      setLoading(false);
    }
  }

  const columns = result && result.results.length > 0 ? Object.keys(result.results[0]) : [];

  return (
    <div className="search-section">
      <div className="eyebrow">Ask the dataset</div>
      <form className="search-form" onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder='e.g. "which Austin targets have 200+ doors and are NARPM members?"'
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
        />
        <button type="submit" disabled={loading}>
          {loading ? 'Asking…' : 'Ask'}
        </button>
      </form>

      {error && <p className="query-error">{error}</p>}

      {result && (
        <>
          <details className="query-sql-toggle">
            <summary>Generated SQL</summary>
            <pre>{result.sql}</pre>
          </details>
          <p className="query-results-note">
            {result.row_count} result{result.row_count === 1 ? '' : 's'}
          </p>
          {result.results.length > 0 && (
            <div className="table-panel" style={{ padding: '12px 0 0' }}>
              <table className="targets-table">
                <thead>
                  <tr>
                    {columns.map((col) => (
                      <th key={col}>{col.replaceAll('_', ' ')}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {result.results.map((row, i) => (
                    <tr key={i} style={{ cursor: 'default' }}>
                      {columns.map((col) => (
                        <td key={col}>{formatValue(row[col])}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function formatValue(value) {
  if (value === null || value === undefined) return '—';
  if (Array.isArray(value)) return value.join(', ');
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  return String(value);
}
