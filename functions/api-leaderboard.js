// functions/api-leaderboard.js
export async function onRequest(context) {
  const db = context.env.DB;
  const url = new URL(context.request.url);

  // Default: today's Mexico date (UTC-6)
  let date = url.searchParams.get("date");
  if (!date) {
    const nowUtcMs = Date.now();
    const offsetMs = -6 * 60 * 60 * 1000;
    const mexNow = new Date(nowUtcMs + offsetMs);
    const y = mexNow.getFullYear();
    const m = String(mexNow.getMonth() + 1).padStart(2, "0");
    const d = String(mexNow.getDate()).padStart(2, "0");
    date = `${y}-${m}-${d}`;
  }

  // 1) Try LIVE table first (your current system)
  let live = [];
  try {
    const r = await db
      .prepare("SELECT country,date,slot,username,raw_turnover,timestamp FROM turnover_updates WHERE date = ?")
      .bind(date)
      .all();
    live = r.results || [];
  } catch (e) {
    // ignore; we can still fallback to import
  }

  // If LIVE data exists, keep your original logic:
  if (live.length) {
    const SLOT_ORDER = {
      "00_02": 1, "00_04": 2, "00_06": 3, "00_08": 4, "00_10": 5, "00_12": 6,
      "00_14": 7, "00_16": 8, "00_18": 9, "00_20": 10, "00_22": 11, "00_24": 12
    };
    const RATE_BR = 5;
    const RATE_MX = 18;

    const agg = {};
    for (const r of live) {
      const country = (r.country || "").toUpperCase();
      const username = String(r.username || "").trim();
      if (!username) continue;

      const key = `${country}:${username.toLowerCase()}`;
      if (!agg[key]) {
        agg[key] = { country, username, cumLocal: 0, lastSlotOrder: -1, brDeduct: 0, brDeductTime: 0 };
      }
      const rec = agg[key];
      const slotKey = r.slot;

      if (slotKey === "BR_00_03") {
        if (Number(r.timestamp) > rec.brDeductTime) {
          rec.brDeductTime = Number(r.timestamp) || 0;
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
      if (rec.country === "BR") effectiveLocal = Math.max(effectiveLocal - (rec.brDeduct || 0), 0);

      let usd = 0;
      if (rec.country === "BR") usd = effectiveLocal / RATE_BR;
      else if (rec.country === "MX") usd = effectiveLocal / RATE_MX;

      return { country: rec.country, username: rec.username, usd_turnover: Number(usd.toFixed(2)) };
    });

    const leaderboard = players.filter(p => p.usd_turnover > 0).sort((a,b)=>b.usd_turnover-a.usd_turnover);
    leaderboard.forEach((p,i)=>p.rank=i+1);
    return new Response(JSON.stringify({ ok:true, date, rows: leaderboard.slice(0,20) }), {
      headers: { "Content-Type":"application/json", "Access-Control-Allow-Origin":"*" }
    });
  }

  // 2) FALLBACK: IMPORT_USD (already USD, stored in raw_turnover.local_turnover)
  const imp = await db
    .prepare("SELECT country, date, username, local_turnover FROM raw_turnover WHERE date = ? AND slot_key = 'IMPORT_USD'")
    .bind(date)
    .all();

  const rows = (imp.results || []).map(r => ({
    country: (r.country || "").toUpperCase(),
    username: r.username,
    usd_turnover: Number((Number(r.local_turnover) || 0).toFixed(2))
  }));

  const leaderboard = rows.filter(p => p.usd_turnover > 0).sort((a,b)=>b.usd_turnover-a.usd_turnover);
  leaderboard.forEach((p,i)=>p.rank=i+1);

  return new Response(JSON.stringify({ ok:true, date, rows: leaderboard.slice(0,20) }), {
    headers: { "Content-Type":"application/json", "Access-Control-Allow-Origin":"*" }
  });
}
