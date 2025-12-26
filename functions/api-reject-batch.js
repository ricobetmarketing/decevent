export async function onRequestPost({ request, env }) {
  const db = env.DB;

  try {
    const body = await request.json().catch(() => ({}));
    const batch_id = String(body.batch_id || "").trim();
    const reason = String(body.reason || "").trim();
    const admin = String(body.admin || "ADMIN").trim(); // you can replace with auth user later

    if (!batch_id) return json({ ok: false, error: "batch_id required" }, 400);
    if (!reason) return json({ ok: false, error: "reason required" }, 400);

    // ensure batch exists and is pending
    const chk = await db.prepare(`
      SELECT status, date, country, slot
      FROM daily_leaderboard
      WHERE batch_id = ?
      LIMIT 1
    `).bind(batch_id).first();

    if (!chk) return json({ ok: false, error: "Batch not found" }, 404);

    const st = String(chk.status || "").toUpperCase();
    if (st !== "PENDING") {
      return json({ ok: false, error: `Cannot reject batch with status=${st}` }, 400);
    }

    const now = Date.now();

    await db.prepare(`
      UPDATE daily_leaderboard
      SET status = 'REJECTED',
          rejected_by = ?,
          rejected_at = ?,
          reject_reason = ?
      WHERE batch_id = ?
    `).bind(admin, now, reason, batch_id).run();

    // OPTIONAL: Telegram notify
    // await sendTelegram(env, `❌ REJECTED\nBatch: ${batch_id}\n${chk.country} ${chk.date} ${chk.slot}\nReason: ${reason}\nBy: ${admin}`);

    return json({ ok: true });
  } catch (e) {
    return json({ ok: false, error: e.message || String(e) }, 500);
  }
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}

// async function sendTelegram(env, text) {
//   if (!env.TG_BOT_TOKEN || !env.TG_CHAT_ID) return;
//   const url = `https://api.telegram.org/bot${env.TG_BOT_TOKEN}/sendMessage`;
//   await fetch(url, {
//     method: "POST",
//     headers: { "Content-Type": "application/json" },
//     body: JSON.stringify({ chat_id: env.TG_CHAT_ID, text })
//   });
// }
