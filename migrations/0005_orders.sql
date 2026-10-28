-- price_cents: price in euro cents (NULL = cena na dopyt, nedá sa objednať).
-- stock: kusy na sklade (NULL = vyrábame na objednávku, bez limitu; 0 = vypredané, v e-shope sa nezobrazí).
ALTER TABLE products ADD COLUMN price_cents INTEGER;
ALTER TABLE products ADD COLUMN stock INTEGER;

CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  number TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  street TEXT NOT NULL,
  city TEXT NOT NULL,
  zip TEXT NOT NULL,
  shipping_method TEXT NOT NULL,
  shipping_label TEXT NOT NULL,
  pickup_point TEXT NOT NULL DEFAULT '',
  note TEXT NOT NULL DEFAULT '',
  items_json TEXT NOT NULL,
  items_cents INTEGER NOT NULL,
  shipping_cents INTEGER NOT NULL,
  cod_cents INTEGER NOT NULL,
  total_cents INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'sent', 'done', 'canceled')),
  client_hash TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS orders_status_idx ON orders(status, created_at);
CREATE INDEX IF NOT EXISTS orders_client_idx ON orders(client_hash, created_at);
