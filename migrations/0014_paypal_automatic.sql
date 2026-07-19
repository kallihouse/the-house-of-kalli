ALTER TABLE vault_orders ADD COLUMN paypal_order_id TEXT;
ALTER TABLE vault_orders ADD COLUMN paypal_capture_id TEXT;
ALTER TABLE vault_orders ADD COLUMN payment_method TEXT NOT NULL DEFAULT '';
ALTER TABLE vault_orders ADD COLUMN paid_at TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS vault_orders_paypal_order_idx
ON vault_orders(paypal_order_id) WHERE paypal_order_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS vault_orders_paypal_capture_idx
ON vault_orders(paypal_capture_id) WHERE paypal_capture_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS paypal_webhook_events (
  event_id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  paypal_resource_id TEXT NOT NULL DEFAULT '',
  processed_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
