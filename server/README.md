# Sweety API

## Required Supabase TLS certificate

The PostgreSQL connection requires the official Supabase root certificate at:

```text
server/certs/prod-supabase.cer
```

Place the PEM-encoded certificate at that path before starting the backend. The
server loads it relative to `config/db.js` and verifies the certificate chain.
Do not disable certificate verification.

Keep SSL query parameters such as `sslmode`, `sslrootcert`, `sslcert`, and
`sslkey` out of `DATABASE_URL`. The `pg` connection-string parser can override
the explicit SSL configuration when those parameters are present.

Start the backend from `server` with `npm run dev`, then check
`http://localhost:5000/api/health`.

## Authentication

The API uses the existing PostgreSQL pool, `bcrypt`, and `jsonwebtoken`.
Configure these values in `server/.env`:

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Supabase PostgreSQL connection string |
| `JWT_SECRET` | Private signing secret; replace the example with a securely generated value |
| `JWT_EXPIRES_IN` | Token lifetime accepted by `jsonwebtoken`, for example `1h` |
| `PORT` | Backend port (defaults to `5000`) |
| `CLIENT_URL` | Allowed frontend origin |
| `APP_TIME_ZONE` | Calendar time zone used for future-date validation (defaults to `Asia/Kolkata`) |

Set `APP_TIME_ZONE` to the same calendar zone as the frontend's
`VITE_APP_TIME_ZONE`. PostgreSQL `DATE` responses are returned as `YYYY-MM-DD`
text and are not converted through UTC timestamps.

`server/.env` is ignored by Git. Never commit real connection strings or JWT
secrets.

### Roles and migration

Run `database/migrations/001_patient_roles_and_profiles.sql`,
`database/migrations/002_doctor_profiles.sql`, and
`database/migrations/003_doctor_patient_access.sql` manually against the target
database before deploying these phases. They add `users.role` with a `patient`
default, explicitly assign `patient` to existing `NULL` roles, add role and
profile validation constraints, and create patient profiles, doctor profiles,
and the unique doctor-patient consent table. Existing user rows and glucose
readings are preserved; existing users receive the `patient` role where their
role is `NULL`. No glucose readings are changed or deleted. The application
does not run migrations at startup. Existing tokens issued before the role
claim was introduced must sign in again after deployment.

Public registration always creates a patient account. Doctor accounts are not
created through the registration API; they require a controlled administrative
process.

### Register

`POST /api/auth/register`

```json
{
  "name": "Mayur",
  "email": "mayur@example.com",
  "password": "StrongPassword123"
}
```

Successful response (`201`):

```json
{
  "success": true,
  "message": "User registered successfully",
  "token": "<JWT>",
  "user": {
    "id": "1",
    "name": "Mayur",
    "email": "mayur@example.com",
    "role": "patient",
    "profile_complete": false,
    "created_at": "2026-11-12T12:00:00.000Z"
  }
}
```

Passwords must contain at least 8 characters and no more than 72 UTF-8 bytes.
Registration returns `409` if the normalized email already exists.

### Login

`POST /api/auth/login`

```json
{
  "email": "mayur@example.com",
  "password": "StrongPassword123",
  "role": "patient"
}
```

Successful response (`200`):

```json
{
  "success": true,
  "message": "Login successful",
  "token": "<JWT>",
  "user": {
    "id": "1",
    "name": "Mayur",
    "email": "mayur@example.com",
    "role": "patient",
    "profile_complete": false,
    "created_at": "2026-11-12T12:00:00.000Z"
  }
}
```

Invalid email/password combinations return the same `401` message. Neither
endpoint returns the stored password hash.
Login verifies the selected role against the stored role and places that
verified role in the signed JWT. Selecting the wrong role is rejected.

### Authenticated requests

Send the token in the `Authorization` header:

```text
Authorization: Bearer <JWT>
```

Use the exported `server/middleware/authMiddleware.js` on protected routes.
It sets `req.user.id` and `req.user.role` from the verified token claims. Use
`authMiddleware.requireRole('patient')` or
`authMiddleware.requireRole('doctor')` after authentication for role-specific
routes.

### Patient profile

`GET /api/patient/profile` returns the authenticated patient's profile or
`data: null` when it has not been completed. `PUT /api/patient/profile` creates
or updates only the profile owned by the authenticated patient. The request
requires `full_name`, an integer `age` from 1 through 120, one of `female`,
`male`, `non_binary`, `other`, or `prefer_not_to_say`, and a valid phone number
containing 7 to 15 digits (optional `+` and common separators are accepted).
The API stores the phone in compact international form. Profile responses
never include authentication fields.

### Fictional doctor seed

The explicit `npm run seed:doctors` command creates five clearly fictional
doctor accounts and profiles. First set `ENABLE_DEMO_DOCTOR_SEED=true` and a
unique `DEMO_DOCTOR_PASSWORD` (12 to 72 UTF-8 bytes) in the private
`server/.env`. The same configured password is hashed with bcrypt separately
for each newly created account; reruns do not reset existing doctor passwords.
The seed runs in one transaction, is idempotent, and refuses to change an
existing non-doctor account into a doctor. Do not enable this seed in production.
The fictional login emails are listed in `server/scripts/seedDemoDoctors.js`.

### Directory and patient consent

These endpoints require a patient-role JWT:

- `GET /api/doctors` returns active directory cards without account emails.
- `GET /api/patient/doctors/access` returns only the authenticated patient's
  consent records.
- `POST /api/patient/doctors/:doctorId/approve` approves access only if the
  target is an active doctor with a directory profile and the patient sends
  `{"confirmed": true}` after the consent dialog.
- `DELETE /api/patient/doctors/:doctorId/access` changes that patient's
  relationship to `revoked`; it does not delete the consent history.

The patient ID is always taken from the verified JWT, never from request data.
The directory asks for explicit patient confirmation before sending the
approval request. Doctors receive report access only through backend checks of
an `approved` relationship.

Doctor-role endpoints:

- `GET /api/doctor/patients` lists only the authenticated doctor's approved
  patients and supports a `search` query.
- `GET /api/doctor/patients/:patientId/report?start_date=YYYY-MM-DD&end_date=YYYY-MM-DD`
  returns the selected patient's profile and real readings only after checking
  and locking the approved consent relationship for the duration of the read.
  Revoked and unapproved relationships return `404`.

The doctor report is read-only. Doctor-role JWTs are rejected by all glucose
create, update, and delete endpoints.

## Glucose readings

Every readings endpoint requires `Authorization: Bearer <JWT>`. The authenticated
user ID is taken only from the verified token; a `user_id` in a request body is
never used.

Permitted time slots are `morning`, `after_breakfast`, `after_lunch`, and
`after_dinner`. Reading values must be integers from 40 through 600, and the
reading date must be a valid `YYYY-MM-DD` date that is not in the future. A user
may have at most four readings per date and only one reading per time slot.

### Create a reading

`POST /api/readings`

```json
{
  "reading_date": "2026-11-13",
  "time_slot": "morning",
  "value": 110
}
```

Successful response (`201`):

```json
{
  "success": true,
  "message": "Reading created successfully.",
  "data": {
    "id": "1",
    "user_id": "17",
    "reading_date": "2026-11-13",
    "time_slot": "morning",
    "value": 110,
    "created_at": "2026-11-13T08:00:00.000Z",
    "updated_at": "2026-11-13T08:00:00.000Z"
  }
}
```

### Get readings

`GET /api/readings`

Optional query filters include `reading_date=2026-11-13`, `month=2026-11`,
or a paired `start_date=2026-11-01&end_date=2026-11-13`. Date-range filters
cannot be combined with `reading_date` or `month`. Future dates and reversed
ranges are rejected. Omitting date filters returns the user's complete history.
Results are restricted to the authenticated user and sorted newest date first,
then by time slot from after dinner to morning. The API returns `reading_date` as
`YYYY-MM-DD` text so PostgreSQL `DATE` values cannot shift across time zones.

Successful response (`200`):

```json
{
  "success": true,
  "data": [
    {
      "id": "1",
      "user_id": "17",
      "reading_date": "2026-11-13",
      "time_slot": "morning",
      "value": 110,
      "created_at": "2026-11-13T08:00:00.000Z",
      "updated_at": "2026-11-13T08:00:00.000Z"
    }
  ]
}
```

### Get a reading

`GET /api/readings/:id`

Successful response (`200`) uses the same `data` object shape as the create
response. A missing reading or one belonging to another user returns `404`.

### Update a reading

`PUT /api/readings/:id`

Supply all three reading fields; the same date, slot, value, duplicate, and
daily-limit validations as creation apply.

```json
{
  "reading_date": "2026-11-13",
  "time_slot": "after_breakfast",
  "value": 125
}
```

Successful response (`200`) contains the updated reading in `data`.

### Delete a reading

`DELETE /api/readings/:id`

Successful response (`200`):

```json
{
  "success": true,
  "message": "Reading deleted successfully."
}
```

Invalid input returns `400`, missing or invalid authentication returns `401`,
missing or non-owned readings return `404`, and duplicate slots or the daily
limit return `409`. Unexpected failures return a generic `500` response without
database details.

Example error responses:

```json
{
  "success": false,
  "message": "Glucose value must be an integer between 40 and 600."
}
```

```json
{
  "success": false,
  "message": "A maximum of four readings is allowed per day."
}
```

Database failures return a generic message, for example:

```json
{
  "success": false,
  "message": "Unable to complete the reading request."
}
```

### Tests

From the `server` directory, run:

```bash
npm test
```

The authentication tests stub database queries and do not require production
database credentials.

### Seed synthetic glucose readings

Set `SEED_USER_EMAIL` in `server/.env` to the email of your existing account.
The seeder verifies that account exists and never creates a user. It generates
synthetic readings for the previous calendar month and current month-to-date,
then inserts them in a transaction using the existing unique daily-slot
constraint to skip duplicates. Existing readings are never deleted or updated.

Run manually from the `server` directory:

```bash
npm run seed:demo
```

The command reports the number of inserted readings and skipped duplicates. It
is not run automatically when the server starts.
