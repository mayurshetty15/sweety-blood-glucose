import { useCallback, useEffect, useState } from 'react'
import { getApiErrorMessage } from '../services/api.js'
import { getReadings } from '../services/readingService.js'
import { filterReadings, getDateRange, isValidDateRange } from '../utils/analyticsUtils.js'
import { getLocalDateValue } from '../utils/readingUtils.js'

function useReadingFilters({
  initialPreset = 'today',
  initialRange,
  initialTimeSlot = 'all',
  enabled = true,
} = {}) {
  const today = getLocalDateValue()
  const [rangePreset, setRangePreset] = useState(initialPreset)
  const [dateRange, setDateRange] = useState(
    () => initialRange || getDateRange(initialPreset, today),
  )
  const [customStart, setCustomStart] = useState(
    () => (initialRange || getDateRange(initialPreset, today)).start,
  )
  const [customEnd, setCustomEnd] = useState(
    () => (initialRange || getDateRange(initialPreset, today)).end,
  )
  const [timeSlot, setTimeSlot] = useState(initialTimeSlot)
  const [dateFilterError, setDateFilterError] = useState('')
  const [allReadings, setAllReadings] = useState([])
  const [loadState, setLoadState] = useState({ requestKey: '', error: '' })
  const [refreshKey, setRefreshKey] = useState(0)
  const requestKey = enabled
    ? `${dateRange.start}|${dateRange.end}|${refreshKey}`
    : 'disabled'
  const isLoading = enabled && loadState.requestKey !== requestKey
  const error = enabled && loadState.requestKey === requestKey ? loadState.error : ''

  useEffect(() => {
    if (!enabled) {
      return undefined
    }

    let active = true
    const controller = new AbortController()

    getReadings({
      start_date: dateRange.start,
      end_date: dateRange.end,
    }, { signal: controller.signal })
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
        setAllReadings([])
        setLoadState({
          requestKey,
          error: getApiErrorMessage(requestError),
        })
      })

    return () => {
      active = false
      controller.abort()
    }
  }, [dateRange.end, dateRange.start, enabled, refreshKey, requestKey])

  const refresh = useCallback(() => {
    setRefreshKey((current) => current + 1)
  }, [])

  function applyRange(nextRange, preset = 'custom') {
    if (!isValidDateRange(nextRange, today)) {
      setDateFilterError('Choose a valid date range that ends today or earlier.')
      return false
    }

    setDateFilterError('')
    setDateRange(nextRange)
    setRangePreset(preset)
    setCustomStart(nextRange.start)
    setCustomEnd(nextRange.end)
    return true
  }

  function changePreset(nextPreset) {
    setDateFilterError('')
    setRangePreset(nextPreset)
    if (nextPreset === 'custom') {
      setCustomStart(dateRange.start)
      setCustomEnd(dateRange.end)
      return
    }
    applyRange(getDateRange(nextPreset, today), nextPreset)
  }

  function applyCustomRange(event) {
    event.preventDefault()
    return applyRange({ start: customStart, end: customEnd }, 'custom')
  }

  function resetFilters() {
    const todayRange = getDateRange('today', today)
    setTimeSlot('all')
    applyRange(todayRange, 'today')
  }

  return {
    allReadings,
    readings: filterReadings(allReadings, dateRange, timeSlot),
    dateRange,
    rangePreset,
    customStart,
    customEnd,
    timeSlot,
    today,
    dateFilterError,
    isLoading,
    error,
    setCustomStart,
    setCustomEnd,
    setTimeSlot,
    changePreset,
    applyRange,
    applyCustomRange,
    resetFilters,
    refresh,
  }
}

export default useReadingFilters
