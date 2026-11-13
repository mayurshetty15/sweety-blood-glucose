import { Activity, LoaderCircle, Search, UsersRound } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { DOCTOR_REPORT_ROUTE } from '../routes/appRoutes.js'
import { formatReadingDate } from '../utils/readingUtils.js'
import { getApiErrorMessage } from '../services/api.js'
import { getDoctorPatients } from '../services/doctorService.js'
import useAuth from '../context/useAuth.js'

function DoctorPatients() {
  const { user } = useAuth()
  const [search, setSearch] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [patients, setPatients] = useState([])
  const [totalApprovedPatients, setTotalApprovedPatients] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [loadAttempt, setLoadAttempt] = useState(0)

  useEffect(() => {
    const timer = window.setTimeout(() => setSearchTerm(search.trim()), 250)
    return () => window.clearTimeout(timer)
  }, [search])

  useEffect(() => {
    let isCurrent = true
    async function loadPatients() {
      setIsLoading(true)
      setError('')
      try {
        const response = await getDoctorPatients(searchTerm)
        if (isCurrent) {
          setPatients(response.data.patients)
          setTotalApprovedPatients(response.data.total_approved_patients)
        }
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

    loadPatients()
    return () => {
      isCurrent = false
    }
  }, [loadAttempt, searchTerm])

  const displayName = user?.name || 'Doctor'

  return (
    <div className="page-content doctor-patients-page">
      <section className="page-heading doctor-welcome">
        <div>
          <p className="section-eyebrow">Doctor workspace</p>
          <h1>Welcome, {displayName}</h1>
          <p>Review records only for patients who have approved your access.</p>
        </div>
      </section>

      <section className="doctor-summary-grid" aria-label="Patient overview">
        <article className="tracker-panel doctor-summary-card">
          <span className="doctor-summary-card__icon" aria-hidden="true">
            <UsersRound size={19} />
          </span>
          <div>
            <p>Total approved patients</p>
            <strong>{isLoading ? '—' : totalApprovedPatients}</strong>
          </div>
        </article>
        <article className="tracker-panel doctor-summary-card">
          <span className="doctor-summary-card__icon doctor-summary-card__icon--teal" aria-hidden="true">
            <Activity size={19} />
          </span>
          <div>
            <p>Records in current view</p>
            <strong>{isLoading ? '—' : patients.length}</strong>
          </div>
        </article>
      </section>

      <section className="tracker-panel doctor-patients-panel" aria-labelledby="doctor-patients-heading">
        <div className="doctor-patients-heading">
          <div>
            <p className="section-eyebrow">Authorized patients</p>
            <h2 id="doctor-patients-heading">Patient list</h2>
          </div>
          <div className="doctor-search-control doctor-patient-search">
            <Search size={17} aria-hidden="true" />
            <input
              className="text-control"
              type="search"
              aria-label="Search patients"
              placeholder="Search by patient name"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
        </div>

        {isLoading && (
          <div className="doctor-patients-state" role="status">
            <LoaderCircle className="button-spinner" size={20} aria-hidden="true" />
            Loading approved patients…
          </div>
        )}
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
        {!isLoading && !error && patients.length === 0 && (
          <div className="doctor-patients-state" role="status">
            {searchTerm
              ? 'No authorized patients match this search.'
              : 'No patients have approved access yet.'}
          </div>
        )}
        {!isLoading && !error && patients.length > 0 && (
          <div className="doctor-patient-list">
            {patients.map((patient) => (
              <article className="doctor-patient-row" key={patient.patient_id}>
                <div className="doctor-patient-row__avatar" aria-hidden="true">
                  {(patient.full_name || 'P').charAt(0).toUpperCase()}
                </div>
                <div className="doctor-patient-row__identity">
                  <h3>{patient.full_name}</h3>
                  <p>
                    {patient.age == null ? 'Age not provided' : `${patient.age} years old`}
                    {patient.gender ? ` · ${patient.gender.replaceAll('_', ' ')}` : ''}
                  </p>
                </div>
                <div className="doctor-patient-row__reading">
                  <span>Last reading</span>
                  <strong>
                    {patient.last_reading_date
                      ? formatReadingDate(patient.last_reading_date)
                      : 'No readings yet'}
                  </strong>
                </div>
                <div className="doctor-patient-row__updated">
                  <span>Record updated</span>
                  <strong>
                    {patient.updated_at ? formatReadingDate(patient.updated_at) : 'Date unavailable'}
                  </strong>
                </div>
                <Link
                  className="secondary-button doctor-view-report"
                  to={DOCTOR_REPORT_ROUTE.replace(':patientId', patient.patient_id)}
                >
                  View report
                </Link>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

export default DoctorPatients
