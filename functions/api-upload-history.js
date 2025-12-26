export async function onRequestGet({ request, env }) {
  const db = env.DB;
  const url = new URL(request.url);

  const date = (url.searchParams.get("date") || "").trim(); // YYYY-MM-DD
  const country = (url.searchParams.get("country") || "").trim().toUpperCase(); // BR/MX

  const where = [];
  const params = [];

  if (date) {
    where.push("date = ?");
    params.push(date);
  }
  if (country) {
    where.push("country = ?");
    params.push(country);
  }

  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

  try {
    const res = await db.prepare(`
      SELECT
        batch_id,
        created_at,
        date,
        country,
        slot,
        status,
        rows_count,
        total_local,
        total_usd,
        uploader,
        note,
        verified_by,
        verified_at,
        rejected_by,
        rejected_at,
        reject_reason
      FROM daily_leaderboard
      ${whereSql}
      ORDER BY created_at DESC
      LIMIT 200
    `).bind(...params).all();

    const rows = (res.results || []).map(r => ({
      batch_id: r.batch_id,
      created_at: r.created_at ? new Date(Number(r.created_at)).toISOString() : "",
      date: r.date,
      country: r.country,
      slot: r.slot,
      status: r.status,
      rows_count: r.rows_count,
      total_local: Number(r.total_local || 0),
      total_usd: Number(r.total_usd || 0),
      uploader: r.uploader || "",
      note: r.note || "",

      verified_by: r.verified_by || "",
      verified_at: r.verified_at ? new Date(Number(r.verified_at)).toISOString() : "",

      rejected_by: r.rejected_by || "",
      rejected_at: r.rejected_at ? new Date(Number(r.rejected_at)).toISOString() : "",
      reject_reason: r.reject_reason || ""
    }));

    return new Response(JSON.stringify({ ok: true, rows }), {
      headers: { "Content-Type": "application/json" }
    });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: e.message || String(e) }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
