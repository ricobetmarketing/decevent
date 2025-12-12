async function telegramSendMessage({ token, chatId, threadId, text }) {
  const body = {
    chat_id: chatId,
    text,
  };
  if (threadId) body.message_thread_id = threadId;

  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const json = await res.json();
  if (!json.ok) throw new Error(`Telegram sendMessage failed: ${JSON.stringify(json)}`);
  return json;
}

async function telegramSendPhoto({ token, chatId, threadId, caption, photoBytes }) {
  const form = new FormData();
  form.append("chat_id", String(chatId));
  if (threadId) form.append("message_thread_id", String(threadId));
  if (caption) form.append("caption", caption);

  const blob = new Blob([photoBytes], { type: "image/png" });
  // ✅ filename provided as 3rd argument (no File() needed)
  form.append("photo", blob, "leaderboard.png");

  const res = await fetch(`https://api.telegram.org/bot${token}/sendPhoto`, {
    method: "POST",
    body: form,
  });

  const json = await res.json();
  if (!json.ok) throw new Error(`Telegram sendPhoto failed: ${JSON.stringify(json)}`);
  return json;
}


export async function onRequestPost(context) {
  const DB = context.env.DB;
  const data = await context.request.json();

  const { date, country, slot, records } = data;
  const timestamp = new Date().toISOString();

  const stmt = `
    INSERT INTO turnover_updates (date, username, country, raw_turnover, timestamp, slot)
    VALUES (?1, ?2, ?3, ?4, ?5, ?6)
  `;

  for (const r of records) {
    await DB.prepare(stmt)
      .bind(date, r.username, country, r.turnover, timestamp, slot)
      .run();
  }

  // =========================
  // ✅ TELEGRAM + SCREENSHOT
  // =========================
  // Make sure these ENV vars exist in Cloudflare Pages/Worker settings:
  // TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID
  // Optional: TELEGRAM_TOPIC_ID (if not set, we use 4)
  const token = context.env.TELEGRAM_BOT_TOKEN;
  const chatId = context.env.TELEGRAM_CHAT_ID;
  const threadId = Number(context.env.TELEGRAM_TOPIC_ID || 4);

  // If you haven't set telegram vars yet, don't crash the update endpoint
  if (token && chatId) {
    // 1) Send text update (optional)
    const text = `✅ Leaderboard updated\nDate: ${date}\nCountry: ${country}\nSlot: ${slot}\nRecords: ${records?.length || 0}\nTime: ${timestamp}`;
    await telegramSendMessage({ token, chatId, threadId, text });

    // 2) Get screenshot from your screenshot worker (d1-template)
    // IMPORTANT: You must have your screenshot worker accepting this key and returning PNG.
    const SHOT_URL =
      "https://d1-template.kenny-658.workers.dev/shot" +
      "?key=dailyranking" +
      "&mode=leaderboard" +
      "&url=" + encodeURIComponent("https://decevent.pages.dev/");

    const shotRes = await fetch(SHOT_URL);

    if (shotRes.ok) {
      const photoBytes = new Uint8Array(await shotRes.arrayBuffer());

      // 3) Send screenshot to same topic
      await telegramSendPhoto({
        token,
        chatId,
        threadId,
        caption: `📸 Daily Ranking Screenshot\n${timestamp}`,
        photoBytes,
      });
    } else {
      const errText = await shotRes.text().catch(() => "");
      // Send a warning message instead of failing
      await telegramSendMessage({
        token,
        chatId,
        threadId,
        text: `⚠️ Screenshot failed (${shotRes.status})\n${errText || "(no details)"}`
      });
    }
  }

  return new Response(JSON.stringify({ ok: true }), {
    headers: { "Content-Type": "application/json" }
  });
}
