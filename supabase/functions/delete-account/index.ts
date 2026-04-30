// deno-lint-ignore-file no-explicit-any
declare const Deno: { env: { get(name: string): string | undefined } };
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") || "";
const RESEND_FROM = Deno.env.get("RESEND_FROM") ?? "Ketravelan <no-reply@ketravelan.com>";

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function scrubProfile(userId: string) {
  // Best-effort PII scrubbing in app profile table. Ignore failures so auth deletion still succeeds.
  const anonymizedUsername = `deleted-${userId.slice(0, 8)}`;
  await admin
    .from("profiles")
    .update({
      full_name: null,
      phone: null,
      avatar_url: null,
      bio: null,
      social_links: {},
      username: anonymizedUsername,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId);
}

function escapeHtml(v: string) {
  return v
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

async function sendDeletionEmail(opts: {
  to: string;
  userName?: string | null;
  mode: "hard" | "soft";
}) {
  if (!RESEND_API_KEY) {
    throw new Error("RESEND_API_KEY is not configured");
  }
  if (!opts.to) {
    throw new Error("No recipient email found for deleted account");
  }

  const greeting = opts.userName?.trim()
    ? `Hi ${escapeHtml(opts.userName.trim())},`
    : "Hi,";
  const deletionLine = opts.mode === "hard"
    ? "Your account has been permanently deleted."
    : "Your account has been deleted and disabled.";
  const appreciationLine = "We are grateful for the time you spent with Ketravelan.";
  const farewellLine = "Your presence was truly appreciated, and we hope our platform served you well.";
  const wishesLine = "Wishing you success and great journeys ahead.";

  const subject = "Your Ketravelan account has been deleted";
  const html = [
    "<div style=\"font-family:Arial,sans-serif;max-width:600px;margin:0 auto;\">",
    "<h2 style=\"color:#111827;\">Account deletion confirmed</h2>",
    `<p style=\"color:#374151;font-size:15px;\">${greeting}</p>`,
    `<p style=\"color:#374151;font-size:15px;\">${deletionLine}</p>`,
    `<p style=\"color:#374151;font-size:15px;\">${appreciationLine}</p>`,
    `<p style=\"color:#374151;font-size:15px;\">${farewellLine}</p>`,
    `<p style=\"color:#374151;font-size:15px;\">${wishesLine}</p>`,
    "<p style=\"color:#374151;font-size:15px;\">If this was not you, please contact support immediately.</p>",
    "<p style=\"color:#6b7280;font-size:12px;margin-top:24px;\">Ketravelan Security Notice</p>",
    "</div>",
  ].join("");
  const text = [
    opts.userName?.trim() ? `Hi ${opts.userName.trim()},` : "Hi,",
    "",
    deletionLine,
    appreciationLine,
    farewellLine,
    wishesLine,
    "If this was not you, please contact support immediately.",
    "",
    "Ketravelan Security Notice",
  ].join("\n");

  const resp = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: RESEND_FROM,
      to: opts.to,
      subject,
      html,
      text,
    }),
  });

  if (!resp.ok) {
    const responseText = await resp.text();
    throw new Error(`Resend error: ${resp.status} ${responseText}`);
  }

  let body: Record<string, unknown> | null = null;
  try {
    body = await resp.json();
  } catch {
    body = null;
  }

  return {
    provider: "resend",
    accepted: true,
    status: resp.status,
    messageId: typeof body?.id === "string" ? body.id : null,
    raw: body,
  };
}

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

  try {
    const authHeader = req.headers.get("authorization") || req.headers.get("Authorization");
    const token = authHeader?.replace("Bearer ", "").trim();

    if (!token) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const { data: authData, error: authError } = await admin.auth.getUser(token);
    if (authError || !authData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const userId = authData.user.id;
    const userEmail = authData.user.email || "";
    const userName =
      (authData.user.user_metadata?.full_name as string | undefined) ||
      (authData.user.user_metadata?.name as string | undefined) ||
      null;
    let deletionMode: "hard" | "soft" = "hard";

    let { error: deleteError } = await admin.auth.admin.deleteUser(userId);

    // FK constraints in application tables can block hard deletes.
    // Fall back to soft delete so the account becomes inaccessible while preserving referential integrity.
    if (deleteError) {
      const message = (deleteError.message || "").toLowerCase();
      if (message.includes("database error deleting user")) {
        deletionMode = "soft";
        const softDeleteResult = await admin.auth.admin.deleteUser(userId, true);
        deleteError = softDeleteResult.error;
      }
    }

    if (deleteError) {
      throw new Error(deleteError.message || "Failed to delete account");
    }

    try {
      await scrubProfile(userId);
    } catch {
      // Ignore profile scrub errors to avoid blocking auth deletion success.
    }

    let emailDelivery = {
      attempted: false,
      sent: false,
      to: userEmail,
      error: null as string | null,
      provider: "resend" as "resend",
      accepted: false,
      status: null as number | null,
      messageId: null as string | null,
      raw: null as Record<string, unknown> | null,
    };

    try {
      emailDelivery.attempted = true;
      const providerResult = await sendDeletionEmail({
        to: userEmail,
        userName,
        mode: deletionMode,
      });
      emailDelivery.sent = true;
      emailDelivery.accepted = providerResult.accepted;
      emailDelivery.status = providerResult.status;
      emailDelivery.messageId = providerResult.messageId;
      emailDelivery.raw = providerResult.raw;
    } catch (emailErr: unknown) {
      const message = emailErr instanceof Error ? emailErr.message : "Unknown email error";
      emailDelivery.error = message;
      console.error("[delete-account] deletion email failed", {
        userId,
        to: userEmail,
        mode: deletionMode,
        error: message,
      });
      // Email is best-effort and should not block deletion success.
    }

    return new Response(JSON.stringify({ ok: true, mode: deletionMode, email: emailDelivery }), {
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
