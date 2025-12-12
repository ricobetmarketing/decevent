// functions/api-admin-save.js

export async function onRequestPost(context) {
  const db = context.env.DB;
  let body;

  try {
    body = await context.request.json();
  } catch {
    return jsonError("Invalid JSON", 400);
  }

  const country = (body.country || "").toUpperCase();
  const date = body.date || "";
  const slotKey = body.slotKey || "";
  const rows = Array.isArray(body.rows) ? body.rows : [];

  // ---- VALIDATION ----
  if (!["BR", "MX"].includes(country)) return jsonError("Invalid country", 400);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return jsonError("Invalid date", 400);
  if (!slotKey) return jsonError("Missing slotKey", 400);

  // ---- CLEAN ROWS ----
  const cleanRows = [];
  for (const r of rows) {
    const username = String(r.username || "").trim();
    const turnover = Number(r.turnover);
    if (!username || !Number.isFinite(turnover)) continue;
    cleanRows.push({ username, turnover });
  }

  if (!cleanRows.length) {
    return jsonError("No valid rows", 400);
  }

  const now = Date.now();
  const totalLocal = cleanRows.reduce((s, r) => s + r.turnover, 0);

  try {
    // ---- OVERWRITE EXISTING SLOT ----
    await db.prepare(
      "DELETE FROM turnover_updates WHERE date = ? AND country = ? AND slot = ?"
    ).bind(date, country, slotKey).run();

    // ---- INSERT NEW ROWS ----
    const insert = db.prepare(
      `INSERT INTO turnover_updates
       (country, date, slot, username, raw_turnover, timestamp)
       VALUES (?, ?, ?, ?, ?, ?)`
    );

    await db.batch(
      cleanRows.map(r =>
        insert.bind(country, date, slotKey, r.username, r.turnover, now)
      )
    );

    // ---- TELEGRAM NOTIFICATION ----
    await sendTelegram(context, {
      country,
      date,
      slotKey,
      rows: cleanRows.length,
      totalLocal
    });

    return new Response(JSON.stringify({
      ok: true,
      inserted: cleanRows.length
    }), { headers: jsonHeaders });

  } catch (e) {
    return jsonError(e.message || String(e), 500);
  }
}

/* ---------- HELPERS ---------- */

async function sendTelegram(context, data) {
  const token = context.env.TELEGRAM_BOT_TOKEN;
  const chatId = context.env.TELEGRAM_CHAT_ID;
  const topicId = context.env.TELEGRAM_TOPIC_ID;

  if (!token || !chatId) return;

  const text =
`<b>✅ Turnover Update Saved</b>
<b>Country:</b> ${data.country}
<b>Date (UTC-6):</b> ${data.date}
<b>Slot:</b> ${data.slotKey}
<b>Rows:</b> ${data.rows}
<b>Total Local:</b> ${data.totalLocal.toFixed(2)}
<b>Time:</b> ${new Date().toISOString()}`;

  const payload = {
    chat_id: chatId,
    text,
    parse_mode: "HTML"
  };

  if (topicId) payload.message_thread_id = Number(topicId);

  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
}

const jsonHeaders = { "Content-Type": "application/json" };

function jsonError(msg, status) {
  return new Response(JSON.stringify({ ok: false, error: msg }), {
    status,
    headers: jsonHeaders
  });
}
