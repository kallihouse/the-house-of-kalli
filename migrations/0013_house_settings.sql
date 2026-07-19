CREATE TABLE IF NOT EXISTS house_settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  house_name TEXT NOT NULL DEFAULT 'The House of Kalli',
  host_name TEXT NOT NULL DEFAULT 'Kalli',
  contact_email TEXT NOT NULL DEFAULT '',
  payid_enabled INTEGER NOT NULL DEFAULT 1 CHECK (payid_enabled IN (0,1)),
  payid_value TEXT NOT NULL DEFAULT '',
  payid_name TEXT NOT NULL DEFAULT '',
  paypal_enabled INTEGER NOT NULL DEFAULT 0 CHECK (paypal_enabled IN (0,1)),
  paypal_url TEXT NOT NULL DEFAULT '',
  default_payment_method TEXT NOT NULL DEFAULT 'payid' CHECK (default_payment_method IN ('payid','paypal')),
  custom_rating_cents INTEGER NOT NULL DEFAULT 15000,
  custom_video_min_cents INTEGER NOT NULL DEFAULT 25000,
  custom_video_max_cents INTEGER NOT NULL DEFAULT 30000,
  custom_story_cents INTEGER NOT NULL DEFAULT 15000,
  custom_narrated_cents INTEGER NOT NULL DEFAULT 25000,
  custom_kink_cents INTEGER NOT NULL DEFAULT 35000,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT OR IGNORE INTO house_settings (id) VALUES (1);
