// deno-lint-ignore-file no-explicit-any
declare const Deno: { env: { get(name: string): string | undefined } };
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
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
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, prefer, x-supabase-api-version, x-requested-with",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Credentials": "true",
  };
}

interface TestPushRequest {
  userId: string;
  dryRun?: boolean;
}

serve(async (req: Request) => {
  const corsHeaders = buildCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const body = await req.json() as TestPushRequest;
    if (!body?.userId) {
      return new Response(JSON.stringify({ error: "Missing userId" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const diagnostics: Record<string, unknown> = {
      userId: body.userId,
      timestamp: new Date().toISOString(),
      checks: {
        firebase_configured: !!FIREBASE_SERVICE_ACCOUNT_JSON,
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
      .eq("id", body.userId)
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
      .eq("user_id", body.userId);

    if (tokensErr) {
      diagnostics.tokens_check = `❌ Error: ${tokensErr.message}`;
    } else {
      diagnostics.tokens_check = `✅ Found ${tokens?.length || 0} push token(s)`;
      diagnostics.tokens = tokens?.map((t) => ({
        platform: t.platform,
        token: t.token?.substring(0, 20) + "...",
        created_at: t.created_at,
      }));
    }

    // Test send via send-system-push
    if (!body.dryRun && tokens && tokens.length > 0) {
      try {
        await admin.functions.invoke("send-system-push", {
          body: {
            userIds: [body.userId],
            type: "test_notification",
            title: "🧪 Test Notification",
            body: "If you see this, push notifications are working!",
            actionUrl: "/",
            priority: "high",
          },
          headers: { Authorization: `Bearer ${SERVICE_ROLE_KEY}` },
        });
        diagnostics.send_attempt = "✅ send-system-push invoked successfully";
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
        "2. Verify User Settings: push_notifications should be true in profiles table",
        "3. Register Push Tokens: Mobile app must call upsert_push_token with device token",
        "4. Check Device: Ensure app has notification permissions granted",
        "5. Check Logs: Review Supabase function logs for errors",
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
