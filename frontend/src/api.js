const API_BASE = import.meta.env.VITE_API_BASE || '';

async function request(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail || `Request failed: ${res.status}`);
  }
  return res.json();
}

export function getTargets(params = {}) {
  const query = new URLSearchParams(
    Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '')
  ).toString();
  return request(`/api/targets${query ? `?${query}` : ''}`);
}

export function getTarget(id) {
  return request(`/api/targets/${id}`);
}

export function updateOutreachStatus(id, outreach_status) {
  return request(`/api/targets/${id}/outreach`, {
    method: 'PATCH',
    body: JSON.stringify({ outreach_status }),
  });
}

export function getStats() {
  return request('/api/stats');
}

export function getScoringConfig() {
  return request('/api/config');
}

export function runNaturalLanguageQuery(question) {
  return request('/api/query', {
    method: 'POST',
    body: JSON.stringify({ question }),
  });
}
