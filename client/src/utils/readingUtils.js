export const TIME_SLOTS = [
  { value: 'morning', label: 'Morning fasting' },
  { value: 'after_breakfast', label: 'After breakfast' },
  { value: 'after_lunch', label: 'After lunch' },
  { value: 'after_dinner', label: 'After dinner' },
]

export const APP_TIME_ZONE = import.meta.env?.VITE_APP_TIME_ZONE || 'Asia/Kolkata'

export function getLocalDateValue(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: APP_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date)
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]))
  return `${values.year}-${values.month}-${values.day}`
}

export function getReadingDateKey(value) {
  if (typeof value !== 'string') {
    return ''
  }

  const match = value.match(/^(\d{4}-\d{2}-\d{2})/)
  return match ? match[1] : ''
}

export function formatReadingDate(value, options = {}) {
  const dateKey = getReadingDateKey(value)
  if (!dateKey) {
    return 'Date unavailable'
  }

  const [year, month, day] = dateKey.split('-').map(Number)
  const calendarDate = new Date(Date.UTC(year, month - 1, day, 12))
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: APP_TIME_ZONE,
    ...options,
  }).format(calendarDate)
}

export function getTimeSlotLabel(timeSlot) {
  return TIME_SLOTS.find((slot) => slot.value === timeSlot)?.label
    || 'Other time'
}
