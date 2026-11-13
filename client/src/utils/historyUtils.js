import { getReadingDateKey, TIME_SLOTS } from './readingUtils.js'

const timeSlotOrder = new Map(TIME_SLOTS.map((slot, index) => [slot.value, index]))

export function sortHistoryReadings(readings) {
  return [...readings].sort((first, second) => {
    const dateOrder = getReadingDateKey(second.reading_date)
      .localeCompare(getReadingDateKey(first.reading_date))
    if (dateOrder !== 0) {
      return dateOrder
    }

    const slotOrder = (timeSlotOrder.get(second.time_slot) ?? -1)
      - (timeSlotOrder.get(first.time_slot) ?? -1)
    if (slotOrder !== 0) {
      return slotOrder
    }

    const createdAtOrder = (second.created_at || '').localeCompare(first.created_at || '')
    return createdAtOrder || String(second.id).localeCompare(String(first.id), undefined, {
      numeric: true,
    })
  })
}

export function filterHistoryReadings(readings, range, timeSlot = 'all') {
  return readings.filter((reading) => {
    const date = getReadingDateKey(reading.reading_date)
    return (!range?.start || date >= range.start)
      && (!range?.end || date <= range.end)
      && (timeSlot === 'all' || reading.time_slot === timeSlot)
  })
}

export function paginateReadings(readings, requestedPage, pageSize) {
  const totalRecords = readings.length
  const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize))
  const currentPage = Math.min(Math.max(1, requestedPage), totalPages)
  const startIndex = (currentPage - 1) * pageSize

  return {
    readings: readings.slice(startIndex, startIndex + pageSize),
    totalRecords,
    currentPage,
    totalPages,
    firstItem: totalRecords ? startIndex + 1 : 0,
    lastItem: Math.min(startIndex + pageSize, totalRecords),
  }
}
