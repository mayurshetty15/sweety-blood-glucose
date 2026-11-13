import { ArrowRight, LoaderCircle } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import PasswordField from '../components/PasswordField.jsx'
import useAuth from '../context/useAuth.js'
import AuthLayout from '../layouts/AuthLayout.jsx'
import { getAuthenticatedHome } from '../routes/routePolicy.js'
import { getApiErrorMessage } from '../services/api.js'

function Register() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')

    const normalizedName = name.trim()
    const normalizedEmail = email.trim()
    if (!normalizedName || normalizedName.length > 100) {
      setError('Name must be between 1 and 100 characters.')
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setError('Enter a valid email address.')
      return
    }
    if (password.length < 8 || new TextEncoder().encode(password).length > 72) {
      setError('Password must be at least 8 characters and no more than 72 bytes.')
      return
    }
    if (password !== confirmPassword) {
      setError('The passwords do not match.')
      return
    }

    setIsSubmitting(true)
    try {
      const user = await register({
        name: normalizedName,
        email: normalizedEmail,
        password,
      })
      toast.success('Your Sweety account is ready.')
      navigate(getAuthenticatedHome(user), { replace: true })
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
        <span className="auth-kicker">Get started</span>
        <h2>Create your account</h2>
        <p>A few details to make your personal space yours.</p>
      </div>

      <form className="auth-form" onSubmit={handleSubmit} noValidate>
        <div className="form-field">
          <label className="form-label" htmlFor="register-name">Full name</label>
          <input
            className="text-control"
            id="register-name"
            name="name"
            type="text"
            autoComplete="name"
            maxLength={100}
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
            aria-invalid={Boolean(error)}
          />
        </div>

        <div className="form-field">
          <label className="form-label" htmlFor="register-email">Email address</label>
          <input
            className="text-control"
            id="register-email"
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
          id="register-password"
          label="Password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoComplete="new-password"
        />

        <PasswordField
          id="register-confirm-password"
          label="Confirm password"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          autoComplete="new-password"
        />

        {error && <p className="form-error" role="alert">{error}</p>}

        <button className="primary-button" type="submit" disabled={isSubmitting}>
          {isSubmitting
            ? <LoaderCircle className="button-spinner" size={18} aria-hidden="true" />
            : <span>Create account</span>}
          {!isSubmitting && <ArrowRight size={18} aria-hidden="true" />}
          <span className="visually-hidden">
            {isSubmitting ? 'Creating account' : ''}
          </span>
        </button>
      </form>

      <p className="auth-switch">
        Already have an account? <Link to="/login">Sign in</Link>
      </p>
    </AuthLayout>
  )
}

export default Register
