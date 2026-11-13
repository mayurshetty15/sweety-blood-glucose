import assert from 'node:assert/strict'
import test from 'node:test'
import {
  buildReportText,
  buildWhatsAppSummary,
  buildWhatsAppUrl,
  getDailyBreakdown,
  getReportRange,
  REPORT_NOTE,
} from '../src/utils/reportUtils.js'
import { filterReadings, summarizeReadings } from '../src/utils/analyticsUtils.js'

const readings = [
  { id: '1', reading_date: '2026-11-12', time_slot: 'morning', value: 90 },
  { id: '2', reading_date: '2026-11-13', time_slot: 'morning', value: 100 },
  { id: '3', reading_date: '2026-11-13', time_slot: 'after_breakfast', value: 155 },
  { id: '4', reading_date: '2026-11-13', time_slot: 'after_lunch', value: 168 },
  { id: '5', reading_date: '2026-11-13', time_slot: 'after_dinner', value: 141 },
]

test('builds daily, weekly, monthly, and custom report ranges without future dates', () => {
  assert.deepEqual(getReportRange('daily', { date: '2026-11-13' }, '2026-11-13'), {
    start: '2026-11-13',
    end: '2026-11-13',
  })
  assert.deepEqual(getReportRange('weekly', { weekEnding: '2026-11-13' }, '2026-11-13'), {
    start: '2026-11-07',
    end: '2026-11-13',
  })
  assert.deepEqual(getReportRange('monthly', { month: '2026-10' }, '2026-11-13'), {
    start: '2026-10-01',
    end: '2026-10-31',
  })
  assert.equal(getReportRange('custom', {
    start: '2026-11-14',
    end: '2026-11-14',
  }, '2026-11-13'), null)
  assert.equal(getReportRange('custom', {
    start: '2026-11-13',
    end: '2026-11-12',
  }, '2026-11-13'), null)
})

test('report calculations consistently apply the selected date range and time slot', () => {
  const range = { start: '2026-11-13', end: '2026-11-13' }
  const morning = filterReadings(readings, range, 'morning')
  const allSlots = filterReadings(readings, range, 'all')

  assert.equal(summarizeReadings(morning).average, 100)
  assert.equal(summarizeReadings(morning).total, 1)
  assert.equal(summarizeReadings(allSlots).average, 141)
  assert.equal(summarizeReadings(allSlots).total, 4)
})

test('daily breakdown uses dashes for missing or unselected time slots', () => {
  const range = { start: '2026-11-12', end: '2026-11-13' }
  const allSlots = getDailyBreakdown(readings, range)
  assert.equal(allSlots.length, 2)
  assert.equal(allSlots[0].morning, 90)
  assert.equal(allSlots[0].after_breakfast, null)
  assert.equal(allSlots[0].average, 90)
  assert.equal(allSlots[1].average, 141)

  const morning = getDailyBreakdown(readings, range, 'morning')
  assert.equal(morning[1].morning, 100)
  assert.equal(morning[1].after_dinner, null)
  assert.equal(morning[1].average, 100)
})

test('builds complete report text and an encoded concise WhatsApp URL', () => {
  const range = { start: '2026-11-13', end: '2026-11-13' }
  const options = {
    userName: 'Demo User',
    timeSlot: 'morning',
    generatedAt: new Date('2026-11-13T18:30:00.000Z'),
  }
  const report = buildReportText(range, readings, options)
  const summary = buildWhatsAppSummary(range, readings, options)
  const url = new URL(buildWhatsAppUrl(summary))

  assert.match(report, /Demo User/)
  assert.match(report, /Morning fasting: 1/)
  assert.match(report, /100 mg\/dL/)
  assert.ok(report.includes(REPORT_NOTE))
  assert.equal(url.origin, 'https://wa.me')
  assert.equal(url.searchParams.get('text'), summary)
  assert.match(summary, /full report can be printed or saved as PDF/i)
  assert.doesNotMatch(summary, /Individual readings:/)
})
