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

function buildTripPath(id) {
  return `/trip/${encodeURIComponent(String(id || "").trim())}`;
}

function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(value || "").trim());
}

function getSupabaseConfig(env) {
  const url = env?.SUPABASE_URL || env?.VITE_SUPABASE_URL || DEFAULT_SUPABASE_URL;
  const key = env?.SUPABASE_ANON_KEY || env?.VITE_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY;

  return {
    url: String(url || "").replace(/\/+$/, ""),
    key: String(key || ""),
  };
}

async function resolveTripIdentifier(rawId, env) {
  const id = String(rawId || "").trim();
  if (!id) return id;

  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
  if (isUuid) return id;

  const { url, key } = getSupabaseConfig(env);
  if (!url || !key) return id;

  try {
    const endpoint = `${url}/rest/v1/trips?select=id&slug=eq.${encodeURIComponent(id)}&limit=1`;
    const response = await fetch(endpoint, {
      headers: {
        apikey: key,
        authorization: `Bearer ${key}`,
        accept: "application/json",
      },
    });

    if (!response.ok) return id;

    const rows = await response.json();
    if (Array.isArray(rows) && rows[0]?.id) {
      return String(rows[0].id);
    }
  } catch (error) {
    // Ignore lookup issues and keep original identifier.
  }

  return id;
}

async function fetchTripMeta(rawId, env) {
  const id = String(rawId || "").trim();
  if (!id) return null;

  const { url, key } = getSupabaseConfig(env);
  if (!url || !key) return null;

  const headers = {
    apikey: key,
    authorization: `Bearer ${key}`,
    accept: "application/json",
  };

  const select = "id,slug,title,destination,description,cover_image";
  const lookup = isUuid(id) ? `id=eq.${encodeURIComponent(id)}` : `slug=eq.${encodeURIComponent(id)}`;
  const endpoint = `${url}/rest/v1/trips?select=${select}&${lookup}&limit=1`;

  try {
    const response = await fetch(endpoint, { headers });
    if (!response.ok) return null;

    const rows = await response.json();
    if (Array.isArray(rows) && rows[0]) return rows[0];
  } catch {
    // Ignore and fallback to defaults
  }

  return null;
}

function extractUuidFromText(value) {
  const text = String(value || "");
  const match = text.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
  return match ? match[0] : null;
}

function titleFromIdentifier(value) {
  const raw = String(value || "").trim();
  if (!raw || isUuid(raw)) return "Ketravelan Trip";

  return raw
    .split("-")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ") || "Ketravelan Trip";
}

export async function onRequest(context) {
  const requestUrl = new URL(context.request.url);
  const origin = requestUrl.origin;
  const id = context.params?.id || "";
  const queryTripId = requestUrl.searchParams.get("tripId") || requestUrl.searchParams.get("trip_id");
  const imageParam = requestUrl.searchParams.get("image") || "";
  const extractedTripUuid = extractUuidFromText(queryTripId) || extractUuidFromText(imageParam);
  const baseIdentifier = extractedTripUuid || String(id || "").trim();
  const resolvedId = await resolveTripIdentifier(baseIdentifier, context.env);
  const tripMeta = await fetchTripMeta(resolvedId || baseIdentifier, context.env);

  const destination = String(tripMeta?.destination || "").trim();
  const descriptionFromQuery = String(requestUrl.searchParams.get("d") || "").trim();
  const title = String(tripMeta?.title || "").trim() || titleFromIdentifier(baseIdentifier);
  const description = descriptionFromQuery || String(tripMeta?.description || "").trim() ||
    (destination ? `Trip to ${destination}.` : "Trip details and itinerary.");
  const image = String(tripMeta?.cover_image || "").trim() || DEFAULT_OG_IMAGE;

  const canonicalIdentifier = String(tripMeta?.slug || resolvedId || baseIdentifier || "").trim();
  const tripPath = buildTripPath(canonicalIdentifier);
  const tripUrl = `${origin}${tripPath}`;

  const userAgent = context.request.headers.get("user-agent") || "";
  const isBot = BOT_UA_PATTERN.test(userAgent);

  if (!isBot) {
    // Let React Router handle /share/trip/:id directly for human users.
    return context.next();
  }

  const html = `<!doctype html>
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

  return new Response(html, {
    headers: {
      "content-type": "text/html; charset=UTF-8",
      "cache-control": "public, max-age=300",
    },
  });
}
