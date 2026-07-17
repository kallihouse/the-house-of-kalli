CREATE TABLE IF NOT EXISTS office_guests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  display_name TEXT NOT NULL,
  contact_value TEXT NOT NULL DEFAULT '',
  contact_method TEXT NOT NULL DEFAULT 'none' CHECK (contact_method IN ('none', 'email', 'sms', 'whatsapp')),
  birthday TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  tags TEXT NOT NULL DEFAULT '[]',
  private_collection INTEGER NOT NULL DEFAULT 0 CHECK (private_collection IN (0, 1)),
  lifetime_spend_cents INTEGER NOT NULL DEFAULT 0,
  visit_count INTEGER NOT NULL DEFAULT 0,
  collection_count INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS office_guests_name_idx ON office_guests(display_name);
CREATE INDEX IF NOT EXISTS office_guests_updated_idx ON office_guests(updated_at DESC);
