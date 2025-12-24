// functions/api-admin-save.js

async function sendTelegram(context, text) {
  const token = context.env.TELEGRAM_BOT_TOKEN;
  const chatId = context.env.TELEGRAM_CHAT_ID;
  const topicId = context.env.TELEGRAM_TOPIC_ID;

  if (!token || !chatId) return { skipped: true, reason: "missing token/chatId" };

  const payload = {
    chat_id: chatId,
    text,
    parse_mode: "HTML",
    disable_web_page_preview: true
  };

  if (topicId) payload.message_thread_id = Number(topicId);

  const resp = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  const data = await resp.json().catch(() => ({}));
  return { ok: resp.ok, status: resp.status, data };
}

function formatTimeGMT8() {
  const dt = new Date(Date.now() + 8 * 60 * 60 * 1000);
  const y = dt.getUTCFullYear();
  const m = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const d = String(dt.getUTCDate()).padStart(2, "0");
  let hh = dt.getUTCHours();
  const mm = String(dt.getUTCMinutes()).padStart(2, "0");
  const ampm = hh >= 12 ? "PM" : "AM";
  hh = hh % 12;
  if (hh === 0) hh = 12;
  return `${y}-${m}-${d} ${hh}:${mm}${ampm} (GMT+8)`;
}

function makeBatchId() {
  return "b_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 10);
}

function toUSD(country, amount) {
  const v = Number(amount || 0);
  if (!Number.isFinite(v)) return 0;
  if (country === "BR") return v / 5;
  if (country === "MX") return v / 18;
  return v;
}

export async function onRequestPost(context) {
  const db = context.env.DB;

  let body;
  try {
    body = await context.request.json();
  } catch {
    return new Response(JSON.stringify({ ok: false, error: "Invalid JSON" }), {
      status: 400,
      headers: { "Content-Type": "application/json" }
    });
  }

  const country = (body.country || "").toUpperCase();
  const date = body.date || ""; // UTC-6 date selected in admin
  const slotKey = body.slotKey || "";
  const rows = Array.isArray(body.rows) ? body.rows : [];
  const uploader = body.uploader || "";
  const note = body.note || "";

  if (!["BR", "MX"].includes(country)) {
    return new Response(JSON.stringify({ ok: false, error: "Invalid country" }), {
      status: 400,
      headers: { "Content-Type": "application/json" }
    });
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return new Response(JSON.stringify({ ok: false, error: "Invalid date" }), {
      status: 400,
      headers: { "Content-Type": "application/json" }
    });
  }
  if (!slotKey) {
    return new Response(JSON.stringify({ ok: false, error: "Missing slotKey" }), {
      status: 400,
      headers: { "Content-Type": "application/json" }
    });
  }

  const cleanRows = [];
  for (const r of rows) {
    const username = String(r.username || "").trim();
    const t = Number(r.turnover);
    if (!username) continue;
    if (!Number.isFinite(t)) continue;
    cleanRows.push({ username, turnover: t });
  }

  if (!cleanRows.length) {
    return new Response(JSON.stringify({ ok: false, error: "No valid rows" }), {
      status: 400,
      headers: { "Content-Type": "application/json" }
    });
  }

  const batch_id = makeBatchId();
  const created_at = new Date().toISOString();
  const nowMs = Date.now();
  const totalLocal = cleanRows.reduce((sum, r) => sum + r.turnover, 0);
  const totalUSD = cleanRows.reduce((sum, r) => sum + toUSD(country, r.turnover), 0);

  try {
    // 1) log batch summary INTO daily_leaderboard (not upload_batches)
    await db.prepare(`
      INSERT INTO daily_leaderboard
        (batch_id, created_at, uploader, country, slot, date, rows_count, total_local, total_usd, note, status)
      VALUES
        (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, 'PENDING')
    `).bind(
      batch_id,
      created_at,
      uploader || null,
      country,
      slotKey,
      date,
      cleanRows.length,
      totalLocal,
      totalUSD,
      note || null
    ).run();

    // 2) insert all rows into turnover_updates with batch_id
    const insert = db.prepare(`
      INSERT INTO turnover_updates (country,date,slot,username,raw_turnover,timestamp,batch_id)
      VALUES (?,?,?,?,?,?,?)
    `);

    const batch = cleanRows.map((r) =>
      insert.bind(country, date, slotKey, r.username, r.turnover, nowMs, batch_id)
    );
    await db.batch(batch);

    // 3) compute day total from ONLY latest batch per (date+country+slot)
    const daySumRes = await db.prepare(`
      SELECT COALESCE(SUM(t.raw_turnover),0) AS total
      FROM turnover_updates t
      JOIN daily_leaderboard b ON b.batch_id = t.batch_id
      WHERE b.date = ?
        AND b.created_at = (
          SELECT MAX(b2.created_at)
          FROM daily_leaderboard b2
          WHERE b2.date = b.date
            AND b2.country = b.country
            AND b2.slot = b.slot
        )
    `).bind(date).first();

    const dayTotalLocal = Number(daySumRes?.total || 0);

    // 4) Telegram message (still ok)
    const msg =
      `📊 <b>Daily Turnover Challenge!</b>\n\n` +
      `<b>Current Update:</b> ${dayTotalLocal.toFixed(2)}\n` +
      `<b>Date (UTC-6):</b> ${date}\n` +
      `<b>Saved Slot:</b> ${slotKey} (${country})\n` +
      `<b>Rows:</b> ${cleanRows.length}\n` +
      `<b>Status:</b> PENDING (need verify)\n` +
      `<b>Upload Time:</b> ${formatTimeGMT8()}`;

    const tg = await sendTelegram(context, msg);

    return new Response(
      JSON.stringify({
        ok: true,
        batch_id,
        inserted: cleanRows.length,
        totals: { totalLocal, totalUSD },
        telegram: tg
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: e.message || String(e) }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
