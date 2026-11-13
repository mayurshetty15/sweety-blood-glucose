const TIME_SLOTS = [
  'morning',
  'after_breakfast',
  'after_lunch',
  'after_dinner',
];
const MAX_BIGINT = 9223372036854775807n;
const APP_TIME_ZONE = process.env.APP_TIME_ZONE || 'Asia/Kolkata';
const { dateKeyInTimeZone } = require('../utils/dateUtils');

function isValidDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const [year, month, day] = value.split('-').map(Number);
  if (year < 1 || month < 1 || month > 12) {
    return false;
  }

  const leapYear = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const daysInMonth = [
    31,
    leapYear ? 29 : 28,
    31,
    30,
    31,
    30,
    31,
    31,
    30,
    31,
    30,
    31,
  ][month - 1];

  return day >= 1 && day <= daysInMonth;
}

function isFutureDate(value) {
  const today = dateKeyInTimeZone(new Date(), APP_TIME_ZONE);
  return value > today;
}

function validateReading(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { error: 'A JSON object is required.' };
  }

  const { reading_date: readingDate, time_slot: timeSlot, value } = body;

  if (!isValidDate(readingDate)) {
    return { error: 'Reading date must be a valid date in YYYY-MM-DD format.' };
  }
  if (isFutureDate(readingDate)) {
    return { error: 'Reading date cannot be in the future.' };
  }
  if (!TIME_SLOTS.includes(timeSlot)) {
    return { error: 'Time slot must be a permitted reading time.' };
  }
  if (!Number.isInteger(value) || value < 40 || value > 600) {
    return { error: 'Glucose value must be an integer between 40 and 600.' };
  }

  return {
    value: {
      reading_date: readingDate,
      time_slot: timeSlot,
      value,
    },
  };
}

function validateReadingId(value) {
  if (
    typeof value !== 'string' ||
    !/^[1-9]\d*$/.test(value) ||
    BigInt(value) > MAX_BIGINT
  ) {
    return { error: 'Reading ID must be a valid positive integer.' };
  }

  return { value };
}

function validateReadingFilters(query) {
  if (query.reading_date !== undefined && !isValidDate(query.reading_date)) {
    return { error: 'reading_date must be a valid date in YYYY-MM-DD format.' };
  }
  if (query.reading_date !== undefined && isFutureDate(query.reading_date)) {
    return { error: 'reading_date cannot be in the future.' };
  }

  if (query.month !== undefined) {
    if (
      typeof query.month !== 'string' ||
      !/^\d{4}-(0[1-9]|1[0-2])$/.test(query.month) ||
      query.month.startsWith('0000')
    ) {
      return { error: 'month must be in YYYY-MM format.' };
    }
    if (query.month > dateKeyInTimeZone(new Date(), APP_TIME_ZONE).slice(0, 7)) {
      return { error: 'month cannot be in the future.' };
    }
  }

  const hasStartDate = query.start_date !== undefined;
  const hasEndDate = query.end_date !== undefined;
  if (hasStartDate !== hasEndDate) {
    return { error: 'start_date and end_date must be provided together.' };
  }
  if (hasStartDate) {
    if (!isValidDate(query.start_date) || !isValidDate(query.end_date)) {
      return { error: 'start_date and end_date must be valid dates in YYYY-MM-DD format.' };
    }
    if (isFutureDate(query.start_date) || isFutureDate(query.end_date)) {
      return { error: 'Date filters cannot include future dates.' };
    }
    if (query.start_date > query.end_date) {
      return { error: 'start_date cannot be after end_date.' };
    }
    if (query.reading_date !== undefined || query.month !== undefined) {
      return { error: 'Date range filters cannot be combined with reading_date or month.' };
    }
  }

  return {
    value: {
      reading_date: query.reading_date,
      month: query.month,
      start_date: query.start_date,
      end_date: query.end_date,
    },
  };
}

module.exports = {
  validateReading,
  validateReadingFilters,
  validateReadingId,
};
