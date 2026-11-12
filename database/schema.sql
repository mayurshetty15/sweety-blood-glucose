CREATE TABLE IF NOT EXISTS users (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL,
  password VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT users_email_unique UNIQUE (email)
);

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
