export async function onRequest(context) {
  const db = context.env.DB;
  const url = new URL(context.request.url);

  const mode = (url.searchParams.get("mode") || "daily").toLowerCase(); // daily | weekly | monthly
  const countryFilter = (url.searchParams.get("country") || "ALL").toUpperCase(); // ALL | BR | MX
  const dateParam = url.searchParams.get("date"); // base date YYYY-MM-DD

  if (!["daily", "weekly", "monthly"].includes(mode)) {
    return new Response(JSON.stringify({ ok: false, error: "Invalid mode" }), {
      status: 400,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
    });
  }
  if (!["ALL", "BR", "MX"].includes(countryFilter)) {
    return new Response(JSON.stringify({ ok: false, error: "Invalid country" }), {
      status: 400,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
    });
  }
  if (dateParam && !/^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
    return new Response(JSON.stringify({ ok: false, error: "Invalid date format (YYYY-MM-DD)" }), {
      status: 400,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
    });
  }

  // Mexico today (UTC-6)
  function getMexicoTodayISO() {
    const nowUtcMs = Date.now();
    const offsetMs = -6 * 60 * 60 * 1000;
    const mexNow = new Date(nowUtcMs + offsetMs);
    const y = mexNow.getFullYear();
    const m = String(mexNow.getMonth() + 1).padStart(2, "0");
    const d = String(mexNow.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  function shiftDateISO(baseISO, deltaDays) {
    const [y, m, d] = baseISO.split("-").map(Number);
    const dt = new Date(Date.UTC(y, m - 1, d));
    dt.setUTCDate(dt.getUTCDate() + deltaDays);
    const yy = dt.getUTCFullYear();
    const mm = String(dt.getUTCMonth() + 1).padStart(2, "0");
    const dd = String(dt.getUTCDate()).padStart(2, "0");
    return `${yy}-${mm}-${dd}`;
  }

  const baseDate = dateParam || getMexicoTodayISO();

  let rangeLength = 1;
  if (mode === "weekly") rangeLength = 7;
  if (mode === "monthly") rangeLength = 30;

  // Build dates oldest → newest
  const dates = [];
  for (let i = rangeLength - 1; i >= 0; i--) {
    dates.push(shiftDateISO(baseDate, -i));
  }

  const fromDate = dates[0];
  const toDate = dates[dates.length - 1];

  const RATE_BR = 5;
  const RATE_MX = 18;

  const SLOT_ORDER = {
    "00_02": 1,
    "00_03": 1.5, // (not used normally)
    "00_04": 2,
    "00_06": 3,
    "00_08": 4,
    "00_10": 5,
    "00_12": 6,
    "00_14": 7,
    "00_16": 8,
    "00_18": 9,
    "00_20": 10,
    "00_22": 11,
    "00_24": 12
  };

  // Load all rows for the date range in one query (faster than 30 loops)
  let all;
  try {
    all = await db
      .prepare(
        "SELECT country,date,slot_key,username,local_turnover,created_at FROM raw_turnover WHERE date >= ? AND date <= ?"
      )
      .bind(fromDate, toDate)
      .all();
  } catch (e) {
    return new Response(
      JSON.stringify({ ok: false, error: "DB error: " + (e.message || String(e)) }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
      }
    );
  }

  const rows = all.results || [];

  // Group raw rows by date
  const byDate = new Map();
  for (const r of rows) {
    if (!r.date) continue;
    if (!byDate.has(r.date)) byDate.set(r.date, []);
    byDate.get(r.date).push(r);
  }

  function computeDailyStats(date, dayRows) {
    const agg = {}; // key country:usernameLower

    for (const r of dayRows) {
      const country = (r.country || "").toUpperCase();
      if (countryFilter !== "ALL" && country !== countryFilter) continue;

      const username = String(r.username || "").trim();
      if (!username) continue;

      const key = `${country}:${username.toLowerCase()}`;

      if (!agg[key]) {
        agg[key] = {
          country,
          username,
          cumLocal: 0,
          lastSlotOrder: -1,
          brDeduct: 0,
          brDeductTime: 0
        };
      }

      const rec = agg[key];
      const slotKey = r.slot_key;

      if (slotKey === "BR_00_03") {
        if ((r.created_at || 0) > rec.brDeductTime) {
          rec.brDeductTime = r.created_at || 0;
          rec.brDeduct = Number(r.local_turnover) || 0;
        }
      } else {
        const so = SLOT_ORDER[slotKey] ?? 0;
        if (so >= rec.lastSlotOrder) {
          rec.lastSlotOrder = so;
          rec.cumLocal = Number(r.local_turnover) || 0;
        }
      }
    }

    let totalUsd = 0;
    const players = [];

    for (const rec of Object.values(agg)) {
      let effectiveLocal = rec.cumLocal;
      if (rec.country === "BR") {
        effectiveLocal = Math.max(effectiveLocal - (rec.brDeduct || 0), 0);
      }

      let usd = 0;
      if (rec.country === "BR") usd = effectiveLocal / RATE_BR;
      else if (rec.country === "MX") usd = effectiveLocal / RATE_MX;
      else usd = effectiveLocal;

      usd = Number(usd.toFixed(2));
      totalUsd += usd;

      players.push({ country: rec.country, username: rec.username, usd_turnover: usd });
    }

    players.sort((a, b) => b.usd_turnover - a.usd_turnover);

    const top20 = players.slice(0, 20).map((p, idx) => ({ rank: idx + 1, ...p }));

    return {
      date,
      totalUsd: Number(totalUsd.toFixed(2)),
      players,
      top20
    };
  }

  // Create perDay in requested date order (even if no data => total 0)
  const perDay = [];
  for (const d of dates) {
    const dayRows = byDate.get(d) || [];
    perDay.push(computeDailyStats(d, dayRows));
  }

  const chartSeries = perDay.map((d) => ({ date: d.date, totalUsd: d.totalUsd }));

  // Aggregate top players for the whole range
  const playerAgg = new Map(); // key country:usernameLower
  for (const d of perDay) {
    for (const p of d.players) {
      const key = `${p.country}:${p.username.toLowerCase()}`;
      if (!playerAgg.has(key)) {
        playerAgg.set(key, { username: p.username, country: p.country, totalUsd: 0, daysInTop20: 0 });
      }
      playerAgg.get(key).totalUsd += p.usd_turnover;
    }
    for (const tp of d.top20) {
      const key = `${tp.country}:${tp.username.toLowerCase()}`;
      if (playerAgg.has(key)) playerAgg.get(key).daysInTop20 += 1;
    }
  }

  const topPlayersOverall = Array.from(playerAgg.values())
    .sort((a, b) => b.totalUsd - a.totalUsd)
    .slice(0, 50)
    .map((p, idx) => ({
      rank: idx + 1,
      username: p.username,
      country: p.country,
      totalUsd: Number(p.totalUsd.toFixed(2)),
      daysInTop20: p.daysInTop20
    }));

  // Range total
  const rangeTotalUsd = Number(
    perDay.reduce((sum, d) => sum + (d.totalUsd || 0), 0).toFixed(2)
  );

  // Top / consistent
  const topPlayer = topPlayersOverall[0] || null;
  const mostConsistent = Array.from(playerAgg.values())
    .sort((a, b) => b.daysInTop20 - a.daysInTop20 || b.totalUsd - a.totalUsd)[0] || null;

  return new Response(
    JSON.stringify({
      ok: true,
      mode,
      country: countryFilter,
      baseDate,
      fromDate,
      toDate,
      rangeTotalUsd,
      topPlayer,
      mostConsistent,
      chartSeries,
      topPlayersOverall
    }),
    {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      }
    }
  );
}
