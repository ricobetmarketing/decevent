// functions/api-admin/approve.js
// Approve (verify) a batch and notify Telegram with verifier email (Cloudflare Access)

async function sendTelegram(context, text) {
  const token = context.env.TELEGRAM_BOT_TOKEN;
  const chatId = context.env.TELEGRAM_CHAT_ID;
  const topicId = context.env.TELEGRAM_TOPIC_ID;

  if (!token || !chatId) return { skipped: true, reason: "missing token/chatId" };

  const payload = {
    chat_id: chatId,
    text,
    parse_mode: "HTML",
    disable_web_page_preview: true,
  };
  if (topicId) payload.message_thread_id = Number(topicId);

  const resp = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = await resp.json().catch(() => ({}));
  return { ok: resp.ok, status: resp.status, data };
}

function escapeHtml(s) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

// Prefer Zero Trust email
function getVerifierEmail(request) {
  // Cloudflare Access passes this header to your origin by default
  const cfEmail = request.headers.get("cf-access-authenticated-user-email");
  if (cfEmail) return cfEmail;

  // Fallback (useful for local testing)
  const xEmail = request.headers.get("x-user-email");
  if (xEmail) return xEmail;

  return "unknown";
}

export async function onRequestPost(context) {
  const db = context.env.DB;
  const req = context.request;

  // Optional: still allow ADMIN_KEY as fallback
  const adminKey = context.env.ADMIN_KEY;
  const auth = req.headers.get("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";

  // If you want to enforce Cloudflare Access ONLY, you can remove this block.
  const verifierEmail = getVerifierEmail(req);
  const hasAccessEmail = verifierEmail && verifierEmail !== "unknown";
  const okByKey = adminKey && token && token === adminKey;

  if (!hasAccessEmail && !okByKey) {
    return new Response(JSON.stringify({ ok: false, error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  let body = {};
  try {
    body = await req.json();
  } catch {}

  const batch_id = String(body.batch_id || "").trim();
  if (!batch_id) {
    return new Response(JSON.stringify({ ok: false, error: "batch_id required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Load batch info
  const batch = await db.prepare(`
    SELECT batch_id, date, country, slot, status, created_at, uploader, note, rows_count, total_local, total_usd
    FROM daily_leaderboard
    WHERE batch_id = ?
    LIMIT 1
  `).bind(batch_id).first();

  if (!batch) {
    return new Response(JSON.stringify({ ok: false, error: "batch not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (String(batch.status).toUpperCase() === "APPROVED") {
    return new Response(JSON.stringify({ ok: true, alreadyApproved: true, batch }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  // Approve it + store who verified (we’ll use column `uploaded` as "verified by")
  // Your table has: uploaded TEXT, uploader TEXT
  await db.prepare(`
    UPDATE daily_leaderboard
    SET status = 'APPROVED',
        uploaded = ?
    WHERE batch_id = ?
  `).bind(verifierEmail, batch_id).run();

  // Compute "published" total for the day (only APPROVED, latest approved per country+slot)
  const date = batch.date;
  const daySumRes = await db.prepare(`
    SELECT COALESCE(SUM(t.raw_turnover),0) AS total
    FROM turnover_updates t
    JOIN daily_leaderboard b ON b.batch_id = t.batch_id
    JOIN (
      SELECT date, country, slot, MAX(created_at) AS max_created
      FROM daily_leaderboard
      WHERE date = ? AND status = 'APPROVED'
      GROUP BY date, country, slot
    ) x
      ON x.date=b.date AND x.country=b.country AND x.slot=b.slot AND x.max_created=b.created_at
    WHERE b.date = ? AND b.status='APPROVED'
  `).bind(date, date).first();

  const dayTotalLocal = Number(daySumRes?.total || 0);

  // Telegram notify
  const msg =
    `✅ <b>Turnover Verified & Published</b>\n\n` +
    `<b>Date (UTC-6):</b> ${escapeHtml(batch.date)}\n` +
    `<b>Country:</b> ${escapeHtml(batch.country)}\n` +
    `<b>Slot:</b> ${escapeHtml(batch.slot)}\n` +
    `<b>Batch:</b> <code>${escapeHtml(batch_id)}</code>\n` +
    `<b>Rows:</b> ${escapeHtml(batch.rows_count ?? "")}\n` +
    `<b>Submitted by:</b> ${escapeHtml(batch.uploader ?? "unknown")}\n` +
    `<b>Verified by:</b> ${escapeHtml(verifierEmail)}\n\n` +
    `<b>Published Total (Local):</b> ${dayTotalLocal.toFixed(2)}`;

  const tg = await sendTelegram(context, msg);

  return new Response(JSON.stringify({
    ok: true,
    approved: true,
    batch_id,
    verified_by: verifierEmail,
    dayTotalLocal,
    telegram: tg,
  }), {
    headers: { "Content-Type": "application/json" },
  });
}
