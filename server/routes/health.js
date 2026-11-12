const express = require('express');
const pool = require('../config/db');
const logDatabaseError = require('../config/dbError');

const router = express.Router();

router.get('/', async (req, res) => {
  if (!process.env.DATABASE_URL) {
    return res.status(500).json({
      success: false,
      message: 'Database connection is not configured',
    });
  }

  try {
    const result = await pool.query('SELECT current_database() AS database');

    return res.status(200).json({
      success: true,
      message: 'PostgreSQL connected successfully',
      database: result.rows[0].database,
    });
  } catch (error) {
    logDatabaseError(error, 'health check');

    return res.status(500).json({
      success: false,
      message: 'Database connection failed',
    });
  }
});

module.exports = router;
