import puppeteer from "@cloudflare/puppeteer";

function u8ToBase64(u8) {
  let s = "";
  for (let i = 0; i < u8.length; i++) s += String.fromCharCode(u8[i]);
  return btoa(s);
}

/**
 * Returns PNG bytes of the leaderboard ranking list framed into /frame.png
 */
export async function makeFramedRankingPng(env) {
  const TARGET_URL = "https://decevent.pages.dev/";         // your frontend
  const FRAME_URL  = "https://decevent.pages.dev/frame.png"; // already in your repo

  // 1) capture ranking only
  const browser1 = await puppeteer.launch(env.BROWSER);
  const page1 = await browser1.newPage();

  await page1.setViewport({ width: 1200, height: 900, deviceScaleFactor: 1 });
  await page1.goto(TARGET_URL, { waitUntil: "domcontentloaded" });
  await page1.waitForTimeout(1200);

  // freeze animations
  await page1.addStyleTag({
    content: `*,*::before,*::after{animation:none!important;transition:none!important;}`
  });

  const rankingEl = await page1.waitForSelector("#rankingList", { timeout: 15000 });
  const rankingPng = await rankingEl.screenshot({ type: "png" });

  await browser1.close();

  // 2) compose into frame (1080x1350)
  const browser2 = await puppeteer.launch(env.BROWSER);
  const page2 = await browser2.newPage();

  await page2.setViewport({ width: 1080, height: 1350, deviceScaleFactor: 1 });

  const rankingBase64 = u8ToBase64(new Uint8Array(rankingPng));
  const rankingDataUrl = `data:image/png;base64,${rankingBase64}`;

  // Adjust these if you want the ranking image bigger/smaller inside the frame.
  const SLOT = { x: 160, y: 380, w: 760, h: 900 };

  const html = `
  <!doctype html>
  <html>
  <head>
    <meta charset="utf-8" />
    <style>
      html, body { margin:0; padding:0; width:1080px; height:1350px; overflow:hidden; background:#000; }
      .stage { position:relative; width:1080px; height:1350px; }
      .frame { position:absolute; inset:0; width:1080px; height:1350px; }
      .slot {
        position:absolute;
        left:${SLOT.x}px; top:${SLOT.y}px;
        width:${SLOT.w}px; height:${SLOT.h}px;
        display:flex; align-items:center; justify-content:center;
        overflow:hidden;
        border-radius:40px;
      }
      .slot img { width:100%; height:100%; object-fit:contain; }
    </style>
  </head>
  <body>
    <div class="stage">
      <div class="slot"><img src="${rankingDataUrl}"></div>
      <img class="frame" src="${FRAME_URL}">
    </div>
  </body>
  </html>
  `;

  await page2.setContent(html, { waitUntil: "load" });
  await page2.waitForTimeout(200);

  const finalPng = await page2.screenshot({ type: "png" });

  await browser2.close();
  return finalPng; // Uint8Array
}

/**
 * (Optional endpoint) If you visit /api-share-screenshot it returns the framed image
 */
export async function onRequestGet(context) {
  const png = await makeFramedRankingPng(context.env);
  return new Response(png, { headers: { "Content-Type": "image/png" } });
}
