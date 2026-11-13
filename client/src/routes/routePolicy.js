import { APP_PATHS } from './appRoutes.js'

export function getAuthenticatedHome(user) {
  if (user?.role === 'doctor') {
    return APP_PATHS.doctorDashboard
  }
  if (user?.role === 'patient' && !user.profile_complete) {
    return APP_PATHS.profile
  }
  return APP_PATHS.dashboard
}

export function getProtectedRedirect({
  isAuthenticated,
  user,
  guestOnly = false,
  role,
  skipProfileCompletion = false,
  pathname,
}) {
  if (guestOnly) {
    return isAuthenticated ? getAuthenticatedHome(user) : null
  }
  if (!isAuthenticated) {
    return '/login'
  }
  if (role && user?.role !== role) {
    return getAuthenticatedHome(user)
  }
  if (
    !skipProfileCompletion &&
    user?.role === 'patient' &&
    !user.profile_complete &&
    pathname !== APP_PATHS.profile
  ) {
    return APP_PATHS.profile
  }
  return null
}
