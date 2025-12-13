export async function onRequestPost({ request, env }) {
  const { key, batch_id } = await request.json().catch(() => ({}));
  if (!env.ADMIN_KEY || key !== env.ADMIN_KEY) {
    return new Response("Forbidden", { status: 403 });
  }
  if (!batch_id) return new Response("batch_id required", { status: 400 });

  const DB = env.DB;

  // delete rows tied to that batch
  await DB.prepare(`DELETE FROM turnover_updates WHERE batch_id = ?`).bind(batch_id).run();
  await DB.prepare(`DELETE FROM upload_batches WHERE batch_id = ?`).bind(batch_id).run();

  return new Response(JSON.stringify({ ok: true, rolled_back: batch_id }), {
    headers: { "Content-Type": "application/json" }
  });
}
