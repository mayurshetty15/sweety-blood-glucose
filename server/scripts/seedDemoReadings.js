const path = require('path');
const bcrypt = require('bcrypt');

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
const DEMO_PATIENT_NAME = 'Demo Patient';
const DEMO_PATIENT_FULL_NAME = 'Demo Patient';
const DEMO_PATIENT_AGE = 35;
const DEMO_PATIENT_GENDER = 'female';
const DEMO_PATIENT_PHONE = '+919876543210';

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

async function createDemoPatientUser({ client, email, password }) {
  const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
  if (!normalizedEmail) {
    const error = new Error(
      'A valid SEED_USER_EMAIL is required to create the demo patient account.',
    );
    error.code = 'SEED_USER_EMAIL_REQUIRED';
    throw error;
  }

  const normalizedPassword = typeof password === 'string' ? password : '';
  if (!normalizedPassword || normalizedPassword.length < 8) {
    const error = new Error(
      'SEED_USER_PASSWORD must be at least 8 characters when creating the demo patient account.',
    );
    error.code = 'SEED_USER_PASSWORD_REQUIRED';
    throw error;
  }

  const passwordHash = await bcrypt.hash(normalizedPassword, 12);
  const userResult = await client.query(
    `INSERT INTO users (name, email, password, role)
     VALUES ($1, $2, $3, 'patient')
     ON CONFLICT (email) DO NOTHING
     RETURNING id, name, email, role`,
    [DEMO_PATIENT_NAME, normalizedEmail, passwordHash],
  );

  let user = userResult.rows[0];
  if (!user) {
    const existingResult = await client.query(
      'SELECT id, role FROM users WHERE email = $1 FOR UPDATE',
      [normalizedEmail],
    );
    user = existingResult.rows[0];
    if (!user || user.role !== 'patient') {
      const error = new Error(
        'The demo patient email is already assigned to a non-patient account; no seed changes were committed.',
      );
      error.code = 'SEED_USER_ROLE_CONFLICT';
      throw error;
    }
  }

  await client.query(
    `INSERT INTO patient_profiles (
       user_id, full_name, age, gender, phone
     )
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (user_id) DO UPDATE
     SET full_name = EXCLUDED.full_name,
         age = EXCLUDED.age,
         gender = EXCLUDED.gender,
         phone = EXCLUDED.phone`,
    [user.id, DEMO_PATIENT_FULL_NAME, DEMO_PATIENT_AGE, DEMO_PATIENT_GENDER, DEMO_PATIENT_PHONE],
  );

  return user;
}

async function seedDemoReadings({ databasePool = pool, email, now = new Date(), createDemoUser = false, demoUserPassword }) {
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
    let user = userResult.rows[0];

    if (!user) {
      if (!createDemoUser) {
        const error = new Error(
          'No existing user matches SEED_USER_EMAIL. Set CREATE_DEMO_USER=true and SEED_USER_PASSWORD to create the demo patient account automatically.',
        );
        error.code = 'SEED_USER_NOT_FOUND';
        throw error;
      }

      user = await createDemoPatientUser({
        client,
        email: normalizedEmail,
        password: demoUserPassword,
      });
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
      createdUser: !!user && user.id !== undefined && user.id !== null,
      createdDemoUser: createDemoUser && !userResult.rows[0],
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
  const createDemoUser = process.env.CREATE_DEMO_USER === 'true';
  const demoUserPassword = process.env.SEED_USER_PASSWORD;

  if (!email || !email.trim()) {
    console.error(
      'SEED_USER_EMAIL is required. Set it to the email address of your existing Sweety account.',
    );
    process.exitCode = 1;
  } else {
    try {
      const result = await seedDemoReadings({
        email,
        createDemoUser,
        demoUserPassword,
      });
      const summary = result.createdDemoUser
        ? `Demo seed complete: ${result.inserted} readings inserted for a newly created demo patient account.`
        : `Demo seed complete: ${result.inserted} readings inserted; ${result.skipped} existing duplicates skipped.`;
      console.log(summary);
    } catch (error) {
      if (
        ['SEED_USER_NOT_FOUND', 'SEED_USER_EMAIL_REQUIRED', 'SEED_USER_PASSWORD_REQUIRED', 'SEED_USER_ROLE_CONFLICT']
          .includes(error.code)
      ) {
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
