const GENDERS = new Set([
  'female',
  'male',
  'non_binary',
  'other',
  'prefer_not_to_say',
]);

function validatePatientProfile(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { error: 'A JSON object is required.' };
  }

  const fullName = typeof body.full_name === 'string' ? body.full_name.trim() : '';
  if (!fullName || fullName.length > 120) {
    return { error: 'Full name must be between 1 and 120 characters.' };
  }

  if (!Number.isInteger(body.age) || body.age < 1 || body.age > 120) {
    return { error: 'Age must be a whole number between 1 and 120.' };
  }

  if (!GENDERS.has(body.gender)) {
    return { error: 'Choose a valid gender option.' };
  }

  if (
    typeof body.phone !== 'string' ||
    !/^[+]?[\d\s().-]+$/.test(body.phone.trim())
  ) {
    return { error: 'Enter a valid phone number.' };
  }

  const phone = body.phone.replace(/[\s().-]/g, '');
  if (!/^\+?[1-9]\d{6,14}$/.test(phone)) {
    return { error: 'Phone number must contain 7 to 15 digits.' };
  }

  return {
    value: {
      full_name: fullName,
      age: body.age,
      gender: body.gender,
      phone,
    },
  };
}

module.exports = validatePatientProfile;
