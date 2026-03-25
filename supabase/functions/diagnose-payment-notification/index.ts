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

function buildCorsHeaders(): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
}

interface DiagnosticRequest {
  userId: string;
  testSend?: boolean;
}

function isLikelyApnsToken(token: string) {
  return /^[A-Fa-f0-9]{64}$/.test(token);
}

function hasApnsConfig() {
  return Boolean(APPLE_TEAM_ID && APPLE_KEY_ID && APPLE_PRIVATE_KEY && APPLE_BUNDLE_ID);
}

serve(async (req: Request) => {
  const corsHeaders = buildCorsHeaders();
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const body = await req.json() as DiagnosticRequest;
    if (!body?.userId) {
      return new Response(JSON.stringify({ error: "Missing userId" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const diagnostics: Record<string, unknown> = {
      userId: body.userId,
      timestamp: new Date().toISOString(),
      checks: {},
    };

    // Check 1: Firebase Configuration
    diagnostics.checks = {
      ...diagnostics.checks,
      firebase_env_set: !!FIREBASE_SERVICE_ACCOUNT_JSON,
      firebase_env_length: FIREBASE_SERVICE_ACCOUNT_JSON.length,
      apns_env_set: hasApnsConfig(),
    };

    if (FIREBASE_SERVICE_ACCOUNT_JSON) {
      try {
        const serviceAccount = JSON.parse(FIREBASE_SERVICE_ACCOUNT_JSON);
        diagnostics.checks = {
          ...diagnostics.checks,
          firebase_valid_json: true,
          firebase_project_id: serviceAccount.project_id,
          firebase_client_email: serviceAccount.client_email,
        };
      } catch (e) {
        diagnostics.checks = {
          ...diagnostics.checks,
          firebase_valid_json: false,
          firebase_json_error: String(e),
        };
      }
    }

    // Check 2: User Profile Settings
    const { data: profile, error: profileErr } = await admin
      .from("profiles")
      .select("id, push_notifications, email_notifications")
      .eq("id", body.userId)
      .maybeSingle();

    if (profileErr) {
      diagnostics.checks = {
        ...diagnostics.checks,
        profile_error: profileErr.message,
      };
    } else if (profile) {
      diagnostics.checks = {
        ...diagnostics.checks,
        profile_exists: true,
        push_notifications_enabled: profile.push_notifications,
        email_notifications_enabled: profile.email_notifications,
      };
    } else {
      diagnostics.checks = {
        ...diagnostics.checks,
        profile_exists: false,
      };
    }

    // Check 3: Push Tokens
    const { data: tokens, error: tokensErr } = await admin
      .from("user_push_tokens")
      .select("id, token, platform, created_at")
      .eq("user_id", body.userId);

    if (tokensErr) {
      diagnostics.checks = {
        ...diagnostics.checks,
        tokens_error: tokensErr.message,
      };
    } else {
      const iosTokens = (tokens || []).filter((t) => String(t.platform || "").toLowerCase() === "ios");
      const iosApnsStyleTokens = iosTokens.filter((t) => isLikelyApnsToken(String(t.token || "")));
      diagnostics.checks = {
        ...diagnostics.checks,
        tokens_count: tokens?.length || 0,
        ios_tokens_count: iosTokens.length,
        ios_apns_style_tokens_count: iosApnsStyleTokens.length,
        tokens: tokens?.map((t) => ({
          platform: t.platform,
          token_preview: t.token?.substring(0, 32) + "...",
          created_at: t.created_at,
        })),
      };

      if (iosApnsStyleTokens.length > 0 && !hasApnsConfig()) {
        diagnostics.checks = {
          ...diagnostics.checks,
          apns_warning: "iOS APNs-style tokens detected, but APNs env vars are missing",
        };
      }
    }

    // Check 4: Recent Notifications
    const { data: notifications, error: notifErr } = await admin
      .from("notifications")
      .select("id, type, title, created_at, action_url")
      .eq("user_id", body.userId)
      .order("created_at", { ascending: false })
      .limit(5);

    if (notifErr) {
      diagnostics.checks = {
        ...diagnostics.checks,
        notifications_error: notifErr.message,
      };
    } else {
      diagnostics.checks = {
        ...diagnostics.checks,
        recent_notifications: notifications || [],
      };
    }

    // Optional: Send test notification
    if (body.testSend && tokens && tokens.length > 0) {
      try {
        const testResult = await admin.functions.invoke("send-system-push", {
          body: {
            userIds: [body.userId],
            type: "payment_marked_test",
            title: "🧪 Test: Payment Marked",
            body: "If you see this, notifications work!",
            actionUrl: "/",
            priority: "high",
          },
          headers: { Authorization: `Bearer ${SERVICE_ROLE_KEY}` },
        });

        diagnostics.checks = {
          ...diagnostics.checks,
          test_send_attempted: true,
          test_send_result: testResult.error ? `Error: ${testResult.error}` : "Success",
        };
      } catch (err) {
        diagnostics.checks = {
          ...diagnostics.checks,
          test_send_attempted: true,
          test_send_error: String(err),
        };
      }
    }

    // Summary
    const issues: string[] = [];
    if (!FIREBASE_SERVICE_ACCOUNT_JSON) issues.push("❌ Firebase not configured - set FIREBASE_SERVICE_ACCOUNT_JSON env var");
    if ((diagnostics.checks as Record<string, unknown>).ios_apns_style_tokens_count && !hasApnsConfig()) {
      issues.push("❌ APNs not configured - set APPLE_TEAM_ID, APPLE_KEY_ID, APPLE_PRIVATE_KEY, APPLE_BUNDLE_ID");
    }
    if (profile && profile.push_notifications === false) issues.push("❌ User has push notifications disabled");
    if (!tokens || tokens.length === 0) issues.push("❌ No push tokens registered - install app on device");
    
    diagnostics.issues = issues;
    diagnostics.summary = issues.length === 0 
      ? "✅ All systems operational - issue may be elsewhere"
      : issues.join(" | ");

    return new Response(JSON.stringify(diagnostics), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unexpected error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
