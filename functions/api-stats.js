export async function onRequest(context) {
  const db = context.env.DB;
  const url = new URL(context.request.url);

  const modeRaw = (url.searchParams.get("mode") || "daily").toLowerCase();
  const mode = ["daily", "weekly", "monthly"].includes(modeRaw) ? modeRaw : "daily";

  const countryFilter = (url.searchParams.get("country") || "ALL").toUpperCase();
  const allowedCountry = ["ALL", "BR", "MX"].includes(countryFilter) ? countryFilter : "ALL";

  const dateParam = url.searchParams.get("date");

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


  const baseDate = /^\d{4}-\d{2}-\d{2}$/.test(dateParam || "") ? dateParam : getMexicoTodayISO();

  let rangeLength = 1;
  if (mode === "weekly") rangeLength = 7;
  if (mode === "monthly") rangeLength = 30;

  const dates = [];
  for (let i = rangeLength - 1; i >= 0; i--) dates.push(shiftDateISO(baseDate, -i));

  const RATE_BR = 5;
  const RATE_MX = 18;

  async function computeDailyStats(date) {
    const result = await db
      .prepare(
        "SELECT country,date,slot_key,username,local_turnover,created_at FROM raw_turnover WHERE date = ?"
      )
      .bind(date)
      .all();

    const rows = result.results || [];

    const SLOT_ORDER = {
      "00_02": 1, "00_04": 2, "00_06": 3, "00_08": 4, "00_10": 5, "00_12": 6,
      "00_14": 7, "00_16": 8, "00_18": 9, "00_20": 10, "00_22": 11, "00_24": 12
    };

    const agg = {};

    for (const r of rows) {
      const country = (r.country || "").toUpperCase();
      if (allowedCountry !== "ALL" && country !== allowedCountry) continue;

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
  brDeductTime: 0,
  isImportedUsd: false
};

      }

      const rec = agg[key];
      const slotKey = r.slot_key;

      // ✅ Imported historical totals are already USD
if (slotKey === "IMPORT_USD") {
  rec.isImportedUsd = true;
  // treat as "latest" for the day (only 1 value/day usually)
  rec.cumLocal = Number(r.local_turnover) || 0;
  rec.lastSlotOrder = 999; // force it to win over normal slots
  continue;
}

      if (slotKey === "BR_00_03") {
        if (Number(r.created_at) > rec.brDeductTime) {
          rec.brDeductTime = Number(r.created_at) || 0;
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

// ✅ If IMPORT_USD, it is already USD
if (rec.isImportedUsd) {
  usd = effectiveLocal;
} else {
  if (rec.country === "BR") usd = effectiveLocal / RATE_BR;
  else if (rec.country === "MX") usd = effectiveLocal / RATE_MX;
}


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

  try {
    const perDay = [];
    for (const d of dates) perDay.push(await computeDailyStats(d));

    const chartSeries = perDay.map((d) => ({ date: d.date, totalUsd: d.totalUsd }));

    const playerAgg = new Map();

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

    const overallTop = topPlayersOverall[0] || null;

    // Most consistent = max daysInTop20 (tie-break totalUsd)
    const consistent = [...topPlayersOverall].sort((a, b) => {
      if (b.daysInTop20 !== a.daysInTop20) return b.daysInTop20 - a.daysInTop20;
      return b.totalUsd - a.totalUsd;
    })[0] || null;

    return new Response(
      JSON.stringify({
        ok: true,
        mode,
        country: allowedCountry,
        baseDate,
        fromDate: dates[0],
        toDate: dates[dates.length - 1],
        chartSeries,
        perDay,
        topPlayersOverall,
        overallTop,
        consistent
      }),
      { headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } }
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ ok: false, error: e.message || String(e) }),
      { status: 500, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } }
    );
  }
}
