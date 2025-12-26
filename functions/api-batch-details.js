export async function onRequestGet({ request, env }) {
  const db = env.DB;
  const url = new URL(request.url);
  const batch_id = (url.searchParams.get("batch_id") || "").trim();
  if (!batch_id) {
    return new Response(JSON.stringify({ ok: false, error: "batch_id required" }), {
      status: 400, headers: { "Content-Type": "application/json" }
    });
  }

  try {
    // 1) this batch summary
    const batch = await db.prepare(`
      SELECT batch_id, created_at, date, country, slot, status, rows_count, total_local, total_usd, uploader, note,
             verified_by, verified_at, rejected_by, rejected_at, reject_reason, published_at
      FROM daily_leaderboard
      WHERE batch_id = ?
    `).bind(batch_id).first();

    if (!batch) {
      return new Response(JSON.stringify({ ok: false, error: "batch not found" }), {
        status: 404, headers: { "Content-Type": "application/json" }
      });
    }

    // 2) current published batch (APPROVED) for same date+country+slot (latest approved)
    const current = await db.prepare(`
      SELECT batch_id, created_at, date, country, slot, status, rows_count, total_local, total_usd, uploader, note,
             verified_by, verified_at, published_at
      FROM daily_leaderboard
      WHERE date = ? AND country = ? AND slot = ? AND status = 'APPROVED'
      ORDER BY verified_at DESC, created_at DESC
      LIMIT 1
    `).bind(batch.date, batch.country, batch.slot).first();

    // 3) top 50 rows for this batch
    const rowsNew = await db.prepare(`
      SELECT username, raw_turnover
      FROM turnover_updates
      WHERE batch_id = ?
      ORDER BY raw_turnover DESC
      LIMIT 50
    `).bind(batch_id).all();

    // 4) top 50 rows for current batch (if exists)
    let rowsCurrent = { results: [] };
    if (current?.batch_id) {
      rowsCurrent = await db.prepare(`
        SELECT username, raw_turnover
        FROM turnover_updates
        WHERE batch_id = ?
        ORDER BY raw_turnover DESC
        LIMIT 50
      `).bind(current.batch_id).all();
    }

    const fmt = (b) => !b ? null : ({
      batch_id: b.batch_id,
      created_at: b.created_at ? new Date(Number(b.created_at)).toISOString() : "",
      date: b.date,
      country: b.country,
      slot: b.slot,
      status: b.status,
      rows_count: b.rows_count,
      total_local: Number(b.total_local || 0),
      total_usd: Number(b.total_usd || 0),
      uploader: b.uploader || "",
      note: b.note || "",
      verified_by: b.verified_by || "",
      verified_at: b.verified_at ? new Date(Number(b.verified_at)).toISOString() : "",
      rejected_by: b.rejected_by || "",
      rejected_at: b.rejected_at ? new Date(Number(b.rejected_at)).toISOString() : "",
      reject_reason: b.reject_reason || "",
      published_at: b.published_at ? new Date(Number(b.published_at)).toISOString() : ""
    });

    return new Response(JSON.stringify({
      ok: true,
      batch: fmt(batch),
      current: fmt(current),
      rows_new: (rowsNew.results || []).map(r => ({ username: r.username, raw_turnover: Number(r.raw_turnover || 0) })),
      rows_current: (rowsCurrent.results || []).map(r => ({ username: r.username, raw_turnover: Number(r.raw_turnover || 0) })),
    }), { headers: { "Content-Type": "application/json" } });

  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: e.message || String(e) }), {
      status: 500, headers: { "Content-Type": "application/json" }
    });
  }
}
