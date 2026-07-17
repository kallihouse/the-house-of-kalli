CREATE TABLE IF NOT EXISTS office_finances (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('income', 'expense')),
  amount_cents INTEGER NOT NULL CHECK (amount_cents >= 0),
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  transaction_date TEXT NOT NULL,
  payment_method TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'cleared' CHECK (status IN ('cleared', 'pending')),
  notes TEXT NOT NULL DEFAULT '',
  source_type TEXT NOT NULL DEFAULT 'manual',
  source_id TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS office_finances_date_idx ON office_finances(transaction_date DESC);
CREATE INDEX IF NOT EXISTS office_finances_type_idx ON office_finances(transaction_type, category);
CREATE UNIQUE INDEX IF NOT EXISTS office_finances_source_idx ON office_finances(source_type, source_id) WHERE source_id <> '';
