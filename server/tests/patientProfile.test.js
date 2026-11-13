const assert = require('node:assert/strict');
const http = require('node:http');
const { after, before, beforeEach, test } = require('node:test');

process.env.JWT_SECRET = 'test-only-secret-for-patient-profile-tests';
delete process.env.DATABASE_URL;

const jwt = require('jsonwebtoken');
const app = require('../app');
const pool = require('../config/db');

const patientId = '41';
let server;

before(async () => {
  await new Promise((resolve) => {
    server = app.listen(0, '127.0.0.1', resolve);
  });
});

beforeEach(() => {
  pool.query = async () => {
    throw new Error('Unexpected database query in patient profile test.');
  };
});

after(async () => {
  await new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
  await pool.end();
});

function request(method, path, body, { role = 'patient', includeToken = true } = {}) {
  return new Promise((resolve, reject) => {
    const headers = {};
    if (body !== undefined) {
      headers['Content-Type'] = 'application/json';
    }
    if (includeToken) {
      const token = jwt.sign(
        { sub: patientId, role },
        process.env.JWT_SECRET,
        { algorithm: 'HS256', expiresIn: '15m' },
      );
      headers.Authorization = `Bearer ${token}`;
    }

    const outgoing = http.request(
      {
        hostname: '127.0.0.1',
        port: server.address().port,
        path,
        method,
        headers,
      },
      (response) => {
        const chunks = [];
        response.on('data', (chunk) => chunks.push(chunk));
        response.on('end', () => {
          try {
            resolve({
              status: response.statusCode,
              body: JSON.parse(Buffer.concat(chunks).toString('utf8')),
            });
          } catch (error) {
            reject(error);
          }
        });
      },
    );

    outgoing.on('error', reject);
    outgoing.end(body === undefined ? undefined : JSON.stringify(body));
  });
}

const validProfile = {
  full_name: '  Demo Patient ',
  age: 37,
  gender: 'prefer_not_to_say',
  phone: '+91 (98765) 43210',
};

test('reads only the authenticated patient profile and never returns auth fields', async () => {
  pool.query = async (sql, values) => {
    assert.match(sql, /FROM patient_profiles/);
    assert.match(sql, /WHERE user_id = \$1/);
    assert.deepEqual(values, [patientId]);
    return {
      rows: [{
        id: '3',
        full_name: 'Demo Patient',
        age: 37,
        gender: 'prefer_not_to_say',
        phone: '+919876543210',
        created_at: '2026-11-12T12:00:00.000Z',
        updated_at: '2026-11-12T12:00:00.000Z',
        password: 'should-not-be-selected',
      }],
    };
  };

  const response = await request('GET', '/api/patient/profile');

  assert.equal(response.status, 200);
  assert.equal(response.body.data.full_name, 'Demo Patient');
  assert.equal(Object.hasOwn(response.body.data, 'password'), false);
  assert.equal(JSON.stringify(response.body).includes('should-not-be-selected'), false);
});

test('saves a profile only for the authenticated patient and normalizes phone separators', async () => {
  let capturedValues;
  pool.query = async (sql, values) => {
    assert.match(sql, /ON CONFLICT \(user_id\) DO UPDATE/);
    capturedValues = values;
    return {
      rows: [{
        id: '3',
        full_name: values[1],
        age: values[2],
        gender: values[3],
        phone: values[4],
        created_at: '2026-11-12T12:00:00.000Z',
        updated_at: '2026-11-13T12:00:00.000Z',
      }],
    };
  };

  const response = await request('PUT', '/api/patient/profile', {
    ...validProfile,
    user_id: '999',
    role: 'doctor',
  });

  assert.equal(response.status, 200);
  assert.deepEqual(capturedValues, [
    patientId,
    'Demo Patient',
    37,
    'prefer_not_to_say',
    '+919876543210',
  ]);
  assert.equal(response.body.data.phone, '+919876543210');
});

test('rejects unreasonable age, invalid gender, and malformed phone numbers', async () => {
  for (const invalidProfile of [
    { ...validProfile, age: 0 },
    { ...validProfile, age: 121 },
    { ...validProfile, gender: 'unknown' },
    { ...validProfile, phone: 'call me' },
    { ...validProfile, phone: '123' },
  ]) {
    const response = await request('PUT', '/api/patient/profile', invalidProfile);
    assert.equal(response.status, 400);
  }
});

test('denies doctor and unauthenticated access to patient profile APIs', async () => {
  const doctorResponse = await request(
    'GET',
    '/api/patient/profile',
    undefined,
    { role: 'doctor' },
  );
  const unauthenticatedResponse = await request(
    'GET',
    '/api/patient/profile',
    undefined,
    { includeToken: false },
  );

  assert.equal(doctorResponse.status, 403);
  assert.equal(unauthenticatedResponse.status, 401);
});
