const DEFAULT_OG_IMAGE = "https://ketravelan.xyz/ketravelan_icon.jpeg";
const DEFAULT_SUPABASE_URL = "https://sspvqhleqlycsiniywkg.supabase.co";
const DEFAULT_SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNzcHZxaGxlcWx5Y3Npbml5d2tnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc0MDU4NjEsImV4cCI6MjA4Mjk4MTg2MX0.yMDAvpxbvfhcCXNtiPnMg8z5DL-yNixNND4naGPZBXw";

const BOT_UA_PATTERN = /(facebookexternalhit|twitterbot|linkedinbot|slackbot|discordbot|telegrambot|skypeuripreview|googlebot|bingbot|applebot)/i;

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function normalizeText(value, fallback = "") {
  const text = String(value || "").trim();
  return text || fallback;
}

function getSupabaseConfig(env) {
  const url =
    env?.SUPABASE_URL ||
    env?.VITE_SUPABASE_URL ||
    DEFAULT_SUPABASE_URL;
  const key =
    env?.SUPABASE_ANON_KEY ||
    env?.VITE_SUPABASE_ANON_KEY ||
    DEFAULT_SUPABASE_ANON_KEY;

  return {
    url: String(url || "").replace(/\/+$/, ""),
    key: String(key || ""),
  };
}

async function fetchTripMeta(id, env) {
  const { url, key } = getSupabaseConfig(env);
  if (!url || !key) return null;

  const headers = {
    apikey: key,
    authorization: `Bearer ${key}`,
    accept: "application/json",
  };

  const select = "title,destination,description,cover_image,slug";
  const encodedId = encodeURIComponent(id);

  const candidates = [
    `${url}/rest/v1/trips?select=${select}&id=eq.${encodedId}&limit=1`,
    `${url}/rest/v1/trips?select=${select}&slug=eq.${encodedId}&limit=1`,
  ];

  for (const endpoint of candidates) {
    try {
      const response = await fetch(endpoint, { headers });
      if (!response.ok) continue;
      const rows = await response.json();
      if (Array.isArray(rows) && rows.length > 0) {
        return rows[0];
      }
    } catch (error) {
      // Ignore and continue with fallback query
    }
  }

  return null;
}

function buildOgHtml({ title, description, image, tripUrl }) {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(title)}</title>
    <meta name="description" content="${escapeHtml(description)}" />
    <link rel="canonical" href="${escapeHtml(tripUrl)}" />
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="Ketravelan" />
    <meta property="og:title" content="${escapeHtml(title)}" />
    <meta property="og:description" content="${escapeHtml(description)}" />
    <meta property="og:url" content="${escapeHtml(tripUrl)}" />
    <meta property="og:image" content="${escapeHtml(image)}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${escapeHtml(title)}" />
    <meta name="twitter:description" content="${escapeHtml(description)}" />
    <meta name="twitter:image" content="${escapeHtml(image)}" />
  </head>
  <body>
    <p>Open this trip: <a href="${escapeHtml(tripUrl)}">${escapeHtml(tripUrl)}</a></p>
  </body>
</html>`;
}

export async function onRequest(context) {
  const request = context.request;
  const userAgent = request.headers.get("user-agent") || "";
  const isBot = BOT_UA_PATTERN.test(userAgent);

  if (!isBot) {
    // Let Cloudflare Pages continue normal static routing (_redirects handles SPA fallback).
    return context.next();
  }

  const requestUrl = new URL(request.url);
  const id = String(context.params?.id || "").trim();
  const tripPath = `/trip/${encodeURIComponent(id)}`;
  const tripUrl = `${requestUrl.origin}${tripPath}`;

  const trip = await fetchTripMeta(id, context.env);

  const destination = normalizeText(trip?.destination);
  const title = normalizeText(trip?.title, destination ? `Trip to ${destination}` : "Ketravelan Trip");
  const description = normalizeText(
    trip?.description,
    destination ? `Trip to ${destination}.` : "Trip details and itinerary."
  );
  const image = normalizeText(trip?.cover_image, DEFAULT_OG_IMAGE);

  const html = buildOgHtml({ title, description, image, tripUrl });

  return new Response(html, {
    headers: {
      "content-type": "text/html; charset=UTF-8",
      "cache-control": "public, max-age=300",
    },
  });
}
