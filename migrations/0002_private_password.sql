ALTER TABLE booking_requests ADD COLUMN password_lookup TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_booking_requests_password_lookup
ON booking_requests(password_lookup)
WHERE password_lookup IS NOT NULL;

CREATE TABLE IF NOT EXISTS room_access_attempts (
  fingerprint TEXT PRIMARY KEY,
  attempts INTEGER NOT NULL DEFAULT 0,
  window_started_at TEXT NOT NULL,
  locked_until TEXT
);
