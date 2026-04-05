const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

/**
 * Get the stored JWT access token.
 */
function getAccessToken() {
  try {
    const raw = localStorage.getItem('nakshatra-auth')
    if (!raw) return null
    const parsed = JSON.parse(raw)
    return parsed?.state?.accessToken || null
  } catch {
    return null
  }
}

/**
 * Authenticated fetch wrapper — attaches JWT Bearer token.
 */
export async function authFetch(path, options = {}) {
  const token = getAccessToken()
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`[API] ${response.status}: ${errorText}`)
  }

  return response.json()
}

/**
 * Public fetch wrapper (no auth token).
 */
export async function apiFetch(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`[API] ${response.status}: ${errorText}`)
  }

  return response.json()
}

// ── Auth helpers ─────────────────────────────────────────────

export async function apiLogin(email, password) {
  return apiFetch('/api/auth/login/', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
}

export async function apiSignup(fullName, email, password) {
  return apiFetch('/api/auth/signup/', {
    method: 'POST',
    body: JSON.stringify({ full_name: fullName, email, password }),
  })
}

export async function apiPatientLogin(patientId, password) {
  return apiFetch('/api/auth/patient-login/', {
    method: 'POST',
    body: JSON.stringify({ patient_id: patientId, password }),
  })
}

export async function apiGetMe() {
  return authFetch('/api/auth/me/')
}

/**
 * Upload a discharge summary file -> Gemini extracts patient info.
 * Returns: { full_name, age, gender, injury_type, injury_details, suggested_exercises, exercise_plan }
 */
export async function apiExtractDischarge(file) {
  const formData = new FormData()
  formData.append('file', file)

  const token = getAccessToken()
  const response = await fetch(`${API_BASE_URL}/api/auth/extract-discharge/`, {
    method: 'POST',
    headers: token ? { 'Authorization': `Bearer ${token}` } : {},
    body: formData,
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`[API] ${response.status}: ${errorText}`)
  }

  return response.json()
}

/**
 * Doctor registers a patient after reviewing Gemini-extracted info.
 */
export async function apiRegisterPatient(patientData) {
  return authFetch('/api/auth/register-patient/', {
    method: 'POST',
    body: JSON.stringify(patientData),
  })
}

// ── Data helpers ─────────────────────────────────────────────

export async function apiGetUsers(role) {
  const params = role ? `?role=${role}` : ''
  return authFetch(`/api/users/${params}`)
}

export async function apiGetRehabSessions(userId, opts = {}) {
  const params = new URLSearchParams()
  if (userId) params.set('user_id', userId)
  if (opts.completed !== undefined) params.set('completed', opts.completed)
  if (opts.order) params.set('order', opts.order)
  if (opts.limit) params.set('limit', opts.limit)
  return authFetch(`/api/rehab-sessions/?${params}`)
}

export async function apiCreateRehabSession(data) {
  return authFetch('/api/rehab-sessions/', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function apiGetCognitiveSessions(userId, opts = {}) {
  const params = new URLSearchParams()
  if (userId) params.set('user_id', userId)
  if (opts.order) params.set('order', opts.order)
  if (opts.limit) params.set('limit', opts.limit)
  return authFetch(`/api/cognitive-sessions/?${params}`)
}

export async function apiGetCognitiveProgress(userId) {
  const params = userId ? `?user_id=${userId}` : ''
  return authFetch(`/api/cognitive-progress/${params}`)
}

export async function getExercises() {
  return apiFetch('/api/exercises/')
}

// ── CV Exercise Session helpers ─────────────────────────────

export async function apiGetCVExercises() {
  return authFetch('/api/cv-exercises/')
}

export async function apiStartExerciseSession(exercise, camera = 0) {
  return authFetch('/api/exercise-sessions/start/', {
    method: 'POST',
    body: JSON.stringify({ exercise, camera }),
  })
}

export async function apiGetExerciseSessionStatus(sessionId) {
  return authFetch(`/api/exercise-sessions/${sessionId}/status/`)
}

export async function apiGetExerciseSessionResult(sessionId) {
  return authFetch(`/api/exercise-sessions/${sessionId}/result/`)
}

export async function apiSaveExerciseSession(sessionId) {
  return authFetch(`/api/exercise-sessions/${sessionId}/save/`, {
    method: 'POST',
  })
}

