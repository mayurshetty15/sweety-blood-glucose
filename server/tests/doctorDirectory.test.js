const assert = require('node:assert/strict');
const http = require('node:http');
const { after, before, beforeEach, test } = require('node:test');

process.env.JWT_SECRET = 'test-only-secret-for-doctor-directory-tests';
delete process.env.DATABASE_URL;

const jwt = require('jsonwebtoken');
const app = require('../app');
const pool = require('../config/db');

const patientId = '41';
const doctorId = '99';
let server;

before(async () => {
  await new Promise((resolve) => {
    server = app.listen(0, '127.0.0.1', resolve);
  });
});

beforeEach(() => {
  pool.query = async () => {
    throw new Error('Unexpected database query in doctor directory test.');
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

test('lists active doctors without exposing account emails or authentication fields', async () => {
  pool.query = async (sql, values) => {
    assert.match(sql, /FROM doctor_profiles/);
    assert.match(sql, /u\.role = 'doctor'/);
    assert.match(sql, /WHERE d\.is_active = TRUE/);
    assert.doesNotMatch(sql, /password|email/i);
    assert.equal(values, undefined);
    return {
      rows: [{
        doctor_id: doctorId,
        doctor_name: 'Dr. Fictional Example',
        specialization: 'Endocrinologist',
        qualification: 'MBBS (Fictional)',
        experience_years: 5,
        clinic_name: 'Demo Clinic',
        location: 'Demo City',
        profile_image: null,
      }],
    };
  };

  const response = await request('GET', '/api/doctors');

  assert.equal(response.status, 200);
  assert.equal(response.body.data[0].doctor_id, doctorId);
  assert.equal(Object.hasOwn(response.body.data[0], 'email'), false);
  assert.equal(Object.hasOwn(response.body.data[0], 'password'), false);
});

test('returns only the authenticated patient consent relationships', async () => {
  pool.query = async (sql, values) => {
    assert.match(sql, /FROM doctor_patient_access a/);
    assert.match(sql, /WHERE a\.patient_id = \$1/);
    assert.deepEqual(values, [patientId]);
    return { rows: [{ doctor_id: doctorId, status: 'approved' }] };
  };

  const response = await request('GET', '/api/patient/doctors/access');

  assert.equal(response.status, 200);
  assert.equal(response.body.data[0].status, 'approved');
});

test('approval scopes consent to JWT patient and verifies an active doctor', async () => {
  pool.query = async (sql, values) => {
    assert.match(sql, /INSERT INTO doctor_patient_access/);
    assert.match(sql, /u\.role = 'doctor'/);
    assert.match(sql, /d\.is_active = TRUE/);
    assert.match(sql, /ON CONFLICT \(patient_id, doctor_id\) DO UPDATE/);
    assert.deepEqual(values, [patientId, doctorId]);
    return { rows: [{ doctor_id: doctorId, status: 'approved' }] };
  };

  const response = await request(
    'POST',
    `/api/patient/doctors/${doctorId}/approve`,
    { patient_id: '888', confirmed: true },
  );

  assert.equal(response.status, 200);
  assert.equal(response.body.data.status, 'approved');
});

test('does not store an approval without an explicit confirmation flag', async () => {
  let queried = false;
  pool.query = async () => {
    queried = true;
    return { rows: [] };
  };

  const response = await request(
    'POST',
    `/api/patient/doctors/${doctorId}/approve`,
    { patient_id: '888' },
  );

  assert.equal(response.status, 400);
  assert.equal(queried, false);
});

test('returns 404 when approval targets a non-directory account', async () => {
  pool.query = async () => ({ rows: [] });

  const response = await request(
    'POST',
    `/api/patient/doctors/${doctorId}/approve`,
    { confirmed: true },
  );

  assert.equal(response.status, 404);
});

test('revocation updates only the authenticated patient and selected doctor', async () => {
  pool.query = async (sql, values) => {
    assert.match(sql, /SET status = 'revoked'/);
    assert.match(sql, /WHERE patient_id = \$1 AND doctor_id = \$2/);
    assert.deepEqual(values, [patientId, doctorId]);
    return { rows: [{ doctor_id: doctorId, status: 'revoked' }] };
  };

  const response = await request('DELETE', `/api/patient/doctors/${doctorId}/access`);

  assert.equal(response.status, 200);
  assert.equal(response.body.data.status, 'revoked');
});

test('denies doctor and unauthenticated access to the patient directory and consent routes', async () => {
  const doctorResponse = await request('GET', '/api/doctors', undefined, { role: 'doctor' });
  const patientResponse = await request(
    'GET',
    '/api/doctor/patients',
    undefined,
    { role: 'patient' },
  );
  const unauthenticatedResponse = await request(
    'GET',
    '/api/patient/doctors/access',
    undefined,
    { includeToken: false },
  );

  assert.equal(doctorResponse.status, 403);
  assert.equal(patientResponse.status, 403);
  assert.equal(unauthenticatedResponse.status, 401);
});

test('doctor patient list is scoped to JWT doctor and includes only approved relationships', async () => {
  const calls = [];
  pool.query = async (sql, values) => {
    calls.push({ sql, values });
    if (/SELECT u\.id AS patient_id/.test(sql)) {
      assert.match(sql, /a\.doctor_id = \$1/);
      assert.match(sql, /a\.status = 'approved'/);
      assert.deepEqual(values, ['41', 'sam']);
      return {
        rows: [{
          patient_id: '72',
          full_name: 'Demo Patient',
          age: 37,
          last_reading_date: '2026-11-12',
        }],
      };
    }
    assert.match(sql, /COUNT\(\*\)/);
    assert.deepEqual(values, ['41']);
    return { rows: [{ total_approved_patients: 1 }] };
  };

  const response = await request(
    'GET',
    '/api/doctor/patients?search=sam',
    undefined,
    { role: 'doctor' },
  );

  assert.equal(response.status, 200);
  assert.equal(response.body.data.total_approved_patients, 1);
  assert.equal(response.body.data.patients[0].patient_id, '72');
  assert.equal(calls.length, 2);
});

test('doctor report verifies and locks approved consent before scoped patient and reading queries', async () => {
  const calls = [];
  pool.connect = async () => ({
    async query(sql, values) {
      calls.push({ sql, values });
      if (['BEGIN', 'COMMIT', 'ROLLBACK'].includes(sql)) {
        return { rows: [] };
      }
      if (/FROM doctor_patient_access/.test(sql)) {
        assert.match(sql, /status = 'approved'/);
        assert.match(sql, /FOR UPDATE/);
        assert.deepEqual(values, ['72', '41']);
        return { rows: [{ '?column?': 1 }] };
      }
      if (/FROM users u/.test(sql)) {
        assert.deepEqual(values, ['72']);
        return {
          rows: [{
            patient_id: '72',
            full_name: 'Demo Patient',
            age: 37,
            gender: 'prefer_not_to_say',
            phone: '+919876543210',
            password: 'must-not-be-returned',
          }],
        };
      }
      assert.match(sql, /WHERE user_id = \$1/);
      assert.match(sql, /reading_date >= \$2::date/);
      assert.match(sql, /reading_date <= \$3::date/);
      assert.deepEqual(values, ['72', '2024-11-01', '2024-11-13']);
      return {
        rows: [{
          id: '18',
          reading_date: '2026-11-04',
          time_slot: 'morning',
          value: 105,
        }],
      };
    },
    release() {
      calls.push({ sql: 'RELEASE' });
    },
  });

  const response = await request(
    'GET',
    '/api/doctor/patients/72/report?start_date=2024-11-01&end_date=2024-11-13',
    undefined,
    { role: 'doctor' },
  );

  assert.equal(response.status, 200);
  assert.equal(response.body.data.patient.full_name, 'Demo Patient');
  assert.equal(Object.hasOwn(response.body.data.patient, 'password'), false);
  assert.deepEqual(response.body.data.date_range, {
    start_date: '2024-11-01',
    end_date: '2024-11-13',
  });
  assert.equal(response.body.data.readings[0].value, 105);
  assert.equal(calls[0].sql, 'BEGIN');
  assert.ok(calls.findIndex(({ sql }) => /FROM doctor_patient_access/.test(sql))
    < calls.findIndex(({ sql }) => /FROM users u/.test(sql)));
  assert.equal(calls[calls.length - 2].sql, 'COMMIT');
  assert.equal(calls[calls.length - 1].sql, 'RELEASE');
});

test('doctor report hides unknown, unapproved, or revoked relationships before patient queries', async () => {
  const calls = [];
  pool.connect = async () => ({
    async query(sql) {
      calls.push(sql);
      if (['BEGIN', 'ROLLBACK'].includes(sql)) {
        return { rows: [] };
      }
      return { rows: [] };
    },
    release() {
      calls.push('RELEASE');
    },
  });

  const response = await request(
    'GET',
    '/api/doctor/patients/72/report',
    undefined,
    { role: 'doctor' },
  );

  assert.equal(response.status, 404);
  assert.equal(calls.some((sql) => /FROM users u|FROM readings/.test(sql)), false);
  assert.ok(calls.includes('ROLLBACK'));
});
