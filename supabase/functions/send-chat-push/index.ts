// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { create, getNumericDate } from "https://deno.land/x/djwt@v2.9/mod.ts";

declare const Deno: { env: { get(name: string): string | undefined } };

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SITE_URL = Deno.env.get("SITE_URL") ?? "https://ketravelan.xyz";
const FIREBASE_SERVICE_ACCOUNT_JSON = Deno.env.get("FIREBASE_SERVICE_ACCOUNT_JSON") ?? "";

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

function getSiteOrigin() {
  try {
    return new URL(SITE_URL).origin;
  } catch {
    const match = SITE_URL.match(/^(https?:\/\/[^/]+)/);
    return match ? match[1] : "https://ketravelan.xyz";
  }
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

async function getAccessToken(serviceAccount: any) {
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

async function sendFcmMessage(projectId: string, accessToken: string, token: string, payload: any) {
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

interface PushRequest {
  messageId: string;
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
    const body = await req.json() as PushRequest;
    const messageId = body?.messageId;
    if (!messageId) {
      return new Response(JSON.stringify({ error: "Missing messageId" }), {
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

    const { data: message, error: msgError } = await admin
      .from("messages")
      .select("id, conversation_id, sender_id, content, attachments, created_at")
      .eq("id", messageId)
      .maybeSingle();

    if (msgError) throw msgError;
    if (!message) {
      return new Response(JSON.stringify({ ok: true, skipped: true, reason: "Message not found" }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const { data: conversation, error: convError } = await admin
      .from("conversations")
      .select("id, trip_id, conversation_type, name")
      .eq("id", message.conversation_id)
      .maybeSingle();

    if (convError) throw convError;

    const { data: senderProfile } = await admin
      .from("profiles")
      .select("id, full_name, username")
      .eq("id", message.sender_id)
      .maybeSingle();

    const senderName = senderProfile?.full_name || senderProfile?.username || "Someone";

    let tripTitle: string | null = null;
    if (conversation?.trip_id) {
      const { data: trip } = await admin
        .from("trips")
        .select("id, title")
        .eq("id", conversation.trip_id)
        .maybeSingle();
      tripTitle = trip?.title || null;
    }

    const { data: participants, error: participantsError } = await admin
      .from("conversation_participants")
      .select("user_id")
      .eq("conversation_id", message.conversation_id);

    if (participantsError) throw participantsError;

    const recipientIds = (participants || [])
      .map((p) => p.user_id)
      .filter((id) => id && id !== message.sender_id);

    if (recipientIds.length === 0) {
      return new Response(JSON.stringify({ ok: true, skipped: true, reason: "No recipients" }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const { data: recipientProfiles } = await admin
      .from("profiles")
      .select("id, push_notifications")
      .in("id", recipientIds);

    const pushEnabledIds = (recipientProfiles || [])
      .filter((p) => p.push_notifications !== false)
      .map((p) => p.id);

    const { data: tokens } = await admin
      .from("user_push_tokens")
      .select("token, user_id")
      .in("user_id", pushEnabledIds);

    const siteOrigin = getSiteOrigin();
    const isTrip = conversation?.conversation_type === "trip_group";
    const actionUrl = isTrip && conversation?.trip_id
      ? `${siteOrigin}/trip/${conversation.trip_id}/hub?tab=chat`
      : `${siteOrigin}/chat/${message.conversation_id}`;

    const attachmentArray = Array.isArray(message.attachments) ? message.attachments : [];
    const hasAttachments = attachmentArray.length > 0;
    const contentText = String(message.content || "").trim();
    const fallbackBody = hasAttachments ? "Sent an attachment" : "Sent a message";

    const title = isTrip ? (tripTitle || conversation?.name || "Trip Chat") : senderName;
    const bodyText = isTrip
      ? `${senderName}: ${contentText || fallbackBody}`
      : (contentText || fallbackBody);

    if (recipientIds.length > 0) {
      await admin.from("notifications").insert(
        recipientIds.map((userId) => ({
          user_id: userId,
          type: "new_message",
          title,
          message: truncate(bodyText),
          action_url: actionUrl,
          metadata: {
            conversation_id: message.conversation_id,
            sender_id: message.sender_id,
            trip_id: conversation?.trip_id || null,
            message_id: message.id,
          },
        })),
      );
    }

    if (!tokens || tokens.length === 0) {
      return new Response(JSON.stringify({ ok: true, skipped: true, reason: "No push tokens" }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const accessToken = await getAccessToken(serviceAccount);

    const payload = {
      notification: {
        title: title,
        body: truncate(bodyText),
      },
      data: {
        action_url: actionUrl,
        conversation_id: message.conversation_id,
        trip_id: conversation?.trip_id || "",
        sender_id: message.sender_id,
        message_id: message.id,
      },
    };

    const sends = tokens.map((t) => sendFcmMessage(projectId, accessToken, t.token, payload));
    await Promise.allSettled(sends);

    return new Response(JSON.stringify({ ok: true, sent: tokens.length }), {
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
