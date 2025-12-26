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

function getEmail(request) {
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
  const reason = (body.reason || "").trim();

  if (!batch_id) {
    return new Response(JSON.stringify({ ok: false, error: "batch_id required" }), {
      status: 400, headers: { "Content-Type": "application/json" }
    });
  }
  if (!reason) {
    return new Response(JSON.stringify({ ok: false, error: "reason required" }), {
      status: 400, headers: { "Content-Type": "application/json" }
    });
  }

  const email = getEmail(request) || "unknown";
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
    if (b.status === "APPROVED") {
      return new Response(JSON.stringify({ ok: false, error: "batch already APPROVED (cannot reject)" }), {
        status: 400, headers: { "Content-Type": "application/json" }
      });
    }

    await db.prepare(`
      UPDATE daily_leaderboard
      SET status='REJECTED', rejected_by=?, rejected_at=?, reject_reason=?
      WHERE batch_id=?
    `).bind(email, now, reason, batch_id).run();

    const msg =
      `❌ <b>Batch REJECTED</b>\n\n` +
      `<b>Date (UTC-6):</b> ${b.date}\n` +
      `<b>Country:</b> ${b.country}\n` +
      `<b>Slot:</b> ${b.slot}\n` +
      `<b>Batch:</b> <code>${batch_id}</code>\n` +
      `<b>Rows:</b> ${b.rows_count}\n` +
      `<b>Total Local:</b> ${Number(b.total_local || 0).toFixed(2)}\n` +
      `<b>Total USD:</b> ${Number(b.total_usd || 0).toFixed(2)}\n\n` +
      `<b>Rejected By:</b> ${email}\n` +
      `<b>Reason:</b> ${reason}`;

    const tg = await sendTelegram(env, msg);

    return new Response(JSON.stringify({ ok: true, batch_id, rejected_by: email, telegram: tg }), {
      headers: { "Content-Type": "application/json" }
    });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: e.message || String(e) }), {
      status: 500, headers: { "Content-Type": "application/json" }
    });
  }
}
