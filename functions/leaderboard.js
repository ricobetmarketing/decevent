// functions/leaderboard.js

// ---- CONFIG ----
const BR_RATE = 5;   // 1 USD = BRL 5
const MX_RATE = 18;  // 1 USD = MXN 18

const BR_FLAG_URL = "https://ricobr.ft-crm.com/media-api/serve/f6b3499e-2692-4d6e-b86d-58d1c55b6d5f_brazil.png";
const MX_FLAG_URL = "https://ricobr.ft-crm.com/media-api/serve/b132c7fc-2f90-4bda-82de-78223c5c3725_mexico.png";

// Slot order (cumulative windows in Mexico time: 00:00–02:00, 00:00–04:00, etc)
const SLOT_ORDER = [
  "00-02",
  "00-04",
  "00-06",
  "00-08",
  "00-10",
  "00-12",
  "00-14",
  "00-16",
  "00-18",
  "00-20",
  "00-22",
  "00-24"
];

const SLOT_INDEX = SLOT_ORDER.reduce((map, key, idx) => {
  map[key] = idx;
  return map;
}, {});

// 👉 TEMPORARY in-memory store (resets on deploy / restart).
// For production we’ll replace this with KV / D1 later.
const memoryStore = {
  // rawSlotData[date][country][slot] = [{ username, turnover, earlyAdjust }]
  rawSlotData: {},
  // dailyRows[date] = [{ date, rank, username, turnover (USD), flagUrl }]
  dailyRows: {}
};

function flagUrlForCountry(country) {
  const c = (country || "").toUpperCase();
  if (c === "BR") return BR_FLAG_URL;
  if (c === "MX") return MX_FLAG_URL;
  return "";
}

function toUsd(country, netAmount) {
  if (country === "BR") return netAmount / BR_RATE;
  if (country === "MX") return netAmount / MX_RATE;
  return netAmount;
}

/**
 * Rebuild the daily leaderboard for a given date.
 * - Uses the LATEST cumulative slot per username per country.
 * - For Brazil, subtracts earlyAdjust (00:00–03:00 BR local) if provided.
 * - Outputs USD values for combined BR + MX ranking.
 */
function rebuildDailyLeaderboard(date) {
  const byDate = memoryStore.rawSlotData[date] || {};
  const countries = Object.keys(byDate); // e.g. ["BR","MX"]

  // usernameLower -> latest snapshot
  const playerState = new Map();

  for (const country of countries) {
    const bySlot = byDate[country] || {};

    for (const [slotKey, records] of Object.entries(bySlot)) {
      const slotIndex = SLOT_INDEX[slotKey] ?? -1;

      for (const rec of records) {
        const username = (rec.username || "").trim();
        if (!username) continue;

        const totalTurnover = Number(rec.turnover || 0);   // cumulative total (in local currency)
        const earlyAdjust = Number(rec.earlyAdjust || 0);  // only for Brazil 00:00–03:00
        const key = username.toLowerCase();

        const existing = playerState.get(key) || {
          username,
          country,
          totalTurnover: 0,
          earlyAdjust: 0,
          slotIndex: -1
        };

        // Because each slot is cumulative (00–02, 00–04, ...),
        // keep only the *latest* slot for that player.
        if (slotIndex > existing.slotIndex) {
          existing.username = username;
          existing.country = country;
          existing.totalTurnover = totalTurnover;
          existing.earlyAdjust = earlyAdjust; // last known 00:00–03:00 value
          existing.slotIndex = slotIndex;
        }

        playerState.set(key, existing);
      }
    }
  }

  // Build rows with Brazil minus logic + USD conversion
  const rows = Array.from(playerState.values()).map((p) => {
    let net = p.totalTurnover;

    if (p.country === "BR") {
      // subtract daily 00:00–03:00 (Brazil local) turnover if provided
      if (Number.isFinite(p.earlyAdjust) && p.earlyAdjust > 0) {
        net = net - p.earlyAdjust;
      }
      if (net < 0) net = 0;
    }

    const usd = toUsd(p.country, net);

    return {
      date,
      rank: 0, // temp, assign below
      username: p.username,
      turnover: Number(usd.toFixed(2)),
      flagUrl: flagUrlForCountry(p.country)
    };
  });

  // Sort by USD turnover desc & assign rank
  rows.sort((a, b) => b.turnover - a.turnover);
  rows.forEach((r, idx) => (r.rank = idx + 1));

  memoryStore.dailyRows[date] = rows;
}

// ---- API HANDLERS ----

// GET /api/leaderboard?date=YYYY-MM-DD  → used by frontend
async function handleGetLeaderboard(request) {
  const url = new URL(request.url);
  const date = url.searchParams.get("date");

  if (!date) {
    return new Response(JSON.stringify({ error: "Missing date" }), {
      status: 400,
      headers: { "Content-Type": "application/json" }
    });
  }

  const rows = memoryStore.dailyRows[date] || [];
  return new Response(JSON.stringify({ date, rows }), {
    headers: { "Content-Type": "application/json" }
  });
}

// POST /admin/leaderboard  → used by your internal backend page
// Body:
// {
//   "date": "2025-12-10",
//   "country": "BR" | "MX",
//   "slot": "00-02" | "00-04" | ... | "00-24",
//   "records": [
//     { "username": "fabiano", "turnover": 2500.5, "earlyAdjust": 200.0 }
//   ]
// }
async function handlePostAdmin(request) {
  const body = await request.json().catch(() => null);

  if (
    !body ||
    !body.date ||
    !body.country ||
    !body.slot ||
    !Array.isArray(body.records)
  ) {
    return new Response(JSON.stringify({ error: "Invalid payload" }), {
      status: 400,
      headers: { "Content-Type": "application/json" }
    });
  }

  const date = String(body.date);
  const country = String(body.country).toUpperCase();
  const slot = String(body.slot);

  if (!SLOT_INDEX.hasOwnProperty(slot)) {
    return new Response(JSON.stringify({ error: "Invalid slot key" }), {
      status: 400,
      headers: { "Content-Type": "application/json" }
    });
  }

  // Initialise storage for this date & country
  if (!memoryStore.rawSlotData[date]) memoryStore.rawSlotData[date] = {};
  if (!memoryStore.rawSlotData[date][country]) memoryStore.rawSlotData[date][country] = {};

  // Overwrite this slot's records
  memoryStore.rawSlotData[date][country][slot] = body.records.map((r) => ({
    username: String(r.username || "").trim(),
    turnover: Number(r.turnover || 0),
    earlyAdjust: Number(r.earlyAdjust || 0)
  }));

  // Rebuild combined BR+MX leaderboard for the date
  rebuildDailyLeaderboard(date);

  const totalPlayers = memoryStore.dailyRows[date]?.length || 0;

  return new Response(
    JSON.stringify({
      ok: true,
      date,
      country,
      slot,
      totalPlayers
    }),
    {
      headers: { "Content-Type": "application/json" }
    }
  );
}

export async function onRequest(context) {
  const { request } = context;
  const url = new URL(request.url);

  if (request.method === "GET" && url.pathname === "/api/leaderboard") {
    return handleGetLeaderboard(request);
  }

  if (request.method === "POST" && url.pathname === "/admin/leaderboard") {
    // Protect with Cloudflare Access in dashboard (emails) later
    return handlePostAdmin(request);
  }

  return new Response("Not found", { status: 404 });
}
