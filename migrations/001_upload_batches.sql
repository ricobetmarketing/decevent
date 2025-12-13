CREATE TABLE IF NOT EXISTS upload_batches (
  id TEXT PRIMARY KEY,
  date TEXT NOT NULL,              -- YYYY-MM-DD
  country TEXT NOT NULL,           -- BR / MX
  slot TEXT NOT NULL,              -- e.g. 00_03, 03_06...
  uploaded_by TEXT,                -- optional
  uploaded_at TEXT NOT NULL,       -- ISO timestamp

  rows_count INTEGER NOT NULL DEFAULT 0,
  total_local REAL NOT NULL DEFAULT 0,
  total_usd REAL NOT NULL DEFAULT 0,

  status TEXT NOT NULL DEFAULT 'active',   -- active / rolled_back
  replaces_batch_id TEXT,                  -- previous batch id (optional)
  note TEXT
);

CREATE INDEX IF NOT EXISTS idx_batches_dcs_time
  ON upload_batches (date, country, slot, uploaded_at);

CREATE INDEX IF NOT EXISTS idx_batches_dcs_status
  ON upload_batches (date, country, slot, status);
