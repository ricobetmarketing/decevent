// functions/api-approve-batch.js
function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
  });
}

export async function onRequestPost(context) {
  const db = context.env.DB;

  let body;
  try { body = await context.request.json(); }
  catch { return json({ ok: false, error: "Invalid JSON" }, 400); }

  const batch_id = String(body.batch_id || "").trim();
  const approved_by = String(body.approved_by || "").trim(); // optional display name
  const key = String(body.key || "").trim();

  // simple admin key check (set in CF env)
  const ADMIN_KEY = context.env.ADMIN_KEY || "";
  if (!ADMIN_KEY || key !== ADMIN_KEY) return json({ ok: false, error: "Unauthorized" }, 401);

  if (!batch_id) return json({ ok: false, error: "Missing batch_id" }, 400);

  const now = new Date().toISOString();

  // Approve this batch_id
  const res = await db.prepare(`
    UPDATE daily_leaderboard
    SET status='APPROVED', approved_at=?1, approved_by=?2
    WHERE batch_id=?3
  `).bind(now, approved_by || null, batch_id).run();

  if (!res.success) return json({ ok: false, error: "Update failed" }, 500);

  return json({ ok: true, batch_id, approved_at: now });
}
