CREATE TABLE IF NOT EXISTS vault_collection_links (
  collection_code TEXT PRIMARY KEY,
  collection_name TEXT NOT NULL,
  access_url TEXT NOT NULL DEFAULT '',
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT OR IGNORE INTO vault_collection_links (collection_code, collection_name) VALUES
  ('taster', 'A Little Taste'),
  ('railed', 'Railed'),
  ('good_girl', 'Good Girl'),
  ('mouthful', 'Mouthful'),
  ('private_play', 'Private Play'),
  ('full_sessions', 'Full Sessions');
