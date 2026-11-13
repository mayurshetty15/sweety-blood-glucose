import {
  Building2,
  Check,
  LoaderCircle,
  MapPin,
  Search,
  ShieldCheck,
  ShieldOff,
  UserRound,
  X,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { toast } from 'react-toastify'
import { getApiErrorMessage } from '../services/api.js'
import {
  approveDoctorAccess,
  getDoctorAccess,
  getDoctors,
  revokeDoctorAccess,
} from '../services/patientService.js'

const ACCESS_LABELS = {
  pending: 'Pending',
  approved: 'Approved',
  revoked: 'Revoked',
}

function PatientDoctors() {
  const [doctors, setDoctors] = useState([])
  const [accessByDoctorId, setAccessByDoctorId] = useState({})
  const [search, setSearch] = useState('')
  const [specialization, setSpecialization] = useState('')
  const [selectedDoctor, setSelectedDoctor] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')
  const [loadAttempt, setLoadAttempt] = useState(0)

  useEffect(() => {
    let isCurrent = true
    async function loadDirectory() {
      setIsLoading(true)
      setError('')
      try {
        const [doctorResponse, accessResponse] = await Promise.all([
          getDoctors(),
          getDoctorAccess(),
        ])
        if (!isCurrent) {
          return
        }

        const access = Object.fromEntries(
          accessResponse.data.map((entry) => [String(entry.doctor_id), entry]),
        )
        setDoctors(doctorResponse.data)
        setAccessByDoctorId(access)
      } catch (requestError) {
        if (isCurrent) {
          setError(getApiErrorMessage(requestError))
        }
      } finally {
        if (isCurrent) {
          setIsLoading(false)
        }
      }
    }

    loadDirectory()
    return () => {
      isCurrent = false
    }
  }, [loadAttempt])

  const specializations = useMemo(
    () => [...new Set(doctors.map((doctor) => doctor.specialization))].sort(),
    [doctors],
  )

  const visibleDoctors = useMemo(() => {
    const query = search.trim().toLowerCase()
    return doctors.filter((doctor) => {
      const matchesSpecialization = !specialization || doctor.specialization === specialization
      const searchableText = [
        doctor.doctor_name,
        doctor.specialization,
        doctor.qualification,
        doctor.clinic_name,
        doctor.location,
      ].join(' ').toLowerCase()
      return matchesSpecialization && (!query || searchableText.includes(query))
    })
  }, [doctors, search, specialization])

  async function handleApprove() {
    if (!selectedDoctor || isSaving) {
      return
    }

    setIsSaving(true)
    try {
      const response = await approveDoctorAccess(selectedDoctor.doctor_id)
      setAccessByDoctorId((current) => ({
        ...current,
        [String(selectedDoctor.doctor_id)]: {
          ...current[String(selectedDoctor.doctor_id)],
          ...response.data,
        },
      }))
      toast.success('Doctor access approved.')
      setSelectedDoctor(null)
    } catch (requestError) {
      toast.error(getApiErrorMessage(requestError))
    } finally {
      setIsSaving(false)
    }
  }

  async function handleRevoke(doctor) {
    const confirmed = window.confirm(
      `Revoke ${doctor.doctor_name}'s access to your glucose readings and reports?`,
    )
    if (!confirmed) {
      return
    }

    setIsSaving(true)
    try {
      const response = await revokeDoctorAccess(doctor.doctor_id)
      setAccessByDoctorId((current) => ({
        ...current,
        [String(doctor.doctor_id)]: {
          ...current[String(doctor.doctor_id)],
          ...response.data,
        },
      }))
      toast.success('Doctor access revoked.')
    } catch (requestError) {
      toast.error(getApiErrorMessage(requestError))
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="page-content doctors-directory-page">
      <section className="page-heading">
        <div>
          <p className="section-eyebrow">Your care connections</p>
          <h1>Doctor directory</h1>
          <p>Access is not shared unless you explicitly authorize a doctor.</p>
        </div>
      </section>

      <section className="tracker-panel doctors-directory-panel" aria-label="Find a doctor">
        <div className="doctor-directory-filters">
          <div className="form-field">
            <label className="form-label" htmlFor="doctor-search">Search doctors</label>
            <div className="doctor-search-control">
              <Search size={17} aria-hidden="true" />
              <input
                className="text-control"
                id="doctor-search"
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Name, clinic, or location"
              />
            </div>
          </div>
          <div className="form-field">
            <label className="form-label" htmlFor="doctor-specialization">Specialization</label>
            <select
              className="text-control select-control"
              id="doctor-specialization"
              value={specialization}
              onChange={(event) => setSpecialization(event.target.value)}
            >
              <option value="">All specializations</option>
              {specializations.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
          </div>
        </div>
      </section>

      {isLoading && <div className="page-loading" role="status">Loading doctors…</div>}
      {!isLoading && error && (
        <div className="dashboard-load-error" role="alert">
          <span>{error}</span>
          <button
            className="text-button"
            type="button"
            onClick={() => setLoadAttempt((attempt) => attempt + 1)}
          >
            Try again
          </button>
        </div>
      )}
      {!isLoading && !error && visibleDoctors.length === 0 && (
        <div className="readings-state" role="status">
          <p>{doctors.length ? 'No doctors match these filters.' : 'No doctors are available right now.'}</p>
        </div>
      )}

      {!isLoading && !error && visibleDoctors.length > 0 && (
        <section className="doctor-directory-grid" aria-label="Available doctors">
          {visibleDoctors.map((doctor) => {
            const access = accessByDoctorId[String(doctor.doctor_id)]
            const status = access?.status || 'not_connected'
            const statusLabel = ACCESS_LABELS[status] || 'Not connected'
            const initial = doctor.doctor_name.replace(/^Dr\.\s*/i, '').charAt(0).toUpperCase()

            return (
              <article className="tracker-panel doctor-card" key={doctor.doctor_id}>
                <div className="doctor-card__identity">
                  <span className="doctor-avatar" aria-hidden="true">{initial}</span>
                  <div>
                    <h2>{doctor.doctor_name}</h2>
                    <p>{doctor.specialization}</p>
                  </div>
                </div>
                <dl className="doctor-card__details">
                  <div><dt>Qualification</dt><dd>{doctor.qualification}</dd></div>
                  <div><dt>Experience</dt><dd>{doctor.experience_years} years</dd></div>
                  <div>
                    <dt>Clinic</dt>
                    <dd><Building2 size={15} aria-hidden="true" />{doctor.clinic_name}</dd>
                  </div>
                  <div>
                    <dt>Location</dt>
                    <dd><MapPin size={15} aria-hidden="true" />{doctor.location}</dd>
                  </div>
                </dl>
                <div className="doctor-card__footer">
                  <span className={`doctor-access-status doctor-access-status--${status}`}>
                    {status === 'approved'
                      ? <ShieldCheck size={15} aria-hidden="true" />
                      : status === 'revoked'
                        ? <ShieldOff size={15} aria-hidden="true" />
                        : <UserRound size={15} aria-hidden="true" />}
                    {statusLabel}
                  </span>
                  {status === 'approved' ? (
                    <button
                      className="secondary-button"
                      type="button"
                      onClick={() => handleRevoke(doctor)}
                      disabled={isSaving}
                    >
                      Revoke access
                    </button>
                  ) : (
                    <button
                      className="primary-button doctor-authorize-button"
                      type="button"
                      onClick={() => setSelectedDoctor(doctor)}
                    >
                      {status === 'pending' ? 'Review request' : 'Authorize access'}
                    </button>
                  )}
                </div>
              </article>
            )
          })}
        </section>
      )}

      {selectedDoctor && (
        <div className="modal-backdrop">
          <section
            className="edit-modal consent-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="consent-modal-title"
          >
            <div className="edit-modal__heading">
              <div>
                <p className="section-eyebrow">Patient consent</p>
                <h2 id="consent-modal-title">Authorize {selectedDoctor.doctor_name}?</h2>
              </div>
              <button
                className="icon-button"
                type="button"
                aria-label="Close consent dialog"
                onClick={() => setSelectedDoctor(null)}
                disabled={isSaving}
              >
                <X size={18} aria-hidden="true" />
              </button>
            </div>
            <p className="consent-modal__copy">
              I authorize this doctor to view my recorded glucose readings and reports. I understand
              that I can revoke access at any time.
            </p>
            <div className="consent-modal__actions">
              <button
                className="secondary-button"
                type="button"
                onClick={() => setSelectedDoctor(null)}
                disabled={isSaving}
              >
                Cancel
              </button>
              <button
                className="primary-button"
                type="button"
                onClick={handleApprove}
                disabled={isSaving}
              >
                {isSaving
                  ? <LoaderCircle className="button-spinner" size={18} aria-hidden="true" />
                  : <Check size={17} aria-hidden="true" />}
                {isSaving ? 'Saving consent…' : 'I authorize access'}
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  )
}

export default PatientDoctors
