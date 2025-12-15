// functions/api-upload-history.js
export async function onRequestGet({ request, env }) {
  const db = env.DB;
  const url = new URL(request.url);

  const date = (url.searchParams.get("date") || "").trim();         // optional YYYY-MM-DD
  const country = (url.searchParams.get("country") || "").trim().toUpperCase(); // optional BR/MX

  const RATE_BR = 5;
  const RATE_MX = 18;

  try {
    // A) Imported batches from raw_turnover (slot_key = IMPORT_USD)
    // We group by date+country+created_at so each import run becomes a batch.
    const imp = await db.prepare(`
      SELECT
        MIN(created_at) AS created_at,
        date,
        upper(country) AS country,
        'IMPORT_USD' AS slot,
        COUNT(*) AS rows_count,
        SUM(local_turnover) AS total_usd
      FROM raw_turnover
      WHERE slot_key = 'IMPORT_USD'
        ${date ? "AND date = ?" : ""}
        ${country ? "AND upper(country) = ?" : ""}
      GROUP BY date, upper(country), created_at
      ORDER BY date DESC, created_at DESC
      LIMIT 500
    `).bind(...([]
      .concat(date ? [date] : [])
      .concat(country ? [country] : [])
    )).all();

    // B) Live upload batches from turnover_updates grouped by date+country+slot
    const live = await db.prepare(`
      SELECT
        MAX(timestamp) AS created_at,
        date,
        upper(country) AS country,
        slot AS slot,
        COUNT(*) AS rows_count,
        SUM(raw_turnover) AS total_local
      FROM turnover_updates
      WHERE 1=1
        ${date ? "AND date = ?" : ""}
        ${country ? "AND upper(country) = ?" : ""}
      GROUP BY date, upper(country), slot
      ORDER BY date DESC, created_at DESC
      LIMIT 500
    `).bind(...([]
      .concat(date ? [date] : [])
      .concat(country ? [country] : [])
    )).all();

    const rows = [];

    // Imported rows -> total_usd is already USD, total_local can just mirror USD for display
    for (const r of (imp.results || [])) {
      const createdAt = Number(r.created_at || 0);
      rows.push({
        created_at: createdAt ? new Date(createdAt).toISOString() : "Imported",
        date: r.date,
        country: r.country,
        slot: r.slot,
        rows_count: Number(r.rows_count || 0),
        total_local: Number(r.total_usd || 0), // (already USD)
        total_usd: Number(r.total_usd || 0),   // (already USD)
        uploader: "IMPORT",
        batch_id: `IMPORT_${createdAt}`
      });
    }

    // Live rows -> compute total_usd from local
    for (const r of (live.results || [])) {
      const c = (r.country || "").toUpperCase();
      const totalLocal = Number(r.total_local || 0);

      let totalUsd = totalLocal;
      if (c === "BR") totalUsd = totalLocal / RATE_BR;
      if (c === "MX") totalUsd = totalLocal / RATE_MX;

      rows.push({
        created_at: r.created_at ? new Date(Number(r.created_at)).toISOString() : "",
        date: r.date,
        country: c,
        slot: r.slot,
        rows_count: Number(r.rows_count || 0),
        total_local: Number(totalLocal.toFixed(2)),
        total_usd: Number(totalUsd.toFixed(2)),
        uploader: "LIVE",
        batch_id: `LIVE_${r.date}_${c}_${r.slot}`
      });
    }

    // Sort newest first
    rows.sort((a, b) => String(b.date).localeCompare(String(a.date)));

    return new Response(JSON.stringify({ ok: true, rows }), {
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
    });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: e.message || String(e) }), {
      status: 500,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
    });
  }
}
