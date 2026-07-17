CREATE TABLE IF NOT EXISTS office_correspondence (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  guest_id INTEGER,
  guest_name TEXT NOT NULL,
  contact_value TEXT NOT NULL DEFAULT '',
  channel TEXT NOT NULL DEFAULT 'private' CHECK (channel IN ('private', 'email', 'sms', 'whatsapp')),
  direction TEXT NOT NULL DEFAULT 'incoming' CHECK (direction IN ('incoming', 'outgoing')),
  subject TEXT NOT NULL DEFAULT '',
  body TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'unread' CHECK (status IN ('unread', 'read', 'draft', 'sent', 'archived')),
  occurred_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS office_correspondence_guest_idx ON office_correspondence(guest_id, guest_name);
CREATE INDEX IF NOT EXISTS office_correspondence_status_idx ON office_correspondence(status, occurred_at DESC);
