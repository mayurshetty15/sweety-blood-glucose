import { AlertCircle, CheckCircle2, Database, LoaderCircle, Upload } from 'lucide-react'
import { useRef, useState } from 'react'
import { toast } from 'react-toastify'
import { getApiErrorMessage } from '../services/api.js'
import { createReading, getReadings } from '../services/readingService.js'
import { getReadingDateKey, getTimeSlotLabel } from '../utils/readingUtils.js'
import demoReadings from './demoReadings.js'

const DEMO_RANGE = {
  start_date: demoReadings[0].reading_date,
  end_date: demoReadings[demoReadings.length - 1].reading_date,
}
const INITIAL_REPORT = {
  processed: 0,
  apiAttempts: 0,
  inserted: 0,
  skipped: 0,
  errors: [],
  completed: false,
}

function getReadingKey(reading) {
  return `${getReadingDateKey(reading.reading_date)}|${reading.time_slot}`
}

function DemoDataImporter({ onImportComplete }) {
  const [isImporting, setIsImporting] = useState(false)
  const [report, setReport] = useState(INITIAL_REPORT)
  const importLock = useRef(false)

  async function handleImport() {
    if (importLock.current) {
      return
    }

    importLock.current = true
    setIsImporting(true)
    setReport(INITIAL_REPORT)

    try {
      const response = await getReadings(DEMO_RANGE)
      if (!Array.isArray(response.data)) {
        throw new Error('The readings response was not in the expected format.')
      }

      const existingKeys = new Set(response.data.map(getReadingKey))
      const result = {
        processed: 0,
        apiAttempts: 0,
        inserted: 0,
        skipped: 0,
        errors: [],
        completed: false,
      }

      for (const reading of demoReadings) {
        const key = getReadingKey(reading)
        if (existingKeys.has(key)) {
          result.skipped += 1
        } else {
          try {
            result.apiAttempts += 1
            await createReading(reading)
            result.inserted += 1
            existingKeys.add(key)
          } catch (error) {
            const message = getApiErrorMessage(error)
            if (error.response?.status === 409 && /already exists/i.test(message)) {
              result.skipped += 1
              existingKeys.add(key)
            } else {
              result.errors.push({
                key,
                message: `${getTimeSlotLabel(reading.time_slot)} on ${reading.reading_date}: ${message}`,
              })
            }
          }
        }

        result.processed += 1
        setReport({ ...result, errors: [...result.errors] })
      }

      result.completed = true
      setReport({ ...result, errors: [...result.errors] })
      if (result.inserted > 0) {
        onImportComplete()
      }

      if (result.errors.length > 0) {
        toast.error(
          `Demo import finished: ${result.inserted} inserted, ${result.skipped} skipped, ${result.errors.length} failed.`,
        )
      } else {
        toast.success(
          `Demo import complete: ${result.inserted} inserted, ${result.skipped} skipped.`,
        )
      }
    } catch (error) {
      const message = getApiErrorMessage(error)
      const failureReport = {
        ...INITIAL_REPORT,
        completed: true,
        errors: [{
          key: 'readings',
          message: `Could not check existing readings for the demo period: ${message}`,
        }],
      }
      setReport(failureReport)
      toast.error(message)
    } finally {
      importLock.current = false
      setIsImporting(false)
    }
  }

  const hasReport = report.completed || report.processed > 0

  return (
    <section className="demo-import" aria-labelledby="demo-import-heading">
      <div className="demo-import__intro">
        <span className="demo-import__icon" aria-hidden="true">
          <Database size={18} />
        </span>
        <div>
          <p className="demo-import__eyebrow">Temporary demo tool</p>
          <h2 id="demo-import-heading">Import Demo Data</h2>
          <p>Add 28 sample readings for November 7–13. Existing date and time slots are skipped.</p>
        </div>
      </div>

      <div className="demo-import__action">
        <button
          className="secondary-button demo-import__button"
          type="button"
          onClick={handleImport}
          disabled={isImporting}
        >
          {isImporting
            ? <LoaderCircle className="button-spinner" size={17} aria-hidden="true" />
            : <Upload size={17} aria-hidden="true" />}
          {isImporting ? 'Importing…' : 'Import Demo Data'}
        </button>
      </div>

      {isImporting && (
        <div className="demo-import__progress">
          <div className="demo-import__progress-label">
            <span>Processing readings</span>
            <span>{report.processed} / {demoReadings.length}</span>
          </div>
          <progress
            max={demoReadings.length}
            value={report.processed}
            aria-label="Demo data import progress"
          />
        </div>
      )}

      {hasReport && (
        <div className="demo-import__report" aria-live="polite">
          <div className="demo-import__counts">
            <span>{report.processed} attempted</span>
            <span>{report.apiAttempts} sent to API</span>
            <span><CheckCircle2 size={15} aria-hidden="true" /> {report.inserted} inserted</span>
            <span>{report.skipped} skipped</span>
            <span className={report.errors.length ? 'has-errors' : ''}>
              {report.errors.length} failed
            </span>
          </div>
          {report.errors.length > 0 && (
            <ul className="demo-import__errors">
              {report.errors.map((error) => (
                <li key={error.key}>
                  <AlertCircle size={15} aria-hidden="true" />
                  <span>{error.message}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  )
}

export default DemoDataImporter
