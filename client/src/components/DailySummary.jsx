import { Activity, ArrowDown, ArrowUp, ListChecks } from 'lucide-react'
import { summarizeReadings } from '../utils/analyticsUtils.js'

function DailySummary({ readings, label = 'Selected period summary', isLoading = false }) {
  const summary = summarizeReadings(readings)
  const cards = [
    {
      title: 'Highest',
      value: isLoading ? '—' : summary.highest ?? '—',
      unit: !isLoading && summary.total ? 'mg/dL' : '',
      icon: ArrowUp,
      className: 'summary-card--high',
    },
    {
      title: 'Lowest',
      value: isLoading ? '—' : summary.lowest ?? '—',
      unit: !isLoading && summary.total ? 'mg/dL' : '',
      icon: ArrowDown,
      className: 'summary-card--low',
    },
    {
      title: 'Average',
      value: isLoading || summary.average == null ? '—' : summary.average.toFixed(1),
      unit: !isLoading && summary.total ? 'mg/dL' : '',
      icon: Activity,
      className: 'summary-card--average',
    },
    {
      title: 'Total readings',
      value: isLoading ? '—' : summary.total,
      unit: isLoading ? '' : summary.total === 1 ? 'reading' : 'readings',
      icon: ListChecks,
      className: 'summary-card--total',
    },
  ]

  return (
    <section className="summary-grid" aria-label={label}>
      {cards.map(({ title, value, unit, icon: Icon, className }) => (
        <article className={`summary-card ${className}`} key={title}>
          <span className="summary-card__icon" aria-hidden="true">
            <Icon size={18} />
          </span>
          <div className="summary-card__content">
            <p>{title}</p>
            <strong>{value}</strong>
            {unit && <span>{unit}</span>}
          </div>
        </article>
      ))}
    </section>
  )
}

export default DailySummary
