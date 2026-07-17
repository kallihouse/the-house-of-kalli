CREATE TABLE IF NOT EXISTS office_journal (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  excerpt TEXT NOT NULL DEFAULT '',
  body TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'From the House',
  audience TEXT NOT NULL DEFAULT 'public' CHECK (audience IN ('public', 'collectors')),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'published', 'archived')),
  publish_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS office_journal_status_idx ON office_journal(status, publish_at DESC);
CREATE INDEX IF NOT EXISTS office_journal_audience_idx ON office_journal(audience, status);
