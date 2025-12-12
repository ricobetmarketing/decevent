import puppeteer from "@cloudflare/puppeteer";

async function sendTelegramPhoto(env, pngBytes, caption) {
  const token = env.TELEGRAM_BOT_TOKEN;
  const chatId = env.TELEGRAM_CHAT_ID;
  const topicId = env.TELEGRAM_TOPIC_ID;
  
  if (!token || !chatId) return;

  const form = new FormData();
  form.append("chat_id", String(chatId));
  if (topicId) form.append("message_thread_id", String(topicId));
  if (caption) form.append("caption", caption);

  form.append("photo", new Blob([pngBytes], { type: "image/png" }), "share.png");

  const r = await fetch(`https://api.telegram.org/bot${token}/sendPhoto`, {
    method: "POST",
    body: form
  });

  const t = await r.text();
  if (!r.ok) throw new Error("Telegram sendPhoto failed: " + t);
}

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);

  const date = url.searchParams.get("date");      // YYYY-MM-DD
  const limit = url.searchParams.get("limit") || "10";

  // Use your production domain here (recommended),
  // or build from request origin:
  const origin = url.origin;

  const shareUrl = `${origin}/share-card.html?date=${encodeURIComponent(date || "")}&limit=${encodeURIComponent(limit)}`;

  const browser = await puppeteer.launch(env.BROWSER);
  const page = await browser.newPage();

  // MATCH your frame image size (your PNG is 1080x1483)
  await page.setViewport({ width: 1080, height: 1483, deviceScaleFactor: 2 });

  await page.goto(shareUrl, { waitUntil: "networkidle0" });

  // Small wait to ensure fonts/table render
  await page.waitForTimeout(300);

  const png = await page.screenshot({ type: "png" });

  await page.close();
  await browser.close();

  const caption =
    `📊 Daily Turnover Challenge\n` +
    `Date (UTC-6): ${date || "today"}\n` +
    `Top ${limit} updated ✅`;

  await sendTelegramPhoto(env, png, caption);

  return new Response(JSON.stringify({ ok: true, shareUrl }), {
    headers: { "Content-Type": "application/json" }
  });
}
