import api from './api.js'

export async function createReading(reading) {
  const response = await api.post('/readings', reading)
  return response.data
}

export async function getReadings(filters = {}, config = {}) {
  const response = await api.get('/readings', { ...config, params: filters })
  return response.data
}

export async function getReading(id) {
  const response = await api.get(`/readings/${encodeURIComponent(id)}`)
  return response.data
}

export async function updateReading(id, reading) {
  const response = await api.put(`/readings/${encodeURIComponent(id)}`, reading)
  return response.data
}

export async function deleteReading(id) {
  const response = await api.delete(`/readings/${encodeURIComponent(id)}`)
  return response.data
}
