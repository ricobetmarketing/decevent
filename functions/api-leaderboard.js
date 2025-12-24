// functions/api-leaderboard.js
export async function onRequest(context) {
  const db = context.env.DB;
  const url = new URL(context.request.url);

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

 async function loadFakeDaily(date) {
  const r = await db.prepare(`
    SELECT username, country, boost_pct
    FROM fake_users
    WHERE date = ? AND is_active = 1
  `).bind(date).all();
  return r.results || [];
}


  function mergeFakeOption1(rowsRealSorted, fakeDaily) {
    const realOnly = (rowsRealSorted || []).filter(r => Number(r.usd_turnover || 0) > 0);
    const topRealUsd = realOnly[0] ? Number(realOnly[0].usd_turnover || 0) : 0;
    if (!topRealUsd || !fakeDaily?.length) return realOnly;

    const fakeRows = [];
    for (const f of fakeDaily) {
      const uname = String(f.username || "").trim();
      const pct = Number(f.boost_pct || 0);
      if (!uname || !Number.isFinite(pct) || pct <= 0) continue;

      const fakeUsd = Number((topRealUsd * (pct / 100)).toFixed(2));
      fakeRows.push({
        country: (String(f.country || "ALL").toUpperCase() === "ALL") ? "FAKE" : String(f.country).toUpperCase(),
        username: uname,
        usd_turnover: fakeUsd,
        is_fake: true
      });
    }

    const combined = [...realOnly, ...fakeRows].sort((a,b)=>b.usd_turnover-a.usd_turnover);
    combined.forEach((p,i)=>p.rank=i+1);
    return combined;
  }

  // ✅ Pull only APPROVED batches for the date
  // latest approved per slot:
  const approved = await db.prepare(`
    SELECT b1.batch_id, b1.country, b1.slot, b1.created_at
    FROM daily_leaderboard b1
    JOIN (
      SELECT date, country, slot, MAX(created_at) AS max_created
      FROM daily_leaderboard
      WHERE date = ? AND status = 'APPROVED'
      GROUP BY date, country, slot
    ) x
    ON x.date = b1.date AND x.country = b1.country AND x.slot = b1.slot AND x.max_created = b1.created_at
    WHERE b1.date = ? AND b1.status = 'APPROVED'
  `).bind(date, date).all();

  const approvedBatches = approved.results || [];

  // If nothing approved yet, return empty
  if (!approvedBatches.length) {
    return new Response(JSON.stringify({ ok:true, date, rows: [] }), {
      headers: { "Content-Type":"application/json", "Access-Control-Allow-Origin":"*" }
    });
  }

  // Read turnover rows only from those batch_ids
  const batchIds = approvedBatches.map(b => b.batch_id).filter(Boolean);
  const placeholders = batchIds.map(()=>"?").join(",");

  const liveRes = await db.prepare(`
    SELECT country,date,slot,username,raw_turnover,timestamp,batch_id
    FROM turnover_updates
    WHERE batch_id IN (${placeholders})
  `).bind(...batchIds).all();

  const live = liveRes.results || [];

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

  let leaderboard = players
    .filter(p => p.usd_turnover > 0)
    .sort((a,b)=>b.usd_turnover-a.usd_turnover);

  leaderboard.forEach((p,i)=>p.rank=i+1);

  // ✅ merge fake after real sort
  const fakeDaily = await loadFakeDaily(date);
  leaderboard = mergeFakeOption1(leaderboard, fakeDaily);

  return new Response(JSON.stringify({ ok:true, date, rows: leaderboard.slice(0,20) }), {
    headers: { "Content-Type":"application/json", "Access-Control-Allow-Origin":"*" }
  });
}
