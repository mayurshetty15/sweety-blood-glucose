export const APP_PATHS = Object.freeze({
  dashboard: '/dashboard',
  analytics: '/analytics',
  reports: '/reports',
})

export const AUTHENTICATED_ROUTES = [
  { path: APP_PATHS.dashboard, key: 'dashboard', label: 'Dashboard' },
  { path: APP_PATHS.analytics, key: 'analytics', label: 'Analytics' },
  { path: APP_PATHS.reports, key: 'reports', label: 'Reports' },
]
