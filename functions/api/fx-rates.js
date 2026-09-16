/**
 * Cloudflare Pages Function - FX rate proxy
 * Route: GET /api/fx-rates?from=MYR
 *        GET /api/fx-rates?from=MYR&to=JPY,SAR
 *
 * Adapts Frankfurter v2's flat response to the v1-style shape consumed by the
 * frontend, with Cloudflare edge caching to avoid repeated upstream requests.
 */

const UPSTREAM = "https://api.frankfurter.dev/v2/rates";
const CACHE_TTL = 3600;

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
  if (to) upstreamUrl.searchParams.set("quotes", to.toUpperCase());

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
  return json(toV1Shape(rows, base), 200, {
    "Cache-Control": `public, max-age=${CACHE_TTL}`,
  });
}

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: corsHeaders });
}
