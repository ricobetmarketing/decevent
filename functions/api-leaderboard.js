export async function onRequestGet(context) {
  const DB = context.env.DB;
  const url = new URL(context.request.url);
  const date = url.searchParams.get("date");

  const rows = await DB.prepare(
    `SELECT username, country, usd_turnover, rank
     FROM daily_leaderboard
     WHERE date = ?1
     ORDER BY rank ASC`
  ).bind(date).all();

  return new Response(JSON.stringify({
    date,
    rows: rows.results || []
  }), {
    headers: { "Content-Type": "application/json" }
  });
}
