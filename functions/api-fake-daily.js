// functions/api-fake-daily.js
function json(data, status=200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type":"application/json", "Access-Control-Allow-Origin":"*" }
  });
}

export async function onRequest(context) {
  const db = context.env.DB;
  const url = new URL(context.request.url);

  if (context.request.method === "GET") {
    const date = url.searchParams.get("date");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date||"")) return json({ ok:false, error:"Invalid date" }, 400);

    const r = await db.prepare(`
      SELECT id, date, country, username, boost_pct, is_active, note, created_at, created_by
      FROM fake_daily
      WHERE date = ?
      ORDER BY id DESC
    `).bind(date).all();

    return json({ ok:true, date, rows: r.results || [] });
  }

  if (context.request.method === "POST") {
    let body;
    try { body = await context.request.json(); }
    catch { return json({ ok:false, error:"Invalid JSON" }, 400); }

    const date = body.date;
    const country = String(body.country||"ALL").toUpperCase();
    const username = String(body.username||"").trim();
    const boost_pct = Number(body.boost_pct || 0);
    const note = body.note || null;
    const created_by = body.created_by || null;
    const is_active = body.is_active === 0 ? 0 : 1;

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date||"")) return json({ ok:false, error:"Invalid date" }, 400);
    if (!["ALL","BR","MX"].includes(country)) return json({ ok:false, error:"Invalid country" }, 400);
    if (!username) return json({ ok:false, error:"Missing username" }, 400);
    if (!Number.isFinite(boost_pct) || boost_pct <= 0) return json({ ok:false, error:"Invalid boost_pct" }, 400);

    // Upsert by (date,country,username)
    await db.prepare(`
      INSERT INTO fake_daily (date, country, username, boost_pct, is_active, note, created_by)
      VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)
      ON CONFLICT(date, country, username)
      DO UPDATE SET boost_pct=excluded.boost_pct, is_active=excluded.is_active, note=excluded.note
    `).bind(date, country, username, boost_pct, is_active, note, created_by).run();

    return json({ ok:true });
  }

  if (context.request.method === "DELETE") {
    const id = url.searchParams.get("id");
    if (!id) return json({ ok:false, error:"Missing id" }, 400);

    await db.prepare(`DELETE FROM fake_daily WHERE id = ?`).bind(id).run();
    return json({ ok:true });
  }

  return json({ ok:false, error:"Method not allowed" }, 405);
}
