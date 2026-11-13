const assert = require('node:assert/strict');
const test = require('node:test');
const { dateKeyInTimeZone } = require('../utils/dateUtils');

test('preserves Asia/Kolkata calendar dates across UTC midnight boundaries', () => {
  assert.equal(
    dateKeyInTimeZone(new Date('2026-11-13T18:29:59.999Z'), 'Asia/Kolkata'),
    '2026-11-13',
  );
  assert.equal(
    dateKeyInTimeZone(new Date('2026-11-13T18:30:00.000Z'), 'Asia/Kolkata'),
    '2026-11-14',
  );
});
