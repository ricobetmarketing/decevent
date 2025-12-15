// functions/api-user-history.js
export async function onRequestGet({ request, env }) {
  const db = env.DB;
  const url = new URL(request.url);

  const username = (url.searchParams.get("username") || "").trim();
  const country = (url.searchParams.get("country") || "").trim().toUpperCase(); // optional: BR/MX

  if (!username) {
    return new Response(JSON.stringify({ ok: false, error: "username required" }), {
      status: 400,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
    });
  }

  try {
    // 1) Imported history (IMPORT_USD) from raw_turnover
    const imp = await db.prepare(`
      SELECT date, slot_key, country, username, local_turnover, created_at
      FROM raw_turnover
      WHERE lower(username) = lower(?)
        AND slot_key = 'IMPORT_USD'
        ${country ? "AND upper(country) = ?" : ""}
      ORDER BY date DESC, created_at DESC
      LIMIT 500
    `).bind(...(country ? [username, country] : [username])).all();

    // 2) Live history from turnover_updates (your normal upload pipeline)
    const live = await db.prepare(`
      SELECT date, slot AS slot_key, country, username, raw_turnover AS local_turnover, timestamp AS created_at
      FROM turnover_updates
      WHERE lower(username) = lower(?)
        ${country ? "AND upper(country) = ?" : ""}
      ORDER BY date DESC, created_at DESC
      LIMIT 500
    `).bind(...(country ? [username, country] : [username])).all();

    // Normalize to what your admin-turnover.html expects:
    const rows = []
      .concat((live.results || []).map(r => ({
        date: r.date,
        slot: r.slot_key,
        country: (r.country || "").toUpperCase(),
        raw_turnover: Number(r.local_turnover || 0),     // (local for live)
        batch_id: `LIVE_${r.date}_${(r.country || "").toUpperCase()}_${r.slot_key}`,
        created_at: Number(r.created_at || 0)
      })))
      .concat((imp.results || []).map(r => ({
        date: r.date,
        slot: r.slot_key, // IMPORT_USD
        country: (r.country || "").toUpperCase(),
        raw_turnover: Number(r.local_turnover || 0),     // already USD, but we keep same field name
        batch_id: `IMPORT_${Number(r.created_at || 0)}`,  // synthetic batch id
        created_at: Number(r.created_at || 0)
      })));

    // Sort newest first
    rows.sort((a, b) => {
      if (a.date !== b.date) return String(b.date).localeCompare(String(a.date));
      return (b.created_at || 0) - (a.created_at || 0);
    });

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
