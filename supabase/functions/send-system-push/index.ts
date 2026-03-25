// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { create, getNumericDate } from "https://deno.land/x/djwt@v2.9/mod.ts";

declare const Deno: { env: { get(name: string): string | undefined } };

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SITE_URL = Deno.env.get("SITE_URL") ?? "https://ketravelan.xyz";
const FIREBASE_SERVICE_ACCOUNT_JSON = Deno.env.get("FIREBASE_SERVICE_ACCOUNT_JSON") ?? "";
const APPLE_TEAM_ID = Deno.env.get("APPLE_TEAM_ID") ?? "";
const APPLE_KEY_ID = Deno.env.get("APPLE_KEY_ID") ?? "";
const APPLE_PRIVATE_KEY = (Deno.env.get("APPLE_PRIVATE_KEY") ?? "").replace(/\\n/g, "\n");
const APPLE_BUNDLE_ID = Deno.env.get("APPLE_BUNDLE_ID") ?? "";
const APPLE_APNS_USE_SANDBOX = (Deno.env.get("APPLE_APNS_USE_SANDBOX") ?? "false").toLowerCase() === "true";

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

function buildCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("origin") || "*";
  const allowedOrigins = new Set([
    "http://localhost:8080",
    "http://127.0.0.1:8080",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "https://ketravelan.xyz",
    "http://10.0.2.2:5173",
    "capacitor://localhost",
  ]);
  const allowOrigin = allowedOrigins.has(origin) ? origin : "*";
  const requestedHeaders = req.headers.get("access-control-request-headers");
  const allowHeaders = requestedHeaders && requestedHeaders.length > 0
    ? requestedHeaders
    : "authorization, x-client-info, apikey, content-type, prefer, x-supabase-api-version, x-requested-with";
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Headers": allowHeaders,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Expose-Headers": "content-type, content-length, etag, date",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin",
  };
}

function truncate(text: string, max = 160) {
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1)}…`;
}

function pemToArrayBuffer(pem: string) {
  const clean = pem.replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----|\n/g, "");
  const raw = atob(clean);
  const buffer = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) {
    buffer[i] = raw.charCodeAt(i);
  }
  return buffer.buffer;
}

async function getAccessToken(serviceAccount: never) {
  const now = getNumericDate(0);
  const payload = {
    iss: serviceAccount.client_email,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: getNumericDate(60 * 60),
  };

  const key = await crypto.subtle.importKey(
    "pkcs8",
    pemToArrayBuffer(serviceAccount.private_key),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const jwt = await create({ alg: "RS256", typ: "JWT" }, payload, key);

  const resp = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Failed to get access token: ${resp.status} ${text}`);
  }

  const data = await resp.json();
  return data.access_token as string;
}

async function sendFcmMessage(projectId: string, accessToken: string, token: string, payload: never) {
  const resp = await fetch(
    `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ message: { token, ...payload } }),
    },
  );

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`FCM send failed: ${resp.status} ${text}`);
  }
}

function isLikelyApnsToken(token: string) {
  return /^[A-Fa-f0-9]{64}$/.test(token);
}

function shouldDeleteTokenOnError(errorMessage: string) {
  const msg = errorMessage.toLowerCase();
  return msg.includes("unregistered")
    || msg.includes("invalidregistration")
    || msg.includes("baddevicetoken")
    || msg.includes("devicetokennotfortopic");
}

function hasApnsConfig() {
  return Boolean(APPLE_TEAM_ID && APPLE_KEY_ID && APPLE_PRIVATE_KEY && APPLE_BUNDLE_ID);
}

async function getApnsJwt() {
  const now = getNumericDate(0);
  const payload = {
    iss: APPLE_TEAM_ID,
    iat: now,
  };

  const key = await crypto.subtle.importKey(
    "pkcs8",
    pemToArrayBuffer(APPLE_PRIVATE_KEY),
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"],
  );

  return await create({ alg: "ES256", typ: "JWT", kid: APPLE_KEY_ID }, payload, key);
}

function shouldRetryAlternateApnsHost(status: number, responseText: string) {
  if (status !== 400) return false;
  const lowered = responseText.toLowerCase();
  return lowered.includes("baddevicetoken") || lowered.includes("devicetokennotfortopic");
}

async function sendApnsMessageViaHost(host: string, token: string, title: string, body: string, data: Record<string, string>, badge?: number) {
  const jwt = await getApnsJwt();
  const aps: Record<string, unknown> = {
    alert: { title, body },
    sound: "default",
  };
  // Include badge count when provided. The value is the recipient's current
  // total unread notification count, making it the authoritative source.
  if (badge !== undefined) {
    aps.badge = Math.max(0, badge);
  }
  const response = await fetch(`${host}/3/device/${token}`, {
    method: "POST",
    headers: {
      authorization: `bearer ${jwt}`,
      "apns-topic": APPLE_BUNDLE_ID,
      "apns-push-type": "alert",
      "apns-priority": "10",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      aps,
      ...data,
    }),
  });

  const text = response.ok ? "" : await response.text();
  return { ok: response.ok, status: response.status, text };
}

async function sendApnsMessage(token: string, title: string, body: string, data: Record<string, string>, badge?: number) {
  const primaryHost = APPLE_APNS_USE_SANDBOX
    ? "https://api.sandbox.push.apple.com"
    : "https://api.push.apple.com";
  const fallbackHost = APPLE_APNS_USE_SANDBOX
    ? "https://api.push.apple.com"
    : "https://api.sandbox.push.apple.com";

  const primary = await sendApnsMessageViaHost(primaryHost, token, title, body, data, badge);
  if (primary.ok) return;

  if (shouldRetryAlternateApnsHost(primary.status, primary.text)) {
    const fallback = await sendApnsMessageViaHost(fallbackHost, token, title, body, data, badge);
    if (fallback.ok) {
      console.warn("APNs send succeeded on fallback host", { primaryHost, fallbackHost });
      return;
    }
    throw new Error(`APNs send failed: ${fallback.status} ${fallback.text}`);
  }

  throw new Error(`APNs send failed: ${primary.status} ${primary.text}`);
}

function getSiteOrigin() {
  try {
    return new URL(SITE_URL).origin;
  } catch {
    const match = SITE_URL.match(/^(https?:\/\/[^/]+)/);
    return match ? match[1] : "https://ketravelan.xyz";
  }
}

interface SystemPushRequest {
  userIds: string[];
  type: string;
  title: string;
  body: string;
  actionUrl?: string;
  metadata?: Record<string, unknown>;
  priority?: "high" | "normal" | "low";
  batchKey?: string;
  batchWindowMinutes?: number;
}

serve(async (req: Request) => {
  const corsHeaders = buildCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }

  const auth = req.headers.get("authorization") || "";
  if (!auth.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
  const authToken = auth.replace("Bearer ", "").trim();
  if (authToken !== SERVICE_ROLE_KEY) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }

  try {
    const body = await req.json() as SystemPushRequest;
    const userIds = Array.isArray(body.userIds) ? body.userIds.filter(Boolean) : [];

    if (!body?.title || !body?.body || !body?.type || userIds.length === 0) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    if (!FIREBASE_SERVICE_ACCOUNT_JSON) {
      return new Response(JSON.stringify({ error: "Missing FIREBASE_SERVICE_ACCOUNT_JSON" }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const serviceAccount = JSON.parse(FIREBASE_SERVICE_ACCOUNT_JSON);
    const projectId = serviceAccount.project_id;
    if (!projectId) {
      return new Response(JSON.stringify({ error: "Missing Firebase project_id" }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const { data: recipientProfiles } = await admin
      .from("profiles")
      .select("id, push_notifications")
      .in("id", userIds);

    const pushEnabledIds = (recipientProfiles || [])
      .filter((p) => p.push_notifications !== false)
      .map((p) => p.id);

    if (pushEnabledIds.length === 0) {
      return new Response(JSON.stringify({ ok: true, skipped: true, reason: "No push-enabled recipients" }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const metadata = body.metadata ?? {};
    const actionUrl = body.actionUrl || "";
    const siteOrigin = getSiteOrigin();
    const resolvedActionUrl = actionUrl.startsWith("http") ? actionUrl : `${siteOrigin}${actionUrl}`;

    const { data: tokens } = await admin
      .from("user_push_tokens")
      .select("token, user_id, platform")
      .in("user_id", pushEnabledIds);

    const notificationsToInsert = pushEnabledIds.map((userId) => ({
      user_id: userId,
      type: body.type,
      title: body.title,
      message: truncate(body.body),
      action_url: resolvedActionUrl,
      metadata,
    }));

    await admin.from("notifications").insert(notificationsToInsert);

    // After insertion, fetch each recipient's total unread count so we can
    // set aps.badge to the authoritative value rather than a blind increment.
    // We fetch raw rows (not a count aggregate via PostgREST) and tally locally.
    const { data: unreadRows } = await admin
      .from("notifications")
      .select("user_id")
      .in("user_id", pushEnabledIds)
      .eq("read", false)
      .not("type", "in", "(new_message,message)");

    const unreadCountMap = new Map<string, number>();
    for (const row of unreadRows ?? []) {
      const uid = String((row as { user_id?: string }).user_id ?? "");
      if (uid) unreadCountMap.set(uid, (unreadCountMap.get(uid) ?? 0) + 1);
    }

    if (!tokens || tokens.length === 0) {
      return new Response(JSON.stringify({ ok: true, skipped: true, reason: "No push tokens" }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const accessToken = await getAccessToken(serviceAccount);
    const priority = body.priority === "high" ? "high" : "normal";

    const payload = {
      notification: {
        title: body.title,
        body: truncate(body.body),
      },
      data: {
        action_url: resolvedActionUrl,
        type: body.type,
        priority,
        ...Object.fromEntries(Object.entries(metadata).map(([key, value]) => [key, String(value)])),
      },
    };

    const payloadData: Record<string, string> = {
      action_url: resolvedActionUrl,
      type: body.type,
      priority,
      ...Object.fromEntries(Object.entries(metadata).map(([key, value]) => [key, String(value)])),
    };

    const sends = tokens.map(async (t) => {
      const tokenValue = String((t as { token: string }).token || "");
      const platform = String((t as { platform?: string }).platform || "").toLowerCase();
      const userId = String((t as { user_id?: string }).user_id ?? "");
      // Use backend unread count as the badge value — this is the source of truth.
      const badgeCount = unreadCountMap.get(userId) ?? 0;
      const shouldUseApns = platform === "ios" && isLikelyApnsToken(tokenValue);

      if (shouldUseApns) {
        if (!hasApnsConfig()) {
          throw new Error("APNs config missing (APPLE_TEAM_ID, APPLE_KEY_ID, APPLE_PRIVATE_KEY, APPLE_BUNDLE_ID)");
        }
        await sendApnsMessage(tokenValue, body.title, truncate(body.body), payloadData, badgeCount);
        return { provider: "apns", token: tokenValue };
      }

      // For FCM (Android + iOS FCM tokens), add the apns.payload.aps.badge
      // field so iOS sets the badge even when the app is backgrounded/killed.
      const fcmPayload = {
        ...payload,
        apns: {
          payload: {
            aps: { badge: badgeCount },
          },
        },
      };

      await sendFcmMessage(projectId, accessToken, tokenValue, fcmPayload);
      return { provider: "fcm", token: tokenValue };
    });

    const results = await Promise.allSettled(sends);
    const success = results.filter((r) => r.status === "fulfilled").length;
    const failed = results.length - success;
    const errors = results
      .filter((r): r is PromiseRejectedResult => r.status === "rejected")
      .map((r) => String(r.reason?.message || r.reason || "Unknown send error"))
      .slice(0, 5);

    const staleTokens = results
      .map((result, index) => ({ result, token: String((tokens[index] as { token?: string })?.token || "") }))
      .filter((entry) => entry.result.status === "rejected")
      .filter((entry) => shouldDeleteTokenOnError(String((entry.result as PromiseRejectedResult).reason?.message || (entry.result as PromiseRejectedResult).reason || "")))
      .map((entry) => entry.token)
      .filter(Boolean);

    if (staleTokens.length > 0) {
      const uniqueStaleTokens = Array.from(new Set(staleTokens));
      await admin.from("user_push_tokens").delete().in("token", uniqueStaleTokens);
    }

    const responsePayload = {
      ok: true,
      sent: success,
      failed,
      total: tokens.length,
      recipients: userIds.length,
      push_enabled_recipients: pushEnabledIds.length,
      token_routing: {
        ios: tokens.filter((t) => String((t as { platform?: string }).platform || "").toLowerCase() === "ios").length,
        android: tokens.filter((t) => String((t as { platform?: string }).platform || "").toLowerCase() === "android").length,
        web: tokens.filter((t) => String((t as { platform?: string }).platform || "").toLowerCase() === "web").length,
      },
      stale_tokens_pruned: staleTokens.length,
      errors,
    };

    console.log("[send-system-push] delivery-result", JSON.stringify(responsePayload));

    return new Response(JSON.stringify(responsePayload), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unexpected error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
