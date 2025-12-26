async function sendTelegram(env, text) {
  const token = env.TELEGRAM_BOT_TOKEN;
  const chatId = env.TELEGRAM_CHAT_ID;
  const topicId = env.TELEGRAM_TOPIC_ID;

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

function getVerifierEmail(request) {
  // Cloudflare Access usually injects this header
  return (
    request.headers.get("cf-access-authenticated-user-email") ||
    request.headers.get("Cf-Access-Authenticated-User-Email") ||
    request.headers.get("x-verifier-email") ||
    ""
  );
}

export async function onRequestPost({ request, env }) {
  const db = env.DB;

  let body = {};
  try { body = await request.json(); } catch {}
  const batch_id = (body.batch_id || "").trim();
  if (!batch_id) {
    return new Response(JSON.stringify({ ok: false, error: "batch_id required" }), {
      status: 400, headers: { "Content-Type": "application/json" }
    });
  }

  const email = getVerifierEmail(request) || "unknown";
  const now = Date.now();

  try {
    const b = await db.prepare(`
      SELECT batch_id, date, country, slot, status, total_local, total_usd, rows_count
      FROM daily_leaderboard
      WHERE batch_id = ?
    `).bind(batch_id).first();

    if (!b) {
      return new Response(JSON.stringify({ ok: false, error: "batch not found" }), {
        status: 404, headers: { "Content-Type": "application/json" }
      });
    }
    if (b.status === "REJECTED") {
      return new Response(JSON.stringify({ ok: false, error: "batch already REJECTED" }), {
        status: 400, headers: { "Content-Type": "application/json" }
      });
    }

    // Approve this batch
await db.prepare(`
  UPDATE daily_leaderboard
  SET status='APPROVED',
      verified_by=?,
      verified_at=?
  WHERE batch_id=?
`).bind(email, now, batch_id).run();


    // Optional: mark other PENDING batches for same date/country/slot as SUPERSEDED
    await db.prepare(`
      UPDATE daily_leaderboard
      SET status='SUPERSEDED'
      WHERE date=? AND country=? AND slot=? AND batch_id<>? AND status='PENDING'
    `).bind(b.date, b.country, b.slot, batch_id).run();

    const msg =
      `✅ <b>Batch VERIFIED & PUBLISHED</b>\n\n` +
      `<b>Date (UTC-6):</b> ${b.date}\n` +
      `<b>Country:</b> ${b.country}\n` +
      `<b>Slot:</b> ${b.slot}\n` +
      `<b>Batch:</b> <code>${batch_id}</code>\n` +
      `<b>Rows:</b> ${b.rows_count}\n` +
      `<b>Total Local:</b> ${Number(b.total_local || 0).toFixed(2)}\n` +
      `<b>Total USD:</b> ${Number(b.total_usd || 0).toFixed(2)}\n\n` +
      `<b>Verified By:</b> ${email}`;

    const tg = await sendTelegram(env, msg);

    return new Response(JSON.stringify({ ok: true, batch_id, verified_by: email, telegram: tg }), {
      headers: { "Content-Type": "application/json" }
    });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: e.message || String(e) }), {
      status: 500, headers: { "Content-Type": "application/json" }
    });
  }
}
