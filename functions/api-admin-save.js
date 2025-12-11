// functions/api-admin-save.js

export async function onRequestPost(context) {
  const db = context.env.DB;
  let body;

  try {
    body = await context.request.json();
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: "Invalid JSON" }), {
      status: 400,
      headers: { "Content-Type": "application/json" }
    });
  }

  const country = (body.country || "").toUpperCase();
  const date = body.date || "";
  const slotKey = body.slotKey || "";
  const rows = Array.isArray(body.rows) ? body.rows : [];

  if (!["BR", "MX"].includes(country)) {
    return new Response(JSON.stringify({ ok: false, error: "Invalid country" }), {
      status: 400,
      headers: { "Content-Type": "application/json" }
    });
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return new Response(JSON.stringify({ ok: false, error: "Invalid date" }), {
      status: 400,
      headers: { "Content-Type": "application/json" }
    });
  }
  if (!slotKey) {
    return new Response(JSON.stringify({ ok: false, error: "Missing slotKey" }), {
      status: 400,
      headers: { "Content-Type": "application/json" }
    });
  }

  // Clean rows
  const cleanRows = [];
  for (const r of rows) {
    const username = String(r.username || "").trim();
    const t = Number(r.turnover);
    if (!username) continue;
    if (!Number.isFinite(t)) continue;
    cleanRows.push({ username, turnover: t });
  }

  const now = Date.now(); // store as timestamp (ms)

  try {
    // Overwrite: same date + country + slot
    await db
      .prepare(
        "DELETE FROM turnover_updates WHERE date = ? AND country = ? AND slot = ?"
      )
      .bind(date, country, slotKey)
      .run();

    if (cleanRows.length) {
      const insert = db.prepare(
        "INSERT INTO turnover_updates (country,date,slot,username,raw_turnover,timestamp) VALUES (?,?,?,?,?,?)"
      );

      const batch = cleanRows.map((r) =>
        insert.bind(country, date, slotKey, r.username, r.turnover, now)
      );
      await db.batch(batch);
    }

    return new Response(
      JSON.stringify({
        ok: true,
        inserted: cleanRows.length
      }),
      {
        headers: { "Content-Type": "application/json" }
      }
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ ok: false, error: e.message || String(e) }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" }
      }
    );
  }
}
