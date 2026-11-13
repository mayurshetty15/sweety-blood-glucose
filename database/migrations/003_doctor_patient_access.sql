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
