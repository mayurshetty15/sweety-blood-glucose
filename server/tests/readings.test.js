const assert = require('node:assert/strict');
const http = require('node:http');
const { after, before, beforeEach, test } = require('node:test');

process.env.JWT_SECRET = 'test-only-secret-for-reading-tests';
delete process.env.DATABASE_URL;

const jwt = require('jsonwebtoken');
const app = require('../app');
const pool = require('../config/db');

let server;
const userId = '17';

before(async () => {
  await new Promise((resolve) => {
    server = app.listen(0, '127.0.0.1', resolve);
  });
});

beforeEach(() => {
  pool.query = async () => {
    throw new Error('Unexpected pool query in reading test.');
  };
  pool.connect = async () => {
    throw new Error('Unexpected connection in reading test.');
  };
});

after(async () => {
  await new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
  await pool.end();
});

function tokenFor(id = userId) {
  return jwt.sign({ sub: id }, process.env.JWT_SECRET, {
    algorithm: 'HS256',
    expiresIn: '15m',
  });
}

function request(method, path, body, includeToken = true) {
  return new Promise((resolve, reject) => {
    const headers = {};
    if (body !== undefined) {
      headers['Content-Type'] = 'application/json';
    }
    if (includeToken) {
      headers.Authorization = `Bearer ${tokenFor()}`;
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
    if (body !== undefined) {
      outgoing.end(typeof body === 'string' ? body : JSON.stringify(body));
    } else {
      outgoing.end();
    }
  });
}

function mockClient(handler) {
  const calls = [];
  pool.connect = async () => ({
    query: async (sql, values) => {
      calls.push({ sql, values });
      return handler(sql, values, calls);
    },
    release() {
      calls.push({ sql: 'RELEASE' });
    },
  });
  return calls;
}

const validReading = {
  reading_date: '2026-01-02',
  time_slot: 'morning',
  value: 110,
};

function readingRow(overrides = {}) {
  return {
    id: '1',
    user_id: userId,
    ...validReading,
    created_at: '2026-01-02T08:00:00.000Z',
    updated_at: '2026-01-02T08:00:00.000Z',
    ...overrides,
  };
}

test('creates a reading under the JWT user and locks the user before the daily count', async () => {
  const calls = mockClient((sql) => {
    if (sql === 'BEGIN' || sql === 'COMMIT' || sql === 'ROLLBACK') {
      return { rows: [] };
    }
    if (/SELECT id FROM users/.test(sql)) {
      return { rows: [{ id: userId }] };
    }
    if (/COUNT\(\*\)/.test(sql)) {
      return { rows: [{ count: 0 }] };
    }
    if (/INSERT INTO readings/.test(sql)) {
      return { rows: [readingRow()] };
    }
    throw new Error(`Unexpected SQL in create test: ${sql}`);
  });

  const response = await request('POST', '/api/readings', {
    ...validReading,
    user_id: '999',
  });

  assert.equal(response.status, 201);
  assert.equal(response.body.data.user_id, userId);
  assert.deepEqual(calls.find((call) => /INSERT INTO readings/.test(call.sql)).values, [
    userId,
    validReading.reading_date,
    validReading.time_slot,
    validReading.value,
  ]);
  assert.ok(calls.findIndex((call) => /FOR UPDATE/.test(call.sql))
    < calls.findIndex((call) => /COUNT\(\*\)/.test(call.sql)));
  assert.equal(calls[calls.length - 1].sql, 'RELEASE');
});

for (const [label, value] of [
  ['below the allowed range', 39],
  ['above the allowed range', 601],
  ['a decimal value', 110.5],
]) {
  test(`rejects a value ${label}`, async () => {
    const response = await request('POST', '/api/readings', {
      ...validReading,
      value,
    });

    assert.equal(response.status, 400);
    assert.match(response.body.message, /integer between 40 and 600/);
  });
}

test('rejects a future date', async () => {
  const tomorrow = new Date();
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  const response = await request('POST', '/api/readings', {
    ...validReading,
    reading_date: tomorrow.toISOString().slice(0, 10),
  });

  assert.equal(response.status, 400);
  assert.match(response.body.message, /cannot be in the future/);
});

test('rejects an invalid time slot', async () => {
  const response = await request('POST', '/api/readings', {
    ...validReading,
    time_slot: 'midnight',
  });

  assert.equal(response.status, 400);
  assert.match(response.body.message, /permitted reading time/);
});

test('rejects malformed JSON with HTTP 400', async () => {
  const response = await request('POST', '/api/readings', '{');

  assert.equal(response.status, 400);
  assert.match(response.body.message, /valid JSON/);
});

test('maps the unique daily-slot constraint to HTTP 409', async () => {
  mockClient((sql) => {
    if (sql === 'BEGIN' || sql === 'ROLLBACK') {
      return { rows: [] };
    }
    if (/SELECT id FROM users/.test(sql)) {
      return { rows: [{ id: userId }] };
    }
    if (/COUNT\(\*\)/.test(sql)) {
      return { rows: [{ count: 1 }] };
    }
    if (/INSERT INTO readings/.test(sql)) {
      const error = new Error('duplicate key');
      error.code = '23505';
      error.constraint = 'unique_daily_slot';
      throw error;
    }
    throw new Error(`Unexpected SQL in duplicate test: ${sql}`);
  });

  const response = await request('POST', '/api/readings', validReading);

  assert.equal(response.status, 409);
  assert.match(response.body.message, /already exists/);
});

test('rejects a fifth reading and rolls back without inserting', async () => {
  const calls = mockClient((sql) => {
    if (sql === 'BEGIN' || sql === 'ROLLBACK') {
      return { rows: [] };
    }
    if (/SELECT id FROM users/.test(sql)) {
      return { rows: [{ id: userId }] };
    }
    if (/COUNT\(\*\)/.test(sql)) {
      return { rows: [{ count: 4 }] };
    }
    throw new Error(`Unexpected SQL in daily-limit test: ${sql}`);
  });

  const response = await request('POST', '/api/readings', validReading);

  assert.equal(response.status, 409);
  assert.match(response.body.message, /maximum of four/);
  assert.ok(calls.some((call) => call.sql === 'ROLLBACK'));
  assert.equal(calls.some((call) => /INSERT INTO readings/.test(call.sql)), false);
});

test('lists only the JWT user readings and supports date/month filters', async () => {
  let query;
  pool.query = async (sql, values) => {
    query = { sql, values };
    return { rows: [readingRow()] };
  };

  const response = await request(
    'GET',
    '/api/readings?reading_date=2026-01-02&month=2026-01',
  );

  assert.equal(response.status, 200);
  assert.deepEqual(response.body.data.map((reading) => reading.user_id), [userId]);
  assert.match(query.sql, /WHERE user_id = \$1/);
  assert.match(query.sql, /ORDER BY reading_date DESC, created_at DESC/);
  assert.deepEqual(query.values, [userId, '2026-01-02', '2026-01-01']);
});

test('does not disclose another user reading when looking up an ID', async () => {
  let query;
  pool.query = async (sql, values) => {
    query = { sql, values };
    return { rows: [] };
  };

  const response = await request('GET', '/api/readings/5');

  assert.equal(response.status, 404);
  assert.match(query.sql, /WHERE id = \$1 AND user_id = \$2/);
  assert.deepEqual(query.values, ['5', userId]);
});

test('rejects a malformed reading ID', async () => {
  const response = await request('GET', '/api/readings/not-an-id');

  assert.equal(response.status, 400);
  assert.match(response.body.message, /valid positive integer/);
});

test('rejects malformed date filters', async () => {
  const response = await request('GET', '/api/readings?month=2026-13');

  assert.equal(response.status, 400);
  assert.match(response.body.message, /month must be in YYYY-MM format/);
});

test('updates a reading with a user-scoped query and a locked daily-limit check', async () => {
  const calls = mockClient((sql) => {
    if (sql === 'BEGIN' || sql === 'COMMIT' || sql === 'ROLLBACK') {
      return { rows: [] };
    }
    if (/SELECT id FROM users/.test(sql)) {
      return { rows: [{ id: userId }] };
    }
    if (/FROM readings/.test(sql) && /FOR UPDATE/.test(sql)) {
      return { rows: [{ id: '1' }] };
    }
    if (/COUNT\(\*\)/.test(sql)) {
      return { rows: [{ count: 0 }] };
    }
    if (/UPDATE readings/.test(sql)) {
      return { rows: [readingRow({ time_slot: 'after_breakfast', value: 125 })] };
    }
    throw new Error(`Unexpected SQL in update test: ${sql}`);
  });

  const response = await request('PUT', '/api/readings/1', {
    ...validReading,
    time_slot: 'after_breakfast',
    value: 125,
  });

  assert.equal(response.status, 200);
  assert.equal(response.body.data.time_slot, 'after_breakfast');
  const updateCall = calls.find((call) => /UPDATE readings/.test(call.sql));
  assert.match(updateCall.sql, /WHERE id = \$4 AND user_id = \$5/);
  assert.deepEqual(updateCall.values, [
    validReading.reading_date,
    'after_breakfast',
    125,
    '1',
    userId,
  ]);
});

test('deletes only an owned reading', async () => {
  let query;
  pool.query = async (sql, values) => {
    query = { sql, values };
    return { rows: [{ id: '1' }] };
  };

  const response = await request('DELETE', '/api/readings/1');

  assert.equal(response.status, 200);
  assert.match(response.body.message, /deleted successfully/);
  assert.match(query.sql, /WHERE id = \$1 AND user_id = \$2/);
  assert.deepEqual(query.values, ['1', userId]);
});

test('rejects a reading request without a JWT before database access', async () => {
  let databaseCalled = false;
  pool.connect = async () => {
    databaseCalled = true;
    throw new Error('Database should not be reached.');
  };

  const response = await request('POST', '/api/readings', validReading, false);

  assert.equal(response.status, 401);
  assert.equal(databaseCalled, false);
});
