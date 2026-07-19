CREATE TABLE IF NOT EXISTS booking_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  reference TEXT NOT NULL UNIQUE,
  guest_name TEXT NOT NULL,
  age INTEGER NOT NULL,
  contact_method TEXT NOT NULL CHECK (contact_method IN ('sms','private_room')),
  contact_value TEXT NOT NULL DEFAULT '',
  experience TEXT NOT NULL,
  connection TEXT NOT NULL DEFAULT '',
  preferred_date TEXT NOT NULL,
  preferred_time TEXT NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 60,
  location_type TEXT NOT NULL DEFAULT '',
  destination TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new','considering','accepted','declined','booked','closed')),
  quote_cents INTEGER NOT NULL DEFAULT 0,
  deposit_cents INTEGER NOT NULL DEFAULT 0,
  public_token TEXT UNIQUE,
  password_lookup TEXT UNIQUE,
  visit_id INTEGER,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS booking_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  booking_request_id INTEGER NOT NULL,
  sender TEXT NOT NULL CHECK (sender IN ('client','kalli')),
  body TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (booking_request_id) REFERENCES booking_requests(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS booking_requests_status_idx ON booking_requests(status, created_at DESC);
CREATE INDEX IF NOT EXISTS booking_messages_request_idx ON booking_messages(booking_request_id, id);
