const assert = require('node:assert/strict');
const { test } = require('node:test');
const bcrypt = require('bcrypt');
const { DEMO_DOCTORS, seedDemoDoctors } = require('../scripts/seedDemoDoctors');

function createMemoryPool(initialUsers = []) {
  const users = new Map(initialUsers.map((user) => [user.email, user]));
  const profiles = new Map();
  const calls = [];
  let nextId = 1;

  return {
    users,
    profiles,
    calls,
    async connect() {
      return {
        async query(sql, values = []) {
          calls.push({ sql, values });
          if (['BEGIN', 'COMMIT', 'ROLLBACK'].includes(sql)) {
            return { rows: [], rowCount: 0 };
          }
          if (/INSERT INTO users/.test(sql)) {
            const [name, email, passwordHash] = values;
            if (users.has(email)) {
              return { rows: [], rowCount: 0 };
            }
            const user = {
              id: String(nextId++),
              name,
              email,
              password: passwordHash,
              role: 'doctor',
            };
            users.set(email, user);
            return { rows: [{ id: user.id, role: user.role }], rowCount: 1 };
          }
          if (/SELECT id, role FROM users/.test(sql)) {
            const user = users.get(values[0]);
            return {
              rows: user ? [{ id: user.id, role: user.role }] : [],
              rowCount: user ? 1 : 0,
            };
          }
          if (/INSERT INTO doctor_profiles/.test(sql)) {
            profiles.set(values[0], {
              user_id: values[0],
              doctor_name: values[1],
              specialization: values[2],
            });
            return { rows: [], rowCount: 1 };
          }
          throw new Error(`Unexpected SQL in seed test: ${sql}`);
        },
        release() {
          calls.push({ sql: 'RELEASE', values: [] });
        },
      };
    },
  };
}

function fakeBcrypt() {
  let nextHash = 0;
  return {
    async hash(password, rounds) {
      assert.equal(password, 'AUniqueDemoPassword123!');
      assert.equal(rounds, 12);
      nextHash += 1;
      return `bcrypt-hash-${nextHash}`;
    },
  };
}

test('creates five fictional doctor users with distinct hashes and idempotent profiles', async () => {
  const databasePool = createMemoryPool();

  const initial = await seedDemoDoctors({
    databasePool,
    password: 'AUniqueDemoPassword123!',
    enabled: true,
  });
  const rerun = await seedDemoDoctors({
    databasePool,
    password: 'AUniqueDemoPassword123!',
    enabled: true,
  });

  assert.equal(DEMO_DOCTORS.length, 5);
  assert.deepEqual(initial, { accountsCreated: 5, profilesSeeded: 5 });
  assert.deepEqual(rerun, { accountsCreated: 0, profilesSeeded: 5 });
  assert.equal(databasePool.users.size, 5);
  assert.equal(databasePool.profiles.size, 5);
  assert.equal(new Set([...databasePool.users.values()].map(({ password }) => password)).size, 5);
  assert.ok([...databasePool.users.values()].every(({ role }) => role === 'doctor'));
  assert.ok([...databasePool.users.values()].every(({ password }) => (
    password !== 'AUniqueDemoPassword123!'
  )));
  assert.ok(await bcrypt.compare(
    'AUniqueDemoPassword123!',
    databasePool.users.get(DEMO_DOCTORS[0].email).password,
  ));
  assert.ok(databasePool.calls.some(({ sql }) => sql === 'COMMIT'));
});

test('requires explicit enablement and a sufficiently strong environment password', async () => {
  let connected = false;
  const databasePool = {
    async connect() {
      connected = true;
      throw new Error('Database must not be reached.');
    },
  };

  await assert.rejects(
    seedDemoDoctors({
      databasePool,
      password: 'AUniqueDemoPassword123!',
      enabled: false,
      bcryptImplementation: fakeBcrypt(),
    }),
    { code: 'DEMO_DOCTOR_SEED_DISABLED' },
  );
  await assert.rejects(
    seedDemoDoctors({
      databasePool,
      password: 'short',
      enabled: true,
      bcryptImplementation: fakeBcrypt(),
    }),
    { code: 'DEMO_DOCTOR_PASSWORD_INVALID' },
  );
  assert.equal(connected, false);
});

test('refuses to promote an existing patient account and rolls back', async () => {
  const firstDoctor = DEMO_DOCTORS[0];
  const databasePool = createMemoryPool([{
    id: '90',
    email: firstDoctor.email,
    role: 'patient',
  }]);

  await assert.rejects(
    seedDemoDoctors({
      databasePool,
      password: 'AUniqueDemoPassword123!',
      enabled: true,
      bcryptImplementation: fakeBcrypt(),
    }),
    { code: 'DEMO_DOCTOR_EMAIL_CONFLICT' },
  );

  assert.equal(databasePool.users.get(firstDoctor.email).role, 'patient');
  assert.ok(databasePool.calls.some(({ sql }) => sql === 'ROLLBACK'));
  assert.equal(databasePool.profiles.size, 0);
});
