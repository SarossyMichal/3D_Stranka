CREATE TABLE IF NOT EXISTS inquiries (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL DEFAULT '',
  company TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL,
  quantity TEXT NOT NULL DEFAULT '',
  dimensions TEXT NOT NULL DEFAULT '',
  deadline TEXT NOT NULL DEFAULT '',
  client_hash TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'handled', 'archived')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS inquiries_status_idx ON inquiries(status, created_at);
CREATE INDEX IF NOT EXISTS inquiries_client_idx ON inquiries(client_hash, created_at);
