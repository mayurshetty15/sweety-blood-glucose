import { LoaderCircle, Save, UserRound } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import useAuth from '../context/useAuth.js'
import { APP_PATHS } from '../routes/appRoutes.js'
import { getApiErrorMessage } from '../services/api.js'
import { getPatientProfile, updatePatientProfile } from '../services/patientService.js'

const EMPTY_PROFILE = {
  full_name: '',
  age: '',
  gender: '',
  phone: '',
}

function PatientProfile() {
  const { user, updateUser } = useAuth()
  const navigate = useNavigate()
  const [profile, setProfile] = useState(EMPTY_PROFILE)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')
  const [loadError, setLoadError] = useState(false)
  const [loadAttempt, setLoadAttempt] = useState(0)

  useEffect(() => {
    let isCurrent = true

    async function loadProfile() {
      setIsLoading(true)
      setError('')
      setLoadError(false)
      try {
        const response = await getPatientProfile()
        if (isCurrent && response.data) {
          setProfile({
            full_name: response.data.full_name,
            age: String(response.data.age),
            gender: response.data.gender,
            phone: response.data.phone,
          })
        } else if (isCurrent) {
          setProfile((current) => ({ ...current, full_name: user?.name || '' }))
        }
      } catch (requestError) {
        if (isCurrent) {
          setError(getApiErrorMessage(requestError))
          setLoadError(true)
        }
      } finally {
        if (isCurrent) {
          setIsLoading(false)
        }
      }
    }

    loadProfile()
    return () => {
      isCurrent = false
    }
  }, [loadAttempt, user?.name])

  function updateField(field, value) {
    setProfile((current) => ({ ...current, [field]: value }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    const age = Number(profile.age)
    if (!Number.isInteger(age) || age < 1 || age > 120) {
      setError('Age must be a whole number between 1 and 120.')
      return
    }

    setIsSaving(true)
    setError('')
    try {
      const response = await updatePatientProfile({ ...profile, age })
      setProfile({
        full_name: response.data.full_name,
        age: String(response.data.age),
        gender: response.data.gender,
        phone: response.data.phone,
      })
      updateUser({
        name: response.data.full_name,
        profile_complete: true,
      })
      toast.success(response.message || 'Profile saved successfully.')
      if (!user?.profile_complete) {
        navigate(APP_PATHS.dashboard, { replace: true })
      }
    } catch (requestError) {
      const message = getApiErrorMessage(requestError)
      setError(message)
      toast.error(message)
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return <div className="page-loading" role="status">Loading your profile…</div>
  }

  if (loadError) {
    return (
      <div className="dashboard-load-error" role="alert">
        <span>{error}</span>
        <button className="text-button" type="button" onClick={() => setLoadAttempt((attempt) => attempt + 1)}>
          Try again
        </button>
      </div>
    )
  }

  return (
    <div className="page-content patient-profile-page">
      <section className="page-heading">
        <div>
          <p className="section-eyebrow">Patient information</p>
          <h1>Your profile</h1>
          <p>Keep your personal details current. Only you can edit this profile.</p>
        </div>
      </section>

      <section className="tracker-panel patient-profile-panel" aria-labelledby="profile-details-title">
        <div className="panel-heading">
          <div>
            <span className="panel-heading__icon" aria-hidden="true">
              <UserRound size={18} />
            </span>
            <div>
              <h2 id="profile-details-title">Profile details</h2>
              <p>All fields are required to complete your patient profile.</p>
            </div>
          </div>
        </div>

        <form className="patient-profile-form" onSubmit={handleSubmit} noValidate>
          <fieldset disabled={isSaving}>
            <div className="form-field">
              <label className="form-label" htmlFor="patient-full-name">Full name</label>
              <input
                className="text-control"
                id="patient-full-name"
                name="full_name"
                type="text"
                autoComplete="name"
                maxLength={120}
                value={profile.full_name}
                onChange={(event) => updateField('full_name', event.target.value)}
                required
              />
            </div>

            <div className="form-field">
              <label className="form-label" htmlFor="patient-age">Age</label>
              <input
                className="text-control"
                id="patient-age"
                name="age"
                type="number"
                min="1"
                max="120"
                step="1"
                inputMode="numeric"
                value={profile.age}
                onChange={(event) => updateField('age', event.target.value)}
                required
              />
            </div>

            <div className="form-field">
              <label className="form-label" htmlFor="patient-gender">Gender</label>
              <select
                className="text-control select-control"
                id="patient-gender"
                name="gender"
                value={profile.gender}
                onChange={(event) => updateField('gender', event.target.value)}
                required
              >
                <option value="">Select an option</option>
                <option value="female">Female</option>
                <option value="male">Male</option>
                <option value="non_binary">Non-binary</option>
                <option value="other">Other</option>
                <option value="prefer_not_to_say">Prefer not to say</option>
              </select>
            </div>

            <div className="form-field">
              <label className="form-label" htmlFor="patient-phone">Phone number</label>
              <input
                className="text-control"
                id="patient-phone"
                name="phone"
                type="tel"
                autoComplete="tel"
                maxLength={25}
                value={profile.phone}
                onChange={(event) => updateField('phone', event.target.value)}
                aria-describedby="patient-phone-hint"
                required
              />
              <span className="form-hint" id="patient-phone-hint">
                Use an international number with 7 to 15 digits.
              </span>
            </div>
          </fieldset>

          {error && <p className="form-error" role="alert">{error}</p>}

          <button className="primary-button patient-profile-submit" type="submit" disabled={isSaving}>
            {isSaving
              ? <LoaderCircle className="button-spinner" size={18} aria-hidden="true" />
              : <Save size={17} aria-hidden="true" />}
            {isSaving ? 'Saving…' : 'Save profile'}
          </button>
        </form>
      </section>
    </div>
  )
}

export default PatientProfile
