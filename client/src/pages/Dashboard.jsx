import { Activity, CalendarRange } from 'lucide-react'
import { useRef, useState } from 'react'
import { toast } from 'react-toastify'
import DailySummary from '../components/DailySummary.jsx'
import DemoDataImporter from '../demo/DemoDataImporter.jsx'
import EditReadingModal from '../components/EditReadingModal.jsx'
import ReadingFilters from '../components/ReadingFilters.jsx'
import ReadingForm from '../components/ReadingForm.jsx'
import ReadingsList from '../components/ReadingsList.jsx'
import useAuth from '../context/useAuth.js'
import useReadingFilters from '../hooks/useReadingFilters.js'
import { getApiErrorMessage } from '../services/api.js'
import {
  createReading,
  deleteReading,
  updateReading,
} from '../services/readingService.js'
import { formatDateRange } from '../utils/analyticsUtils.js'
import {
  formatReadingDate,
  getReadingDateKey,
} from '../utils/readingUtils.js'

function Dashboard() {
  const { user } = useAuth()
  const filters = useReadingFilters()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [deletingId, setDeletingId] = useState(null)
  const [editingReading, setEditingReading] = useState(null)
  const [historyRefreshKey, setHistoryRefreshKey] = useState(0)
  const [updatedHistoryReading, setUpdatedHistoryReading] = useState(null)
  const submitLock = useRef(false)
  const periodLabel = formatDateRange(filters.dateRange)
  const readings = filters.isLoading || filters.error ? [] : filters.readings
  const displayName = user?.name?.trim() || 'there'
  const showDemoImporter = import.meta.env.DEV

  function showReadingDate(readingDate) {
    if (readingDate < filters.dateRange.start || readingDate > filters.dateRange.end) {
      filters.applyRange({ start: readingDate, end: readingDate }, 'custom')
    }
  }

  async function handleSave(values, readingId) {
    if (submitLock.current) {
      return
    }

    submitLock.current = true
    setIsSubmitting(true)
    try {
      const response = readingId
        ? await updateReading(readingId, values)
        : await createReading(values)
      toast.success(response.message || 'Reading saved successfully.')
      showReadingDate(values.reading_date)
      filters.refresh()
      if (readingId) {
        setUpdatedHistoryReading(response.data)
        setEditingReading(null)
      } else {
        setHistoryRefreshKey((current) => current + 1)
      }
    } catch (error) {
      toast.error(getApiErrorMessage(error))
    } finally {
      submitLock.current = false
      setIsSubmitting(false)
    }
  }

  async function handleDelete(reading) {
    const dateKey = getReadingDateKey(reading.reading_date)
    const confirmed = window.confirm(
      `Delete your ${reading.time_slot.replaceAll('_', ' ')} reading from ${formatReadingDate(dateKey)}?`,
    )
    if (!confirmed) {
      return false
    }

    setDeletingId(reading.id)
    try {
      const response = await deleteReading(reading.id)
      toast.success(response.message || 'Reading deleted successfully.')
      filters.refresh()
      setHistoryRefreshKey((current) => current + 1)
      return true
    } catch (error) {
      toast.error(getApiErrorMessage(error))
      return false
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="page-content dashboard-content">
      <section className="tracker-welcome">
        <div>
          <p className="section-eyebrow">Your personal glucose overview</p>
          <h1>Welcome back, {displayName}</h1>
          <p className="tracker-welcome__copy">
            Review your recorded readings and notice patterns over time.
          </p>
        </div>
        <div className="welcome-date">
          <span className="welcome-date__icon" aria-hidden="true">
            <CalendarRange size={19} />
          </span>
          <div>
            <span>Currently viewing</span>
            <strong>{periodLabel}</strong>
          </div>
        </div>
      </section>

      <DailySummary
        readings={readings}
        label={`Glucose summary for ${periodLabel}`}
        isLoading={filters.isLoading}
      />

      <ReadingFilters filters={filters} idPrefix="dashboard-filter" />

      {filters.error && (
        <div className="dashboard-load-error" role="alert">
          <span>{filters.error}</span>
          <button className="text-button" type="button" onClick={filters.refresh}>Try again</button>
        </div>
      )}

      <section className="tracker-grid reading-section" aria-label="Glucose reading management">
        <section className="tracker-panel entry-panel" aria-labelledby="add-reading-heading">
          <div className="panel-heading">
            <div>
              <span className="panel-heading__icon" aria-hidden="true">
                <Activity size={18} />
              </span>
              <div>
                <h2 id="add-reading-heading">Add a reading</h2>
                <p>Record a glucose reading for your day.</p>
              </div>
            </div>
          </div>
          <ReadingForm
            initialDate={filters.today}
            isSubmitting={isSubmitting}
            onSubmit={(values) => handleSave(values)}
          />
        </section>

        <ReadingsList
          refreshKey={historyRefreshKey}
          updatedReading={updatedHistoryReading}
          deletingId={deletingId}
          onEdit={setEditingReading}
          onDelete={handleDelete}
        />
      </section>

      {showDemoImporter && (
        <details className="developer-tools">
          <summary>Development-only demo tools</summary>
          <p>Temporary utilities are available only in the development build.</p>
          <DemoDataImporter onImportComplete={filters.refresh} />
        </details>
      )}

      {editingReading && (
        <EditReadingModal
          reading={{
            ...editingReading,
            reading_date: getReadingDateKey(editingReading.reading_date),
          }}
          isSubmitting={isSubmitting}
          onClose={() => {
            if (!isSubmitting) {
              setEditingReading(null)
            }
          }}
          onSave={(values) => handleSave(values, editingReading.id)}
        />
      )}
    </div>
  )
}

export default Dashboard
