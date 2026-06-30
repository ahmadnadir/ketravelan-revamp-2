const DEFAULT_SUPABASE_URL = "https://sspvqhleqlycsiniywkg.supabase.co";
const DEFAULT_SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJIUzI1NiIsInJlZiI6InNzcHZxaGxlcWx5Y3Npbml5d2tnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc0MDU4NjEsImV4cCI6MjA4Mjk4MTg2MX0.yMDAvpxbvfhcCXNtiPnMg8z5DL-yNixNND4naGPZBXw";

function getSupabaseConfig(env) {
  return {
    url: String(env?.SUPABASE_URL || env?.VITE_SUPABASE_URL || DEFAULT_SUPABASE_URL).replace(/\/+$/, ""),
    key: String(env?.SUPABASE_ANON_KEY || env?.VITE_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY),
  };
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=UTF-8" },
  });
}

async function getUser(token, env) {
  const { url, key } = getSupabaseConfig(env);
  const response = await fetch(`${url}/auth/v1/user`, {
    headers: {
      apikey: key,
      authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    return null;
  }

  return response.json();
}

export async function onRequestPost(context) {
  const authHeader = context.request.headers.get("authorization") || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!token) {
    return json({ error: "Unauthorized" }, 401);
  }

  const user = await getUser(token, context.env);
  if (!user?.id) {
    return json({ error: "Unauthorized" }, 401);
  }

  let body;
  try {
    body = await context.request.json();
  } catch {
    return json({ error: "Invalid JSON payload" }, 400);
  }

  const blockedUserId = String(body?.blockedUserId || "").trim();
  const blockedAt = body?.blockedAt || new Date().toISOString();

  if (!blockedUserId || blockedUserId === user.id) {
    return json({ error: "Invalid blocked user" }, 400);
  }

  const { url, key } = getSupabaseConfig(context.env);
  const response = await fetch(`${url}/rest/v1/blocked_users?on_conflict=user_id,blocked_user_id`, {
    method: "POST",
    headers: {
      apikey: key,
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
      prefer: "resolution=ignore-duplicates,return=representation",
    },
    body: JSON.stringify([
      {
        user_id: user.id,
        blocked_user_id: blockedUserId,
        reason: "Blocked from moderation menu",
        created_at: blockedAt,
      },
    ]),
  });

  if (!response.ok) {
    const errorText = await response.text();
    return json({ error: errorText || "Unable to block user" }, 400);
  }

  const data = await response.json().catch(() => []);
  return json({ success: true, record: Array.isArray(data) ? data[0] ?? null : data });
}

export function onRequest(context) {
  if (context.request.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  return onRequestPost(context);
}