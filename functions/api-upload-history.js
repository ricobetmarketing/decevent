export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);

  const date = url.searchParams.get("date");
  const slot = url.searchParams.get("slot");
  const country = url.searchParams.get("country");

  let where = [];
  let bind = [];
  if (date) { where.push("date = ?"); bind.push(date); }
  if (slot) { where.push("slot = ?"); bind.push(slot); }
  if (country) { where.push("country = ?"); bind.push(country); }

  const sql = `
    SELECT *
    FROM upload_batches
    ${where.length ? "WHERE " + where.join(" AND ") : ""}
    ORDER BY created_at DESC
    LIMIT 200
  `;

  const res = await env.DB.prepare(sql).bind(...bind).all();
  return new Response(JSON.stringify(res.results || []), {
    headers: { "Content-Type": "application/json" }
  });
}
