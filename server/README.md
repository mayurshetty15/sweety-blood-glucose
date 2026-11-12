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

### Tests

From the `server` directory, run:

```bash
npm test
```

The authentication tests stub database queries and do not require production
database credentials.
