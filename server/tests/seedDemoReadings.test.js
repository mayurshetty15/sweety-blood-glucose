const assert = require('node:assert/strict');
const { test } = require('node:test');
const {
  generateSyntheticReadings,
  seedDemoReadings,
} = require('../scripts/seedDemoReadings');

const FIXED_NOW = new Date(2026, 10, 13, 12);

test('generates 120–150 deterministic readings within the previous month and month-to-date', () => {
  const readings = generateSyntheticReadings(FIXED_NOW);
  const readingsAgain = generateSyntheticReadings(FIXED_NOW);
  const dates = [...new Set(readings.map((reading) => reading.reading_date))];
  const datesWithMissingSlots = dates.filter(
    (date) => readings.filter((reading) => reading.reading_date === date).length < 4,
  );

  assert.equal(readings.length, 132);
  assert.deepEqual(readingsAgain, readings);
  assert.equal(dates[0], '2026-10-01');
  assert.equal(dates[dates.length - 1], '2026-11-13');
  assert.ok(datesWithMissingSlots.length > 0);
  assert.deepEqual(
    new Set(readings.map((reading) => reading.time_slot)),
    new Set(['morning', 'after_breakfast', 'after_lunch', 'after_dinner']),
  );
  assert.ok(readings.every((reading) => Number.isInteger(reading.value)));
  assert.ok(readings.every((reading) => reading.value >= 40 && reading.value <= 600));
  assert.ok(readings.every((reading) => reading.reading_date <= '2026-11-13'));
});

test('inserts only for the existing email user and counts duplicate conflicts', async () => {
  const calls = [];
  const databasePool = {
    async connect() {
      return {
        async query(sql, values) {
          calls.push({ sql, values });
          if (sql === 'BEGIN' || sql === 'COMMIT' || sql === 'ROLLBACK') {
            return { rowCount: 0, rows: [] };
          }
          if (/SELECT id FROM users/.test(sql)) {
            return { rowCount: 1, rows: [{ id: '27' }] };
          }
          assert.match(sql, /INSERT INTO readings/);
          assert.match(sql, /ON CONFLICT \(user_id, reading_date, time_slot\) DO NOTHING/);
          assert.match(sql, /RETURNING id/);
          assert.ok(values.every((value) => value !== undefined));
          assert.ok(values.length <= 200);
          assert.ok(values.every((value, index) => {
            if (index % 4 === 0) {
              return value === '27';
            }
            return true;
          }));
          const batchNumber = calls.filter((call) => /INSERT INTO readings/.test(call.sql)).length;
          const rowCount = batchNumber <= 2 ? 48 : 0;
          return {
            rowCount,
            rows: Array.from({ length: rowCount }, (_, index) => ({ id: index })),
          };
        },
        release() {
          calls.push({ sql: 'RELEASE' });
        },
      };
    },
  };

  const result = await seedDemoReadings({
    databasePool,
    email: '  EXISTING@example.com ',
    now: FIXED_NOW,
  });
  const userLookup = calls.find((call) => /SELECT id FROM users/.test(call.sql));
  const inserts = calls.filter((call) => /INSERT INTO readings/.test(call.sql));

  assert.equal(result.attempted, 132);
  assert.equal(result.inserted, 96);
  assert.equal(result.skipped, 36);
  assert.deepEqual(userLookup.values, ['existing@example.com']);
  assert.ok(inserts.every((call) => call.values.every((_, index) => (
    index % 4 !== 0 || call.values[index] === '27'
  ))));
  assert.equal(calls[0].sql, 'BEGIN');
  assert.equal(calls[calls.length - 2].sql, 'COMMIT');
  assert.equal(calls[calls.length - 1].sql, 'RELEASE');
});

test('creates a demo patient account when explicitly enabled and the email is missing', async () => {
  const calls = [];
  const databasePool = {
    async connect() {
      return {
        async query(sql, values) {
          calls.push({ sql, values });
          if (sql === 'BEGIN' || sql === 'COMMIT' || sql === 'ROLLBACK') {
            return { rowCount: 0, rows: [] };
          }
          if (/SELECT id FROM users/.test(sql)) {
            return { rowCount: 0, rows: [] };
          }
          if (/INSERT INTO users/.test(sql)) {
            return {
              rowCount: 1,
              rows: [{ id: '99', role: 'patient' }],
            };
          }
          if (/INSERT INTO patient_profiles/.test(sql)) {
            return { rowCount: 1, rows: [] };
          }
          assert.match(sql, /INSERT INTO readings/);
          const rowCount = calls.filter((call) => /INSERT INTO readings/.test(call.sql)).length <= 2 ? 48 : 36;
          return {
            rowCount,
            rows: Array.from({ length: rowCount }, (_, index) => ({ id: index })),
          };
        },
        release() {
          calls.push({ sql: 'RELEASE' });
        },
      };
    },
  };

  const result = await seedDemoReadings({
    databasePool,
    email: 'demo.patient@example.com',
    now: FIXED_NOW,
    createDemoUser: true,
    demoUserPassword: 'StrongDemoPassword123',
  });

  assert.equal(result.inserted, 132);
  assert.equal(result.createdDemoUser, true);
  assert.ok(calls.some((call) => /INSERT INTO users/.test(call.sql)));
  assert.ok(calls.some((call) => /INSERT INTO patient_profiles/.test(call.sql)));
  assert.equal(calls[0].sql, 'BEGIN');
  assert.equal(calls[calls.length - 2].sql, 'COMMIT');
  assert.equal(calls[calls.length - 1].sql, 'RELEASE');
});

test('requires a configured email before acquiring a database client', async () => {
  let connected = false;
  const databasePool = {
    async connect() {
      connected = true;
      throw new Error('Database should not be reached.');
    },
  };

  await assert.rejects(
    seedDemoReadings({ databasePool, email: '   ', now: FIXED_NOW }),
    { code: 'SEED_USER_EMAIL_REQUIRED' },
  );
  assert.equal(connected, false);
});

test('rolls back and inserts nothing when the configured email is not found', async () => {
  const calls = [];
  const databasePool = {
    async connect() {
      return {
        async query(sql, values) {
          calls.push({ sql, values });
          if (/SELECT id FROM users/.test(sql)) {
            return { rowCount: 0, rows: [] };
          }
          return { rowCount: 0, rows: [] };
        },
        release() {
          calls.push({ sql: 'RELEASE' });
        },
      };
    },
  };

  await assert.rejects(
    seedDemoReadings({ databasePool, email: 'missing@example.com', now: FIXED_NOW }),
    { code: 'SEED_USER_NOT_FOUND' },
  );

  assert.equal(calls[0].sql, 'BEGIN');
  assert.ok(calls.some((call) => call.sql === 'ROLLBACK'));
  assert.equal(calls.some((call) => /INSERT INTO readings/.test(call.sql)), false);
  assert.equal(calls[calls.length - 1].sql, 'RELEASE');
});
