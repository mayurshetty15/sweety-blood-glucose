import assert from 'node:assert/strict'
import test from 'node:test'
import { getDateRange } from '../src/utils/analyticsUtils.js'
import {
  filterHistoryReadings,
  paginateReadings,
  sortHistoryReadings,
} from '../src/utils/historyUtils.js'

const today = '2026-11-13'
const slots = ['morning', 'after_breakfast', 'after_lunch', 'after_dinner']

function makeReading(id, dayOffset, timeSlot = slots[id % slots.length]) {
  const date = new Date(Date.UTC(2026, 10, 13 - dayOffset))
    .toISOString()
    .slice(0, 10)
  return {
    id: String(id),
    reading_date: date,
    time_slot: timeSlot,
    value: 100 + id,
    created_at: `${date}T08:00:00.000Z`,
  }
}

const readings = [
  ...Array.from({ length: 28 }, (_, index) => makeReading(index + 1, index)),
  makeReading(29, 0, 'morning'),
  makeReading(30, 0, 'after_dinner'),
]

test('shows every date and sorts newest dates and later time slots first', () => {
  const sorted = sortHistoryReadings(readings)

  assert.equal(sorted.length, 30)
  assert.equal(sorted[0].reading_date, today)
  assert.equal(sorted[0].time_slot, 'after_dinner')
  assert.deepEqual(
    sorted.slice(0, 3).map(({ time_slot }) => time_slot),
    ['after_dinner', 'after_breakfast', 'morning'],
  )
  assert.equal(sorted.at(-1).reading_date, '2026-10-17')
})

test('filters today, the last seven days, custom ranges, and time slots', () => {
  const sorted = sortHistoryReadings(readings)

  assert.equal(filterHistoryReadings(sorted, getDateRange('today', today)).length, 3)
  assert.equal(filterHistoryReadings(sorted, getDateRange('last7', today)).length, 9)
  assert.equal(filterHistoryReadings(sorted, {
    start: '2026-11-05',
    end: '2026-11-09',
  }).length, 5)
  assert.ok(filterHistoryReadings(sorted, null, 'after_lunch')
    .every((reading) => reading.time_slot === 'after_lunch'))
  assert.equal(filterHistoryReadings(sorted, null, 'after_lunch').length, 7)
})

test('paginates 25 records across pages and clamps empty or out-of-range pages', () => {
  const fixture = sortHistoryReadings(readings).slice(0, 25)
  const first = paginateReadings(fixture, 1, 10)
  const second = paginateReadings(fixture, 2, 10)
  const third = paginateReadings(fixture, 3, 10)
  const afterDeletion = paginateReadings(fixture.slice(0, 20), 3, 10)
  const empty = paginateReadings([], 3, 10)

  assert.deepEqual(
    [first.totalRecords, first.currentPage, first.totalPages, first.readings.length],
    [25, 1, 3, 10],
  )
  assert.deepEqual(
    [second.currentPage, second.firstItem, second.lastItem, second.readings.length],
    [2, 11, 20, 10],
  )
  assert.deepEqual(
    [third.currentPage, third.readings.length],
    [3, 5],
  )
  assert.equal(afterDeletion.currentPage, 2)
  assert.deepEqual(
    [empty.totalRecords, empty.currentPage, empty.totalPages, empty.firstItem, empty.lastItem],
    [0, 1, 1, 0, 0],
  )
})
