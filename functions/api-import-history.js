// functions/api-import-history.js
// Upload CSV (Google Sheet export) of historical DAILY USD totals
// Expected CSV columns:
// date,username,turnover_usd,country
// Example:
// 2025-12-09,adriantkk,228.82,BR

function csvParseLine(line) {
  // Simple CSV parser for 4 columns (no quoted commas expected)
  // If your usernames can contain commas, tell me and I'll upgrade to a real CSV parser.
  return line.split(",").map((s) => s.trim());
}

export async function onRequestPost(context) {
  const db = context.env.DB;

  const importKey = context.env.IMPORT_KEY;
  const providedKey = context.request.headers.get("x-import-key") || "";

  if (!importKey || providedKey !== importKey) {
    return new Response(JSON.stringify({ ok: false, error: "Forbidden" }), {
      status: 403,
      headers: { "Content-Type": "application/json" }
    });
  }

  let body;
  try {
    body = await context.request.json();
  } catch {
    return new Response(JSON.stringify({ ok: false, error: "Invalid JSON" }), {
      status: 400,
      headers: { "Content-Type": "application/json" }
    });
  }

  const csvText = String(body.csv || "");
  const overwrite = Boolean(body.overwrite); // if true: delete same date+country before insert

  if (!csvText.trim()) {
    return new Response(JSON.stringify({ ok: false, error: "Empty CSV" }), {
      status: 400,
      headers: { "Content-Type": "application/json" }
    });
  }

  const lines = csvText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length < 2) {
    return new Response(JSON.stringify({ ok: false, error: "CSV needs header + rows" }), {
      status: 400,
      headers: { "Content-Type": "application/json" }
    });
  }

  // Validate header (loose)
  const header = lines[0].toLowerCase().replace(/\s+/g, "");
  if (!header.includes("date") || !header.includes("username") || !header.includes("turnover") || !header.includes("country")) {
    return new Response(JSON.stringify({
      ok: false,
      error: "Header must include: date, username, turnover_usd, country"
    }), { status: 400, headers: { "Content-Type": "application/json" } });
  }

  const nowMs = Date.now();
  const slotKey = "IMPORT_USD";

  // Parse rows
  const rows = [];
  const errors = [];

  for (let i = 1; i < lines.length; i++) {
    const parts = csvParseLine(lines[i]);
    if (parts.length < 4) {
      errors.push(`Line ${i + 1}: expected 4 columns`);
      continue;
    }

    const date = parts[0];
    const username = parts[1];
    const turnoverUsd = Number(String(parts[2]).replace(/,/g, ""));
    const country = String(parts[3] || "").toUpperCase();

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      errors.push(`Line ${i + 1}: invalid date "${date}"`);
      continue;
    }
    if (!username) {
      errors.push(`Line ${i + 1}: missing username`);
      continue;
    }
    if (!Number.isFinite(turnoverUsd)) {
      errors.push(`Line ${i + 1}: invalid turnover "${parts[2]}"`);
      continue;
    }
    if (!["BR", "MX"].includes(country)) {
      errors.push(`Line ${i + 1}: invalid country "${parts[3]}" (use BR or MX)`);
      continue;
    }

    rows.push({ date, username, turnoverUsd, country });
  }

  if (errors.length) {
    return new Response(JSON.stringify({ ok: false, error: errors[0], errors }), {
      status: 400,
      headers: { "Content-Type": "application/json" }
    });
  }

  if (!rows.length) {
    return new Response(JSON.stringify({ ok: false, error: "No valid rows" }), {
      status: 400,
      headers: { "Content-Type": "application/json" }
    });
  }

  // Optional overwrite: delete imported rows for same (date,country,slot_key)
  // NOTE: we only delete slot_key=IMPORT_USD so we never touch your real live slots
  if (overwrite) {
    // Delete per unique (date,country)
    const unique = new Set(rows.map((r) => `${r.date}::${r.country}`));
    for (const key of unique) {
      const [date, country] = key.split("::");
      await db
        .prepare("DELETE FROM raw_turnover WHERE date=? AND country=? AND slot_key=?")
        .bind(date, country, slotKey)
        .run();
    }
  }

  // Insert in chunks (safe)
  const insertStmt = db.prepare(
    "INSERT INTO raw_turnover (country,date,slot_key,username,local_turnover,created_at) VALUES (?,?,?,?,?,?)"
  );

  const CHUNK = 100;
  let inserted = 0;

  for (let i = 0; i < rows.length; i += CHUNK) {
    const slice = rows.slice(i, i + CHUNK);
    const batch = slice.map((r) =>
      insertStmt.bind(r.country, r.date, slotKey, r.username, r.turnoverUsd, nowMs)
    );
    await db.batch(batch);
    inserted += slice.length;
  }

  return new Response(JSON.stringify({
    ok: true,
    inserted,
    slot_key: slotKey,
    overwrite
  }), { headers: { "Content-Type": "application/json" } });
}
