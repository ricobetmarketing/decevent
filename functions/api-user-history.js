export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const username = url.searchParams.get("username");
  if (!username) return new Response("username required", { status: 400 });

const res = await db.prepare(`
  SELECT
    date,
    slot_key,
    country,
    username,
    local_turnover,
    COALESCE(batch_id, 'IMPORT') AS batch,
    COALESCE(created_at, 0) AS created_at
  FROM raw_turnover
  WHERE username = ?
  ORDER BY date DESC
`).bind(username).all();

  const rows = res.results.map(r => ({
  date: r.date,
  slot: r.slot_key,
  country: r.country,
  turnover: Number(r.local_turnover).toFixed(2), // already USD
  batch: r.batch,
  uploaded: r.created_at ? new Date(r.created_at).toISOString() : 'Imported'
}));


  return new Response(JSON.stringify(res.results || []), {
    headers: { "Content-Type": "application/json" }
  });
}
