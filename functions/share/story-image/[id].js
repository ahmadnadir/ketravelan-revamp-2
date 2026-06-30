const DEFAULT_SUPABASE_URL = "https://sspvqhleqlycsiniywkg.supabase.co";
const DEFAULT_SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNzcHZxaGxlcWx5Y3Npbml5d2tnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc0MDU4NjEsImV4cCI6MjA4Mjk4MTg2MX0.yMDAvpxbvfhcCXNtiPnMg8z5DL-yNixNND4naGPZBXw";

function getSupabaseConfig(env) {
  const url = env?.SUPABASE_URL || env?.VITE_SUPABASE_URL || DEFAULT_SUPABASE_URL;
  const key = env?.SUPABASE_ANON_KEY || env?.VITE_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY;

  return {
    url: String(url || "").replace(/\/+$/, ""),
    key: String(key || ""),
  };
}

async function fetchStoryCover(rawId, env) {
  const id = String(rawId || "").trim();
  if (!id) return null;

  const { url, key } = getSupabaseConfig(env);
  if (!url || !key) return null;

  const endpoint = `${url}/rest/v1/stories?select=slug,cover_image_url&slug=eq.${encodeURIComponent(id)}&limit=1`;

  try {
    const response = await fetch(endpoint, {
      headers: {
        apikey: key,
        authorization: `Bearer ${key}`,
        accept: "application/json",
      },
    });

    if (!response.ok) return null;
    const rows = await response.json();
    return Array.isArray(rows) ? rows[0] || null : null;
  } catch {
    return null;
  }
}

function decodeDataUrlImage(dataUrl) {
  const raw = String(dataUrl || "").trim();
  const match = raw.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
  if (!match) return null;

  const mime = match[1].toLowerCase();
  const base64 = match[2];

  try {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return { mime, bytes };
  } catch {
    return null;
  }
}

export async function onRequest(context) {
  const id = String(context.params?.id || "").trim();
  const origin = new URL(context.request.url).origin;
  const fallback = `${origin}/ketravelan_icon.jpeg`;

  const story = await fetchStoryCover(id, context.env);
  const cover = String(story?.cover_image_url || "").trim();

  if (!cover) {
    return Response.redirect(fallback, 302);
  }

  if (/^https?:\/\//i.test(cover)) {
    return Response.redirect(cover, 302);
  }

  if (cover.startsWith("/")) {
    return Response.redirect(`${origin}${cover}`, 302);
  }

  const decoded = decodeDataUrlImage(cover);
  if (!decoded) {
    return Response.redirect(fallback, 302);
  }

  return new Response(decoded.bytes, {
    headers: {
      "content-type": decoded.mime,
      "cache-control": "public, max-age=86400",
    },
  });
}
