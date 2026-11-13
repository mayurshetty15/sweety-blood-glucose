import assert from 'node:assert/strict'
import test from 'node:test'
import {
  filterReadings,
  getDailyTrends,
  getDateRange,
  getTimeSlotAverages,
  getTimeSlotDistribution,
  isValidDateRange,
  summarizeReadings,
} from '../src/utils/analyticsUtils.js'
import { getLocalDateValue } from '../src/utils/readingUtils.js'

test('builds inclusive presets using date-only calendar arithmetic', () => {
  assert.deepEqual(getDateRange('today', '2026-11-13'), {
    start: '2026-11-13',
    end: '2026-11-13',
  })
  assert.deepEqual(getDateRange('yesterday', '2026-11-13'), {
    start: '2026-11-12',
    end: '2026-11-12',
  })
  assert.deepEqual(getDateRange('last7', '2026-11-13'), {
    start: '2026-11-07',
    end: '2026-11-13',
  })
  assert.deepEqual(getDateRange('last30', '2026-11-13'), {
    start: '2026-10-15',
    end: '2026-11-13',
  })
  assert.deepEqual(getDateRange('previousMonth', '2026-01-03'), {
    start: '2025-12-01',
    end: '2025-12-31',
  })
})

test('uses the configured calendar timezone around UTC midnight', () => {
  assert.equal(getLocalDateValue(new Date('2026-11-13T18:29:59.999Z')), '2026-11-13')
  assert.equal(getLocalDateValue(new Date('2026-11-13T18:30:00.000Z')), '2026-11-14')
})

test('rejects invalid, reversed, and future date ranges', () => {
  assert.equal(isValidDateRange({ start: '2026-11-12', end: '2026-11-13' }, '2026-11-13'), true)
  assert.equal(isValidDateRange({ start: '2026-11-14', end: '2026-11-14' }, '2026-11-13'), false)
  assert.equal(isValidDateRange({ start: '2026-11-13', end: '2026-11-12' }, '2026-11-13'), false)
  assert.equal(isValidDateRange({ start: '2026-02-30', end: '2026-02-30' }, '2026-11-13'), false)
})

test('summarizes readings and returns safe empty values', () => {
  assert.deepEqual(summarizeReadings([
    { value: 100 },
    { value: 125 },
    { value: 150 },
  ]), {
    total: 3,
    highest: 150,
    lowest: 100,
    average: 125,
  })
  assert.deepEqual(summarizeReadings([]), {
    total: 0,
    highest: null,
    lowest: null,
    average: null,
  })
})

test('groups readings by their date-only calendar key and calculates real counts', () => {
  const readings = [
    { reading_date: '2026-11-13', time_slot: 'morning', value: 100 },
    { reading_date: '2026-11-13T00:00:00.000Z', time_slot: 'after_lunch', value: 160 },
    { reading_date: '2026-11-12', time_slot: 'after_lunch', value: 140 },
  ]

  assert.deepEqual(getTimeSlotDistribution(readings).map(({ count }) => count), [1, 0, 2, 0])
  assert.deepEqual(getDailyTrends(readings).map(({ date, average, highest, lowest, count }) => ({
    date,
    average,
    highest,
    lowest,
    count,
  })), [
    { date: '2026-11-12', average: 140, highest: 140, lowest: 140, count: 1 },
    { date: '2026-11-13', average: 130, highest: 160, lowest: 100, count: 2 },
  ])
})

test('filters by date and slot, and marks time-slot comparisons with insufficient observations', () => {
  const readings = [
    { reading_date: '2026-11-13', time_slot: 'morning', value: 100 },
    { reading_date: '2026-11-13T00:00:00.000Z', time_slot: 'morning', value: 120 },
    { reading_date: '2026-11-13', time_slot: 'after_dinner', value: 141 },
    { reading_date: '2026-11-12', time_slot: 'morning', value: 110 },
  ]

  assert.deepEqual(
    filterReadings(readings, { start: '2026-11-13', end: '2026-11-13' }, 'morning')
      .map(({ value }) => value),
    [100, 120],
  )

  assert.deepEqual(
    getTimeSlotAverages(readings).map(({ key, average, count, hasSufficientData }) => ({
      key,
      average,
      count,
      hasSufficientData,
    })),
    [
      { key: 'morning', average: 110, count: 3, hasSufficientData: true },
      { key: 'after_breakfast', average: null, count: 0, hasSufficientData: false },
      { key: 'after_lunch', average: null, count: 0, hasSufficientData: false },
      { key: 'after_dinner', average: null, count: 1, hasSufficientData: false },
    ],
  )
})

test('distribution percentages reflect actual counts, including a single populated slot', () => {
  assert.deepEqual(
    getTimeSlotDistribution([
      { time_slot: 'morning', value: 100 },
      { time_slot: 'morning', value: 120 },
      { time_slot: 'after_lunch', value: 150 },
    ]).map(({ count, percentage }) => ({ count, percentage })),
    [
      { count: 2, percentage: 66.7 },
      { count: 0, percentage: 0 },
      { count: 1, percentage: 33.3 },
      { count: 0, percentage: 0 },
    ],
  )
  assert.equal(
    getTimeSlotDistribution([{ time_slot: 'morning', value: 100 }])[0].percentage,
    100,
  )
})
