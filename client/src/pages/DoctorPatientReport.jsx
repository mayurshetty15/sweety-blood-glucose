import { CalendarRange, LoaderCircle } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import AnalyticsCharts from '../components/AnalyticsCharts.jsx'
import { getApiErrorMessage } from '../services/api.js'
import { getDoctorPatientReport } from '../services/doctorService.js'
import {
  formatDateRange,
  getDateRange,
  isValidDateRange,
  summarizeReadings,
} from '../utils/analyticsUtils.js'
import { getDailyBreakdown } from '../utils/reportUtils.js'
import {
  APP_TIME_ZONE,
  formatReadingDate,
  getLocalDateValue,
  getTimeSlotLabel,
  TIME_SLOTS,
} from '../utils/readingUtils.js'

const GENDER_LABELS = {
  female: 'Female',
  male: 'Male',
  non_binary: 'Non-binary',
  other: 'Other',
  prefer_not_to_say: 'Prefer not to say',
}

function DoctorPatientReport() {
  const { patientId } = useParams()
  const today = getLocalDateValue()
  const initialRange = getDateRange('last30', today)
  const [range, setRange] = useState(initialRange)
  const [appliedRange, setAppliedRange] = useState(initialRange)
  const [report, setReport] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [rangeError, setRangeError] = useState('')
  const [loadAttempt, setLoadAttempt] = useState(0)

  useEffect(() => {
    let isCurrent = true
    async function loadReport() {
      setIsLoading(true)
      setError('')
      setReport(null)
      try {
        const response = await getDoctorPatientReport(patientId, appliedRange)
        if (isCurrent) {
          setReport(response.data)
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

    loadReport()
    return () => {
      isCurrent = false
    }
  }, [appliedRange, loadAttempt, patientId])

  const readings = report?.readings || []
  const summary = summarizeReadings(readings)
  const breakdown = getDailyBreakdown(readings, appliedRange)
  const patient = report?.patient
  const generatedDate = report?.generated_at
    ? formatReadingDate(getLocalDateValue(new Date(report.generated_at)), {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    })
    : '—'

  function applyDateRange(event) {
    event.preventDefault()
    if (!isValidDateRange(range, today)) {
      setRangeError('Choose a valid date range that ends today or earlier.')
      return
    }
    setRangeError('')
    setAppliedRange({ ...range })
  }

  return (
    <div className="page-content doctor-report-page">
      <section className="page-heading">
        <div>
          <p className="section-eyebrow">Authorized patient report</p>
          <h1>{patient?.full_name || 'Patient report'}</h1>
          <p>Read-only glucose records shared with your account by this patient.</p>
        </div>
        <div className="welcome-date">
          <span className="welcome-date__icon" aria-hidden="true">
            <CalendarRange size={19} />
          </span>
          <div>
            <span>Applied period</span>
            <strong>{formatDateRange(appliedRange)}</strong>
          </div>
        </div>
      </section>

      <section className="tracker-panel doctor-report-filters" aria-label="Report date filters">
        <form className="doctor-report-filter-form" onSubmit={applyDateRange}>
          <div className="form-field">
            <label className="form-label" htmlFor="doctor-report-start">Start date</label>
            <input
              className="text-control"
              id="doctor-report-start"
              type="date"
              max={today}
              value={range.start}
              onChange={(event) => {
                setRange((current) => ({ ...current, start: event.target.value }))
                setRangeError('')
              }}
              required
            />
          </div>
          <div className="form-field">
            <label className="form-label" htmlFor="doctor-report-end">End date</label>
            <input
              className="text-control"
              id="doctor-report-end"
              type="date"
              max={today}
              value={range.end}
              onChange={(event) => {
                setRange((current) => ({ ...current, end: event.target.value }))
                setRangeError('')
              }}
              required
            />
          </div>
          <button className="primary-button doctor-report-apply" type="submit" disabled={isLoading}>
            {isLoading
              ? <LoaderCircle className="button-spinner" size={18} aria-hidden="true" />
              : <CalendarRange size={17} aria-hidden="true" />}
            Apply range
          </button>
        </form>
        {rangeError && <p className="form-error" role="alert">{rangeError}</p>}
      </section>

      {isLoading && <div className="page-loading" role="status">Loading authorized report…</div>}
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
      {!isLoading && !error && report && (
        <section className="tracker-panel generated-report doctor-generated-report">
          <div className="generated-report__heading">
            <div>
              <p className="section-eyebrow">Read-only record summary</p>
              <h2>Glucose report</h2>
            </div>
            <span className="doctor-report-range">{formatDateRange(appliedRange)}</span>
          </div>

          <div className="report-information">
            <p><strong>Patient:</strong> {patient.full_name}</p>
            <p><strong>Age:</strong> {patient.age == null ? 'Not provided' : `${patient.age} years`}</p>
            <p><strong>Gender:</strong> {GENDER_LABELS[patient.gender] || 'Not provided'}</p>
            <p><strong>Phone:</strong> {patient.phone || 'Not provided'}</p>
            <p><strong>Date range:</strong> {formatDateRange(appliedRange)}</p>
            <p><strong>Generated:</strong> {generatedDate} ({APP_TIME_ZONE})</p>
          </div>

          <div className="report-summary">
            <article><span>Total readings</span><strong>{summary.total}</strong></article>
            <article>
              <span>Average glucose</span>
              <strong>{summary.average == null ? '—' : `${summary.average.toFixed(1)} mg/dL`}</strong>
            </article>
            <article>
              <span>Highest glucose</span>
              <strong>{summary.highest == null ? '—' : `${summary.highest} mg/dL`}</strong>
            </article>
            <article>
              <span>Lowest glucose</span>
              <strong>{summary.lowest == null ? '—' : `${summary.lowest} mg/dL`}</strong>
            </article>
          </div>

          {readings.length === 0 ? (
            <div className="report-empty doctor-report-empty" role="status">
              No glucose readings were recorded in this date range.
            </div>
          ) : (
            <>
              <section className="report-detail" aria-labelledby="doctor-daily-breakdown">
                <h3 id="doctor-daily-breakdown">Daily readings</h3>
                <div className="report-table-wrap">
                  <table className="report-table">
                    <caption className="visually-hidden">Patient daily glucose readings</caption>
                    <thead>
                      <tr>
                        <th scope="col">Date</th>
                        {TIME_SLOTS.map((slot) => (
                          <th key={slot.value} scope="col">{slot.label}</th>
                        ))}
                        <th scope="col">Daily average</th>
                      </tr>
                    </thead>
                    <tbody>
                      {breakdown.map((day) => (
                        <tr key={day.date}>
                          <th scope="row">{formatReadingDate(day.date)}</th>
                          {TIME_SLOTS.map((slot) => (
                            <td key={slot.value}>
                              {day[slot.value] == null ? '—' : `${day[slot.value]} mg/dL`}
                            </td>
                          ))}
                          <td>{day.average == null ? '—' : `${day.average.toFixed(1)} mg/dL`}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>

              <section className="report-detail" aria-labelledby="doctor-report-charts">
                <h3 id="doctor-report-charts">Recorded glucose charts</h3>
                <AnalyticsCharts readings={readings} readingOwner="patient" />
              </section>

              <section className="report-detail doctor-individual-readings" aria-labelledby="doctor-individual-readings">
                <h3 id="doctor-individual-readings">Individual readings</h3>
                <ul>
                  {readings.map((reading) => (
                    <li key={reading.id}>
                      <span>{formatReadingDate(reading.reading_date)}</span>
                      <span>{getTimeSlotLabel(reading.time_slot)}</span>
                      <strong>{reading.value} mg/dL</strong>
                    </li>
                  ))}
                </ul>
              </section>
            </>
          )}

          <p className="report-note">
            This report summarizes recorded glucose readings and is intended to support discussion
            with a qualified healthcare professional. It is not a diagnosis or treatment recommendation.
          </p>
        </section>
      )}
    </div>
  )
}

export default DoctorPatientReport
