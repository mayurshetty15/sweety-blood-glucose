# Sweety – Blood Glucose Tracker

Sweety is a patient-facing glucose tracking application built to help individuals record readings, review trends, and share approved summaries with doctors without exposing private data beyond the consented scope. The project combines a React client, an Express API, and a PostgreSQL data layer to support daily monitoring, filtered summaries, and controlled doctor access.

## Project overview

Blood glucose tracking is valuable because small trends often matter more than isolated readings. Sweety helps patients log values tied to time slots such as morning fasting, after breakfast, after lunch, and after dinner, then compare the readings across daily, weekly, and monthly views. The dashboard highlights current patterns, analytics surfaces trends, and reports make it easier to communicate relevant data to an approved clinician.

Patients can register and complete a profile, record readings with validation against the app’s allowed ranges and slot rules, and review their history with consistent date and time-slot filters. The app also supports a patient directory and explicit doctor consent flows so that a doctor can only access patient reports when the patient has granted access.

## Key features

### Completed implementation

- Patient registration and login
- Doctor login and role-aware routing
- Secure password storage with bcrypt
- JWT-based authentication and role authorization
- Patient profile completion and validation
- Glucose reading create, read, update, and delete flows
- Day/time-slot validation for glucose readings
- Dashboard overview with summary metrics and active filters
- Analytics views with date-based filtering and charts
- Reading history with date and time-slot filtering
- Persistent patient filters stored per user in browser localStorage
- Doctor directory listing for approved patient workflows
- Patient consent management and doctor approval/revocation
- Doctor patient report access, protected by consent checks
- Light and dark themes

### Planned or future-only features

The following items are not part of the current implementation and should be treated as future work rather than shipped capability:

- Automated glucose alerts and risk-based notifications
- Appointment booking or teleconsultation integration
- Advanced PDF/Excel export workflows beyond the built-in report generation
- Additional medical-grade analytics or machine learning-based trend analysis
- Multi-clinic or multi-doctor care coordination beyond the current consent model

## Technology stack

### Frontend

- React
- Vite
- JavaScript
- CSS
- Axios
- React Router
- Recharts
- lucide-react
- react-toastify

### Backend

- Node.js
- Express.js
- REST API
- JWT
- bcrypt
- PostgreSQL client (`pg`)

### Database

- PostgreSQL
- Supabase PostgreSQL-compatible hosting

### Testing

- Node.js built-in test runner (`node:test`)
- Assert library (`node:assert/strict`)

## System architecture

Sweety follows a standard three-layer pattern:

React frontend → Express REST API → PostgreSQL database

```mermaid
flowchart LR
  Patient[Patient] --> Frontend[React + Vite frontend]
  Doctor[Doctor] --> Frontend
  Frontend --> API[Express REST API]
  API --> Auth[Authentication middleware]
  Auth --> RBAC[Role-based authorization]
  API --> DB[(PostgreSQL / Supabase)]
  DB --> Users[users]
  DB --> Profiles[patient_profiles / doctor_profiles]
  DB --> Readings[readings]
  DB --> Access[doctor_patient_access]
```

The frontend is responsible for presentation, navigation, and client-side state management. The backend validates requests, enforces authentication and role checks, and queries the database with parameterized SQL. The database stores patient and doctor accounts, glucose readings, and the consent record that governs whether a doctor can view a patient report.

## Project folder structure

```text
sweety-blood-glucose/
├─ client/                     # React frontend application
│  ├─ src/                    # App source code, routes, pages, hooks, and context
│  ├─ tests/                  # Frontend logic tests
│  ├─ public/                 # Static assets (if added later)
│  ├─ .env.example            # Frontend environment template
│  └─ package.json            # Frontend dependencies and scripts
├─ server/                    # Express backend application
│  ├─ controllers/            # Auth, patient, reading, and doctor logic
│  ├─ middleware/             # Authentication and authorization checks
│  ├─ routes/                 # HTTP route registrations
│  ├─ config/                # Database configuration and error handling
│  ├─ scripts/                # Demo data seeding utilities
│  ├─ tests/                  # Backend API and validation tests
│  ├─ .env.example           # Backend environment template
│  └─ package.json           # Backend dependencies and scripts
├─ database/                  # SQL schema and migrations
│  ├─ schema.sql              # Full schema reference
│  └─ migrations/             # Database evolution scripts
├─ docs/
│  └─ screenshots/            # Add real screenshots here
├─ README.md                  # Project overview and setup guide
├─ .gitignore                 # Ignore local environment and generated files
└─ package.json               # Optional repo-level tooling, if added later
```

## Installation and local setup

The following steps are based on the current repository structure and verified scripts.

### 1. Prerequisites

- Node.js 18+ or a compatible current LTS version
- npm
- PostgreSQL database or a Supabase Postgres instance
- A browser for the frontend UI
- PowerShell or another shell capable of running the commands below

### 2. Clone the repository

```powershell
git clone https://github.com/mayurshetty15/sweety-blood-glucose.git
cd sweety-blood-glucose
```

### 3. Install frontend dependencies

```powershell
cd client
npm install
```

### 4. Install backend dependencies

```powershell
cd ..\server
npm install
```

### 5. Configure environment variables

Create local environment files from the examples without committing the real values:

```powershell
cd ..\client
Copy-Item .env.example .env

cd ..\server
Copy-Item .env.example .env
```

Set values for the local environment and database connection before starting the project.

### 6. Configure PostgreSQL / Supabase

Use the project database and apply the schema migration files in the correct order. The application does not run migrations automatically on startup.

Run the files in this order:

```sql
database/migrations/001_patient_roles_and_profiles.sql
database/migrations/002_doctor_profiles.sql
database/migrations/003_doctor_patient_access.sql
```

Then apply the full schema if needed for local dev setup:

```sql
database/schema.sql
```

Place the official Supabase root CA certificate at `server/certs/prod-supabase.cer` before starting the backend. The backend verifies the certificate chain and does not disable TLS validation.

### 7. Seed demo patient data (optional)

If you want to populate a local demo patient account with sample readings, set the environment variables below in `server/.env` and run the seed script:

```powershell
cd server
$env:SEED_USER_EMAIL = "demo.patient@example.com"
$env:SEED_USER_PASSWORD = "replace_with_a_secure_demo_password"
$env:CREATE_DEMO_USER = "true"
npm run seed:demo
```

The script creates a patient account when `CREATE_DEMO_USER=true` and the email is not already present, then inserts a deterministic month of sample glucose readings. Without the opt-in flag, it requires an existing user record and will not create a new one.

### 8. Seed demo doctors (optional)

The fictional doctor seed is intentionally opt-in and requires a local `server/.env` configuration:

```powershell
cd server
$env:ENABLE_DEMO_DOCTOR_SEED = "true"
$env:DEMO_DOCTOR_PASSWORD = "replace_with_a_local_demo_password"
npm run seed:doctors
```

This script creates the five fictional demo doctor accounts documented in the project and refuses to convert a non-doctor account into a doctor.

### 9. Start the backend

```powershell
cd server
npm run dev
```

The backend listens on port 5000 by default and exposes health checks under `/api/health`.

### 10. Start the frontend

```powershell
cd ..\client
npm run dev
```

### 11. Open the application

Open the frontend URL reported by Vite, usually `http://localhost:5173`.

## Environment variables

### Frontend

| Variable | Purpose | Example |
| --- | --- | --- |
| `VITE_API_URL` | Base API URL for the React client | `http://localhost:5000/api` |
| `VITE_APP_TIME_ZONE` | Client-side calendar timezone used for date filtering and display | `Asia/Kolkata` |

### Backend

| Variable | Purpose | Example |
| --- | --- | --- |
| `PORT` | Backend server port | `5000` |
| `CLIENT_URL` | Allowed frontend origin for CORS | `http://localhost:5173` |
| `APP_TIME_ZONE` | Backend calendar timezone used for validation and dates | `Asia/Kolkata` |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://username:password@host:port/database` |
| `JWT_SECRET` | Secret used to sign JWTs | `replace_with_a_secure_random_secret` |
| `JWT_EXPIRES_IN` | JWT lifetime | `1h` |
| `SEED_USER_EMAIL` | Email used by the reading seed script | `your-existing-account@example.com` |
| `SEED_USER_PASSWORD` | Password used when creating an automatic demo patient account | `replace_with_a_secure_demo_password` |
| `CREATE_DEMO_USER` | Opt-in flag that creates a demo patient account when the target email is missing | `false` |
| `ENABLE_DEMO_DOCTOR_SEED` | Enables the explicit fictional doctor seed | `false` |
| `DEMO_DOCTOR_PASSWORD` | Local-only demo doctor password | `replace_with_a_unique_secure_demo_password` |

The repository intentionally avoids committing real secrets, certificate files, or private credentials. The production database certificate must be kept in the secure server-side configuration.

## Database design

The application uses the following core tables:

### `users`

- Stores the authentication record for each account
- Key columns: `id`, `name`, `email`, `password`, `role`, `created_at`
- `role` is constrained to `patient` or `doctor`

### `patient_profiles`

- Stores patient profile data completed after registration
- Key columns: `id`, `user_id`, `full_name`, `age`, `gender`, `phone`, `created_at`, `updated_at`
- Each patient has at most one profile row

### `readings`

- Stores glucose readings owned by a patient
- Key columns: `id`, `user_id`, `reading_date`, `time_slot`, `value`, `created_at`, `updated_at`
- Valid time slots are `morning`, `after_breakfast`, `after_lunch`, and `after_dinner`
- Each patient can have a single reading per date and time slot

### `doctor_profiles`

- Stores public and professional details for doctors
- Key columns: `id`, `user_id`, `doctor_name`, `specialization`, `qualification`, `experience_years`, `clinic_name`, `location`, `phone`, `profile_image`, `is_active`

### `doctor_patient_access`

- Tracks patient-to-doctor consent and approval status
- Key columns: `id`, `patient_id`, `doctor_id`, `status`, `approved_at`, `revoked_at`, `created_at`, `updated_at`
- Allowed statuses: `pending`, `approved`, `revoked`

```mermaid
erDiagram
  users ||--o| patient_profiles : owns
  users ||--o{ readings : records
  users ||--o| doctor_profiles : keeps_profile
  users ||--o{ doctor_patient_access : patient_relationship
  users ||--o{ doctor_patient_access : doctor_relationship
```

## REST API documentation

### Authentication

#### `POST /api/auth/register`

- Auth: Not required
- Role: Public
- Request body: `name`, `email`, `password`
- Response: creates a patient account and returns a JWT token and user payload

#### `POST /api/auth/login`

- Auth: Not required
- Role: Public
- Request body: `email`, `password`, `role`
- Response: returns the authenticated user and JWT when the role matches the stored account role

### Patient profile

#### `GET /api/patient/profile`

- Auth: Required
- Role: `patient`
- Response: the authenticated patient profile or `null`

#### `PUT /api/patient/profile`

- Auth: Required
- Role: `patient`
- Request body: `full_name`, `age`, `gender`, `phone`
- Response: updates or creates the patient profile for the authenticated user

### Glucose readings

#### `POST /api/readings`

- Auth: Required
- Role: `patient`
- Request body: `reading_date`, `time_slot`, `value`
- Response: created reading with metadata

#### `GET /api/readings`

- Auth: Required
- Role: `patient`
- Query parameters: optional `reading_date`, `month`, `start_date`, `end_date`
- Response: list of the authenticated patient’s readings matching the filters

#### `GET /api/readings/:id`

- Auth: Required
- Role: `patient`
- Response: the reading if it belongs to the authenticated patient

#### `PUT /api/readings/:id`

- Auth: Required
- Role: `patient`
- Request body: `reading_date`, `time_slot`, `value`
- Response: updated reading details

#### `DELETE /api/readings/:id`

- Auth: Required
- Role: `patient`
- Response: removal confirmation for owned readings only

### Doctor directory and consent

#### `GET /api/doctors`

- Auth: Required
- Role: `patient`
- Response: active doctor directory cards without account emails

#### `GET /api/patient/doctors/access`

- Auth: Required
- Role: `patient`
- Response: the patient's doctor approval, pending, and revoked relationships

#### `POST /api/patient/doctors/:doctorId/approve`

- Auth: Required
- Role: `patient`
- Request body: `{ "confirmed": true }`
- Response: marks that doctor as approved for the authenticated patient when the target is a valid active doctor

#### `DELETE /api/patient/doctors/:doctorId/access`

- Auth: Required
- Role: `patient`
- Response: revokes access without deleting the historical relationship record

### Doctor patient reports

#### `GET /api/doctor/patients`

- Auth: Required
- Role: `doctor`
- Query: optional `search`
- Response: list of the authenticated doctor’s approved patients

#### `GET /api/doctor/patients/:patientId/report`

- Auth: Required
- Role: `doctor`
- Query: `start_date`, `end_date`
- Response: patient profile and readings only when the doctor has approved access and the consent is still valid

## Security implementation

The backend enforces several security expectations:

- Passwords are hashed with bcrypt before being stored.
- JWTs authorize route access and carry the verified user role.
- Role middleware restricts patient-only and doctor-only endpoints.
- SQL queries use parameterized inputs to avoid injection risk.
- Reading and profile queries are scoped to the authenticated user identity from the token.
- Doctor access to a patient report is guarded by the `doctor_patient_access` consent table and only valid when the relationship is in the `approved` state.
- Patient data is never exposed to a doctor without an explicit approval record.
- Validation checks reject malformed dates, invalid time slots, non-numeric values, future dates, and invalid profile data.
- Environment variables are kept outside version control and the app relies on secure local `.env` files rather than hardcoded secrets.
- PostgreSQL SSL verification is enforced through the configured connection string and certificate setup.

## Testing

The project includes automated backend and frontend tests. The following commands were run against the current repository state:

```powershell
cd client
npm test
npm run build
npm run lint

cd ..\server
npm test
```

Use the following commands for a fresh local verification pass:

```powershell
cd client
npm test
npm run build
npm run lint

cd ..\server
npm test
```

Notable test coverage includes:

- Authentication flow and invalid login behavior
- Role-based route enforcement
- Data validation for readings and patient profiles
- Doctor directory access and consent enforcement
- Doctor report authorization checks
- Asia/Kolkata date handling and date-range validation
- Persistent filter logic and report calculations on the client side

## Demo accounts

The demo doctor seed creates fictional doctor accounts using the following email addresses:

- `ananya.rao@demo.sweety.test`
- `rahul.mehta@demo.sweety.test`
- `priya.nair@demo.sweety.test`
- `arjun.sharma@demo.sweety.test`
- `sneha.iyer@demo.sweety.test`

The actual demo password must be configured locally in `server/.env` as `DEMO_DOCTOR_PASSWORD` before running `npm run seed:doctors`. The project does not expose demo passwords in the repository.

## Screenshots

The repository does not currently include application screenshots. The expected placeholder location is:

```text
docs/screenshots/
```

Recommended filenames for real screenshots include:

- `docs/screenshots/patient-dashboard.png`
- `docs/screenshots/analytics-overview.png`
- `docs/screenshots/report-generator.png`
- `docs/screenshots/doctor-consent-flow.png`

Add genuine screenshots to this folder and update the project documentation with the final images when the app is reviewed by stakeholders or recruiters.

## Deployment

### Completed deployment support

The current code is structured to run locally through the React Vite frontend and an Express backend connected to PostgreSQL. It is designed for a standard web deployment pattern with a frontend app and a separate API service.

### Recommended future deployment

A typical production deployment would include:

- Frontend hosted on a static site platform or CDN
- Backend on a Node.js hosting service or container platform
- PostgreSQL on managed Postgres infrastructure
- Secure secret management for `DATABASE_URL`, `JWT_SECRET`, and related variables
- HTTPS and origin validation via `CLIENT_URL`

## Future improvements

The following are realistic future enhancements for the application and are clearly marked as planned work, not completed features:

- Automated glucose trend alerts based on sustained spikes or drops
- Expanded analytics and personalized recommendations
- Appointment scheduling or integration with clinic workflows
- Improved report export options for PDF and spreadsheet formats
- Notification infrastructure for reminders and shared reports
- More advanced physician dashboard views and patient summaries

## Assumptions and limitations

- The application is designed for tracking and review support, not as a replacement for professional medical diagnosis.
- Demo doctor data is clearly fictional and intended for local or evaluation workflows.
- Readings are validated for the app’s supported range and time-slot model.
- The project stores filter preferences in the browser for a patient and separates them by patient ID so they do not leak across user accounts.
- The built-in report features are focused on data review and summarization rather than clinical decision support.

## Notes

- The backend requires a valid Supabase certificate at `server/certs/prod-supabase.cer` before it can open a TLS-secured Postgres connection.
- `server/.env` and `client/.env` are local-only files and must never be committed.
- Demo and seed commands are intentionally opt-in and should never be enabled in production without review.
- The application is a local or evaluation project focused on patient tracking flows, consent checks, and diagnostics; it is not a medical diagnosis system.

## Author and contact

This repository is maintained in GitHub under the project owner `mayurshetty15`:

- Repository: `https://github.com/mayurshetty15/sweety-blood-glucose`

No additional personal contact or portfolio links are claimed in this project documentation unless they are added in a future verified update.
