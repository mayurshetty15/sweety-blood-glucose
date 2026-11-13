import {
  filterReadings,
  getDateRange,
  getTimeSlotDistribution,
  isValidDateRange,
  summarizeReadings,
} from './analyticsUtils.js'
import {
  formatReadingDate,
  getLocalDateValue,
  getTimeSlotLabel,
  TIME_SLOTS,
} from './readingUtils.js'

export const REPORT_NOTE = 'This report summarizes the glucose readings recorded during the selected period. It is intended for personal tracking and discussion with a qualified healthcare professional. It is not a medical diagnosis.'

function dateKeyInUtc(date) {
  return [
    date.getUTCFullYear(),
    String(date.getUTCMonth() + 1).padStart(2, '0'),
    String(date.getUTCDate()).padStart(2, '0'),
  ].join('-')
}

export function getReportRange(type, selections, today = getLocalDateValue()) {
  let range
  if (type === 'daily') {
    range = { start: selections.date, end: selections.date }
  } else if (type === 'weekly') {
    range = getDateRange('last7', selections.weekEnding)
  } else if (type === 'monthly') {
    const month = selections.month
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month || '')) {
      return null
    }
    const [year, monthNumber] = month.split('-').map(Number)
    const start = `${month}-01`
    const lastDate = dateKeyInUtc(new Date(Date.UTC(year, monthNumber, 0, 12)))
    range = {
      start,
      end: month === today.slice(0, 7) ? today : lastDate,
    }
  } else if (type === 'custom') {
    range = { start: selections.start, end: selections.end }
  } else {
    return null
  }

  return isValidDateRange(range, today) ? range : null
}

export function getDailyBreakdown(readings, range, timeSlot = 'all') {
  const filtered = filterReadings(readings, range, timeSlot)
  const byDate = new Map()

  for (const reading of filtered) {
    const date = reading.reading_date.slice(0, 10)
    const values = byDate.get(date) || new Map()
    values.set(reading.time_slot, Number(reading.value))
    byDate.set(date, values)
  }

  const rows = []
  for (const date of Array.from(byDate.keys()).sort()) {
    const values = byDate.get(date) || new Map()
    const row = { date }
    const dayValues = []

    for (const slot of TIME_SLOTS) {
      const value = timeSlot === 'all' || timeSlot === slot.value
        ? values.get(slot.value) ?? null
        : null
      row[slot.value] = value
      if (value !== null) {
        dayValues.push(value)
      }
    }

    row.average = dayValues.length
      ? Math.round((dayValues.reduce((sum, value) => sum + value, 0) / dayValues.length) * 10) / 10
      : null
    rows.push(row)
  }

  return rows
}

function formatValue(value) {
  return value == null ? '—' : `${value} mg/dL`
}

function reportMetadata(range, {
  userName = 'User',
  timeSlot = 'all',
  generatedAt = new Date(),
} = {}) {
  return [
    `User: ${userName}`,
    `Generated: ${formatReadingDate(getLocalDateValue(generatedAt), {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    })}`,
    `Date range: ${formatReadingDate(range.start)} – ${formatReadingDate(range.end)}`,
    `Time slot: ${timeSlot === 'all' ? 'All time slots' : getTimeSlotLabel(timeSlot)}`,
  ]
}

export function buildReportText(range, readings, options = {}) {
  const filtered = filterReadings(readings, range, options.timeSlot || 'all')
  const summary = summarizeReadings(filtered)
  const distribution = getTimeSlotDistribution(filtered)
  const lines = [
    'Sweety – Blood Glucose Tracker',
    ...reportMetadata(range, options),
    `Total readings: ${summary.total}`,
    `Average glucose: ${formatValue(summary.average)}`,
    `Highest reading: ${formatValue(summary.highest)}`,
    `Lowest reading: ${formatValue(summary.lowest)}`,
    '',
    'Reading count by time slot:',
    ...distribution.map((slot) => `${slot.name}: ${slot.count}`),
    '',
    'Daily breakdown:',
    'Date | Morning fasting | After breakfast | After lunch | After dinner | Daily average',
  ]

  for (const day of getDailyBreakdown(filtered, range, options.timeSlot || 'all')) {
    lines.push([
      formatReadingDate(day.date),
      ...TIME_SLOTS.map((slot) => formatValue(day[slot.value])),
      formatValue(day.average),
    ].join(' | '))
  }

  lines.push('', 'Individual readings:')
  const sortedReadings = [...filtered].sort((first, second) => (
    first.reading_date.localeCompare(second.reading_date)
      || TIME_SLOTS.findIndex((slot) => slot.value === first.time_slot)
        - TIME_SLOTS.findIndex((slot) => slot.value === second.time_slot)
  ))
  if (sortedReadings.length) {
    for (const reading of sortedReadings) {
      lines.push(
        `${formatReadingDate(reading.reading_date)} · ${getTimeSlotLabel(reading.time_slot)} · ${reading.value} mg/dL`,
      )
    }
  } else {
    lines.push('No readings recorded.')
  }

  lines.push('', REPORT_NOTE)
  return lines.join('\n')
}

export function buildWhatsAppSummary(range, readings, options = {}) {
  const filtered = filterReadings(readings, range, options.timeSlot || 'all')
  const summary = summarizeReadings(filtered)
  return [
    'Sweety glucose report summary',
    ...reportMetadata(range, options),
    `Total readings: ${summary.total}`,
    `Average: ${formatValue(summary.average)}`,
    `Highest: ${formatValue(summary.highest)}`,
    `Lowest: ${formatValue(summary.lowest)}`,
    'The full report can be printed or saved as PDF in Sweety.',
    'For personal tracking and discussion with a qualified healthcare professional; not a medical diagnosis.',
  ].join('\n')
}

export function buildWhatsAppUrl(text) {
  return `https://wa.me/?text=${encodeURIComponent(text)}`
}
