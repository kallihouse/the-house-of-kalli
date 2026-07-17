CREATE TABLE IF NOT EXISTS vault_orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  public_token TEXT NOT NULL UNIQUE,
  order_reference TEXT NOT NULL UNIQUE,
  password_lookup TEXT UNIQUE,
  product_code TEXT NOT NULL,
  product_name TEXT NOT NULL,
  amount_cents INTEGER NOT NULL,
  selected_collections TEXT NOT NULL DEFAULT '[]',
  delivery_method TEXT NOT NULL CHECK (delivery_method IN ('private', 'email', 'text', 'whatsapp')),
  delivery_contact TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'awaiting_payment' CHECK (status IN ('awaiting_payment', 'paid', 'cancelled')),
  access_url TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_vault_orders_status_created
ON vault_orders(status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_vault_orders_reference
ON vault_orders(order_reference);
