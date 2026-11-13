import { Navigate, Outlet } from 'react-router-dom'
import useAuth from '../context/useAuth.js'
import { getProtectedRedirect } from './routePolicy.js'

function ProtectedRoute({ guestOnly = false }) {
  const { isAuthenticated } = useAuth()
  const redirect = getProtectedRedirect(isAuthenticated, guestOnly)

  if (redirect) {
    return <Navigate to={redirect} replace />
  }

  return <Outlet />
}

export default ProtectedRoute
