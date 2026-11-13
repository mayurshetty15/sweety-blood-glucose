const pool = require('../config/db');
const logDatabaseError = require('../config/dbError');
const {
  validateReading,
  validateReadingFilters,
  validateReadingId,
} = require('../validators/readingValidators');

const DAILY_READING_LIMIT = 4;

function sendConflict(res, message) {
  return res.status(409).json({
    success: false,
    message,
  });
}

function sendDatabaseError(error, res, operation) {
  if (error.code === '23505') {
    return sendConflict(res, 'A reading already exists for this date and time slot.');
  }

  logDatabaseError(error, operation);
  return res.status(500).json({
    success: false,
    message: 'Unable to complete the reading request.',
  });
}

function validateRequest(validation, res) {
  if (validation.error) {
    res.status(400).json({
      success: false,
      message: validation.error,
    });
    return false;
  }

  return true;
}

async function createReading(req, res) {
  const validation = validateReading(req.body);
  if (!validateRequest(validation, res)) {
    return;
  }

  const userId = req.user.id;
  const { reading_date: readingDate, time_slot: timeSlot, value } = validation.value;
  let client;
  let transactionStarted = false;

  try {
    client = await pool.connect();
    await client.query('BEGIN');
    transactionStarted = true;

    const userResult = await client.query(
      'SELECT id FROM users WHERE id = $1 FOR UPDATE',
      [userId],
    );
    if (!userResult.rows[0]) {
      await client.query('ROLLBACK');
      transactionStarted = false;
      return res.status(404).json({
        success: false,
        message: 'User not found.',
      });
    }

    const countResult = await client.query(
      `SELECT COUNT(*)::int AS count
       FROM readings
       WHERE user_id = $1 AND reading_date = $2`,
      [userId, readingDate],
    );
    if (countResult.rows[0].count >= DAILY_READING_LIMIT) {
      await client.query('ROLLBACK');
      transactionStarted = false;
      return sendConflict(res, 'A maximum of four readings is allowed per day.');
    }

    const result = await client.query(
      `INSERT INTO readings (user_id, reading_date, time_slot, value)
       VALUES ($1, $2, $3, $4)
       RETURNING id, user_id, reading_date, time_slot, value, created_at, updated_at`,
      [userId, readingDate, timeSlot, value],
    );
    await client.query('COMMIT');
    transactionStarted = false;

    return res.status(201).json({
      success: true,
      message: 'Reading created successfully.',
      data: result.rows[0],
    });
  } catch (error) {
    if (client && transactionStarted) {
      try {
        await client.query('ROLLBACK');
      } catch (rollbackError) {
        logDatabaseError(rollbackError, 'reading creation rollback');
      }
    }

    return sendDatabaseError(error, res, 'reading creation');
  } finally {
    if (client) {
      client.release();
    }
  }
}

async function getReadings(req, res) {
  const validation = validateReadingFilters(req.query);
  if (!validateRequest(validation, res)) {
    return;
  }

  const values = [req.user.id];
  const conditions = ['user_id = $1'];

  if (validation.value.reading_date !== undefined) {
    values.push(validation.value.reading_date);
    conditions.push(`reading_date = $${values.length}`);
  }
  if (validation.value.month !== undefined) {
    values.push(`${validation.value.month}-01`);
    conditions.push(`reading_date >= $${values.length}::date`);
    conditions.push(`reading_date < ($${values.length}::date + INTERVAL '1 month')`);
  }

  try {
    const result = await pool.query(
      `SELECT id, user_id, reading_date, time_slot, value, created_at, updated_at
       FROM readings
       WHERE ${conditions.join(' AND ')}
       ORDER BY reading_date DESC, created_at DESC`,
      values,
    );

    return res.status(200).json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    return sendDatabaseError(error, res, 'reading list');
  }
}

async function getReadingById(req, res) {
  const validation = validateReadingId(req.params.id);
  if (!validateRequest(validation, res)) {
    return;
  }

  try {
    const result = await pool.query(
      `SELECT id, user_id, reading_date, time_slot, value, created_at, updated_at
       FROM readings
       WHERE id = $1 AND user_id = $2`,
      [validation.value, req.user.id],
    );
    if (!result.rows[0]) {
      return res.status(404).json({
        success: false,
        message: 'Reading not found.',
      });
    }

    return res.status(200).json({
      success: true,
      data: result.rows[0],
    });
  } catch (error) {
    return sendDatabaseError(error, res, 'reading lookup');
  }
}

async function updateReading(req, res) {
  const idValidation = validateReadingId(req.params.id);
  if (!validateRequest(idValidation, res)) {
    return;
  }

  const readingValidation = validateReading(req.body);
  if (!validateRequest(readingValidation, res)) {
    return;
  }

  const userId = req.user.id;
  const readingId = idValidation.value;
  const { reading_date: readingDate, time_slot: timeSlot, value } = readingValidation.value;
  let client;
  let transactionStarted = false;

  try {
    client = await pool.connect();
    await client.query('BEGIN');
    transactionStarted = true;

    const userResult = await client.query(
      'SELECT id FROM users WHERE id = $1 FOR UPDATE',
      [userId],
    );
    if (!userResult.rows[0]) {
      await client.query('ROLLBACK');
      transactionStarted = false;
      return res.status(404).json({
        success: false,
        message: 'Reading not found.',
      });
    }

    const readingResult = await client.query(
      `SELECT id
       FROM readings
       WHERE id = $1 AND user_id = $2
       FOR UPDATE`,
      [readingId, userId],
    );
    if (!readingResult.rows[0]) {
      await client.query('ROLLBACK');
      transactionStarted = false;
      return res.status(404).json({
        success: false,
        message: 'Reading not found.',
      });
    }

    const countResult = await client.query(
      `SELECT COUNT(*)::int AS count
       FROM readings
       WHERE user_id = $1 AND reading_date = $2 AND id <> $3`,
      [userId, readingDate, readingId],
    );
    if (countResult.rows[0].count >= DAILY_READING_LIMIT) {
      await client.query('ROLLBACK');
      transactionStarted = false;
      return sendConflict(res, 'A maximum of four readings is allowed per day.');
    }

    const result = await client.query(
      `UPDATE readings
       SET reading_date = $1, time_slot = $2, value = $3, updated_at = CURRENT_TIMESTAMP
       WHERE id = $4 AND user_id = $5
       RETURNING id, user_id, reading_date, time_slot, value, created_at, updated_at`,
      [readingDate, timeSlot, value, readingId, userId],
    );
    await client.query('COMMIT');
    transactionStarted = false;

    return res.status(200).json({
      success: true,
      message: 'Reading updated successfully.',
      data: result.rows[0],
    });
  } catch (error) {
    if (client && transactionStarted) {
      try {
        await client.query('ROLLBACK');
      } catch (rollbackError) {
        logDatabaseError(rollbackError, 'reading update rollback');
      }
    }

    return sendDatabaseError(error, res, 'reading update');
  } finally {
    if (client) {
      client.release();
    }
  }
}

async function deleteReading(req, res) {
  const validation = validateReadingId(req.params.id);
  if (!validateRequest(validation, res)) {
    return;
  }

  try {
    const result = await pool.query(
      'DELETE FROM readings WHERE id = $1 AND user_id = $2 RETURNING id',
      [validation.value, req.user.id],
    );
    if (!result.rows[0]) {
      return res.status(404).json({
        success: false,
        message: 'Reading not found.',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Reading deleted successfully.',
    });
  } catch (error) {
    return sendDatabaseError(error, res, 'reading deletion');
  }
}

module.exports = {
  createReading,
  deleteReading,
  getReadingById,
  getReadings,
  updateReading,
};
