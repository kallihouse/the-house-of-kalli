ALTER TABLE custom_requests ADD COLUMN public_token TEXT;
ALTER TABLE custom_requests ADD COLUMN password_lookup TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS custom_requests_public_token_idx
ON custom_requests(public_token) WHERE public_token IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS custom_requests_password_lookup_idx
ON custom_requests(password_lookup) WHERE password_lookup IS NOT NULL;

CREATE TABLE IF NOT EXISTS custom_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  custom_request_id INTEGER NOT NULL,
  sender TEXT NOT NULL CHECK (sender IN ('kalli','client')),
  body TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (custom_request_id) REFERENCES custom_requests(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS custom_messages_request_idx
ON custom_messages(custom_request_id,id ASC);
