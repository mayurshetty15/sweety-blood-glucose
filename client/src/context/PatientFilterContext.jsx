import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import useAuth from './useAuth.js'
import { getDateRange, isValidDateRange } from '../utils/analyticsUtils.js'
import { getLocalDateValue, TIME_SLOTS } from '../utils/readingUtils.js'

const STORAGE_PREFIX = 'sweety-patient-filters'
const RANGE_PRESETS = new Set(['today', 'yesterday', 'last7', 'last30', 'thisMonth', 'previousMonth', 'custom'])

function getDefaultState(today = getLocalDateValue()) {
  const defaultRange = getDateRange('today', today)
  return {
    rangePreset: 'today',
    dateRange: defaultRange,
    customStart: defaultRange.start,
    customEnd: defaultRange.end,
    timeSlot: 'all',
    dateFilterError: '',
  }
}

function getStorageKey(userId) {
  return userId ? `${STORAGE_PREFIX}:${userId}` : null
}

export function clearPatientFiltersForUser(userId) {
  if (typeof window === 'undefined' || !userId) {
    return
  }

  window.localStorage.removeItem(getStorageKey(userId))
}

function normalizeState(rawValue, today = getLocalDateValue()) {
  const fallback = getDefaultState(today)

  if (!rawValue || typeof rawValue !== 'object') {
    return fallback
  }

  const rangePreset = RANGE_PRESETS.has(rawValue.rangePreset)
    ? rawValue.rangePreset
    : fallback.rangePreset
  const defaultRange = getDateRange(rangePreset === 'custom' ? 'today' : rangePreset, today)
  const dateRange = isValidDateRange(rawValue.dateRange, today)
    ? rawValue.dateRange
    : defaultRange
  const customStart = typeof rawValue.customStart === 'string' && rawValue.customStart <= today
    ? rawValue.customStart
    : defaultRange.start
  const customEnd = typeof rawValue.customEnd === 'string' && rawValue.customEnd <= today
    ? rawValue.customEnd
    : defaultRange.end
  const timeSlot = rawValue.timeSlot === 'all' || TIME_SLOTS.some((slot) => slot.value === rawValue.timeSlot)
    ? rawValue.timeSlot || 'all'
    : fallback.timeSlot

  return {
    rangePreset,
    dateRange,
    customStart,
    customEnd,
    timeSlot,
    dateFilterError: '',
  }
}

function readStoredState(user) {
  const today = getLocalDateValue()
  const storageKey = getStorageKey(user?.id)

  if (!storageKey || typeof window === 'undefined') {
    return getDefaultState(today)
  }

  try {
    const rawValue = window.localStorage.getItem(storageKey)
    if (!rawValue) {
      return getDefaultState(today)
    }

    return normalizeState(JSON.parse(rawValue), today)
  } catch {
    return getDefaultState(today)
  }
}

export const PatientFilterContext = createContext(null)

export function PatientFilterProvider({ children }) {
  const { user } = useAuth()
  const [filters, setFilters] = useState(() => readStoredState(user))

  useEffect(() => {
    setFilters(readStoredState(user))
  }, [user?.id])

  useEffect(() => {
    if (!user?.id || typeof window === 'undefined') {
      return undefined
    }

    window.localStorage.setItem(getStorageKey(user.id), JSON.stringify(filters))
    return undefined
  }, [filters, user?.id])

  function applyRange(nextRange, preset = 'custom') {
    const today = getLocalDateValue()
    if (!isValidDateRange(nextRange, today)) {
      return false
    }

    setFilters((current) => ({
      ...current,
      dateRange: nextRange,
      rangePreset: preset,
      customStart: nextRange.start,
      customEnd: nextRange.end,
      dateFilterError: '',
    }))
    return true
  }

  function changePreset(nextPreset) {
    const today = getLocalDateValue()
    setFilters((current) => {
      if (nextPreset === 'custom') {
        return {
          ...current,
          rangePreset: 'custom',
          customStart: current.customStart || current.dateRange.start,
          customEnd: current.customEnd || current.dateRange.end,
          dateFilterError: '',
        }
      }

      const nextRange = getDateRange(nextPreset, today)
      return {
        ...current,
        rangePreset: nextPreset,
        dateRange: nextRange,
        customStart: nextRange.start,
        customEnd: nextRange.end,
        dateFilterError: '',
      }
    })
  }

  function applyCustomRange(event) {
    event.preventDefault()
    const today = getLocalDateValue()
    const nextRange = { start: filters.customStart, end: filters.customEnd }
    const valid = isValidDateRange(nextRange, today)
    if (!valid) {
      setFilters((current) => ({ ...current, dateFilterError: 'Choose a valid date range that ends today or earlier.' }))
      return false
    }

    setFilters((current) => ({
      ...current,
      dateRange: nextRange,
      rangePreset: 'custom',
      customStart: nextRange.start,
      customEnd: nextRange.end,
      dateFilterError: '',
    }))
    return true
  }

  function resetFilters() {
    const today = getLocalDateValue()
    const nextRange = getDateRange('today', today)
    setFilters({
      rangePreset: 'today',
      dateRange: nextRange,
      customStart: nextRange.start,
      customEnd: nextRange.end,
      timeSlot: 'all',
      dateFilterError: '',
    })
  }

  function setTimeSlot(nextTimeSlot) {
    setFilters((current) => ({ ...current, timeSlot: nextTimeSlot }))
  }

  function setCustomStart(nextDate) {
    setFilters((current) => ({ ...current, customStart: nextDate }))
  }

  function setCustomEnd(nextDate) {
    setFilters((current) => ({ ...current, customEnd: nextDate }))
  }

  const value = useMemo(() => ({
    ...filters,
    applyRange,
    changePreset,
    applyCustomRange,
    resetFilters,
    setTimeSlot,
    setCustomStart,
    setCustomEnd,
  }), [filters])

  return <PatientFilterContext.Provider value={value}>{children}</PatientFilterContext.Provider>
}

export function usePatientFilters() {
  const context = useContext(PatientFilterContext)
  if (!context) {
    throw new Error('usePatientFilters must be used within a PatientFilterProvider.')
  }
  return context
}

export function usePatientFiltersOptional() {
  return useContext(PatientFilterContext)
}

export default PatientFilterContext
