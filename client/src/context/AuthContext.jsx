import { useEffect, useState } from 'react'
import { toast } from 'react-toastify'
import AuthContext from './authContext.js'
import { clearPatientFiltersForUser } from './PatientFilterContext.jsx'
import {
  clearStoredSession,
  TOKEN_STORAGE_KEY,
  USER_STORAGE_KEY,
} from '../services/api.js'
import { login as loginRequest, register as registerRequest } from '../services/authService.js'

function hasUnexpiredToken(token) {
  if (typeof token !== 'string') {
    return false
  }

  try {
    const encodedPayload = token.split('.')[1]
      ?.replace(/-/g, '+')
      .replace(/_/g, '/')
    if (!encodedPayload) {
      return false
    }

    const paddedPayload = encodedPayload.padEnd(
      encodedPayload.length + ((4 - (encodedPayload.length % 4)) % 4),
      '=',
    )
    const payload = JSON.parse(window.atob(paddedPayload))
    return Number.isFinite(payload.exp) && payload.exp * 1000 > Date.now()
  } catch {
    return false
  }
}

function readStoredSession() {
  const token = window.localStorage.getItem(TOKEN_STORAGE_KEY)
  const storedUser = window.localStorage.getItem(USER_STORAGE_KEY)

  if (!token || !storedUser || !hasUnexpiredToken(token)) {
    clearStoredSession()
    return { token: null, user: null }
  }

  try {
    const user = JSON.parse(storedUser)
    if (
      !user ||
      typeof user !== 'object' ||
      user.id == null ||
      typeof user.email !== 'string' ||
      !['patient', 'doctor'].includes(user.role)
    ) {
      clearStoredSession()
      return { token: null, user: null }
    }

    return { token, user }
  } catch {
    clearStoredSession()
    return { token: null, user: null }
  }
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(readStoredSession)

  useEffect(() => {
    function handleUnauthorized() {
      clearStoredSession()
      setSession({ token: null, user: null })
      toast.info('Your session expired. Please sign in again.')
    }

    window.addEventListener('sweety:unauthorized', handleUnauthorized)
    return () => window.removeEventListener('sweety:unauthorized', handleUnauthorized)
  }, [])

  function storeSession(response) {
    const { token, user } = response
    if (!token || !user || !['patient', 'doctor'].includes(user.role)) {
      throw new Error('The server returned an incomplete authentication response.')
    }

    window.localStorage.setItem(TOKEN_STORAGE_KEY, token)
    window.localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user))
    setSession({ token, user })
    return user
  }

  async function login(credentials) {
    return storeSession(await loginRequest(credentials))
  }

  async function register(details) {
    return storeSession(await registerRequest(details))
  }

  function logout() {
    if (session.user?.id) {
      clearPatientFiltersForUser(session.user.id)
    }
    clearStoredSession()
    setSession({ token: null, user: null })
  }

  function updateUser(updates) {
    if (!session.user) {
      return
    }

    const user = { ...session.user, ...updates }
    window.localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user))
    setSession({ ...session, user })
  }

  const value = {
    user: session.user,
    token: session.token,
    isAuthenticated: Boolean(session.token && session.user),
    login,
    register,
    updateUser,
    logout,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

