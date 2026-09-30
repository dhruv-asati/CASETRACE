const API_BASE = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8082').replace(/\/$/, '')

async function request(path, options = {}) {
  let response
  try {
    response = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers: { Accept: 'application/json', ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...options.headers },
    })
  } catch {
    throw new Error(`Could not reach the CASETRACE API at ${API_BASE}. Check that the Spring Boot server is running.`)
  }

  const raw = await response.text()
  let payload = null
  if (raw) {
    try { payload = JSON.parse(raw) } catch { payload = raw }
  }
  if (!response.ok) {
    const message = payload?.message || (response.status === 404 ? 'That case could not be found.' : 'The request could not be completed.')
    const error = new Error(message)
    error.status = response.status
    error.code = payload?.code
    throw error
  }
  return payload
}

export const api = {
  baseUrl: API_BASE,
  listCases: () => request('/api/cases'),
  getCase: (caseId) => request(`/api/cases/${caseId}`),
  getSection: (caseId, section) => request(`/api/cases/${caseId}/${section}`),
  search: (caseId, filters) => {
    const query = new URLSearchParams()
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== '' && value !== null && value !== undefined) query.set(key, value)
    })
    const suffix = query.size ? `?${query.toString()}` : ''
    return request(`/api/cases/${caseId}/investigate${suffix}`)
  },
  submitTheory: (caseId, body) => request(`/api/cases/${caseId}/solve`, {
    method: 'POST',
    body: JSON.stringify(body),
  }),
}

export function toApiTimestamp(localDateTime) {
  if (!localDateTime) return ''
  const date = new Date(localDateTime)
  return Number.isNaN(date.getTime()) ? '' : date.toISOString()
}
