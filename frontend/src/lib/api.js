const API_BASE = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8083').replace(/\/$/, '')
let csrfToken = null

async function request(path, options = {}, includeCsrf = true) {
  const method = String(options.method || 'GET').toUpperCase()
  if (includeCsrf && !['GET', 'HEAD', 'OPTIONS'].includes(method) && path !== '/api/auth/csrf') {
    if (!csrfToken) await request('/api/auth/csrf', {}, false)
  }
  let response
  try {
    response = await fetch(`${API_BASE}${path}`, {
      ...options,
      credentials: 'include',
      headers: {
        Accept: 'application/json',
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...(includeCsrf && !['GET', 'HEAD', 'OPTIONS'].includes(method) && csrfToken ? { 'X-XSRF-TOKEN': csrfToken } : {}),
        ...options.headers,
      },
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
  if (path === '/api/auth/csrf') csrfToken = payload?.token || null
  return payload
}

export const api = {
  baseUrl: API_BASE,
  listCases: () => request('/api/cases'),
  createCase: (body) => request('/api/cases', { method: 'POST', body: JSON.stringify(body) }),
  getCase: (caseId) => request(`/api/cases/${caseId}`),
  updateCase: (caseId, body) => request(`/api/cases/${caseId}`, { method: 'PUT', body: JSON.stringify(body) }),
  updateCaseStatus: (caseId, status) => request(`/api/cases/${caseId}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  deleteCase: (caseId) => request(`/api/cases/${caseId}`, { method: 'DELETE' }),
  addPerson: (caseId, body) => request(`/api/cases/${caseId}/people`, { method: 'POST', body: JSON.stringify(body) }),
  addEvidence: (caseId, body) => request(`/api/cases/${caseId}/evidence`, { method: 'POST', body: JSON.stringify(body) }),
  addCctv: (caseId, body) => request(`/api/cases/${caseId}/cctv`, { method: 'POST', body: JSON.stringify(body) }),
  addAccess: (caseId, body) => request(`/api/cases/${caseId}/access-logs`, { method: 'POST', body: JSON.stringify(body) }),
  addPhone: (caseId, body) => request(`/api/cases/${caseId}/phone-records`, { method: 'POST', body: JSON.stringify(body) }),
  addStatement: (caseId, body) => request(`/api/cases/${caseId}/witness-statements`, { method: 'POST', body: JSON.stringify(body) }),
  addVehicle: (caseId, body) => request(`/api/cases/${caseId}/vehicles`, { method: 'POST', body: JSON.stringify(body) }),
  addVehicleEvent: (caseId, body) => request(`/api/cases/${caseId}/vehicle-logs`, { method: 'POST', body: JSON.stringify(body) }),
  addTimeline: (caseId, body) => request(`/api/cases/${caseId}/timeline`, { method: 'POST', body: JSON.stringify(body) }),
  getCaseParticipants: (caseId) => request(`/api/cases/${caseId}/participants`),
  getCaseEventRecords: (caseId) => request(`/api/cases/${caseId}/timeline-records`),
  updatePerson: (caseId, id, body) => request(`/api/cases/${caseId}/people/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deletePerson: (caseId, id) => request(`/api/cases/${caseId}/people/${id}`, { method: 'DELETE' }),
  updateEvidence: (caseId, id, body) => request(`/api/cases/${caseId}/evidence/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteEvidence: (caseId, id) => request(`/api/cases/${caseId}/evidence/${id}`, { method: 'DELETE' }),
  updateCctv: (caseId, id, body) => request(`/api/cases/${caseId}/cctv/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteCctv: (caseId, id) => request(`/api/cases/${caseId}/cctv/${id}`, { method: 'DELETE' }),
  updateAccess: (caseId, id, body) => request(`/api/cases/${caseId}/access-logs/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteAccess: (caseId, id) => request(`/api/cases/${caseId}/access-logs/${id}`, { method: 'DELETE' }),
  updatePhone: (caseId, id, body) => request(`/api/cases/${caseId}/phone-records/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deletePhone: (caseId, id) => request(`/api/cases/${caseId}/phone-records/${id}`, { method: 'DELETE' }),
  updateStatement: (caseId, id, body) => request(`/api/cases/${caseId}/witness-statements/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteStatement: (caseId, id) => request(`/api/cases/${caseId}/witness-statements/${id}`, { method: 'DELETE' }),
  updateVehicle: (caseId, id, body) => request(`/api/cases/${caseId}/vehicles/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteVehicle: (caseId, id) => request(`/api/cases/${caseId}/vehicles/${id}`, { method: 'DELETE' }),
  updateVehicleEvent: (caseId, id, body) => request(`/api/cases/${caseId}/vehicle-logs/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteVehicleEvent: (caseId, id) => request(`/api/cases/${caseId}/vehicle-logs/${id}`, { method: 'DELETE' }),
  updateTimelineEvent: (caseId, id, body) => request(`/api/cases/${caseId}/timeline/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteTimelineEvent: (caseId, id) => request(`/api/cases/${caseId}/timeline/${id}`, { method: 'DELETE' }),
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

export const authApi = {
  register: (body) => request('/api/auth/register', { method: 'POST', body: JSON.stringify(body) }),
  login: (body) => request('/api/auth/login', { method: 'POST', body: JSON.stringify(body) }),
  me: () => request('/api/auth/me'),
  logout: async () => {
    try { return await request('/api/auth/logout', { method: 'POST' }) }
    finally { csrfToken = null }
  },
  dashboard: () => request('/api/dashboard'),
  updateProfile: (body) => request('/api/auth/me', { method: 'PUT', body: JSON.stringify(body) }),
  changePassword: (body) => request('/api/auth/password', { method: 'POST', body: JSON.stringify(body) }),
  reviewEvidence: (caseId, evidenceId) => request(`/api/cases/${caseId}/evidence/${evidenceId}/review`, { method: 'POST' }),
  reviewedEvidence: (caseId) => request(`/api/cases/${caseId}/evidence/reviews`),
}

export function toApiTimestamp(localDateTime) {
  if (!localDateTime) return ''
  const date = new Date(localDateTime)
  return Number.isNaN(date.getTime()) ? '' : date.toISOString()
}
