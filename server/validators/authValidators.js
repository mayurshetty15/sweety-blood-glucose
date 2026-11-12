const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_BCRYPT_PASSWORD_BYTES = 72;

function validateEmail(email) {
  const normalizedEmail = email.trim().toLowerCase();

  if (normalizedEmail.length > 255 || !EMAIL_PATTERN.test(normalizedEmail)) {
    return { error: 'A valid email address is required.' };
  }

  return { value: normalizedEmail };
}

function validatePassword(password) {
  if (password.length < 8) {
    return { error: 'Password must be at least 8 characters long.' };
  }

  if (Buffer.byteLength(password, 'utf8') > MAX_BCRYPT_PASSWORD_BYTES) {
    return { error: 'Password must not exceed 72 bytes.' };
  }

  return { value: password };
}

function validateRegistration(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { error: 'A JSON object is required.' };
  }

  const { name, email, password } = body;
  if (typeof name !== 'string' || typeof email !== 'string' || typeof password !== 'string') {
    return { error: 'Name, email, and password are required.' };
  }

  const normalizedName = name.trim();
  if (!normalizedName || normalizedName.length > 100) {
    return { error: 'Name must be between 1 and 100 characters.' };
  }

  const emailResult = validateEmail(email);
  if (emailResult.error) {
    return emailResult;
  }

  const passwordResult = validatePassword(password);
  if (passwordResult.error) {
    return passwordResult;
  }

  return {
    value: {
      name: normalizedName,
      email: emailResult.value,
      password: passwordResult.value,
    },
  };
}

function validateLogin(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { error: 'A JSON object is required.' };
  }

  const { email, password } = body;
  if (typeof email !== 'string' || typeof password !== 'string' || !password) {
    return { error: 'Email and password are required.' };
  }

  const emailResult = validateEmail(email);
  if (emailResult.error) {
    return emailResult;
  }

  if (Buffer.byteLength(password, 'utf8') > MAX_BCRYPT_PASSWORD_BYTES) {
    return { error: 'Password must not exceed 72 bytes.' };
  }

  return {
    value: {
      email: emailResult.value,
      password,
    },
  };
}

module.exports = {
  validateLogin,
  validateRegistration,
};
