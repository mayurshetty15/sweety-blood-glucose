import { APP_PATHS } from './appRoutes.js'

export function getProtectedRedirect(isAuthenticated, guestOnly = false) {
  if (guestOnly) {
    return isAuthenticated ? APP_PATHS.dashboard : null
  }
  return isAuthenticated ? null : '/login'
}
