import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Label,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  getDailyTrends,
  getTimeSlotAverages,
  getTimeSlotDistribution,
} from '../utils/analyticsUtils.js'
import { formatReadingDate } from '../utils/readingUtils.js'

const COLORS = [
  'var(--chart-1)',
  'var(--chart-2)',
  'var(--chart-3)',
  'var(--chart-4)',
]

function DistributionTooltip({ active, payload, total }) {
  if (!active || !payload?.length) {
    return null
  }
  const { name, value } = payload[0]
  const percentage = total ? ((value / total) * 100).toFixed(1) : '0.0'
  return (
    <div className="chart-tooltip">
      <strong>{name}</strong>
      <span>{value} {value === 1 ? 'reading' : 'readings'} · {percentage}%</span>
    </div>
  )
}

function TrendTooltip({ active, payload }) {
  if (!active || !payload?.length) {
    return null
  }
  const point = payload[0].payload
  return (
    <div className="chart-tooltip chart-tooltip--trend">
      <strong>{formatReadingDate(point.date, { weekday: 'short' })}</strong>
      <span>Average: {point.average.toFixed(1)} mg/dL</span>
      <span>Highest: {point.highest} mg/dL</span>
      <span>Lowest: {point.lowest} mg/dL</span>
      <span>{point.count} {point.count === 1 ? 'reading' : 'readings'}</span>
    </div>
  )
}

function SlotAverageTooltip({ active, payload }) {
  if (!active || !payload?.length) {
    return null
  }
  const slot = payload[0].payload
  return (
    <div className="chart-tooltip">
      <strong>{slot.name}</strong>
      {slot.hasSufficientData
        ? <span>Average: {slot.average.toFixed(1)} mg/dL</span>
        : <span>Insufficient data for comparison</span>}
      <span>{slot.count} {slot.count === 1 ? 'reading' : 'readings'}</span>
    </div>
  )
}

function EmptyChart({ isLoading, error, emptyMessage }) {
  if (isLoading) {
    return <div className="chart-empty" role="status">Loading your readings…</div>
  }
  if (error) {
    return (
      <div className="chart-empty chart-empty--error" role="alert">
        Readings could not be loaded. Try again to see your data.
      </div>
    )
  }
  return (
    <div className="chart-empty">
      <p>No readings in this period yet.</p>
      <span>{emptyMessage}</span>
    </div>
  )
}

function AnalyticsCharts({ readings, isLoading = false, error = '' }) {
  const distribution = getTimeSlotDistribution(readings)
  const trends = getDailyTrends(readings)
  const slotAverages = getTimeSlotAverages(readings)
  const total = distribution.reduce((sum, item) => sum + item.count, 0)
  const pieData = distribution.filter((item) => item.count > 0)
  const hasDistribution = pieData.length > 0

  return (
    <div className="analytics-grid analytics-grid--three">
      <article className="tracker-panel analytics-card">
        <div className="analytics-card__heading">
          <h3>Reading distribution by time of day</h3>
          <p>Number and share of recorded readings</p>
        </div>
        {hasDistribution && !isLoading && !error ? (
          <>
            <div className="chart-container chart-container--pie">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="count"
                    nameKey="name"
                    cx="50%"
                    cy="48%"
                    innerRadius={52}
                    outerRadius={78}
                    paddingAngle={pieData.length > 1 ? 3 : 0}
                    stroke="var(--color-surface)"
                    strokeWidth={3}
                  >
                    {pieData.map((item) => (
                      <Cell
                        key={item.key}
                        fill={COLORS[distribution.findIndex((slot) => slot.key === item.key)]}
                      />
                    ))}
                  </Pie>
                  <Tooltip content={<DistributionTooltip total={total} />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <ul className="chart-legend" aria-label="Reading distribution legend">
              {distribution.map((item, index) => (
                <li key={item.key}>
                  <span
                    className="chart-legend__swatch"
                    style={{ backgroundColor: COLORS[index] }}
                    aria-hidden="true"
                  />
                  <span>{item.name}</span>
                  <strong className="chart-legend__count">
                    {item.count} · {item.percentage.toFixed(1)}%
                  </strong>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <EmptyChart
            isLoading={isLoading}
            error={error}
            emptyMessage="Distribution will appear when readings are available."
          />
        )}
      </article>

      <article className="tracker-panel analytics-card">
        <div className="analytics-card__heading">
          <h3>Daily glucose trend</h3>
          <p>Daily average with recorded range (mg/dL)</p>
        </div>
        {trends.length > 0 && !isLoading && !error ? (
          <div className="chart-container">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trends} margin={{ top: 12, right: 12, bottom: 13, left: 3 }}>
                <CartesianGrid stroke="var(--chart-grid)" strokeDasharray="4 4" vertical={false} />
                <XAxis
                  dataKey="date"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: 'var(--chart-label)', fontSize: 11 }}
                  tickFormatter={(date) => formatReadingDate(date, { month: 'short', day: 'numeric' })}
                  interval="preserveStartEnd"
                  minTickGap={18}
                >
                  <Label value="Date" fill="var(--chart-label)" position="insideBottom" offset={-6} />
                </XAxis>
                <YAxis
                  domain={[0, 'auto']}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: 'var(--chart-label)', fontSize: 11 }}
                  width={43}
                >
                  <Label value="Glucose (mg/dL)" fill="var(--chart-label)" angle={-90} position="insideLeft" />
                </YAxis>
                <Tooltip content={<TrendTooltip />} />
                <Line
                  type="monotone"
                  dataKey="average"
                  name="Daily average"
                  stroke="var(--chart-1)"
                  strokeWidth={2.5}
                  activeDot={{ r: 5 }}
                  dot={{ r: 3, fill: 'var(--chart-1)' }}
                  connectNulls={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <EmptyChart
            isLoading={isLoading}
            error={error}
            emptyMessage="Daily averages will appear when readings are available."
          />
        )}
      </article>

      <article className="tracker-panel analytics-card">
        <div className="analytics-card__heading">
          <h3>Average by time slot</h3>
          <p>At least 2 observations are needed for comparison</p>
        </div>
        {total > 0 && !isLoading && !error ? (
          <>
            <div className="chart-container">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={slotAverages} margin={{ top: 12, right: 8, bottom: 10, left: 0 }}>
                  <CartesianGrid stroke="var(--chart-grid)" strokeDasharray="4 4" vertical={false} />
                  <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: 'var(--chart-label)', fontSize: 9 }}
                    interval={0}
                    tickFormatter={(name) => name.replace(' fasting', '')}
                  />
                  <YAxis
                    domain={[0, 'auto']}
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: 'var(--chart-label)', fontSize: 10 }}
                    width={38}
                  />
                  <Tooltip content={<SlotAverageTooltip />} />
                  <Bar dataKey="average" name="Average" fill="var(--chart-2)" radius={[5, 5, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <ul className="slot-average-legend" aria-label="Time-slot average details">
              {slotAverages.map((slot) => (
                <li key={slot.key}>
                  <span>{slot.name}</span>
                  <strong>
                    {slot.hasSufficientData ? `${slot.average.toFixed(1)} mg/dL` : 'Insufficient data'}
                  </strong>
                  <small>{slot.count} {slot.count === 1 ? 'reading' : 'readings'}</small>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <EmptyChart
            isLoading={isLoading}
            error={error}
            emptyMessage="Time-slot averages will appear when readings are available."
          />
        )}
      </article>
    </div>
  )
}

export default AnalyticsCharts
