import { ArrowRight, LoaderCircle } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import PasswordField from '../components/PasswordField.jsx'
import useAuth from '../context/useAuth.js'
import AuthLayout from '../layouts/AuthLayout.jsx'
import { getApiErrorMessage } from '../services/api.js'

function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')

    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Enter a valid email address.')
      return
    }
    if (!password) {
      setError('Enter your password.')
      return
    }

    setIsSubmitting(true)
    try {
      await login({ email: email.trim(), password })
      toast.success('Welcome back to Sweety.')
      navigate('/dashboard', { replace: true })
    } catch (requestError) {
      const message = getApiErrorMessage(requestError)
      setError(message)
      toast.error(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AuthLayout>
      <div className="auth-heading">
        <span className="auth-kicker">Welcome back</span>
        <h2>Sign in to Sweety</h2>
        <p>Continue to your personal glucose tracker.</p>
      </div>

      <form className="auth-form" onSubmit={handleSubmit} noValidate>
        <div className="form-field">
          <label className="form-label" htmlFor="login-email">Email address</label>
          <input
            className={`text-control${error ? ' has-error' : ''}`}
            id="login-email"
            name="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            aria-invalid={Boolean(error)}
          />
        </div>

        <PasswordField
          id="login-password"
          label="Password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoComplete="current-password"
        />

        {error && <p className="form-error" role="alert">{error}</p>}

        <button className="primary-button" type="submit" disabled={isSubmitting}>
          {isSubmitting
            ? <LoaderCircle className="button-spinner" size={18} aria-hidden="true" />
            : <span>Sign in</span>}
          {!isSubmitting && <ArrowRight size={18} aria-hidden="true" />}
          <span className="visually-hidden">
            {isSubmitting ? 'Signing in' : ''}
          </span>
        </button>
      </form>

      <p className="auth-switch">
        New to Sweety? <Link to="/register">Create an account</Link>
      </p>
    </AuthLayout>
  )
}

export default Login
