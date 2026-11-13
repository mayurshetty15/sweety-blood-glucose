import api from './api.js'

export async function getDoctorPatients(search = '') {
  const response = await api.get('/doctor/patients', {
    params: search ? { search } : undefined,
  })
  return response.data
}

export async function getDoctorPatientReport(patientId, range) {
  const response = await api.get(`/doctor/patients/${patientId}/report`, {
    params: range,
  })
  return response.data
}
