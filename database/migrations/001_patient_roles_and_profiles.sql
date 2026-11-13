ALTER TABLE users
  ADD COLUMN IF NOT EXISTS role VARCHAR(20);

UPDATE users
SET role = 'patient'
WHERE role IS NULL;

ALTER TABLE users
  ALTER COLUMN role SET DEFAULT 'patient',
  ALTER COLUMN role SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'users_role_valid'
      AND conrelid = 'users'::regclass
  ) THEN
    ALTER TABLE users
      ADD CONSTRAINT users_role_valid
      CHECK (role IN ('patient', 'doctor'));
  END IF;
END
$$;

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
