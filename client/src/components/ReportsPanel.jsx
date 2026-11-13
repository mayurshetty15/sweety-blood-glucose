import { Copy, Printer, Share2 } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'react-toastify'
import AnalyticsCharts from './AnalyticsCharts.jsx'
import useAuth from '../context/useAuth.js'
import useReadingFilters from '../hooks/useReadingFilters.js'
import {
  getTimeSlotDistribution,
  summarizeReadings,
} from '../utils/analyticsUtils.js'
import {
  buildReportText,
  buildWhatsAppSummary,
  buildWhatsAppUrl,
  getDailyBreakdown,
  getReportRange,
  REPORT_NOTE,
} from '../utils/reportUtils.js'
import {
  formatReadingDate,
  getLocalDateValue,
  getTimeSlotLabel,
  TIME_SLOTS,
} from '../utils/readingUtils.js'

const REPORT_TYPES = [
  { value: 'daily', label: 'Daily report' },
  { value: 'weekly', label: 'Weekly report' },
  { value: 'monthly', label: 'Monthly report' },
  { value: 'custom', label: 'Custom date range report' },
]

function ReportsPanel() {
  const { user } = useAuth()
  const today = getLocalDateValue()
  const [reportType, setReportType] = useState('daily')
  const [reportDate, setReportDate] = useState(today)
  const [weekEnding, setWeekEnding] = useState(today)
  const [month, setMonth] = useState(today.slice(0, 7))
  const [customStart, setCustomStart] = useState(today)
  const [customEnd, setCustomEnd] = useState(today)
  const [reportTimeSlot, setReportTimeSlot] = useState('all')
  const [hasGenerated, setHasGenerated] = useState(false)
  const [generatedConfig, setGeneratedConfig] = useState(null)
  const [rangeError, setRangeError] = useState('')
  const filters = useReadingFilters({
    enabled: hasGenerated,
    initialRange: { start: today, end: today },
  })
  const range = generatedConfig?.range
  const readings = hasGenerated && !filters.isLoading && !filters.error
    ? filters.readings
    : []
  const summary = summarizeReadings(readings)
  const slotCounts = getTimeSlotDistribution(readings)
  const breakdown = range
    ? getDailyBreakdown(readings, range, generatedConfig.timeSlot)
    : []
  const reportTypeLabel = REPORT_TYPES.find((type) => type.value === generatedConfig?.type)?.label
    || 'Glucose report'

  function generateReport(event) {
    event.preventDefault()
    const nextRange = getReportRange(reportType, {
      date: reportDate,
      weekEnding,
      month,
      start: customStart,
      end: customEnd,
    }, today)

    if (!nextRange) {
      setRangeError('Choose valid dates that end today or earlier.')
      return
    }

    if (!filters.applyRange(nextRange, 'custom')) {
      setRangeError(filters.dateFilterError)
      return
    }

    filters.setTimeSlot(reportTimeSlot)
    setRangeError('')
    setGeneratedConfig({
      type: reportType,
      range: nextRange,
      timeSlot: reportTimeSlot,
      generatedAt: new Date(),
    })
    setHasGenerated(true)
  }

  function getReportOptions() {
    return {
      userName: user?.name || user?.email || 'Sweety user',
      timeSlot: generatedConfig.timeSlot,
      generatedAt: generatedConfig.generatedAt,
    }
  }

  async function copyReport() {
    const text = buildReportText(range, readings, getReportOptions())
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text)
      } else {
        const textArea = document.createElement('textarea')
        textArea.value = text
        textArea.setAttribute('readonly', '')
        textArea.style.position = 'fixed'
        textArea.style.opacity = '0'
        document.body.append(textArea)
        textArea.select()
        const copied = document.execCommand('copy')
        textArea.remove()
        if (!copied) {
          throw new Error('Clipboard access is unavailable.')
        }
      }
      toast.success('Full report copied to clipboard.')
    } catch {
      toast.error('Unable to copy the report. Please try selecting it manually.')
    }
  }

  function shareReport() {
    const text = buildWhatsAppSummary(range, readings, getReportOptions())
    const openedWindow = window.open(buildWhatsAppUrl(text), '_blank', 'noopener,noreferrer')
    if (!openedWindow) {
      toast.info('WhatsApp could not be opened. You can copy or print the report instead.')
    }
  }

  return (
    <div className="report-workspace">
      <section className="tracker-panel report-builder" aria-labelledby="report-settings-heading">
        <div className="report-builder__heading">
          <div>
            <p className="section-eyebrow">Create a personal summary</p>
            <h2 id="report-settings-heading">Report settings</h2>
          </div>
          <p>Report filters are independent of Dashboard and Analytics.</p>
        </div>
        <form className="report-builder__form" onSubmit={generateReport}>
          <div className="report-builder__fields report-builder__fields--report">
            <div className="form-field">
              <label className="form-label" htmlFor="report-type">Report type</label>
              <select
                className="text-control select-control"
                id="report-type"
                value={reportType}
                onChange={(event) => {
                  setReportType(event.target.value)
                  setRangeError('')
                }}
              >
                {REPORT_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
            </div>

            {reportType === 'daily' && (
              <div className="form-field">
                <label className="form-label" htmlFor="report-date">Date</label>
                <input
                  className="text-control"
                  id="report-date"
                  type="date"
                  max={today}
                  value={reportDate}
                  onChange={(event) => setReportDate(event.target.value)}
                  required
                />
              </div>
            )}

            {reportType === 'weekly' && (
              <div className="form-field">
                <label className="form-label" htmlFor="report-week-ending">Week ending</label>
                <input
                  className="text-control"
                  id="report-week-ending"
                  type="date"
                  max={today}
                  value={weekEnding}
                  onChange={(event) => setWeekEnding(event.target.value)}
                  required
                />
              </div>
            )}

            {reportType === 'monthly' && (
              <div className="form-field">
                <label className="form-label" htmlFor="report-month">Month</label>
                <input
                  className="text-control"
                  id="report-month"
                  type="month"
                  max={today.slice(0, 7)}
                  value={month}
                  onChange={(event) => setMonth(event.target.value)}
                  required
                />
              </div>
            )}

            {reportType === 'custom' && (
              <>
                <div className="form-field">
                  <label className="form-label" htmlFor="report-start">Start date</label>
                  <input
                    className="text-control"
                    id="report-start"
                    type="date"
                    max={today}
                    value={customStart}
                    onChange={(event) => setCustomStart(event.target.value)}
                    required
                  />
                </div>
                <div className="form-field">
                  <label className="form-label" htmlFor="report-end">End date</label>
                  <input
                    className="text-control"
                    id="report-end"
                    type="date"
                    max={today}
                    value={customEnd}
                    onChange={(event) => setCustomEnd(event.target.value)}
                    required
                  />
                </div>
              </>
            )}

            <div className="form-field">
              <label className="form-label" htmlFor="report-time-slot">Time slot</label>
              <select
                className="text-control select-control"
                id="report-time-slot"
                value={reportTimeSlot}
                onChange={(event) => setReportTimeSlot(event.target.value)}
              >
                <option value="all">All time slots</option>
                {TIME_SLOTS.map((slot) => (
                  <option key={slot.value} value={slot.value}>{slot.label}</option>
                ))}
              </select>
            </div>
          </div>
          {rangeError && <p className="field-error" role="alert">{rangeError}</p>}
          <button className="primary-button report-generate" type="submit">Generate report</button>
        </form>
      </section>

      {hasGenerated && (
        <section className="generated-report tracker-panel" aria-live="polite">
          <header className="generated-report__heading">
            <div>
              <p className="section-eyebrow">Generated report</p>
              <h2>{reportTypeLabel}</h2>
            </div>
            <div className="report-actions no-print">
              <button className="secondary-button" type="button" onClick={copyReport}>
                <Copy size={16} aria-hidden="true" />
                <span>Copy full report</span>
              </button>
              <button className="secondary-button" type="button" onClick={shareReport}>
                <Share2 size={16} aria-hidden="true" />
                <span>Share on WhatsApp</span>
              </button>
              <button
                className="secondary-button report-print"
                type="button"
                onClick={() => window.print()}
              >
                <Printer size={16} aria-hidden="true" />
                <span>Print / Save PDF</span>
              </button>
            </div>
          </header>

          <p className="report-sharing-note no-print">
            WhatsApp shares a concise summary; print or save as PDF for the full report. Review the
            message and choose a recipient yourself.
          </p>

          {filters.isLoading ? (
            <p className="report-loading" role="status">Loading report readings…</p>
          ) : filters.error ? (
            <div className="report-empty report-empty--error" role="alert">
              <p>{filters.error}</p>
              <button className="text-button no-print" type="button" onClick={filters.refresh}>
                Try again
              </button>
            </div>
          ) : (
            <>
              <div className="report-information">
                <p><strong>User:</strong> {user?.name || user?.email || 'Sweety user'}</p>
                <p>
                  <strong>Generated:</strong>{' '}
                  {formatReadingDate(getLocalDateValue(generatedConfig.generatedAt), {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </p>
                <p><strong>Date range:</strong> {formatReadingDate(range.start)} – {formatReadingDate(range.end)}</p>
                <p>
                  <strong>Time slot:</strong>{' '}
                  {generatedConfig.timeSlot === 'all'
                    ? 'All time slots'
                    : getTimeSlotLabel(generatedConfig.timeSlot)}
                </p>
              </div>

              {readings.length === 0 ? (
                <div className="report-empty">
                  No readings were recorded in this report period and time slot.
                </div>
              ) : (
                <>
                  <div className="report-summary">
                    <article><span>Total readings</span><strong>{summary.total}</strong></article>
                    <article>
                      <span>Average glucose</span>
                      <strong>{summary.average.toFixed(1)} mg/dL</strong>
                    </article>
                    <article><span>Highest reading</span><strong>{summary.highest} mg/dL</strong></article>
                    <article><span>Lowest reading</span><strong>{summary.lowest} mg/dL</strong></article>
                  </div>

                  <section className="report-detail" aria-labelledby="report-slot-counts">
                    <h3 id="report-slot-counts">Reading count by time slot</h3>
                    <ul className="report-slot-counts">
                      {slotCounts.map((slot) => (
                        <li key={slot.key}>
                          <span>{slot.name}</span>
                          <strong>{slot.count} {slot.count === 1 ? 'reading' : 'readings'}</strong>
                        </li>
                      ))}
                    </ul>
                  </section>

                  <section className="report-detail report-breakdown" aria-labelledby="daily-breakdown-heading">
                    <h3 id="daily-breakdown-heading">Daily breakdown</h3>
                    <div className="report-table-wrap">
                      <table className="report-table">
                        <caption className="visually-hidden">Daily glucose breakdown for this report</caption>
                        <thead>
                          <tr>
                            <th scope="col">Date</th>
                            {TIME_SLOTS.map((slot) => <th key={slot.value} scope="col">{slot.label}</th>)}
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

                  <section className="report-detail" aria-labelledby="report-charts-heading">
                    <h3 id="report-charts-heading">Report charts</h3>
                    <AnalyticsCharts readings={readings} />
                  </section>

                  <section className="report-detail report-history" aria-labelledby="individual-readings-heading">
                    <h3 id="individual-readings-heading">Individual readings</h3>
                    <ul>
                      {[...readings]
                        .sort((first, second) => (
                          first.reading_date.localeCompare(second.reading_date)
                            || TIME_SLOTS.findIndex((slot) => slot.value === first.time_slot)
                              - TIME_SLOTS.findIndex((slot) => slot.value === second.time_slot)
                        ))
                        .map((reading) => (
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

              <p className="report-note">{REPORT_NOTE}</p>
            </>
          )}
        </section>
      )}
    </div>
  )
}

export default ReportsPanel
