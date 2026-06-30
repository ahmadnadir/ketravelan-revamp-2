const DEFAULT_OG_IMAGE = "https://ketravelan.com/ketravelan_icon.jpeg";
const DEFAULT_SUPABASE_URL = "https://sspvqhleqlycsiniywkg.supabase.co";
const DEFAULT_SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNzcHZxaGxlcWx5Y3Npbml5d2tnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc0MDU4NjEsImV4cCI6MjA4Mjk4MTg2MX0.yMDAvpxbvfhcCXNtiPnMg8z5DL-yNixNND4naGPZBXw";

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}



function normalizeImageUrl(image, origin) {
  const raw = String(image || "").trim();
  if (!raw) return "";

  if (raw.startsWith("data:image/")) return "";

  // Already absolute URL
  if (/^https?:\/\//i.test(raw)) return raw;
  
  // Relative path
  if (raw.startsWith("/")) return `${origin}${raw}`;
  
  // Supabase storage path - try to build absolute URL
  if (raw.includes("storage") || raw.includes("bucket")) {
    if (/^https?:\/\//i.test(raw)) return raw;
    return `${origin}${raw.startsWith("/") ? "" : "/"}${raw}`;
  }

  return "";
}

function buildProxyImageUrl(slugOrId, origin) {
  const key = String(slugOrId || "").trim();
  if (!key) return "";
  return `${origin}/share/story-image/${encodeURIComponent(key)}`;
}

function extractFirstHttpImage(value) {
  const regex = /https?:\/\/[^\s"'<>]+/g;

  const fromString = (text) => {
    if (!text) return "";
    const matches = String(text).match(regex) || [];
    return matches.find((url) => /\.(png|jpe?g|webp|gif|avif)(\?|$)/i.test(url) || url.includes("/storage/")) || "";
  };

  const walk = (node) => {
    if (!node) return "";
    if (typeof node === "string") return fromString(node);
    if (Array.isArray(node)) {
      for (const item of node) {
        const found = walk(item);
        if (found) return found;
      }
      return "";
    }
    if (typeof node === "object") {
      for (const key of Object.keys(node)) {
        const found = walk(node[key]);
        if (found) return found;
      }
    }
    return "";
  };

  return walk(value);
}

function getSupabaseConfig(env) {
  const url = env?.SUPABASE_URL || env?.VITE_SUPABASE_URL || DEFAULT_SUPABASE_URL;
  const key = env?.SUPABASE_ANON_KEY || env?.VITE_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY;

  return {
    url: String(url || "").replace(/\/+$/, ""),
    key: String(key || ""),
  };
}

async function fetchStoryMeta(id, env) {
  const { url, key } = getSupabaseConfig(env);
  if (!url || !key) return null;

  const headers = {
    apikey: key,
    authorization: `Bearer ${key}`,
    accept: "application/json",
  };

  const select = "id,slug,title,excerpt,cover_image_url,content";
  const endpoint = `${url}/rest/v1/stories?select=${select}&slug=eq.${encodeURIComponent(id)}&limit=1`;

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

function titleFromSlug(value) {
  const raw = String(value || "").trim();
  if (!raw) return "Ketravelan Story";

  return raw
    .split("-")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ") || "Ketravelan Story";
}

export async function onRequest(context) {
  const requestUrl = new URL(context.request.url);
  const origin = requestUrl.origin;
  const id = context.params?.id || "";
  const storyMeta = await fetchStoryMeta(id, context.env);

  const title = String(storyMeta?.title || "").trim() || titleFromSlug(id);
  const excerpt = String(storyMeta?.excerpt || "").trim() ||
    "Check out this story on Ketravelan";
  const coverImage = normalizeImageUrl(storyMeta?.cover_image_url, origin);
  const contentImage = normalizeImageUrl(extractFirstHttpImage(storyMeta?.content), origin);
  const storySlug = String(storyMeta?.slug || id || "").trim();
  const proxyImage = buildProxyImageUrl(storySlug || id, origin);
  const image = coverImage || contentImage || proxyImage || DEFAULT_OG_IMAGE;
  const storyPath = `/community/stories/${encodeURIComponent(storySlug)}`;
  const storyUrl = `${origin}${storyPath}`;

  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(title)}</title>
    <meta name="description" content="${escapeHtml(excerpt)}" />
    <link rel="canonical" href="${escapeHtml(storyUrl)}" />
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="Ketravelan" />
    <meta property="og:title" content="${escapeHtml(title)}" />
    <meta property="og:description" content="${escapeHtml(excerpt)}" />
    <meta property="og:url" content="${escapeHtml(storyUrl)}" />
    <meta property="og:image" content="${escapeHtml(image)}" />
    <meta property="og:image:secure_url" content="${escapeHtml(image)}" />
    <meta property="og:image:alt" content="${escapeHtml(title)}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${escapeHtml(title)}" />
    <meta name="twitter:description" content="${escapeHtml(excerpt)}" />
    <meta name="twitter:image" content="${escapeHtml(image)}" />
    <script>
      window.location.replace(${JSON.stringify(storyUrl)});
    </script>
  </head>
  <body>
    <p>Redirecting to <a href="${escapeHtml(storyUrl)}">${escapeHtml(storyUrl)}</a></p>
  </body>
</html>`;

  return new Response(html, {
    headers: {
      "content-type": "text/html; charset=UTF-8",
      "cache-control": "public, max-age=300",
    },
  });
}
