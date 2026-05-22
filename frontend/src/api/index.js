import axios from 'axios'

const api = axios.create({ baseURL: '/api' })

api.interceptors.request.use(config => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
    }
    return Promise.reject(err)
  }
)

export const authAPI = {
  login: (data) => api.post('/auth/login', data),
  register: (data) => api.post('/auth/register', data),
  me: () => api.get('/auth/me'),
}

export const dashboardAPI = {
  kpis: () => api.get('/dashboard/kpis'),
  overview: () => api.get('/dashboard/overview'),
  zoneSummary: () => api.get('/dashboard/zone-summary'),
}

export const trafficAPI = {
  list: (params) => api.get('/traffic/', { params }),
  heatmap: () => api.get('/traffic/heatmap'),
  trends: (params) => api.get('/traffic/trends', { params }),
  peakHours: (params) => api.get('/traffic/peak-hours', { params }),
  zonesComparison: () => api.get('/traffic/zones-comparison'),
  live: () => api.get('/traffic/live'),
}

export const pollutionAPI = {
  list: (params) => api.get('/pollution/', { params }),
  map: () => api.get('/pollution/map'),
  trends: (params) => api.get('/pollution/trends', { params }),
  zonesComparison: () => api.get('/pollution/zones-comparison'),
  live: () => api.get('/pollution/live'),
}

export const transportAPI = {
  routes: () => api.get('/transport/routes'),
  trends: (params) => api.get('/transport/trends', { params }),
  peakHours: (params) => api.get('/transport/peak-hours', { params }),
  performance: () => api.get('/transport/performance'),
}

export const energyAPI = {
  list: (params) => api.get('/energy/', { params }),
  trends: (params) => api.get('/energy/trends', { params }),
  bySector: (params) => api.get('/energy/by-sector', { params }),
  anomalies: () => api.get('/energy/anomalies'),
  zonesComparison: () => api.get('/energy/zones-comparison'),
  recommendations: () => api.get('/energy/recommendations'),
}

export const predictionsAPI = {
  traffic: (zoneId, hoursAhead) => api.get(`/predictions/traffic/${zoneId}`, { params: { hours_ahead: hoursAhead } }),
  pollution: (zoneId, hoursAhead) => api.get(`/predictions/pollution/${zoneId}`, { params: { hours_ahead: hoursAhead } }),
  energy: (zoneId, hoursAhead) => api.get(`/predictions/energy/${zoneId}`, { params: { hours_ahead: hoursAhead } }),
  compare: (zoneId) => api.get(`/predictions/compare/${zoneId}`),
}

export const alertsAPI = {
  list: (params) => api.get('/alerts/', { params }),
  summary: () => api.get('/alerts/summary'),
  markRead: (id) => api.post(`/alerts/${id}/read`),
  resolve: (id) => api.post(`/alerts/${id}/resolve`),
}

export const adminAPI = {
  stats: () => api.get('/admin/stats'),
  zones: () => api.get('/admin/zones'),
  users: () => api.get('/admin/users'),
  report: () => api.get('/admin/report'),
}

export const chatbotAPI = {
  chat: (message) => api.post('/chatbot/', { message }),
}

export default api
