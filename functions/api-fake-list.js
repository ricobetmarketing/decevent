export async function onRequest(context) {
  const db = context.env.DB;
  const url = new URL(context.request.url);

  const date = url.searchParams.get("date");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date || "")) {
    return new Response(JSON.stringify({ ok: false, error: "Invalid date" }), {
      status: 400,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
    });
  }

  const r = await db.prepare(`
    SELECT id, date, country, username, boost_pct, is_active, note, created_at, created_by
    FROM fake_daily
    WHERE date = ?
    ORDER BY is_active DESC, boost_pct DESC, id DESC
  `).bind(date).all();

  return new Response(JSON.stringify({ ok: true, date, rows: r.results || [] }), {
    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
  });
}
