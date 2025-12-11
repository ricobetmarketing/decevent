// functions/api-leaderboard.js

export async function onRequest(context) {
  const db = context.env.DB;
  const url = new URL(context.request.url);

  let date = url.searchParams.get("date");
  if (!date) {
    // Default: today's Mexico date (UTC-6)
    const nowUtcMs = Date.now();
    const offsetMs = -6 * 60 * 60 * 1000;
    const mexNow = new Date(nowUtcMs + offsetMs);
    const y = mexNow.getFullYear();
    const m = String(mexNow.getMonth() + 1).padStart(2, "0");
    const d = String(mexNow.getDate()).padStart(2, "0");
    date = `${y}-${m}-${d}`;
  }

  let result;
  try {
    result = await db
      .prepare(
        "SELECT country,date,slot,username,raw_turnover,timestamp FROM turnover_updates WHERE date = ?"
      )
      .bind(date)
      .all();
  } catch (e) {
    return new Response(
      JSON.stringify({ ok: false, error: e.message || String(e) }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" }
      }
    );
  }

  const rows = result.results || [];

  // Order of cumulative slots (latest wins)
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

  const RATE_BR = 5;
  const RATE_MX = 18;

  // Aggregate per player
  const agg = {}; // key: country:username(lower)

  for (const r of rows) {
    const country = (r.country || "").toUpperCase();
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
    const slotKey = r.slot; // comes from <select value="00_02" etc>

    if (slotKey === "BR_00_03") {
      // Special Brazil 00:00–03:00 local – keep latest
      if (r.timestamp > rec.brDeductTime) {
        rec.brDeductTime = r.timestamp;
        rec.brDeduct = Number(r.raw_turnover) || 0;
      }
    } else {
      const so = SLOT_ORDER[slotKey] ?? 0;
      if (so >= rec.lastSlotOrder) {
        rec.lastSlotOrder = so;
        rec.cumLocal = Number(r.raw_turnover) || 0;
      }
    }
  }

  const players = Object.values(agg).map((rec) => {
    let effectiveLocal = rec.cumLocal;
    if (rec.country === "BR") {
      effectiveLocal = Math.max(effectiveLocal - (rec.brDeduct || 0), 0);
    }

    let usd = 0;
    if (rec.country === "BR") usd = effectiveLocal / RATE_BR;
    else if (rec.country === "MX") usd = effectiveLocal / RATE_MX;
    else usd = effectiveLocal;

    return {
      country: rec.country,
      username: rec.username,
      usd_turnover: Number(usd.toFixed(2))
    };
  });

  const leaderboard = players
    .filter((p) => p.usd_turnover > 0)
    .sort((a, b) => b.usd_turnover - a.usd_turnover);

  leaderboard.forEach((p, i) => {
    p.rank = i + 1;
  });

  const top20 = leaderboard.slice(0, 20);

  return new Response(JSON.stringify({ ok: true, date, rows: top20 }), {
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*"
    }
  });
}
