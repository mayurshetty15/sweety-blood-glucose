import api from './api.js'

export async function getPatientProfile() {
  const response = await api.get('/patient/profile')
  return response.data
}

export async function updatePatientProfile(profile) {
  const response = await api.put('/patient/profile', profile)
  return response.data
}

export async function getDoctors() {
  const response = await api.get('/doctors')
  return response.data
}

export async function getDoctorAccess() {
  const response = await api.get('/patient/doctors/access')
  return response.data
}

export async function approveDoctorAccess(doctorId) {
  const response = await api.post(`/patient/doctors/${doctorId}/approve`, { confirmed: true })
  return response.data
}

export async function revokeDoctorAccess(doctorId) {
  const response = await api.delete(`/patient/doctors/${doctorId}/access`)
  return response.data
}
