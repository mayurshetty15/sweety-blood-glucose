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
