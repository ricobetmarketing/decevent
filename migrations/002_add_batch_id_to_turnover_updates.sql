ALTER TABLE turnover_updates ADD COLUMN batch_id TEXT;

CREATE INDEX IF NOT EXISTS idx_turnover_user_date
  ON turnover_updates (username, date);

CREATE INDEX IF NOT EXISTS idx_turnover_dcs
  ON turnover_updates (date, country, slot);

CREATE INDEX IF NOT EXISTS idx_turnover_batch
  ON turnover_updates (batch_id);
