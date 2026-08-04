// deno-lint-ignore-file no-explicit-any
declare const Deno: { env: { get(name: string): string | undefined } };
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const FIREBASE_SERVICE_ACCOUNT_JSON = Deno.env.get("FIREBASE_SERVICE_ACCOUNT_JSON") ?? "";
const APPLE_TEAM_ID = Deno.env.get("APPLE_TEAM_ID") ?? "";
const APPLE_KEY_ID = Deno.env.get("APPLE_KEY_ID") ?? "";
const APPLE_PRIVATE_KEY = Deno.env.get("APPLE_PRIVATE_KEY") ?? "";
const APPLE_BUNDLE_ID = Deno.env.get("APPLE_BUNDLE_ID") ?? "";

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
    "https://ketravelan.com",
    "http://10.0.2.2:5173",
    "capacitor://localhost",
  ]);
  const allowOrigin = allowedOrigins.has(origin) ? origin : "*";
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, prefer, x-supabase-api-version, x-requested-with",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Credentials": "true",
  };
}

interface TestPushRequest {
  userId?: string;
  email?: string;
  dryRun?: boolean;
}

function isLikelyApnsToken(token: string) {
  return /^[A-Fa-f0-9]{64}$/.test(token);
}

function hasApnsConfig() {
  return Boolean(APPLE_TEAM_ID && APPLE_KEY_ID && APPLE_PRIVATE_KEY && APPLE_BUNDLE_ID);
}

async function resolveUserIdByEmail(email: string) {
  const normalizedEmail = email.trim().toLowerCase();
  const lookupErrors: string[] = [];

  try {
    const { data: profileByEmail, error: profileByEmailErr } = await admin
      .from("profiles_with_email")
      .select("id, email")
      .eq("email", normalizedEmail)
      .maybeSingle();

    if (profileByEmailErr) {
      lookupErrors.push(`profiles_with_email lookup failed: ${profileByEmailErr.message}`);
    } else if (profileByEmail?.id) {
      return {
        id: String(profileByEmail.id),
        email: String(profileByEmail.email || normalizedEmail),
      };
    }
  } catch (viewErr) {
    lookupErrors.push(`profiles_with_email exception: ${viewErr instanceof Error ? viewErr.message : String(viewErr)}`);
  }

  let page = 1;
  const perPage = 1000;

  while (true) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) {
      const details = [error.name, error.message, JSON.stringify(error)].filter(Boolean).join(" | ");
      lookupErrors.push(`auth.admin.listUsers failed: ${details}`);
      throw new Error(lookupErrors.join("; "));
    }

    const users = data?.users ?? [];
    const matchedUser = users.find((user) => String(user.email || "").trim().toLowerCase() === normalizedEmail);
    if (matchedUser?.id) {
      return {
        id: matchedUser.id,
        email: matchedUser.email || normalizedEmail,
      };
    }

    if (users.length < perPage) {
      throw new Error(lookupErrors.length > 0 ? lookupErrors.join("; ") : "User not found for provided email");
    }

    page += 1;
  }
}

serve(async (req: Request) => {
  const corsHeaders = buildCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const body = await req.json() as TestPushRequest;
    if (!body?.userId && !body?.email) {
      return new Response(JSON.stringify({ error: "Missing userId or email" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    let resolvedUserId = body.userId?.trim() || "";
    let resolvedEmail = body.email?.trim().toLowerCase() || "";

    if (!resolvedUserId && resolvedEmail) {
      let resolvedUser: { id: string; email: string } | null = null;
      try {
        resolvedUser = await resolveUserIdByEmail(resolvedEmail);
      } catch (lookupErr) {
        const message = lookupErr instanceof Error ? lookupErr.message : String(lookupErr);
        return new Response(JSON.stringify({ error: `Failed to resolve email: ${message}` }), {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }

      if (!resolvedUser?.id) {
        return new Response(JSON.stringify({ error: "User not found for provided email" }), {
          status: 404,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }

      resolvedUserId = String(resolvedUser.id);
      resolvedEmail = String(resolvedUser.email || resolvedEmail);
    }

    const diagnostics: Record<string, unknown> = {
      userId: resolvedUserId,
      email: resolvedEmail || null,
      timestamp: new Date().toISOString(),
      checks: {
        firebase_configured: !!FIREBASE_SERVICE_ACCOUNT_JSON,
        apns_configured: hasApnsConfig(),
      },
    };

    // Check Firebase config
    if (!FIREBASE_SERVICE_ACCOUNT_JSON) {
      diagnostics.checks.firebase_configured = false;
      diagnostics.error = "❌ FIREBASE_SERVICE_ACCOUNT_JSON not configured";
    } else {
      try {
        const serviceAccount = JSON.parse(FIREBASE_SERVICE_ACCOUNT_JSON);
        diagnostics.checks.firebase_project = serviceAccount.project_id || "unknown";
      } catch (e) {
        diagnostics.checks.firebase_configured = false;
        diagnostics.error = "❌ FIREBASE_SERVICE_ACCOUNT_JSON is invalid JSON";
      }
    }

    // Check user profile
    const { data: profile, error: profileErr } = await admin
      .from("profiles")
      .select("id, push_notifications, email_notifications")
      .eq("id", resolvedUserId)
      .maybeSingle();

    if (profileErr) {
      diagnostics.profile_check = `❌ Error: ${profileErr.message}`;
    } else if (!profile) {
      diagnostics.profile_check = "❌ User profile not found";
    } else {
      diagnostics.profile_check = "✅ User profile found";
      diagnostics.push_notifications_enabled = profile.push_notifications !== false;
    }

    // Check push tokens
    const { data: tokens, error: tokensErr } = await admin
      .from("user_push_tokens")
      .select("id, token, platform, created_at")
      .eq("user_id", resolvedUserId);

    if (tokensErr) {
      diagnostics.tokens_check = `❌ Error: ${tokensErr.message}`;
    } else {
      const iosTokens = (tokens || []).filter((t) => String(t.platform || "").toLowerCase() === "ios");
      const androidTokens = (tokens || []).filter((t) => String(t.platform || "").toLowerCase() === "android");
      const webTokens = (tokens || []).filter((t) => String(t.platform || "").toLowerCase() === "web");
      const iosApnsStyleTokens = iosTokens.filter((t) => isLikelyApnsToken(String(t.token || "")));

      diagnostics.tokens_check = `✅ Found ${tokens?.length || 0} push token(s)`;
      diagnostics.token_routing = {
        ios: iosTokens.length,
        ios_apns_style: iosApnsStyleTokens.length,
        android: androidTokens.length,
        web: webTokens.length,
      };
      diagnostics.tokens = tokens?.map((t) => ({
        platform: t.platform,
        token: t.token?.substring(0, 20) + "...",
        created_at: t.created_at,
      }));

      if (iosApnsStyleTokens.length > 0 && !hasApnsConfig()) {
        diagnostics.apns_warning = "❌ iOS APNs-style tokens detected but APNs env vars are missing";
      }
    }

    const { data: recentBroadcasts, error: broadcastsErr } = await admin
      .from("notifications")
      .select("id, title, read, created_at, action_url")
      .eq("user_id", resolvedUserId)
      .eq("type", "broadcast_announcement")
      .order("created_at", { ascending: false })
      .limit(5);

    if (broadcastsErr) {
      diagnostics.broadcast_check = `❌ Error: ${broadcastsErr.message}`;
    } else {
      diagnostics.broadcast_check = `✅ Found ${recentBroadcasts?.length || 0} recent broadcast notification row(s)`;
      diagnostics.recent_broadcasts = (recentBroadcasts || []).map((row) => ({
        title: row.title,
        read: row.read,
        created_at: row.created_at,
        action_url: row.action_url,
      }));
    }

    // Test send via send-system-push
    if (!body.dryRun && tokens && tokens.length > 0) {
      try {
        const { data, error } = await admin.functions.invoke("send-system-push", {
          body: {
            userIds: [resolvedUserId],
            type: "test_notification",
            title: "🧪 Test Notification",
            body: "If you see this, push notifications are working!",
            actionUrl: "/",
            priority: "high",
          },
          headers: { Authorization: `Bearer ${SERVICE_ROLE_KEY}` },
        });

        diagnostics.send_attempt = error
          ? `❌ send-system-push invoke error: ${error.message}`
          : "✅ send-system-push invoked";
        diagnostics.send_result = data ?? null;
      } catch (err) {
        diagnostics.send_attempt = `❌ send-system-push failed: ${err instanceof Error ? err.message : String(err)}`;
      }
    } else {
      diagnostics.send_attempt = "⏭️ Skipped (dry run mode or no tokens)";
    }

    return new Response(JSON.stringify({ 
      ok: true, 
      diagnostics,
      instructions: [
        "1. Check Firebase Configuration: FIREBASE_SERVICE_ACCOUNT_JSON env var must be set",
        "2. For iOS APNs-style tokens, set APPLE_TEAM_ID, APPLE_KEY_ID, APPLE_PRIVATE_KEY, APPLE_BUNDLE_ID",
        "3. Verify User Settings: push_notifications should be true in profiles table",
        "4. Register Push Tokens: Mobile app must call upsert_push_token with device token",
        "5. Check Device: Ensure app has notification permissions granted",
        "6. Check Logs: Review Supabase function logs for errors",
      ]
    }), {
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
