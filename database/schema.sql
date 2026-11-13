CREATE TABLE IF NOT EXISTS users (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL,
  password VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'patient',
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT users_email_unique UNIQUE (email),
  CONSTRAINT users_role_valid CHECK (role IN ('patient', 'doctor'))
);

CREATE TABLE IF NOT EXISTS patient_profiles (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL UNIQUE,
  full_name VARCHAR(120) NOT NULL,
  age SMALLINT NOT NULL,
  gender VARCHAR(30) NOT NULL,
  phone VARCHAR(16) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_patient_profiles_user
    FOREIGN KEY (user_id)
    REFERENCES users (id)
    ON DELETE CASCADE,
  CONSTRAINT patient_profiles_age_valid CHECK (age BETWEEN 1 AND 120),
  CONSTRAINT patient_profiles_gender_valid
    CHECK (gender IN ('female', 'male', 'non_binary', 'other', 'prefer_not_to_say')),
  CONSTRAINT patient_profiles_phone_valid
    CHECK (phone ~ '^\+?[1-9][0-9]{6,14}$')
);

CREATE TABLE IF NOT EXISTS doctor_profiles (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL UNIQUE,
  doctor_name VARCHAR(120) NOT NULL,
  specialization VARCHAR(120) NOT NULL,
  qualification VARCHAR(180) NOT NULL,
  experience_years SMALLINT NOT NULL,
  clinic_name VARCHAR(160) NOT NULL,
  location VARCHAR(160) NOT NULL,
  phone VARCHAR(25),
  profile_image TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_doctor_profiles_user
    FOREIGN KEY (user_id)
    REFERENCES users (id)
    ON DELETE CASCADE,
  CONSTRAINT doctor_profiles_experience_valid
    CHECK (experience_years BETWEEN 0 AND 80)
);

CREATE INDEX IF NOT EXISTS idx_doctor_profiles_active_specialization
  ON doctor_profiles (specialization, doctor_name)
  WHERE is_active = TRUE;

CREATE TABLE IF NOT EXISTS doctor_patient_access (
  id BIGSERIAL PRIMARY KEY,
  patient_id BIGINT NOT NULL,
  doctor_id BIGINT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  approved_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_doctor_patient_access_patient
    FOREIGN KEY (patient_id)
    REFERENCES users (id)
    ON DELETE CASCADE,
  CONSTRAINT fk_doctor_patient_access_doctor
    FOREIGN KEY (doctor_id)
    REFERENCES users (id)
    ON DELETE CASCADE,
  CONSTRAINT doctor_patient_access_pair_unique UNIQUE (patient_id, doctor_id),
  CONSTRAINT doctor_patient_access_status_valid
    CHECK (status IN ('pending', 'approved', 'revoked')),
  CONSTRAINT doctor_patient_access_distinct_users
    CHECK (patient_id <> doctor_id),
  CONSTRAINT doctor_patient_access_approval_timestamps_valid
    CHECK (
      (status = 'approved' AND approved_at IS NOT NULL AND revoked_at IS NULL)
      OR (status = 'revoked' AND revoked_at IS NOT NULL)
      OR (status = 'pending' AND approved_at IS NULL AND revoked_at IS NULL)
    )
);

CREATE INDEX IF NOT EXISTS idx_doctor_patient_access_approved_doctor
  ON doctor_patient_access (doctor_id, patient_id)
  WHERE status = 'approved';

CREATE INDEX IF NOT EXISTS idx_doctor_patient_access_patient_status
  ON doctor_patient_access (patient_id, status);

CREATE TABLE IF NOT EXISTS readings (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL,
  reading_date DATE NOT NULL,
  time_slot VARCHAR(30) NOT NULL,
  value INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_readings_user
    FOREIGN KEY (user_id)
    REFERENCES users (id)
    ON DELETE CASCADE,
  CONSTRAINT valid_glucose_value
    CHECK (value BETWEEN 40 AND 600),
  CONSTRAINT valid_time_slot
    CHECK (time_slot IN ('morning', 'after_breakfast', 'after_lunch', 'after_dinner')),
  CONSTRAINT unique_daily_slot
    UNIQUE (user_id, reading_date, time_slot)
);

CREATE INDEX IF NOT EXISTS idx_readings_user_date
  ON readings (user_id, reading_date);
