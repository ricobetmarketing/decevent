export async function onRequestPost(context) {
  const db = context.env.DB;

  let body;
  try { body = await context.request.json(); }
  catch {
    return new Response(JSON.stringify({ ok:false, error:"Invalid JSON" }), {
      status: 400, headers: { "Content-Type":"application/json" }
    });
  }

  const id = body.id != null ? Number(body.id) : null;
  const date = String(body.date || "").trim();
  const country = String(body.country || "ALL").toUpperCase().trim();
  const username = String(body.username || "").trim();
  const boost_pct = Number(body.boost_pct);
  const is_active = body.is_active == null ? 1 : (Number(body.is_active) ? 1 : 0);
  const note = String(body.note || "").trim();
  const created_by = String(body.created_by || "").trim();

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return new Response(JSON.stringify({ ok:false, error:"Invalid date" }), {
      status: 400, headers: { "Content-Type":"application/json" }
    });
  }
  if (!["ALL","BR","MX"].includes(country)) {
    return new Response(JSON.stringify({ ok:false, error:"Invalid country (ALL/BR/MX)" }), {
      status: 400, headers: { "Content-Type":"application/json" }
    });
  }
  if (!username) {
    return new Response(JSON.stringify({ ok:false, error:"Missing username" }), {
      status: 400, headers: { "Content-Type":"application/json" }
    });
  }
  if (!Number.isFinite(boost_pct) || boost_pct <= 0) {
    return new Response(JSON.stringify({ ok:false, error:"boost_pct must be > 0" }), {
      status: 400, headers: { "Content-Type":"application/json" }
    });
  }

  const now = new Date().toISOString();

  try {
    if (id) {
      await db.prepare(`
        UPDATE fake_daily
        SET date=?1, country=?2, username=?3, boost_pct=?4, is_active=?5, note=?6, created_by=?7
        WHERE id=?8
      `).bind(date, country, username, boost_pct, is_active, note || null, created_by || null, id).run();

      return new Response(JSON.stringify({ ok:true, updated:true, id }), {
        headers: { "Content-Type":"application/json" }
      });
    } else {
      const ins = await db.prepare(`
        INSERT INTO fake_daily (date, country, username, boost_pct, is_active, note, created_at, created_by)
        VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)
      `).bind(date, country, username, boost_pct, is_active, note || null, now, created_by || null).run();

      // D1 returns meta.last_row_id sometimes; we’ll just return ok
      return new Response(JSON.stringify({ ok:true, inserted:true, id: ins?.meta?.last_row_id || null }), {
        headers: { "Content-Type":"application/json" }
      });
    }
  } catch (e) {
    return new Response(JSON.stringify({ ok:false, error: e.message || String(e) }), {
      status: 500, headers: { "Content-Type":"application/json" }
    });
  }
}
