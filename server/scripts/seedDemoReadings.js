const path = require('path');

require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });

const pool = require('../config/db');
const logDatabaseError = require('../config/dbError');

const TIME_SLOTS = [
  'morning',
  'after_breakfast',
  'after_lunch',
  'after_dinner',
];
const BASE_VALUES = [95, 128, 122, 112];
const INSERT_BATCH_SIZE = 50;

function formatLocalDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function generateSyntheticReadings(now = new Date()) {
  if (!(now instanceof Date) || !Number.isFinite(now.getTime())) {
    throw new TypeError('A valid current date is required to generate readings.');
  }

  const firstDay = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dates = [];

  for (
    const date = new Date(firstDay);
    date <= lastDay;
    date.setDate(date.getDate() + 1)
  ) {
    dates.push(new Date(date));
  }

  const targetCount = Math.max(120, Math.round(dates.length * 3));
  const totalReadings = Math.min(
    150,
    dates.length * TIME_SLOTS.length - 1,
    targetCount,
  );
  const readingsPerDay = Math.floor(totalReadings / dates.length);
  const daysWithAdditionalReading = totalReadings % dates.length;
  const readings = [];

  dates.forEach((date, dateIndex) => {
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const dateKey = formatLocalDate(date);
    const firstSlotIndex = (year + month + day) % TIME_SLOTS.length;
    const dailyCount = readingsPerDay + (dateIndex < daysWithAdditionalReading ? 1 : 0);

    for (let offset = 0; offset < dailyCount; offset += 1) {
      const slotIndex = (firstSlotIndex + offset) % TIME_SLOTS.length;
      const dateSeed = year * 10000 + month * 100 + day;
      const variation = ((dateSeed * 17 + slotIndex * 29) % 61) - 30;

      readings.push({
        reading_date: dateKey,
        time_slot: TIME_SLOTS[slotIndex],
        value: Math.max(40, Math.min(600, BASE_VALUES[slotIndex] + variation)),
      });
    }
  });

  return readings;
}

function buildInsertQuery(rows, userId) {
  const values = [];
  const placeholders = rows.map((reading) => {
    const firstParameter = values.length + 1;
    values.push(userId, reading.reading_date, reading.time_slot, reading.value);
    return `($${firstParameter}, $${firstParameter + 1}, $${firstParameter + 2}, $${firstParameter + 3})`;
  });

  return {
    text: `INSERT INTO readings (user_id, reading_date, time_slot, value)
           VALUES ${placeholders.join(', ')}
           ON CONFLICT (user_id, reading_date, time_slot) DO NOTHING
           RETURNING id`,
    values,
  };
}

async function seedDemoReadings({ databasePool = pool, email, now = new Date() }) {
  const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
  if (!normalizedEmail) {
    const error = new Error(
      'SEED_USER_EMAIL is required. Set it to the email address of your existing Sweety account.',
    );
    error.code = 'SEED_USER_EMAIL_REQUIRED';
    throw error;
  }

  const readings = generateSyntheticReadings(now);
  let client;
  let transactionStarted = false;

  try {
    client = await databasePool.connect();
    await client.query('BEGIN');
    transactionStarted = true;

    const userResult = await client.query(
      'SELECT id FROM users WHERE email = $1 LIMIT 1',
      [normalizedEmail],
    );
    const user = userResult.rows[0];
    if (!user) {
      const error = new Error(
        'No existing user matches SEED_USER_EMAIL. Check that it matches your account; no readings were inserted.',
      );
      error.code = 'SEED_USER_NOT_FOUND';
      throw error;
    }

    let inserted = 0;
    for (let offset = 0; offset < readings.length; offset += INSERT_BATCH_SIZE) {
      const batch = readings.slice(offset, offset + INSERT_BATCH_SIZE);
      const query = buildInsertQuery(batch, user.id);
      const result = await client.query(query.text, query.values);
      inserted += result.rowCount;
    }

    await client.query('COMMIT');
    transactionStarted = false;

    return {
      attempted: readings.length,
      inserted,
      skipped: readings.length - inserted,
    };
  } catch (error) {
    if (client && transactionStarted) {
      try {
        await client.query('ROLLBACK');
      } catch (rollbackError) {
        logDatabaseError(rollbackError, 'demo reading seed rollback');
      }
    }
    throw error;
  } finally {
    if (client) {
      client.release();
    }
  }
}

async function main() {
  const email = process.env.SEED_USER_EMAIL;
  if (!email || !email.trim()) {
    console.error(
      'SEED_USER_EMAIL is required. Set it to the email address of your existing Sweety account.',
    );
    process.exitCode = 1;
  } else {
    try {
      const result = await seedDemoReadings({ email });
      console.log(
        `Demo seed complete: ${result.inserted} readings inserted; ${result.skipped} existing duplicates skipped.`,
      );
    } catch (error) {
      if (error.code === 'SEED_USER_NOT_FOUND' || error.code === 'SEED_USER_EMAIL_REQUIRED') {
        console.error(error.message);
      } else {
        logDatabaseError(error, 'demo reading seed');
        console.error('Demo seed failed; no completion count is available.');
      }
      process.exitCode = 1;
    }
  }

  try {
    await pool.end();
  } catch (error) {
    logDatabaseError(error, 'demo reading seed shutdown');
    process.exitCode = 1;
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  generateSyntheticReadings,
  seedDemoReadings,
};
