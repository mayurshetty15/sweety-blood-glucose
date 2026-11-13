const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');
const logDatabaseError = require('../config/dbError');
const { validateLogin, validateRegistration } = require('../validators/authValidators');

const SALT_ROUNDS = 12;
const DEFAULT_TOKEN_EXPIRY = '1h';

function getJwtConfiguration() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    return null;
  }

  const expiresIn = process.env.JWT_EXPIRES_IN || DEFAULT_TOKEN_EXPIRY;

  try {
    jwt.sign({ sub: 'configuration-check' }, secret, {
      algorithm: 'HS256',
      expiresIn,
    });
  } catch {
    return null;
  }

  return { secret, expiresIn };
}

function respondWithAuthConfigurationError(res) {
  console.error('Authentication is unavailable because JWT configuration is missing or invalid.');
  return res.status(500).json({
    success: false,
    message: 'Authentication is not configured',
  });
}

function createToken(userId, role, jwtConfiguration) {
  return jwt.sign(
    { sub: String(userId), role },
    jwtConfiguration.secret,
    {
      algorithm: 'HS256',
      expiresIn: jwtConfiguration.expiresIn,
    },
  );
}

function toSafeUser(row) {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    profile_complete: Boolean(row.profile_complete),
    created_at: row.created_at,
  };
}

async function register(req, res) {
  const validation = validateRegistration(req.body);
  if (validation.error) {
    return res.status(400).json({
      success: false,
      message: validation.error,
    });
  }

  const jwtConfiguration = getJwtConfiguration();
  if (!jwtConfiguration) {
    return respondWithAuthConfigurationError(res);
  }

  let passwordHash;
  try {
    passwordHash = await bcrypt.hash(validation.value.password, SALT_ROUNDS);
  } catch (error) {
    console.error('Password hashing failed.');
    return res.status(500).json({
      success: false,
      message: 'Unable to complete registration',
    });
  }

  let result;
  try {
    result = await pool.query(
      `INSERT INTO users (name, email, password, role)
       VALUES ($1, $2, $3, 'patient')
       RETURNING id, name, email, role, created_at`,
      [validation.value.name, validation.value.email, passwordHash],
    );
  } catch (error) {
    if (
      error.code === '23505' &&
      ['users_email_unique', 'users_email_key'].includes(error.constraint)
    ) {
      return res.status(409).json({
        success: false,
        message: 'An account with this email already exists.',
      });
    }

    logDatabaseError(error, 'user registration');
    return res.status(500).json({
      success: false,
      message: 'Unable to complete registration',
    });
  }

  try {
    const user = toSafeUser(result.rows[0]);
    const token = createToken(user.id, 'patient', jwtConfiguration);

    return res.status(201).json({
      success: true,
      message: 'User registered successfully',
      token,
      user,
    });
  } catch (error) {
    console.error('Token creation failed.');
    return res.status(500).json({
      success: false,
      message: 'Unable to complete registration',
    });
  }
}

async function login(req, res) {
  const validation = validateLogin(req.body);
  if (validation.error) {
    return res.status(400).json({
      success: false,
      message: validation.error,
    });
  }

  const jwtConfiguration = getJwtConfiguration();
  if (!jwtConfiguration) {
    return respondWithAuthConfigurationError(res);
  }

  let result;
  try {
    result = await pool.query(
      `SELECT u.id, u.name, u.email, u.password, u.role, u.created_at,
              (
                p.id IS NOT NULL
                AND p.full_name IS NOT NULL
                AND p.age IS NOT NULL
                AND p.gender IS NOT NULL
                AND p.phone IS NOT NULL
              ) AS profile_complete
       FROM users u
       LEFT JOIN patient_profiles p ON p.user_id = u.id
       WHERE u.email = $1
       LIMIT 1`,
      [validation.value.email],
    );
  } catch (error) {
    logDatabaseError(error, 'user login');
    return res.status(500).json({
      success: false,
      message: 'Unable to complete login',
    });
  }

  const row = result.rows[0];
  if (!row) {
    return res.status(401).json({
      success: false,
      message: 'Invalid email or password.',
    });
  }

  let passwordMatches;
  try {
    passwordMatches = await bcrypt.compare(validation.value.password, row.password);
  } catch (error) {
    console.error('Password verification failed.');
    return res.status(500).json({
      success: false,
      message: 'Unable to complete login',
    });
  }

  if (!passwordMatches) {
    return res.status(401).json({
      success: false,
      message: 'Invalid email or password.',
    });
  }

  if (row.role !== validation.value.role) {
    return res.status(401).json({
      success: false,
      message: 'Invalid email or password.',
    });
  }

  try {
    const user = toSafeUser(row);
    const token = createToken(user.id, user.role, jwtConfiguration);

    return res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
      user,
    });
  } catch (error) {
    console.error('Token creation failed.');
    return res.status(500).json({
      success: false,
      message: 'Unable to complete login',
    });
  }
}

module.exports = {
  login,
  register,
};
