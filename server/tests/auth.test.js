const assert = require('node:assert/strict');
const http = require('node:http');
const { after, before, beforeEach, test } = require('node:test');

process.env.JWT_SECRET = 'test-only-secret-for-auth-tests';
process.env.JWT_EXPIRES_IN = '15m';
delete process.env.DATABASE_URL;

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const app = require('../app');
const authMiddleware = require('../middleware/authMiddleware');
const pool = require('../config/db');

let server;
let queryHandler;

pool.query = (...args) => queryHandler(...args);

before(async () => {
  await new Promise((resolve) => {
    server = app.listen(0, '127.0.0.1', resolve);
  });
});

beforeEach(() => {
  queryHandler = async () => {
    throw new Error('Unexpected database query in auth test.');
  };
});

after(async () => {
  await new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
  await pool.end();
});

function postJson(path, body) {
  return new Promise((resolve, reject) => {
    const request = http.request(
      {
        hostname: '127.0.0.1',
        port: server.address().port,
        path,
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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

    request.on('error', reject);
    request.end(JSON.stringify(body));
  });
}

function runAuthMiddleware(authorization) {
  const req = {
    body: { userId: '999' },
    query: { userId: '888' },
    get: () => authorization,
  };
  const res = {
    statusCode: null,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
  let nextCalled = false;

  authMiddleware(req, res, () => {
    nextCalled = true;
  });

  return { req, res, nextCalled };
}

test('registers a normalized user, stores a bcrypt hash, and returns a safe user and token', async () => {
  let insertedHash;
  queryHandler = async (sql, values) => {
    assert.match(sql, /INSERT INTO users/);
    assert.match(sql, /VALUES\s*\(\$1,\s*\$2,\s*\$3\)/);
    assert.deepEqual(values.slice(0, 2), ['Mayur', 'mayur@example.com']);
    insertedHash = values[2];

    return {
      rows: [{
        id: '17',
        name: 'Mayur',
        email: 'mayur@example.com',
        created_at: '2026-11-12T12:00:00.000Z',
      }],
    };
  };

  const response = await postJson('/api/auth/register', {
    name: ' Mayur ',
    email: ' Mayur@Example.COM ',
    password: 'StrongPassword123',
  });

  assert.equal(response.status, 201);
  assert.equal(response.body.user.id, '17');
  assert.equal(response.body.user.email, 'mayur@example.com');
  assert.equal(Object.hasOwn(response.body.user, 'password'), false);
  assert.equal(Object.hasOwn(response.body.user, 'password_hash'), false);
  assert.ok(await bcrypt.compare('StrongPassword123', insertedHash));
  assert.notEqual(insertedHash, 'StrongPassword123');
  assert.equal(JSON.stringify(response.body).includes(insertedHash), false);
  const claims = jwt.verify(response.body.token, process.env.JWT_SECRET);
  assert.equal(claims.sub, '17');
  assert.equal(Object.hasOwn(claims, 'password'), false);
  assert.equal(Object.hasOwn(claims, 'password_hash'), false);
});

test('rejects duplicate email with HTTP 409', async () => {
  queryHandler = async () => {
    const error = new Error('duplicate key');
    error.code = '23505';
    error.constraint = 'users_email_unique';
    throw error;
  };

  const response = await postJson('/api/auth/register', {
    name: 'Mayur',
    email: 'mayur@example.com',
    password: 'StrongPassword123',
  });

  assert.equal(response.status, 409);
  assert.equal(response.body.success, false);
});

test('validates required registration fields, email, and minimum password length', async () => {
  const missingFields = await postJson('/api/auth/register', {
    name: 'Mayur',
  });
  const invalidEmail = await postJson('/api/auth/register', {
    name: 'Mayur',
    email: 'not-an-email',
    password: 'StrongPassword123',
  });
  const shortPassword = await postJson('/api/auth/register', {
    name: 'Mayur',
    email: 'mayur@example.com',
    password: 'short',
  });

  assert.equal(missingFields.status, 400);
  assert.equal(invalidEmail.status, 400);
  assert.equal(shortPassword.status, 400);
  assert.match(shortPassword.body.message, /at least 8 characters/);
});

test('logs in with a normalized email and returns a safe user and token', async () => {
  const passwordHash = await bcrypt.hash('StrongPassword123', 12);
  queryHandler = async (sql, values) => {
    assert.match(sql, /WHERE email = \$1/);
    assert.deepEqual(values, ['mayur@example.com']);
    return {
      rows: [{
        id: '17',
        name: 'Mayur',
        email: 'mayur@example.com',
        password: passwordHash,
        created_at: '2026-11-12T12:00:00.000Z',
      }],
    };
  };

  const response = await postJson('/api/auth/login', {
    email: ' Mayur@Example.COM ',
    password: 'StrongPassword123',
  });

  assert.equal(response.status, 200);
  assert.equal(response.body.user.email, 'mayur@example.com');
  assert.equal(Object.hasOwn(response.body.user, 'password'), false);
  assert.equal(JSON.stringify(response.body).includes(passwordHash), false);
  assert.equal(jwt.verify(response.body.token, process.env.JWT_SECRET).sub, '17');
});

test('returns the same invalid-credentials response for unknown email and wrong password', async () => {
  const passwordHash = await bcrypt.hash('CorrectPassword123', 12);
  queryHandler = async (sql, [email]) => ({
    rows: email === 'unknown@example.com'
      ? []
      : [{
        id: '17',
        name: 'Mayur',
        email: 'mayur@example.com',
        password: passwordHash,
        created_at: '2026-11-12T12:00:00.000Z',
      }],
  });

  const unknownEmail = await postJson('/api/auth/login', {
    email: 'unknown@example.com',
    password: 'WrongPassword123',
  });
  const wrongPassword = await postJson('/api/auth/login', {
    email: 'mayur@example.com',
    password: 'WrongPassword123',
  });

  assert.equal(unknownEmail.status, 401);
  assert.equal(wrongPassword.status, 401);
  assert.equal(unknownEmail.body.message, wrongPassword.body.message);
});

test('rejects a missing authentication token with HTTP 401', () => {
  const result = runAuthMiddleware(undefined);

  assert.equal(result.res.statusCode, 401);
  assert.equal(result.nextCalled, false);
});

test('rejects an invalid authentication token with HTTP 401', () => {
  const result = runAuthMiddleware('Bearer invalid-token');

  assert.equal(result.res.statusCode, 401);
  assert.equal(result.nextCalled, false);
});

test('rejects a malformed authentication token with HTTP 401', () => {
  const result = runAuthMiddleware('Bearer not.a.valid.jwt');

  assert.equal(result.res.statusCode, 401);
  assert.equal(result.nextCalled, false);
});

test('rejects a token with an invalid signature', () => {
  const token = jwt.sign(
    { sub: '17' },
    'different-isolated-test-secret',
    { algorithm: 'HS256', expiresIn: '1m' },
  );
  const result = runAuthMiddleware(`Bearer ${token}`);

  assert.equal(result.res.statusCode, 401);
  assert.equal(result.nextCalled, false);
});

test('rejects an expired authentication token with HTTP 401', () => {
  const token = jwt.sign(
    { sub: '17' },
    process.env.JWT_SECRET,
    { algorithm: 'HS256', expiresIn: -1 },
  );
  const result = runAuthMiddleware(`Bearer ${token}`);

  assert.equal(result.res.statusCode, 401);
  assert.equal(result.nextCalled, false);
});

test('attaches only the verified token user ID to the request', () => {
  const token = jwt.sign(
    { sub: '17' },
    process.env.JWT_SECRET,
    { algorithm: 'HS256', expiresIn: '1m' },
  );
  const result = runAuthMiddleware(`Bearer ${token}`);

  assert.equal(result.nextCalled, true);
  assert.deepEqual(result.req.user, { id: '17' });
});
