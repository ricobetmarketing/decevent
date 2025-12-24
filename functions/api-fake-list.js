export async function onRequestGet({ env, request }) {
  const url = new URL(request.url);
  const date = url.searchParams.get("date");

  if (!date) {
    return new Response(JSON.stringify({ ok:false, error:"date required" }), { status:400 });
  }

  const res = await env.DB.prepare(`
    SELECT *
    FROM fake_users
    WHERE date = ?
    ORDER BY created_at DESC
  `).bind(date).all();

  return new Response(JSON.stringify({
    ok: true,
    rows: res.results
  }));
}
