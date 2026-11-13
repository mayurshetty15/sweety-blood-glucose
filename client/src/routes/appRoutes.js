export const APP_PATHS = Object.freeze({
  dashboard: '/patient/dashboard',
  analytics: '/patient/analytics',
  reports: '/patient/reports',
  profile: '/patient/profile',
  doctors: '/patient/doctors',
  doctorDashboard: '/doctor/dashboard',
  doctorPatients: '/doctor/patients',
})

export const AUTHENTICATED_ROUTES = [
  { path: APP_PATHS.dashboard, key: 'dashboard', label: 'Dashboard' },
  { path: APP_PATHS.analytics, key: 'analytics', label: 'Analytics' },
  { path: APP_PATHS.reports, key: 'reports', label: 'Reports' },
  { path: APP_PATHS.profile, key: 'profile', label: 'Profile' },
  { path: APP_PATHS.doctors, key: 'doctors', label: 'Doctors' },
]

export const DOCTOR_ROUTES = [
  { path: APP_PATHS.doctorDashboard, label: 'Dashboard' },
  { path: APP_PATHS.doctorPatients, label: 'Patients' },
]

export const DOCTOR_REPORT_ROUTE = `${APP_PATHS.doctorPatients}/:patientId/report`
