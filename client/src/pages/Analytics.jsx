import { CalendarRange } from 'lucide-react'
import DailySummary from '../components/DailySummary.jsx'
import AnalyticsCharts from '../components/AnalyticsCharts.jsx'
import ReadingFilters from '../components/ReadingFilters.jsx'
import useReadingFilters from '../hooks/useReadingFilters.js'
import { formatDateRange } from '../utils/analyticsUtils.js'

function Analytics() {
  const filters = useReadingFilters()
  const periodLabel = formatDateRange(filters.dateRange)
  const readings = filters.isLoading || filters.error ? [] : filters.readings

  return (
    <div className="page-content analytics-page">
      <section className="page-heading">
        <div>
          <p className="section-eyebrow">Patterns in your records</p>
          <h1>Analytics</h1>
          <p>Explore your recorded readings by date and time slot.</p>
        </div>
        <div className="welcome-date">
          <span className="welcome-date__icon" aria-hidden="true">
            <CalendarRange size={19} />
          </span>
          <div>
            <span>Applied period</span>
            <strong>{periodLabel}</strong>
          </div>
        </div>
      </section>

      <ReadingFilters filters={filters} idPrefix="analytics-filter" />

      {filters.error && (
        <div className="dashboard-load-error" role="alert">
          <span>{filters.error}</span>
          <button className="text-button" type="button" onClick={filters.refresh}>Try again</button>
        </div>
      )}

      <DailySummary
        readings={readings}
        label={`Analytics summary for ${periodLabel}`}
        isLoading={filters.isLoading}
      />

      <section className="dashboard-section analytics-page__charts" aria-labelledby="analytics-heading">
        <div className="dashboard-section__heading">
          <div>
            <p className="section-eyebrow">Descriptive summaries only</p>
            <h2 id="analytics-heading">Recorded glucose patterns</h2>
          </div>
          <p>These charts summarize recorded measurements; they do not provide a medical assessment.</p>
        </div>
        <AnalyticsCharts
          readings={readings}
          isLoading={filters.isLoading}
          error={filters.error}
        />
      </section>
    </div>
  )
}

export default Analytics
