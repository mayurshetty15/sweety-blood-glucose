import axios from 'axios'

export const TOKEN_STORAGE_KEY = 'sweety_token'
export const USER_STORAGE_KEY = 'sweety_user'

export function clearStoredSession() {
  if (typeof window !== 'undefined') {
    window.localStorage.removeItem(TOKEN_STORAGE_KEY)
    window.localStorage.removeItem(USER_STORAGE_KEY)
  }
}

const api = axios.create({
  baseURL: (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/+$/, ''),
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
})

api.interceptors.request.use((config) => {
  const skipAuth = config.skipAuth
  delete config.skipAuth

  if (!skipAuth && typeof window !== 'undefined') {
    const token = window.localStorage.getItem(TOKEN_STORAGE_KEY)
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
  }

  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const responseMessage = error.response?.data?.message
    const hasSentToken = Boolean(
      error.config?.headers?.Authorization || error.config?.headers?.authorization,
    )

    if (error.response?.status === 401 && hasSentToken) {
      clearStoredSession()
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('sweety:unauthorized'))
      }
    }

    error.userMessage = responseMessage
      || (error.request
        ? 'Unable to reach Sweety. Check your connection and try again.'
        : 'Something went wrong. Please try again.')
    return Promise.reject(error)
  },
)

export function getApiErrorMessage(error) {
  return error?.userMessage
    || error?.response?.data?.message
    || 'Something went wrong. Please try again.'
}

export default api
