export async function onRequestPost({ env, request }) {
  const body = await request.json();
  const {
    id, date, country, username,
    boost_pct, is_active = 1, note = ""
  } = body;

  if (!date || !username || !boost_pct) {
    return new Response(JSON.stringify({ ok:false, error:"missing fields" }), { status:400 });
  }

  if (id) {
    await env.DB.prepare(`
      UPDATE fake_users
      SET country=?, username=?, boost_pct=?, is_active=?, note=?
      WHERE id=?
    `).bind(country, username, boost_pct, is_active, note, id).run();
  } else {
    await env.DB.prepare(`
      INSERT INTO fake_users
      (date, country, username, boost_pct, is_active, note, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(
      date, country, username, boost_pct,
      is_active, note, Math.floor(Date.now()/1000)
    ).run();
  }

  return new Response(JSON.stringify({ ok:true }));
}
