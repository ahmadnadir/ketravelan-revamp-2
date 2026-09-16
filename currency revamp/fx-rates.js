/**
 * Cloudflare Pages Function – FX rate proxy
 * Route: GET /api/fx-rates?from=MYR            (all currencies, base MYR)
 *        GET /api/fx-rates?from=MYR&to=JPY,SAR (only these currencies)
 *
 * Calls Frankfurter v2 (205 currencies from many central banks) server-side,
 * then returns the SAME shape the app already reads from v1:
 *   { amount: 1, base: "MYR", date: "2026-09-15", rates: { JPY: 32.1, SAR: 0.89, ... } }
 * so no frontend change is needed.
 *
 * v1 -> v2 differences handled here:
 *   - host/path: api.frankfurter.app/latest  ->  api.frankfurter.dev/v2/rates
 *   - base param: ?from=MYR                   ->  ?base=MYR   (in v2, "from" means a START DATE)
 *   - target param: ?to=JPY                   ->  ?quotes=JPY
 *   - response: nested { rates: {...} }       ->  flat array [{ date, base, quote, rate }]
 */

const UPSTREAM = "https://api.frankfurter.dev/v2/rates";
const CACHE_TTL = 3600; // seconds – Cloudflare edge cache for 1 hour

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function json(body, status, extraHeaders = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders, ...extraHeaders },
  });
}

// Turn the v2 flat array into the v1-style object the app expects
function toV1Shape(rows, base) {
  const rates = {};
  let latestDate = null;
  for (const row of Array.isArray(rows) ? rows : []) {
    if (!row || typeof row.rate !== "number" || !Number.isFinite(row.rate) || row.rate <= 0) continue;
    const quote = String(row.quote || "").toUpperCase();
    if (!quote || quote === base) continue;
    rates[quote] = row.rate;
    if (row.date && (!latestDate || row.date > latestDate)) latestDate = row.date;
  }
  return { amount: 1, base, date: latestDate, rates };
}

export async function onRequestGet({ request }) {
  const incoming = new URL(request.url);
  const base = (incoming.searchParams.get("from") || "MYR").trim().toUpperCase();
  const to = incoming.searchParams.get("to");

  if (!/^[A-Z]{3}$/.test(base)) {
    return json({ error: "Invalid base currency" }, 400);
  }

  const upstreamUrl = new URL(UPSTREAM);
  upstreamUrl.searchParams.set("base", base);
  if (to) {
    upstreamUrl.searchParams.set("quotes", to.toUpperCase());
  }

  let upstreamResponse;
  try {
    upstreamResponse = await fetch(upstreamUrl.toString(), {
      headers: { Accept: "application/json" },
      cf: { cacheTtl: CACHE_TTL, cacheEverything: true },
    });
  } catch (err) {
    return json({ error: "Upstream fetch failed", detail: String(err) }, 502);
  }

  if (!upstreamResponse.ok) {
    return json({ error: "Upstream error", status: upstreamResponse.status }, upstreamResponse.status);
  }

  const rows = await upstreamResponse.json();
  return json(toV1Shape(rows, base), 200, { "Cache-Control": `public, max-age=${CACHE_TTL}` });
}

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: corsHeaders });
}
