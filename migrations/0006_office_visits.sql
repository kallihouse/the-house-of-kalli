CREATE TABLE IF NOT EXISTS office_visits (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  guest_id INTEGER,
  guest_name TEXT NOT NULL,
  visit_date TEXT NOT NULL,
  start_time TEXT NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 60,
  location TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'enquiry' CHECK (status IN ('enquiry', 'confirmed', 'completed', 'cancelled')),
  fee_cents INTEGER NOT NULL DEFAULT 0,
  deposit_cents INTEGER NOT NULL DEFAULT 0,
  deposit_status TEXT NOT NULL DEFAULT 'not_required' CHECK (deposit_status IN ('not_required', 'outstanding', 'paid')),
  notes TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS office_visits_date_idx ON office_visits(visit_date, start_time);
CREATE INDEX IF NOT EXISTS office_visits_status_idx ON office_visits(status);
