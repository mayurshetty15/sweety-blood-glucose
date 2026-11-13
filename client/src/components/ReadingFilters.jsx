import { RotateCcw } from 'lucide-react'
import {
  formatDateRange,
  isValidDateRange,
} from '../utils/analyticsUtils.js'
import { TIME_SLOTS } from '../utils/readingUtils.js'

const RANGE_OPTIONS = [
  { value: 'today', label: 'Today' },
  { value: 'yesterday', label: 'Yesterday' },
  { value: 'last7', label: 'Last 7 days' },
  { value: 'last30', label: 'Last 30 days' },
  { value: 'thisMonth', label: 'This month' },
  { value: 'previousMonth', label: 'Previous month' },
  { value: 'custom', label: 'Custom date range' },
]

function ReadingFilters({ filters, idPrefix = 'reading-filter' }) {
  const {
    dateRange,
    rangePreset,
    customStart,
    customEnd,
    timeSlot,
    today,
    dateFilterError,
    setCustomStart,
    setCustomEnd,
    setTimeSlot,
    changePreset,
    applyCustomRange,
    resetFilters,
  } = filters

  return (
    <section className="tracker-panel filter-panel" aria-label="Reading filters">
      <div className="filter-panel__heading">
        <div>
          <h2>Filter readings</h2>
          <p>These filters apply to summaries only; Reading History has separate filters.</p>
        </div>
        <button className="text-button reset-filters" type="button" onClick={resetFilters}>
          <RotateCcw size={15} aria-hidden="true" />
          Reset filters
        </button>
      </div>

      <div className="filter-controls">
        <div className="form-field">
          <label className="form-label" htmlFor={`${idPrefix}-period`}>Date range</label>
          <select
            className="text-control select-control"
            id={`${idPrefix}-period`}
            value={rangePreset}
            onChange={(event) => changePreset(event.target.value)}
          >
            {RANGE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </div>

        {rangePreset === 'custom' && (
          <form className="custom-range-form" onSubmit={applyCustomRange}>
            <div className="form-field">
              <label className="form-label" htmlFor={`${idPrefix}-start`}>From</label>
              <input
                className="text-control"
                id={`${idPrefix}-start`}
                type="date"
                max={today}
                value={customStart}
                onChange={(event) => setCustomStart(event.target.value)}
                required
              />
            </div>
            <div className="form-field">
              <label className="form-label" htmlFor={`${idPrefix}-end`}>To</label>
              <input
                className="text-control"
                id={`${idPrefix}-end`}
                type="date"
                max={today}
                value={customEnd}
                onChange={(event) => setCustomEnd(event.target.value)}
                required
              />
            </div>
            <button className="secondary-button apply-filter" type="submit">Apply dates</button>
          </form>
        )}

        <div className="form-field">
          <label className="form-label" htmlFor={`${idPrefix}-slot`}>Time slot</label>
          <select
            className="text-control select-control"
            id={`${idPrefix}-slot`}
            value={timeSlot}
            onChange={(event) => setTimeSlot(event.target.value)}
          >
            <option value="all">All time slots</option>
            {TIME_SLOTS.map((slot) => (
              <option key={slot.value} value={slot.value}>{slot.label}</option>
            ))}
          </select>
        </div>
      </div>

      {dateFilterError && (
        <p className="field-error filter-error" role="alert">{dateFilterError}</p>
      )}
      {!isValidDateRange(dateRange, today) && (
        <p className="field-error filter-error" role="alert">
          The selected date range is invalid. Reset filters to continue.
        </p>
      )}
      <p className="active-period" aria-live="polite">
        Applied: <strong>{formatDateRange(dateRange)}</strong>
        {timeSlot !== 'all'
          ? ` · ${TIME_SLOTS.find((slot) => slot.value === timeSlot)?.label}`
          : ' · All time slots'}
      </p>
    </section>
  )
}

export default ReadingFilters
