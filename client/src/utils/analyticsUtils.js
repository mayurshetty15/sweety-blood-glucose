import {
  formatReadingDate,
  getLocalDateValue,
  getReadingDateKey,
  TIME_SLOTS,
} from './readingUtils.js'

function shiftDate(dateValue, offset) {
  const [year, month, day] = dateValue.split('-').map(Number)
  const shifted = new Date(Date.UTC(year, month - 1, day + offset, 12))
  return [
    shifted.getUTCFullYear(),
    String(shifted.getUTCMonth() + 1).padStart(2, '0'),
    String(shifted.getUTCDate()).padStart(2, '0'),
  ].join('-')
}

function isCalendarDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false
  }
  const [year, month, day] = value.split('-').map(Number)
  if (year < 1 || month < 1 || month > 12) {
    return false
  }
  const date = new Date(0)
  date.setFullYear(year, month - 1, day)
  date.setHours(12, 0, 0, 0)
  return date.getFullYear() === year
    && date.getMonth() === month - 1
    && date.getDate() === day
}

export function getDateRange(preset, today = getLocalDateValue()) {
  const [year, month] = today.split('-').map(Number)
  const monthStart = `${year}-${String(month).padStart(2, '0')}-01`

  switch (preset) {
    case 'yesterday':
      return { start: shiftDate(today, -1), end: shiftDate(today, -1) }
    case 'last7':
      return { start: shiftDate(today, -6), end: today }
    case 'last30':
      return { start: shiftDate(today, -29), end: today }
    case 'thisMonth':
      return { start: monthStart, end: today }
    case 'previousMonth': {
      const previousMonthEnd = shiftDate(monthStart, -1)
      const previousMonthStart = `${previousMonthEnd.slice(0, 7)}-01`
      return { start: previousMonthStart, end: previousMonthEnd }
    }
    case 'today':
    default:
      return { start: today, end: today }
  }
}

export function isValidDateRange(range, today = getLocalDateValue()) {
  return Boolean(
    isCalendarDate(range?.start)
      && isCalendarDate(range?.end)
      && range.start <= range.end
      && range.start <= today
      && range.end <= today,
  )
}

export function formatDateRange(range) {
  if (!range?.start || !range?.end) {
    return 'Choose a date range'
  }
  if (range.start === range.end) {
    return formatReadingDate(range.start, { weekday: 'long' })
  }
  return `${formatReadingDate(range.start)} – ${formatReadingDate(range.end)}`
}

export function filterReadings(readings, range, timeSlot = 'all') {
  return readings.filter((reading) => {
    const date = getReadingDateKey(reading.reading_date)
    return date >= range.start
      && date <= range.end
      && (timeSlot === 'all' || reading.time_slot === timeSlot)
  })
}

function isValidReading(reading) {
  const value = Number(reading.value)
  return TIME_SLOTS.some((slot) => slot.value === reading.time_slot)
    && Number.isInteger(value)
    && value >= 40
    && value <= 600
}

export function summarizeReadings(readings) {
  const values = readings
    .map((reading) => Number(reading.value))
    .filter((value) => Number.isInteger(value) && value >= 40 && value <= 600)

  if (values.length === 0) {
    return { total: 0, highest: null, lowest: null, average: null }
  }

  const total = values.reduce((sum, value) => sum + value, 0)
  return {
    total: values.length,
    highest: Math.max(...values),
    lowest: Math.min(...values),
    average: Math.round((total / values.length) * 10) / 10,
  }
}

export function getTimeSlotDistribution(readings) {
  const counts = new Map(TIME_SLOTS.map((slot) => [slot.value, 0]))
  for (const reading of readings) {
    if (isValidReading(reading)) {
      counts.set(reading.time_slot, counts.get(reading.time_slot) + 1)
    }
  }
  const total = Array.from(counts.values()).reduce((sum, count) => sum + count, 0)

  return TIME_SLOTS.map((slot) => {
    const count = counts.get(slot.value)
    return {
      key: slot.value,
      name: slot.label,
      count,
      percentage: total ? Math.round((count / total) * 1000) / 10 : 0,
    }
  })
}

export function getDailyTrends(readings) {
  const byDate = new Map()
  for (const reading of readings) {
    const date = getReadingDateKey(reading.reading_date)
    const value = Number(reading.value)
    if (!isCalendarDate(date) || !isValidReading({ ...reading, value })) {
      continue
    }
    const values = byDate.get(date) || []
    values.push(value)
    byDate.set(date, values)
  }

  return Array.from(byDate, ([date, values]) => ({
    date,
    label: formatReadingDate(date, { month: 'short', day: 'numeric' }),
    average: Math.round(
      (values.reduce((sum, value) => sum + value, 0) / values.length) * 10,
    ) / 10,
    highest: Math.max(...values),
    lowest: Math.min(...values),
    count: values.length,
  })).sort((first, second) => first.date.localeCompare(second.date))
}

export function getTimeSlotAverages(readings, minimumObservations = 2) {
  const valuesBySlot = new Map(TIME_SLOTS.map((slot) => [slot.value, []]))

  for (const reading of readings) {
    if (isValidReading(reading)) {
      valuesBySlot.get(reading.time_slot).push(Number(reading.value))
    }
  }

  return TIME_SLOTS.map((slot) => {
    const values = valuesBySlot.get(slot.value)
    const observedAverage = values.length
      ? Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 10) / 10
      : null
    const hasSufficientData = values.length >= minimumObservations
    return {
      key: slot.value,
      name: slot.label,
      count: values.length,
      average: hasSufficientData ? observedAverage : null,
      hasSufficientData,
      minimumObservations,
    }
  })
}

