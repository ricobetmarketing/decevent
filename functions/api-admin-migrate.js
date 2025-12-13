export async function onRequestPost({ request, env }) {
  const { key } = await request.json().catch(() => ({}));
  if (!env.ADMIN_KEY || key !== env.ADMIN_KEY) {
    return new Response("Forbidden", { status: 403 });
  }

  const DB = env.DB;

  const stmts = [
    `CREATE TABLE IF NOT EXISTS upload_batches (
      batch_id TEXT PRIMARY KEY,
      created_at TEXT NOT NULL,
      uploader TEXT,
      country TEXT NOT NULL,
      slot TEXT NOT NULL,
      date TEXT NOT NULL,
      rows_count INTEGER NOT NULL DEFAULT 0,
      total_local REAL NOT NULL DEFAULT 0,
      total_usd REAL NOT NULL DEFAULT 0,
      note TEXT
    );`,
    `CREATE INDEX IF NOT EXISTS idx_batches_date_slot ON upload_batches(date, slot);`,
    `CREATE INDEX IF NOT EXISTS idx_batches_country ON upload_batches(country);`,

    // add column batch_id if missing (D1 supports ALTER TABLE ADD COLUMN)
    `ALTER TABLE turnover_updates ADD COLUMN batch_id TEXT;`,
    `CREATE INDEX IF NOT EXISTS idx_turnover_batch ON turnover_updates(batch_id);`,
    `CREATE INDEX IF NOT EXISTS idx_turnover_user_date ON turnover_updates(username, date);`
  ];

  const results = [];
  for (const sql of stmts) {
    try {
      await DB.prepare(sql).run();
      results.push({ ok: true, sql });
    } catch (e) {
      // ignore "duplicate column" / already exists
      const msg = String(e?.message || e);
      if (
        msg.includes("duplicate column") ||
        msg.includes("already exists") ||
        msg.includes("Duplicate column") ||
        msg.includes("SQLITE_ERROR: duplicate column")
      ) {
        results.push({ ok: true, sql, skipped: true, reason: msg });
      } else {
        results.push({ ok: false, sql, error: msg });
      }
    }
  }

  return new Response(JSON.stringify({ ok: true, results }, null, 2), {
    headers: { "Content-Type": "application/json" }
  });
}
