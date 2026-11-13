const path = require('path');

require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });

const bcrypt = require('bcrypt');
const pool = require('../config/db');
const logDatabaseError = require('../config/dbError');

const SALT_ROUNDS = 12;

const DEMO_DOCTORS = [
  {
    name: 'Dr. Ananya Rao',
    email: 'ananya.rao@demo.sweety.test',
    specialization: 'Endocrinologist',
    qualification: 'MBBS, MD (Fictional)',
    experience_years: 8,
    clinic_name: 'Sweety Demo Clinic North',
    location: 'Demo City, India',
  },
  {
    name: 'Dr. Rahul Mehta',
    email: 'rahul.mehta@demo.sweety.test',
    specialization: 'General Physician',
    qualification: 'MBBS (Fictional)',
    experience_years: 6,
    clinic_name: 'Sweety Demo Clinic Central',
    location: 'Demo City, India',
  },
  {
    name: 'Dr. Priya Nair',
    email: 'priya.nair@demo.sweety.test',
    specialization: 'Diabetologist',
    qualification: 'MBBS, Diploma in Diabetes (Fictional)',
    experience_years: 10,
    clinic_name: 'Sweety Demo Clinic South',
    location: 'Demo City, India',
  },
  {
    name: 'Dr. Arjun Sharma',
    email: 'arjun.sharma@demo.sweety.test',
    specialization: 'Internal Medicine',
    qualification: 'MBBS, MD (Fictional)',
    experience_years: 7,
    clinic_name: 'Sweety Demo Clinic East',
    location: 'Demo City, India',
  },
  {
    name: 'Dr. Sneha Iyer',
    email: 'sneha.iyer@demo.sweety.test',
    specialization: 'Endocrinologist',
    qualification: 'MBBS, DM (Fictional)',
    experience_years: 9,
    clinic_name: 'Sweety Demo Clinic West',
    location: 'Demo City, India',
  },
];

function validateSeedPassword(password) {
  if (
    typeof password !== 'string' ||
    password.length < 12 ||
    Buffer.byteLength(password, 'utf8') > 72
  ) {
    const error = new Error(
      'DEMO_DOCTOR_PASSWORD must be at least 12 characters and no more than 72 UTF-8 bytes.',
    );
    error.code = 'DEMO_DOCTOR_PASSWORD_INVALID';
    throw error;
  }
}

async function seedDemoDoctors({
  databasePool = pool,
  password,
  enabled,
  bcryptImplementation = bcrypt,
}) {
  if (enabled !== true) {
    const error = new Error('Set ENABLE_DEMO_DOCTOR_SEED=true to run the demo doctor seed.');
    error.code = 'DEMO_DOCTOR_SEED_DISABLED';
    throw error;
  }
  validateSeedPassword(password);

  let client;
  let transactionStarted = false;

  try {
    client = await databasePool.connect();
    await client.query('BEGIN');
    transactionStarted = true;

    let created = 0;
    for (const doctor of DEMO_DOCTORS) {
      const passwordHash = await bcryptImplementation.hash(password, SALT_ROUNDS);
      const userResult = await client.query(
        `INSERT INTO users (name, email, password, role)
         VALUES ($1, $2, $3, 'doctor')
         ON CONFLICT (email) DO NOTHING
         RETURNING id, role`,
        [doctor.name, doctor.email, passwordHash],
      );
      let user = userResult.rows[0];

      if (!user) {
        const existingResult = await client.query(
          'SELECT id, role FROM users WHERE email = $1 FOR UPDATE',
          [doctor.email],
        );
        user = existingResult.rows[0];
        if (!user || user.role !== 'doctor') {
          const error = new Error(
            'A demo doctor email is already assigned to a non-doctor account; no seed changes were committed.',
          );
          error.code = 'DEMO_DOCTOR_EMAIL_CONFLICT';
          throw error;
        }
      } else {
        created += 1;
      }

      await client.query(
        `INSERT INTO doctor_profiles (
           user_id, doctor_name, specialization, qualification,
           experience_years, clinic_name, location, is_active
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, TRUE)
         ON CONFLICT (user_id) DO UPDATE
         SET doctor_name = EXCLUDED.doctor_name,
             specialization = EXCLUDED.specialization,
             qualification = EXCLUDED.qualification,
             experience_years = EXCLUDED.experience_years,
             clinic_name = EXCLUDED.clinic_name,
             location = EXCLUDED.location,
             is_active = TRUE`,
        [
          user.id,
          doctor.name,
          doctor.specialization,
          doctor.qualification,
          doctor.experience_years,
          doctor.clinic_name,
          doctor.location,
        ],
      );
    }

    await client.query('COMMIT');
    transactionStarted = false;
    return { accountsCreated: created, profilesSeeded: DEMO_DOCTORS.length };
  } catch (error) {
    if (client && transactionStarted) {
      try {
        await client.query('ROLLBACK');
      } catch (rollbackError) {
        logDatabaseError(rollbackError, 'demo doctor seed rollback');
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
  try {
    if (process.env.ENABLE_DEMO_DOCTOR_SEED !== 'true') {
      throw Object.assign(
        new Error('Set ENABLE_DEMO_DOCTOR_SEED=true to run the demo doctor seed.'),
        { code: 'DEMO_DOCTOR_SEED_DISABLED' },
      );
    }
    const result = await seedDemoDoctors({
      enabled: true,
      password: process.env.DEMO_DOCTOR_PASSWORD,
    });
    console.log(
      `Demo doctors seeded: ${result.accountsCreated} accounts created; ${result.profilesSeeded} fictional profiles ready.`,
    );
  } catch (error) {
    if (
      ['DEMO_DOCTOR_SEED_DISABLED', 'DEMO_DOCTOR_PASSWORD_INVALID', 'DEMO_DOCTOR_EMAIL_CONFLICT']
        .includes(error.code)
    ) {
      console.error(error.message);
    } else {
      logDatabaseError(error, 'demo doctor seed');
      console.error('Demo doctor seed failed; no completion count is available.');
    }
    process.exitCode = 1;
  }

  try {
    await pool.end();
  } catch (error) {
    logDatabaseError(error, 'demo doctor seed shutdown');
    process.exitCode = 1;
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  DEMO_DOCTORS,
  seedDemoDoctors,
};
