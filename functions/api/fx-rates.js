/**
 * Cloudflare Pages Function – FX rate proxy
 * Route: GET /api/fx-rates?from=MYR
 *
 * Proxies requests to api.frankfurter.app server-side so the browser is never
 * blocked by a CORS policy from the third-party service.
 */

const UPSTREAM = "https://api.frankfurter.app";
const CACHE_TTL = 3600; // seconds – Cloudflare edge cache for 1 hour

export async function onRequestGet({ request }) {
  const incoming = new URL(request.url);
  const from = incoming.searchParams.get("from") || "MYR";
  const to = incoming.searchParams.get("to") || null;

  const upstreamUrl = new URL(`${UPSTREAM}/latest`);
  upstreamUrl.searchParams.set("from", from);
  if (to) {
    upstreamUrl.searchParams.set("to", to);
  }

  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  let upstreamResponse;
  try {
    upstreamResponse = await fetch(upstreamUrl.toString(), {
      cf: {
        cacheTtl: CACHE_TTL,
        cacheEverything: true,
      },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: "Upstream fetch failed", detail: String(err) }), {
      status: 502,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }

  if (!upstreamResponse.ok) {
    return new Response(JSON.stringify({ error: "Upstream error", status: upstreamResponse.status }), {
      status: upstreamResponse.status,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }

  const data = await upstreamResponse.json();

  return new Response(JSON.stringify(data), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": `public, max-age=${CACHE_TTL}`,
      ...corsHeaders,
    },
  });
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
