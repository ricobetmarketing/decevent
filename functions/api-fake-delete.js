export async function onRequestPost({ env, request }) {
  const { id } = await request.json();
  if (!id) {
    return new Response(JSON.stringify({ ok:false, error:"id required" }), { status:400 });
  }

  await env.DB.prepare(`
    DELETE FROM fake_users WHERE id=?
  `).bind(id).run();

  return new Response(JSON.stringify({ ok:true }));
}
