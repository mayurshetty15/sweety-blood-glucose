import { Navigate, Outlet, useLocation } from 'react-router-dom'
import useAuth from '../context/useAuth.js'
import { getProtectedRedirect } from './routePolicy.js'

function ProtectedRoute({ guestOnly = false, role, skipProfileCompletion = false }) {
  const { isAuthenticated, user } = useAuth()
  const location = useLocation()
  const redirect = getProtectedRedirect({
    isAuthenticated,
    user,
    guestOnly,
    role,
    skipProfileCompletion,
    pathname: location.pathname,
  })

  if (redirect) {
    return <Navigate to={redirect} replace />
  }

  return <Outlet />
}

export default ProtectedRoute
