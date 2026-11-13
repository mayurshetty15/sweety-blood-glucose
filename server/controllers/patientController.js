const pool = require('../config/db');
const logDatabaseError = require('../config/dbError');
const validatePatientProfile = require('../validators/patientProfileValidators');

function toSafeProfile(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    full_name: row.full_name,
    age: row.age,
    gender: row.gender,
    phone: row.phone,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

async function getProfile(req, res) {
  let result;
  try {
    result = await pool.query(
      `SELECT id, full_name, age, gender, phone, created_at, updated_at
       FROM patient_profiles
       WHERE user_id = $1
       LIMIT 1`,
      [req.user.id],
    );
  } catch (error) {
    logDatabaseError(error, 'patient profile retrieval');
    return res.status(500).json({
      success: false,
      message: 'Unable to retrieve the patient profile.',
    });
  }

  return res.status(200).json({
    success: true,
    data: toSafeProfile(result.rows[0]),
  });
}

async function updateProfile(req, res) {
  const validation = validatePatientProfile(req.body);
  if (validation.error) {
    return res.status(400).json({
      success: false,
      message: validation.error,
    });
  }

  let result;
  try {
    result = await pool.query(
      `INSERT INTO patient_profiles (user_id, full_name, age, gender, phone)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (user_id) DO UPDATE
       SET full_name = EXCLUDED.full_name,
           age = EXCLUDED.age,
           gender = EXCLUDED.gender,
           phone = EXCLUDED.phone,
           updated_at = CURRENT_TIMESTAMP
       RETURNING id, full_name, age, gender, phone, created_at, updated_at`,
      [
        req.user.id,
        validation.value.full_name,
        validation.value.age,
        validation.value.gender,
        validation.value.phone,
      ],
    );
  } catch (error) {
    logDatabaseError(error, 'patient profile update');
    return res.status(500).json({
      success: false,
      message: 'Unable to update the patient profile.',
    });
  }

  return res.status(200).json({
    success: true,
    message: 'Patient profile updated successfully.',
    data: toSafeProfile(result.rows[0]),
  });
}

module.exports = {
  getProfile,
  updateProfile,
};
