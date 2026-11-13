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
  "password": "StrongPassword123"
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
    "created_at": "2026-11-12T12:00:00.000Z"
  }
}
```

Invalid email/password combinations return the same `401` message. Neither
endpoint returns the stored password hash.

### Authenticated requests

Send the token in the `Authorization` header:

```text
Authorization: Bearer <JWT>
```

Use the exported `server/middleware/authMiddleware.js` on protected routes.
It sets `req.user.id` from the verified token subject.

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
