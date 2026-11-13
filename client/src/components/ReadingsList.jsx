import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Pencil,
  RefreshCw,
  RotateCcw,
  Trash2,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { getApiErrorMessage } from '../services/api.js'
import { getReadings } from '../services/readingService.js'
import { getDateRange, isValidDateRange } from '../utils/analyticsUtils.js'
import {
  filterHistoryReadings,
  paginateReadings,
  sortHistoryReadings,
} from '../utils/historyUtils.js'
import {
  formatReadingDate,
  getReadingDateKey,
  getLocalDateValue,
  getTimeSlotLabel,
  TIME_SLOTS,
} from '../utils/readingUtils.js'

const PAGE_SIZES = [5, 10, 20, 50]
const DATE_FILTERS = [
  { value: 'all', label: 'All dates' },
  { value: 'today', label: 'Today' },
  { value: 'yesterday', label: 'Yesterday' },
  { value: 'last7', label: 'Last 7 days' },
  { value: 'last30', label: 'Last 30 days' },
  { value: 'thisMonth', label: 'This month' },
  { value: 'previousMonth', label: 'Previous month' },
  { value: 'custom', label: 'Custom date range' },
]

function ReadingActions({ reading, isDeleting, isDisabled, onEdit, onDelete }) {
  const date = getReadingDateKey(reading.reading_date)
  const slot = getTimeSlotLabel(reading.time_slot)

  return (
    <div className="reading-actions">
      <button
        className="icon-button"
        type="button"
        onClick={() => onEdit(reading)}
        disabled={isDisabled}
        aria-label={`Edit ${slot} reading for ${date}`}
        title="Edit reading"
      >
        <Pencil size={16} aria-hidden="true" />
      </button>
      <button
        className="icon-button icon-button--danger"
        type="button"
        onClick={() => onDelete(reading)}
        disabled={isDisabled}
        aria-label={`Delete ${slot} reading for ${date}`}
        title={isDeleting ? 'Deleting reading' : 'Delete reading'}
      >
        {isDeleting
          ? <RefreshCw className="loading-icon" size={16} aria-hidden="true" />
          : <Trash2 size={16} aria-hidden="true" />}
      </button>
    </div>
  )
}

function ReadingsList({ refreshKey, updatedReading, deletingId, onEdit, onDelete }) {
  const today = getLocalDateValue()
  const [allReadings, setAllReadings] = useState([])
  const [loadState, setLoadState] = useState({ requestKey: '', error: '' })
  const [retryKey, setRetryKey] = useState(0)
  const [dateFilter, setDateFilter] = useState('all')
  const [customRange, setCustomRange] = useState({ start: '', end: '' })
  const [appliedCustomRange, setAppliedCustomRange] = useState(null)
  const [dateFilterError, setDateFilterError] = useState('')
  const [timeSlot, setTimeSlot] = useState('all')
  const [pageSize, setPageSize] = useState(5)
  const [currentPage, setCurrentPage] = useState(1)
  const requestKey = `${refreshKey}|${retryKey}`
  const isLoading = loadState.requestKey !== requestKey
  const error = loadState.requestKey === requestKey ? loadState.error : ''
  const readingsWithUpdate = useMemo(() => (
    updatedReading
      ? allReadings.map((reading) => (
        reading.id === updatedReading.id ? updatedReading : reading
      ))
      : allReadings
  ), [allReadings, updatedReading])
  const sortedReadings = useMemo(
    () => sortHistoryReadings(readingsWithUpdate),
    [readingsWithUpdate],
  )
  const activeRange = dateFilter === 'all'
    ? null
    : dateFilter === 'custom'
      ? appliedCustomRange
      : getDateRange(dateFilter, today)
  const filteredReadings = useMemo(
    () => filterHistoryReadings(sortedReadings, activeRange, timeSlot),
    [sortedReadings, activeRange, timeSlot],
  )
  const pageData = paginateReadings(filteredReadings, currentPage, pageSize)
  const pageReadings = pageData.readings

  useEffect(() => {
    const controller = new AbortController()
    let active = true

    getReadings({}, { signal: controller.signal })
      .then((response) => {
        if (!Array.isArray(response.data)) {
          throw new Error('The readings response was not in the expected format.')
        }
        if (active) {
          setAllReadings(response.data)
          setLoadState({ requestKey, error: '' })
        }
      })
      .catch((requestError) => {
        if (!active || requestError.code === 'ERR_CANCELED') {
          return
        }
        setLoadState({
          requestKey,
          error: getApiErrorMessage(requestError),
        })
      })

    return () => {
      active = false
      controller.abort()
    }
  }, [requestKey])

  function changeDateFilter(event) {
    const nextFilter = event.target.value
    setDateFilter(nextFilter)
    setDateFilterError('')
    setCurrentPage(1)
    if (nextFilter === 'custom') {
      const initialRange = activeRange || getDateRange('last7', today)
      setCustomRange(initialRange)
    } else {
      setAppliedCustomRange(null)
    }
  }

  function applyCustomDates(event) {
    event.preventDefault()
    if (!isValidDateRange(customRange, today)) {
      setDateFilterError('Choose a valid date range that ends today or earlier.')
      return
    }
    setDateFilterError('')
    setAppliedCustomRange(customRange)
    setCurrentPage(1)
  }

  function resetFilters() {
    setDateFilter('all')
    setCustomRange({ start: '', end: '' })
    setAppliedCustomRange(null)
    setDateFilterError('')
    setTimeSlot('all')
    setCurrentPage(1)
  }

  async function deleteReading(reading) {
    const deleted = await onDelete(reading)
    if (deleted) {
      setAllReadings((readings) => readings.filter((item) => item.id !== reading.id))
    }
  }

  function changePageSize(event) {
    setPageSize(Number(event.target.value))
    setCurrentPage(1)
  }

  const activeDateLabel = DATE_FILTERS.find((filter) => filter.value === dateFilter)?.label
  const activeSlotLabel = timeSlot === 'all'
    ? 'All time slots'
    : TIME_SLOTS.find((slot) => slot.value === timeSlot)?.label
  const activeFilterLabel = dateFilter === 'custom' && appliedCustomRange
    ? `${formatReadingDate(appliedCustomRange.start)} – ${formatReadingDate(appliedCustomRange.end)}`
    : activeDateLabel

  return (
    <section className="tracker-panel readings-panel" aria-labelledby="readings-heading">
      <div className="panel-heading">
        <div>
          <h2 id="readings-heading">Reading History</h2>
          <p>Your complete record of glucose readings.</p>
        </div>
        <span className="reading-count">
          {pageData.totalRecords} matching · {allReadings.length} total
        </span>
      </div>

      <div className="history-filters" aria-label="Reading history filters">
        <div className="form-field">
          <label className="form-label" htmlFor="history-date-filter">Date range</label>
          <select
            className="text-control select-control"
            id="history-date-filter"
            value={dateFilter}
            onChange={changeDateFilter}
          >
            {DATE_FILTERS.map((filter) => (
              <option key={filter.value} value={filter.value}>{filter.label}</option>
            ))}
          </select>
        </div>
        {dateFilter === 'custom' && (
          <form className="history-custom-range" onSubmit={applyCustomDates}>
            <div className="form-field">
              <label className="form-label" htmlFor="history-start-date">From</label>
              <input
                className="text-control"
                id="history-start-date"
                type="date"
                max={today}
                value={customRange.start}
                onChange={(event) => setCustomRange((range) => ({
                  ...range,
                  start: event.target.value,
                }))}
                required
              />
            </div>
            <div className="form-field">
              <label className="form-label" htmlFor="history-end-date">To</label>
              <input
                className="text-control"
                id="history-end-date"
                type="date"
                max={today}
                value={customRange.end}
                onChange={(event) => setCustomRange((range) => ({
                  ...range,
                  end: event.target.value,
                }))}
                required
              />
            </div>
            <button className="secondary-button apply-filter" type="submit">Apply dates</button>
          </form>
        )}
        <div className="form-field">
          <label className="form-label" htmlFor="history-time-slot">Time slot</label>
          <select
            className="text-control select-control"
            id="history-time-slot"
            value={timeSlot}
            onChange={(event) => {
              setTimeSlot(event.target.value)
              setCurrentPage(1)
            }}
          >
            <option value="all">All time slots</option>
            {TIME_SLOTS.map((slot) => (
              <option key={slot.value} value={slot.value}>{slot.label}</option>
            ))}
          </select>
        </div>
        <button className="text-button reset-filters" type="button" onClick={resetFilters}>
          <RotateCcw size={15} aria-hidden="true" />
          Reset filters
        </button>
      </div>
      {dateFilterError && (
        <p className="field-error filter-error" role="alert">{dateFilterError}</p>
      )}
      <p className="active-period" aria-live="polite">
        Applied: <strong>{activeFilterLabel}</strong> · {activeSlotLabel}
      </p>

      {isLoading ? (
        <div className="readings-state" role="status">
          <RefreshCw className="loading-icon" size={20} aria-hidden="true" />
          <span>Loading your reading history…</span>
        </div>
      ) : error ? (
        <div className="readings-state readings-state--error" role="alert">
          <p>{error}</p>
          <button
            className="text-button"
            type="button"
            onClick={() => setRetryKey((current) => current + 1)}
          >
            Try again
          </button>
        </div>
      ) : pageData.totalRecords === 0 ? (
        <div className="readings-empty">
          <span className="readings-empty__icon" aria-hidden="true">
            <CalendarDays size={22} />
          </span>
          <h3>{allReadings.length ? 'No readings match these filters' : 'No readings yet'}</h3>
          <p>
            {allReadings.length
              ? 'Try another date range or time slot, or reset your filters.'
              : 'Your glucose readings will appear here after you record them.'}
          </p>
        </div>
      ) : (
        <>
          <div className="reading-history-toolbar">
            <span>Showing {pageData.firstItem}–{pageData.lastItem} of {pageData.totalRecords}</span>
            <label>
              Rows per page
              <select value={pageSize} onChange={changePageSize} aria-label="Rows per page">
                {PAGE_SIZES.map((size) => <option key={size} value={size}>{size}</option>)}
              </select>
            </label>
          </div>

          <div className="reading-table-wrap">
            <table className="reading-table">
            <caption className="visually-hidden">
              Glucose readings for {activeFilterLabel}, {activeSlotLabel}
            </caption>
              <thead>
                <tr>
                  <th scope="col">Date</th>
                  <th scope="col">Time slot</th>
                  <th scope="col">Glucose value (mg/dL)</th>
                  <th scope="col"><span className="visually-hidden">Actions</span></th>
                </tr>
              </thead>
              <tbody>
                {pageReadings.map((reading) => {
                  const dateKey = getReadingDateKey(reading.reading_date)
                  const isDeleting = deletingId === reading.id
                  return (
                    <tr key={reading.id}>
                      <td>{formatReadingDate(dateKey)}</td>
                      <td>
                        <span className={`slot-dot slot-dot--${reading.time_slot}`} aria-hidden="true" />
                        {getTimeSlotLabel(reading.time_slot)}
                      </td>
                      <td><strong>{reading.value}</strong><span className="table-unit">mg/dL</span></td>
                      <td>
                        <ReadingActions
                          reading={reading}
                          isDeleting={isDeleting}
                          isDisabled={Boolean(deletingId)}
                          onEdit={onEdit}
                          onDelete={deleteReading}
                        />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <ul className="reading-cards">
            {pageReadings.map((reading) => {
              const isDeleting = deletingId === reading.id
              return (
                <li className="reading-card" key={reading.id}>
                  <div className="reading-card__top">
                    <span>{formatReadingDate(reading.reading_date)}</span>
                    <strong>{reading.value} <small>mg/dL</small></strong>
                  </div>
                  <div className="reading-card__bottom">
                    <span className="reading-item__slot">
                      <span className={`slot-dot slot-dot--${reading.time_slot}`} aria-hidden="true" />
                      {getTimeSlotLabel(reading.time_slot)}
                    </span>
                    <ReadingActions
                      reading={reading}
                      isDeleting={isDeleting}
                      isDisabled={Boolean(deletingId)}
                      onEdit={onEdit}
                      onDelete={deleteReading}
                    />
                  </div>
                </li>
              )
            })}
          </ul>

          <div className="reading-pagination" aria-label="Reading history pages">
            <span>Page {pageData.currentPage} of {pageData.totalPages}</span>
            <div>
              <button
                className="pagination-button"
                type="button"
                aria-label="Previous page"
                onClick={() => setCurrentPage(Math.max(1, pageData.currentPage - 1))}
                disabled={pageData.currentPage === 1}
              >
                <ChevronLeft size={17} aria-hidden="true" />
              </button>
              <button
                className="pagination-button"
                type="button"
                aria-label="Next page"
                onClick={() => setCurrentPage(Math.min(pageData.totalPages, pageData.currentPage + 1))}
                disabled={pageData.currentPage === pageData.totalPages}
              >
                <ChevronRight size={17} aria-hidden="true" />
              </button>
            </div>
          </div>
        </>
      )}
    </section>
  )
}

export default ReadingsList
