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

  // Send into a Topic if provided
  if (topicId) payload.message_thread_id = Number(topicId);

  const resp = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  const data = await resp.json().catch(() => ({}));
  return { ok: resp.ok, status: resp.status, data };
}

// Format time in GMT+8 (your PC time)
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

// Get Mexico "today" ISO (UTC-6)
function getMexicoTodayISO() {
  const nowUtcMs = Date.now();
  const offsetMs = -6 * 60 * 60 * 1000;
  const mexNow = new Date(nowUtcMs + offsetMs);
  const y = mexNow.getFullYear();
  const m = String(mexNow.getMonth() + 1).padStart(2, "0");
  const d = String(mexNow.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
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
  const date = body.date || "";         // this is UTC-6 date selected in admin
  const slotKey = body.slotKey || "";
  const rows = Array.isArray(body.rows) ? body.rows : [];

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

  // Clean rows
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

  const now = Date.now(); // timestamp (ms)
  const totalLocal = cleanRows.reduce((sum, r) => sum + r.turnover, 0);

  try {
    // Overwrite: same date + country + slot
    await db
      .prepare("DELETE FROM turnover_updates WHERE date = ? AND country = ? AND slot = ?")
      .bind(date, country, slotKey)
      .run();

    const insert = db.prepare(
      "INSERT INTO turnover_updates (country,date,slot,username,raw_turnover,timestamp) VALUES (?,?,?,?,?,?)"
    );

    const batch = cleanRows.map((r) =>
      insert.bind(country, date, slotKey, r.username, r.turnover, now)
    );
    await db.batch(batch);

    // ✅ Sum up CURRENT TOTAL turnover for the day (UTC-6 date) from turnover_updates table
    const daySumRes = await db
      .prepare("SELECT COALESCE(SUM(raw_turnover),0) AS total FROM turnover_updates WHERE date = ?")
      .bind(date)
      .first();

    const dayTotalLocal = Number(daySumRes?.total || 0);

    // Telegram message (your required style)
    const msg =
      `📊 <b>Daily Turnover Challenge!</b>\n\n` +
      `<b>Current Update:</b> ${dayTotalLocal.toFixed(2)}\n` +
      `<b>Date (UTC-6):</b> ${date}\n` +
      `<b>Saved Slot:</b> ${slotKey} (${country})\n` +
      `<b>Rows:</b> ${cleanRows.length}\n` +
      `<b>Upload Time:</b> ${formatTimeGMT8()}`;

    const tg = await sendTelegram(context, msg);

    return new Response(
      JSON.stringify({
        ok: true,
        inserted: cleanRows.length,
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
