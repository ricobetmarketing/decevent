export async function onRequest(context) {
  const db = context.env.DB;
  const url = new URL(context.request.url);

  // --- Query params ---
  const mode = url.searchParams.get("mode") || "daily"; // daily | weekly | monthly
  const countryFilter = (url.searchParams.get("country") || "ALL").toUpperCase(); // ALL | BR | MX
  const dateParam = url.searchParams.get("date"); // optional base date

  // Base today = Mexico time (UTC-6), same as leaderboard
  function getMexicoTodayISO() {
    const nowUtcMs = Date.now();
    const offsetMs = -6 * 60 * 60 * 1000;
    const mexNow = new Date(nowUtcMs + offsetMs);
    const y = mexNow.getFullYear();
    const m = String(mexNow.getMonth() + 1).padStart(2, "0");
    const d = String(mexNow.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  // Small helper to shift dates
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

  // Determine range length (days) for mode
  let rangeLength = 1;
  if (mode === "weekly") rangeLength = 7;
  if (mode === "monthly") rangeLength = 30;

  // Build list of dates from oldest → newest
  const dates = [];
  for (let i = rangeLength - 1; i >= 0; i--) {
    dates.push(shiftDateISO(baseDate, -i));
  }

  // Conversion rates
  const RATE_BR = 5;
  const RATE_MX = 18;

  // Helper – compute daily stats for one date
  async function computeDailyStats(date) {
    let result;
    try {
      result = await db
        .prepare(
          "SELECT country,date,slot_key,username,local_turnover,created_at FROM raw_turnover WHERE date = ?"
        )
        .bind(date)
        .all();
    } catch (e) {
      throw new Error("DB error: " + (e.message || String(e)));
    }

    const rows = result.results || [];

    // Same aggregation logic as api-leaderboard, but we keep totals for all players
    const SLOT_ORDER = {
      "00_02": 1,
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

    const agg = {}; // key: country:username(lower)

    for (const r of rows) {
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
        // special Brazil 00–03
        if (r.created_at > rec.brDeductTime) {
          rec.brDeductTime = r.created_at;
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

      players.push({
        country: rec.country,
        username: rec.username,
        usd_turnover: usd
      });
    }

    // Sort players descending
    players.sort((a, b) => b.usd_turnover - a.usd_turnover);

    // Top 20 for this date
    const top20 = players.slice(0, 20).map((p, idx) => ({
      rank: idx + 1,
      ...p
    }));

    return {
      date,
      totalUsd: Number(totalUsd.toFixed(2)),
      players,
      top20
    };
  }

  try {
    // 1) Get stats per date
    const perDay = [];
    for (const d of dates) {
      perDay.push(await computeDailyStats(d));
    }

    // 2) Build chart series: daily total USD
    const chartSeries = perDay.map((d) => ({
      date: d.date,
      totalUsd: d.totalUsd
    }));

    // 3) Aggregate overall top players across the range
    const playerAgg = new Map(); // username:country → { username,country,totalUsd,daysInTop20 }

    for (const d of perDay) {
      for (const p of d.players) {
        const key = `${p.country}:${p.username.toLowerCase()}`;
        if (!playerAgg.has(key)) {
          playerAgg.set(key, {
            username: p.username,
            country: p.country,
            totalUsd: 0,
            daysInTop20: 0
          });
        }
        const obj = playerAgg.get(key);
        obj.totalUsd += p.usd_turnover;
      }

      // Count how many days each player appears in top20
      for (const tp of d.top20) {
        const key = `${tp.country}:${tp.username.toLowerCase()}`;
        if (!playerAgg.has(key)) continue;
        playerAgg.get(key).daysInTop20 += 1;
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

    return new Response(
      JSON.stringify({
        ok: true,
        mode,
        country: countryFilter,
        baseDate,
        fromDate: dates[0],
        toDate: dates[dates.length - 1],
        chartSeries,
        perDay,
        topPlayersOverall
      }),
      {
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        }
      }
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ ok: false, error: e.message || String(e) }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        }
      }
    );
  }
}
