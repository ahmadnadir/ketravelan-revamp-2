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
  const { error } = await admin
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
  if (error) throw error;
}

// Supabase/PostgREST/GoTrue errors are often plain objects (or class instances whose fields are
// non-enumerable), so JSON.stringify(error) can yield "{}". Pull out the useful fields explicitly.
function normalizeError(err: unknown): {
  message: string;
  code?: string;
  status?: number;
  details?: string;
  hint?: string;
  name?: string;
} {
  if (err === null || err === undefined) return { message: "Unknown error" };
  if (typeof err === "string") return { message: err || "Unknown error" };
  if (typeof err === "object") {
    const e = err as Record<string, unknown>;
    const str = (v: unknown) => (typeof v === "string" && v.length > 0 ? v : undefined);
    let message = str(e.message) ?? str(e.error_description) ?? str(e.error);
    if (!message || message === "{}") {
      try {
        const json = JSON.stringify(err, Object.getOwnPropertyNames(err));
        message = json && json !== "{}" ? json : String(err);
      } catch {
        message = String(err);
      }
    }
    return {
      message: message || "Unknown error",
      code: str(e.code) ?? (typeof e.code === "number" ? String(e.code) : undefined),
      status: typeof e.status === "number" ? e.status : undefined,
      details: str(e.details),
      hint: str(e.hint),
      name: str(e.name),
    };
  }
  return { message: String(err) };
}

function jsonResponse(
  body: Record<string, unknown>,
  status: number,
  corsHeaders: Record<string, string>,
) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

function escapeHtml(v: string) {
  return v
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

// {{variable}} rendering, same syntax as notification-dispatcher.
function render(template: string, values: Record<string, string>, escape = false) {
  return template.replace(/\{\{\s*([A-Za-z0-9_.-]+)\s*\}\}/g, (_m, key: string) => {
    const value = values[key] ?? "";
    return escape ? escapeHtml(value) : value;
  });
}

// Built-in copy of the 'account_deleted' template, used if the notification_templates row is missing.
const DEFAULT_DELETION_TEMPLATE = {
  email_subject_template: "Your Ketravelan account has been deleted",
  email_html_template: "<!doctype html><html lang=\"en\"><head><meta charset=\"utf-8\" /><meta name=\"viewport\" content=\"width=device-width\" /><title>Ketravelan</title></head><body style=\"margin:0;background:#f4f6f8;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Arial\"><div style=\"display:none;font-size:1px;color:#f4f6f8;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden\">Your Ketravelan account has been deleted.</div><table role=\"presentation\" width=\"100%\" cellspacing=\"0\" cellpadding=\"0\" style=\"padding:32px 0;\"><tr><td align=\"center\"><table role=\"presentation\" width=\"100%\" cellspacing=\"0\" cellpadding=\"0\" style=\"max-width:520px;background:#ffffff;border-radius:16px;border:1px solid #e5e7eb;box-shadow:0 10px 28px rgba(15,23,42,.08);\"><tr><td align=\"center\" style=\"padding:24px 20px\"><img src=\"https://ketravelan.com/ketravelan_logo.png\" alt=\"Ketravelan\" style=\"display:block;border:0;outline:none;text-decoration:none;height:28px;width:auto\" /></td></tr><tr><td style=\"height:1px;background:#e5e7eb\" aria-hidden=\"true\"></td></tr><tr><td style=\"padding:28px\"><h1 style=\"font-size:22px;font-weight:700;margin:0 0 8px;color:#020617;text-align:center\">Account deletion confirmed</h1><div style=\"font-size:15px;line-height:1.65;color:#475569;text-align:center\">Hi <strong>{{recipient_name}}</strong>,<br><br>{{deletion_line}}<br><br>We are grateful for the time you spent with Ketravelan. Your presence was truly appreciated, and we hope our platform served you well.<br><br>Wishing you success and great journeys ahead.</div></td></tr><tr><td style=\"padding:24px 28px;font-size:12px;color:#64748b;line-height:1.6\">If this was not you, please contact us immediately at <a href=\"mailto:support@ketravelan.com\" style=\"color:#2563eb\">support@ketravelan.com</a>.<br><br><strong>The Ketravelan Crew</strong></td></tr></table></td></tr></table></body></html>",
  email_text_template: "Hi {{recipient_name}},\n\n{{deletion_line}}\n\nWe are grateful for the time you spent with Ketravelan. Your presence was truly appreciated, and we hope our platform served you well.\n\nWishing you success and great journeys ahead.\n\nIf this was not you, please contact us immediately at support@ketravelan.com.\n\nThe Ketravelan Crew",
};

// The email design lives in notification_templates (type = 'account_deleted') so it can be edited in
// the admin Notification Center. Returns null when the row is missing/inactive so we can fall back.
async function loadDeletionTemplate() {
  const { data, error } = await admin
    .from("notification_templates")
    .select("email_subject_template, email_html_template, email_text_template, is_active")
    .eq("type", "account_deleted")
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!data || data.is_active === false || !data.email_html_template) return null;
  return data as {
    email_subject_template: string | null;
    email_html_template: string;
    email_text_template: string | null;
  };
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

  let template = DEFAULT_DELETION_TEMPLATE as {
    email_subject_template: string | null;
    email_html_template: string;
    email_text_template: string | null;
  };
  try {
    template = (await loadDeletionTemplate()) ?? template;
  } catch (templateErr) {
    console.error("[delete-account] could not load email template, using built-in", normalizeError(templateErr));
  }

  const values = {
    recipient_name: opts.userName?.trim() || "there",
    deletion_line: opts.mode === "hard"
      ? "Your account has been permanently deleted."
      : "Your account has been deleted and disabled.",
  };
  const subject = render(template.email_subject_template || "Your Ketravelan account has been deleted", values);
  const html = render(template.email_html_template, values, true);
  const text = render(template.email_text_template || "{{deletion_line}}", values);

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
  const requestId = crypto.randomUUID();

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse(
      { error: "Method not allowed", code: "METHOD_NOT_ALLOWED", requestId },
      405,
      corsHeaders,
    );
  }

  // Tracks how far we got so a failure can be reported as before/after the account was deleted.
  let userId: string | null = null;
  let accountDeleted = false;

  try {
    const authHeader = req.headers.get("authorization") || req.headers.get("Authorization");
    const token = authHeader?.replace(/^Bearer\s+/i, "").trim();

    if (!token) {
      return jsonResponse({ error: "Unauthorized", code: "UNAUTHORIZED", requestId }, 401, corsHeaders);
    }

    const { data: authData, error: authError } = await admin.auth.getUser(token);
    if (authError || !authData?.user) {
      return jsonResponse({ error: "Unauthorized", code: "UNAUTHORIZED", requestId }, 401, corsHeaders);
    }

    userId = authData.user.id;
    const userEmail = authData.user.email || "";
    const userName =
      (authData.user.user_metadata?.full_name as string | undefined) ||
      (authData.user.user_metadata?.name as string | undefined) ||
      null;
    let deletionMode: "hard" | "soft" = "hard";

    const hardResult = await admin.auth.admin.deleteUser(userId);

    if (hardResult.error) {
      // Hard deletes are blocked by FK constraints in application tables (e.g. ON DELETE RESTRICT
      // on settlement_payments). The error text varies (sometimes it is just "{}"), so fall back to a
      // soft delete for any failure other than a missing user, and surface the original error in logs.
      const hardErr = normalizeError(hardResult.error);
      console.warn("[delete-account] hard delete failed, falling back to soft delete", {
        requestId,
        userId,
        error: hardErr,
      });
      if (hardErr.status === 404 || hardErr.code === "user_not_found") {
        return jsonResponse({ error: "Account not found", code: "ACCOUNT_NOT_FOUND", requestId }, 404, corsHeaders);
      }

      deletionMode = "soft";
      const softResult = await admin.auth.admin.deleteUser(userId, true);
      if (softResult.error) {
        console.error("[delete-account] soft delete failed", {
          requestId,
          userId,
          hardError: hardErr,
          softError: normalizeError(softResult.error),
        });
        return jsonResponse(
          { error: "Account deletion failed", code: "ACCOUNT_DELETION_FAILED", requestId },
          500,
          corsHeaders,
        );
      }
    }
    accountDeleted = true;

    // Best-effort PII scrubbing; the account is already gone, so never fail the request over it.
    try {
      await scrubProfile(userId);
    } catch (scrubErr) {
      console.error("[delete-account] profile scrub failed", {
        requestId,
        userId,
        error: normalizeError(scrubErr),
      });
    }

    const emailDelivery = {
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
      const message = normalizeError(emailErr).message;
      emailDelivery.error = message;
      console.error("[delete-account] deletion email failed", {
        requestId,
        userId,
        mode: deletionMode,
        error: message,
      });
      // Email is best-effort and does not affect deletion success.
    }

    return jsonResponse({ ok: true, mode: deletionMode, requestId, email: emailDelivery }, 200, corsHeaders);
  } catch (err: unknown) {
    console.error("[delete-account] unexpected failure", {
      requestId,
      userId,
      accountDeleted,
      error: normalizeError(err),
    });
    // If the account was already deleted, the user's goal succeeded; don't report a failure.
    if (accountDeleted) {
      return jsonResponse({ ok: true, mode: "unknown", requestId, email: null }, 200, corsHeaders);
    }
    return jsonResponse(
      { error: "Account deletion failed", code: "ACCOUNT_DELETION_FAILED", requestId },
      500,
      corsHeaders,
    );
  }
});
