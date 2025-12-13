export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const username = url.searchParams.get("username");
  if (!username) return new Response("username required", { status: 400 });

  const res = await env.DB.prepare(`
    SELECT date, slot, country, raw_turnover, timestamp, batch_id
    FROM turnover_updates
    WHERE username = ?
    ORDER BY date DESC, slot DESC, timestamp DESC
    LIMIT 500
  `).bind(username).all();

  return new Response(JSON.stringify(res.results || []), {
    headers: { "Content-Type": "application/json" }
  });
}
