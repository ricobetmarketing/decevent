export async function onRequestPost(context) {
  const db = context.env.DB;

  let body;
  try { body = await context.request.json(); }
  catch {
    return new Response(JSON.stringify({ ok:false, error:"Invalid JSON" }), {
      status: 400, headers: { "Content-Type":"application/json" }
    });
  }

  const id = Number(body.id);
  if (!Number.isFinite(id) || id <= 0) {
    return new Response(JSON.stringify({ ok:false, error:"Invalid id" }), {
      status: 400, headers: { "Content-Type":"application/json" }
    });
  }

  try {
    await db.prepare(`DELETE FROM fake_daily WHERE id = ?`).bind(id).run();
    return new Response(JSON.stringify({ ok:true, deleted:true, id }), {
      headers: { "Content-Type":"application/json" }
    });
  } catch (e) {
    return new Response(JSON.stringify({ ok:false, error: e.message || String(e) }), {
      status: 500, headers: { "Content-Type":"application/json" }
    });
  }
}
