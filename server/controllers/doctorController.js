const pool = require('../config/db');
const logDatabaseError = require('../config/dbError');
const { validateReadingFilters } = require('../validators/readingValidators');

const MAX_BIGINT = 9223372036854775807n;

function pickFields(row, fields) {
  const safeRow = {};
  for (const field of fields) {
    safeRow[field] = row[field];
  }
  return safeRow;
}

const DIRECTORY_FIELDS = [
  'doctor_id',
  'doctor_name',
  'specialization',
  'qualification',
  'experience_years',
  'clinic_name',
  'location',
  'profile_image',
];
const ACCESS_FIELDS = [
  'doctor_id',
  'status',
  'approved_at',
  'revoked_at',
  'created_at',
  'updated_at',
];
const PATIENT_FIELDS = [
  'patient_id',
  'full_name',
  'age',
  'gender',
  'last_reading_date',
  'updated_at',
];
const REPORT_PATIENT_FIELDS = ['patient_id', 'full_name', 'age', 'gender', 'phone'];
const READING_FIELDS = [
  'id',
  'reading_date',
  'time_slot',
  'value',
  'created_at',
  'updated_at',
];

function validateDoctorId(value) {
  if (
    typeof value !== 'string' ||
    value.length > 19 ||
    !/^[1-9]\d*$/.test(value) ||
    BigInt(value) > MAX_BIGINT
  ) {
    return false;
  }
  return true;
}

function sendDatabaseError(res, error, operation) {
  logDatabaseError(error, operation);
  return res.status(500).json({
    success: false,
    message: 'Unable to complete the doctor access request.',
  });
}

async function getDoctors(req, res) {
  try {
    const result = await pool.query(
      `SELECT d.user_id AS doctor_id, d.doctor_name, d.specialization,
              d.qualification, d.experience_years, d.clinic_name, d.location,
              d.profile_image
       FROM doctor_profiles d
       JOIN users u ON u.id = d.user_id AND u.role = 'doctor'
       WHERE d.is_active = TRUE
       ORDER BY d.doctor_name`,
    );
    return res.status(200).json({
      success: true,
      data: result.rows.map((row) => pickFields(row, DIRECTORY_FIELDS)),
    });
  } catch (error) {
    return sendDatabaseError(res, error, 'doctor directory retrieval');
  }
}

async function getPatientDoctorAccess(req, res) {
  try {
    const result = await pool.query(
      `SELECT a.doctor_id, a.status, a.approved_at, a.revoked_at,
              a.created_at, a.updated_at, d.doctor_name, d.specialization,
              d.qualification, d.experience_years, d.clinic_name, d.location,
              d.profile_image, d.is_active
       FROM doctor_patient_access a
       LEFT JOIN doctor_profiles d ON d.user_id = a.doctor_id
       WHERE a.patient_id = $1
       ORDER BY a.updated_at DESC, a.doctor_id`,
      [req.user.id],
    );
    return res.status(200).json({
      success: true,
      data: result.rows.map((row) => pickFields(row, [
        ...ACCESS_FIELDS,
        'doctor_name',
        'specialization',
        'qualification',
        'experience_years',
        'clinic_name',
        'location',
        'profile_image',
        'is_active',
      ])),
    });
  } catch (error) {
    return sendDatabaseError(res, error, 'patient doctor access retrieval');
  }
}

async function approveDoctorAccess(req, res) {
  const { doctorId } = req.params;
  if (!validateDoctorId(doctorId) || doctorId === req.user.id) {
    return res.status(400).json({
      success: false,
      message: 'A valid doctor ID is required.',
    });
  }
  if (req.body?.confirmed !== true) {
    return res.status(400).json({
      success: false,
      message: 'Explicit patient consent is required to approve doctor access.',
    });
  }

  try {
    const result = await pool.query(
      `INSERT INTO doctor_patient_access (
         patient_id, doctor_id, status, approved_at, revoked_at
       )
       SELECT $1, d.user_id, 'approved', CURRENT_TIMESTAMP, NULL
       FROM doctor_profiles d
       JOIN users u ON u.id = d.user_id
       WHERE d.user_id = $2
         AND u.role = 'doctor'
         AND d.is_active = TRUE
       ON CONFLICT (patient_id, doctor_id) DO UPDATE
       SET status = 'approved',
           approved_at = CURRENT_TIMESTAMP,
           revoked_at = NULL,
           updated_at = CURRENT_TIMESTAMP
       RETURNING doctor_id, status, approved_at, revoked_at, created_at, updated_at`,
      [req.user.id, doctorId],
    );

    if (!result.rows[0]) {
      return res.status(404).json({
        success: false,
        message: 'Doctor not found.',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Doctor access approved.',
      data: pickFields(result.rows[0], ACCESS_FIELDS),
    });
  } catch (error) {
    return sendDatabaseError(res, error, 'patient consent approval');
  }
}

async function revokeDoctorAccess(req, res) {
  const { doctorId } = req.params;
  if (!validateDoctorId(doctorId) || doctorId === req.user.id) {
    return res.status(400).json({
      success: false,
      message: 'A valid doctor ID is required.',
    });
  }

  try {
    const result = await pool.query(
      `UPDATE doctor_patient_access
       SET status = 'revoked',
           revoked_at = COALESCE(revoked_at, CURRENT_TIMESTAMP),
           updated_at = CURRENT_TIMESTAMP
       WHERE patient_id = $1 AND doctor_id = $2
       RETURNING doctor_id, status, approved_at, revoked_at, created_at, updated_at`,
      [req.user.id, doctorId],
    );

    if (!result.rows[0]) {
      return res.status(404).json({
        success: false,
        message: 'Doctor access record not found.',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Doctor access revoked.',
      data: pickFields(result.rows[0], ACCESS_FIELDS),
    });
  } catch (error) {
    return sendDatabaseError(res, error, 'patient consent revocation');
  }
}

async function getDoctorPatients(req, res) {
  const search = req.query.search;
  if (search !== undefined && (typeof search !== 'string' || search.length > 100)) {
    return res.status(400).json({
      success: false,
      message: 'Search text must be 100 characters or fewer.',
    });
  }

  const searchText = search?.trim() || null;
  try {
    const [patientsResult, countResult] = await Promise.all([
      pool.query(
        `SELECT u.id AS patient_id, COALESCE(p.full_name, u.name) AS full_name,
                p.age, p.gender,
                MAX(r.reading_date)::text AS last_reading_date,
                GREATEST(
                  COALESCE(p.updated_at, u.created_at),
                  COALESCE(MAX(r.updated_at), u.created_at)
                ) AS updated_at
         FROM doctor_patient_access a
         JOIN users u ON u.id = a.patient_id AND u.role = 'patient'
         LEFT JOIN patient_profiles p ON p.user_id = u.id
         LEFT JOIN readings r ON r.user_id = u.id
         WHERE a.doctor_id = $1
           AND a.status = 'approved'
           AND (
             $2::text IS NULL
             OR COALESCE(p.full_name, u.name) ILIKE '%' || $2 || '%'
           )
         GROUP BY u.id, p.id
         ORDER BY updated_at DESC, patient_id`,
        [req.user.id, searchText],
      ),
      pool.query(
        `SELECT COUNT(*)::int AS total_approved_patients
         FROM doctor_patient_access a
         JOIN users u ON u.id = a.patient_id AND u.role = 'patient'
         WHERE a.doctor_id = $1 AND a.status = 'approved'`,
        [req.user.id],
      ),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        total_approved_patients: countResult.rows[0].total_approved_patients,
        patients: patientsResult.rows.map((row) => pickFields(row, PATIENT_FIELDS)),
      },
    });
  } catch (error) {
    return sendDatabaseError(res, error, 'approved patient list retrieval');
  }
}

async function getDoctorPatientReport(req, res) {
  const { patientId } = req.params;
  if (!validateDoctorId(patientId)) {
    return res.status(400).json({
      success: false,
      message: 'A valid patient ID is required.',
    });
  }

  const filterValidation = validateReadingFilters(req.query);
  if (filterValidation.error) {
    return res.status(400).json({
      success: false,
      message: filterValidation.error,
    });
  }
  if (
    filterValidation.value.reading_date !== undefined ||
    filterValidation.value.month !== undefined
  ) {
    return res.status(400).json({
      success: false,
      message: 'Reports accept a paired start_date and end_date filter.',
    });
  }

  let client;
  let transactionStarted = false;
  const { start_date: startDate, end_date: endDate } = filterValidation.value;
  try {
    client = await pool.connect();
    await client.query('BEGIN');
    transactionStarted = true;

    const clientAccess = await client.query(
      `SELECT 1
       FROM doctor_patient_access
       WHERE patient_id = $1
         AND doctor_id = $2
         AND status = 'approved'
       FOR UPDATE`,
      [patientId, req.user.id],
    );
    if (!clientAccess.rows[0]) {
      await client.query('ROLLBACK');
      transactionStarted = false;
      return res.status(404).json({
        success: false,
        message: 'Patient report not found.',
      });
    }

    const patientResult = await client.query(
      `SELECT u.id AS patient_id, COALESCE(p.full_name, u.name) AS full_name,
              p.age, p.gender, p.phone
       FROM users u
       LEFT JOIN patient_profiles p ON p.user_id = u.id
       WHERE u.id = $1 AND u.role = 'patient'
       LIMIT 1`,
      [patientId],
    );

    if (!patientResult.rows[0]) {
      await client.query('ROLLBACK');
      transactionStarted = false;
      return res.status(404).json({
        success: false,
        message: 'Patient report not found.',
      });
    }

    const values = [patientId];
    const conditions = ['user_id = $1'];
    if (startDate !== undefined) {
      values.push(startDate, endDate);
      conditions.push(`reading_date >= $${values.length - 1}::date`);
      conditions.push(`reading_date <= $${values.length}::date`);
    }

    const readingsResult = await client.query(
      `SELECT id, reading_date::text AS reading_date, time_slot, value,
              created_at, updated_at
       FROM readings
       WHERE ${conditions.join(' AND ')}
       ORDER BY reading_date, CASE time_slot
         WHEN 'morning' THEN 1
         WHEN 'after_breakfast' THEN 2
         WHEN 'after_lunch' THEN 3
         WHEN 'after_dinner' THEN 4
         ELSE 5
       END, id`,
      values,
    );

    await client.query('COMMIT');
    transactionStarted = false;
    return res.status(200).json({
      success: true,
      data: {
        patient: pickFields(patientResult.rows[0], REPORT_PATIENT_FIELDS),
        date_range: {
          start_date: startDate || null,
          end_date: endDate || null,
        },
        generated_at: new Date().toISOString(),
        readings: readingsResult.rows.map((row) => pickFields(row, READING_FIELDS)),
      },
    });
  } catch (error) {
    if (client && transactionStarted) {
      try {
        await client.query('ROLLBACK');
      } catch (rollbackError) {
        logDatabaseError(rollbackError, 'doctor report rollback');
      }
    }
    return sendDatabaseError(res, error, 'doctor patient report retrieval');
  } finally {
    if (client) {
      client.release();
    }
  }
}

module.exports = {
  approveDoctorAccess,
  getDoctorPatients,
  getDoctorPatientReport,
  getDoctors,
  getPatientDoctorAccess,
  revokeDoctorAccess,
};
