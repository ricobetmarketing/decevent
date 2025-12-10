export async function onRequestPost(context) {
  const DB = context.env.DB;
  const { date } = await context.request.json();

  // 1) Load raw records for this date
  const raw = await DB.prepare(
    `SELECT username, country, raw_turnover, slot
     FROM turnover_updates
     WHERE date = ?1`
  ).bind(date).all();

  const summary = new Map(); // username → { country, turnover_usd }

  for (const r of raw.results) {
    const user = r.username;
    const country = r.country;
    let turnover = r.raw_turnover;

    // 2) Handle Brazil subtraction logic:
    if (country === "BR" && r.slot === "00-03") {
      turnover = turnover * -1; // subtract
    }

    // 3) Aggregate turnover per user
    if (!summary.has(user)) {
      summary.set(user, { country, br_total: 0, mx_total: 0 });
    }
    const u = summary.get(user);

    if (country === "BR") u.br_total += turnover;
    if (country === "MX") u.mx_total += turnover;
  }

  // 4) Convert to USD
  const rows = [];
  for (const [username, obj] of summary.entries()) {
    const country = obj.br_total !== 0 ? "BR" : "MX";
    let usd = 0;

    if (country === "BR") usd = obj.br_total / 5;
    if (country === "MX") usd = obj.mx_total / 18;

    rows.push({ username, country, usd });
  }

  // 5) Sort and rank
  rows.sort((a, b) => b.usd - a.usd);
  rows.forEach((r, i) => (r.rank = i + 1));

  // 6) Clear previous leaderboard for this date
  await DB.prepare(
    `DELETE FROM daily_leaderboard WHERE date = ?1`
  ).bind(date).run();

  // 7) Insert new leaderboard
  for (const r of rows) {
    await DB.prepare(
      `INSERT INTO daily_leaderboard (date, username, country, usd_turnover, rank)
       VALUES (?1, ?2, ?3, ?4, ?5)`
    ).bind(date, r.username, r.country, r.usd, r.rank).run();
  }

  return new Response(JSON.stringify({ ok: true, count: rows.length }));
}
