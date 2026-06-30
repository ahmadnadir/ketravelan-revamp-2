const DEFAULT_SUPABASE_URL = "https://sspvqhleqlycsiniywkg.supabase.co";
const DEFAULT_SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJIUzI1NiIsInJlZiI6InNzcHZxaGxlcWx5Y3Npbml5d2tnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc0MDU4NjEsImV4cCI6MjA4Mjk4MTg2MX0.yMDAvpxbvfhcCXNtiPnMg8z5DL-yNixNND4naGPZBXw";

const TYPE_MAP = {
  TRIP: "trip",
  STORY: "story",
  DISCUSSION: "discussion",
  TRIP_CHAT: "trip_chat_message",
  DIRECT_CHAT: "direct_chat_message",
  USER: "user_profile",
};

const REASONS = new Set([
  "spam",
  "harassment",
  "hate_speech",
  "inappropriate",
  "scam_or_fraud",
  "violence",
  "other",
]);

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

  const reportType = TYPE_MAP[String(body?.reportType || "").toUpperCase()];
  const targetId = String(body?.targetId || "").trim();
  const reportedUserId = String(body?.reportedUserId || "").trim();
  const reason = String(body?.reason || "").trim();
  const description = String(body?.description || "").trim();
  const reportedAt = body?.reportedAt || new Date().toISOString();

  if (!reportType || !targetId || !reportedUserId || !REASONS.has(reason)) {
    return json({ error: "Missing or invalid report payload" }, 400);
  }

  const { url, key } = getSupabaseConfig(context.env);
  const insertResponse = await fetch(`${url}/rest/v1/reports`, {
    method: "POST",
    headers: {
      apikey: key,
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
      prefer: "return=representation",
    },
    body: JSON.stringify([
      {
        reporter_id: user.id,
        content_type: reportType,
        content_id: targetId,
        reported_user_id: reportedUserId,
        reason,
        description,
        details: description,
        reported_at: reportedAt,
      },
    ]),
  });

  if (!insertResponse.ok) {
    const errorText = await insertResponse.text();
    return json({ error: errorText || "Unable to store report" }, 400);
  }

  const data = await insertResponse.json();
  return json({ success: true, report: Array.isArray(data) ? data[0] : data });
}

export function onRequest(context) {
  if (context.request.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  return onRequestPost(context);
}