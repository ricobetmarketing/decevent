// functions/api-user-history.js

export async function onRequest(context) {
  const { request, env } = context;
  const db = env.DB;

  const url = new URL(request.url);
  const usernameRaw = url.searchParams.get("username");
  const countryRaw = (url.searchParams.get("country") || "").toUpperCase();

  const username = (usernameRaw || "").trim();
  if (!username) {
    return new Response(JSON.stringify({ ok: false, error: "username required" }), {
      status: 400,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  }

  const allowedCountry = ["BR", "MX"].includes(countryRaw) ? countryRaw : "";

  try {
    const sql = `
      SELECT
        date,
        slot_key,
        country,
        username,
        local_turnover,
        COALESCE(batch_id, 'IMPORT') AS batch,
        COALESCE(created_at, 0) AS created_at
      FROM raw_turnover
      WHERE LOWER(username) = LOWER(?)
      ${allowedCountry ? "AND UPPER(country) = ?" : ""}
      ORDER BY date DESC, created_at DESC
      LIMIT 500
    `;

    const stmt = db.prepare(sql);
    const res = allowedCountry
      ? await stmt.bind(username, allowedCountry).all()
      : await stmt.bind(username).all();

    const rows = (res.results || []).map((r) => ({
      date: r.date,
      slot: r.slot_key,
      country: (r.country || "").toUpperCase(),
      raw_turnover: Number(r.local_turnover || 0).toFixed(2), // (local_turnover is USD for IMPORT_USD)
      batch_id: r.batch,
      created_at: r.created_at
        ? new Date(Number(r.created_at)).toISOString()
        : "Imported",
    }));

    return new Response(JSON.stringify({ ok: true, rows }), {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: e.message || String(e) }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  }
}
