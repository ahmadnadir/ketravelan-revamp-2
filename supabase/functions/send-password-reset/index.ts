// deno-lint-ignore-file no-explicit-any
// Provide Deno type for TypeScript tooling when not running in Deno
declare const Deno: { env: { get(name: string): string | undefined } };
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Edge Function: Generate recovery link and send email via Resend
// Env required: SUPABASE_URL, SERVICE_ROLE_KEY (or SUPABASE_SERVICE_ROLE_KEY), RESEND_API_KEY

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const RESEND_FROM = Deno.env.get("RESEND_FROM") ?? "Ketravelan <no-reply@ketravelan.com>";
const DEFAULT_REDIRECT = Deno.env.get("SITE_URL") ?? "https://ketravelan.app/auth/callback";

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const DEFAULT_SUBJECT = "Reset your Ketravelan password";

// Built-in copy of the 'password_reset' template, used if the notification_templates row is missing.
const DEFAULT_RESET_TEMPLATE = {
  email_subject_template: "Reset your Ketravelan password",
  email_html_template: "<!doctype html><html lang=\"en\"><head><meta charset=\"utf-8\" /><meta name=\"viewport\" content=\"width=device-width\" /><title>Ketravelan</title></head><body style=\"margin:0;background:#f4f6f8;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Arial\"><div style=\"display:none;font-size:1px;color:#f4f6f8;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden\">Reset your Ketravelan password.</div><table role=\"presentation\" width=\"100%\" cellspacing=\"0\" cellpadding=\"0\" style=\"padding:32px 0;\"><tr><td align=\"center\"><table role=\"presentation\" width=\"100%\" cellspacing=\"0\" cellpadding=\"0\" style=\"max-width:520px;background:#ffffff;border-radius:16px;border:1px solid #e5e7eb;box-shadow:0 10px 28px rgba(15,23,42,.08);\"><tr><td align=\"center\" style=\"padding:24px 20px\"><img src=\"https://ketravelan.com/ketravelan_logo.png\" alt=\"Ketravelan\" style=\"display:block;border:0;outline:none;text-decoration:none;height:28px;width:auto\" /></td></tr><tr><td style=\"height:1px;background:#e5e7eb\" aria-hidden=\"true\"></td></tr><tr><td style=\"padding:28px\"><h1 style=\"font-size:22px;font-weight:700;margin:0 0 8px;color:#020617;text-align:center\">Reset your password</h1><div style=\"font-size:15px;line-height:1.65;color:#475569;margin-bottom:24px;text-align:center\">We received a request to reset the password for your Ketravelan account. Tap the button below to choose a new one.</div><table role=\"presentation\" cellspacing=\"0\" cellpadding=\"0\" width=\"100%\"><tr><td align=\"center\"><a href=\"{{action_url}}\" target=\"_blank\" style=\"display:inline-block;padding:14px 26px;border-radius:10px;background:#000000;color:#ffffff;text-decoration:none;font-weight:600\">Reset Password</a></td></tr></table></td></tr><tr><td style=\"padding:24px 28px;font-size:12px;color:#64748b;line-height:1.6\">If you didn\u2019t request this, you can safely ignore this email \u2014 your password won\u2019t change.<br><br>If the button doesn\u2019t work, copy this link:<br><a href=\"{{action_url}}\" style=\"color:#2563eb;word-break:break-all\">{{action_url}}</a><br><br><strong>The Ketravelan Crew</strong></td></tr></table></td></tr></table></body></html>",
  email_text_template: "Reset your password\n\nWe received a request to reset the password for your Ketravelan account. Open the link below to choose a new one:\n\n{{action_url}}\n\nIf you didn't request this, you can safely ignore this email. Your password won't change.\n\nThe Ketravelan Crew",
};

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

// The design lives in notification_templates (type = 'password_reset') so it can be edited in the admin
// Notification Center. Falls back to the built-in copy if the row is missing, inactive or unreadable.
async function loadResetTemplate() {
  try {
    const { data, error } = await admin
      .from("notification_templates")
      .select("email_subject_template, email_html_template, email_text_template, is_active")
      .eq("type", "password_reset")
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    if (data && data.is_active !== false && data.email_html_template) {
      return data as { email_subject_template: string | null; email_html_template: string; email_text_template: string | null };
    }
  } catch (err) {
    console.error("send-password-reset: could not load email template, using built-in", err instanceof Error ? err.message : err);
  }
  return DEFAULT_RESET_TEMPLATE;
}

function buildCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("origin") || "*";
  const allowedOrigins = new Set([
    "http://localhost:8080",
    "http://127.0.0.1:8080",
    "https://ketravelan.com",
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

interface ResetBody {
  email: string;
  redirectTo?: string;
  subject?: string;
  templateId?: string;
  useTemplate?: boolean; // when false, send simple HTML
}

async function sendResendEmail(opts: { to: string; subject: string; variables?: Record<string, unknown>; templateId?: string }) {
  const payload: Record<string, unknown> = {
    from: RESEND_FROM,
    to: opts.to,
    subject: opts.subject,
  };
  if (opts.templateId) {
    payload["template"] = { id: opts.templateId, data: opts.variables ?? {} };
  } else {
    const template = await loadResetTemplate();
    const values = { action_url: (opts.variables?.ctaUrl as string) || "" };
    payload["subject"] = opts.subject === DEFAULT_SUBJECT && template.email_subject_template
      ? render(template.email_subject_template, values)
      : opts.subject;
    payload["html"] = render(template.email_html_template, values, true);
    payload["text"] = render(template.email_text_template || "{{action_url}}", values);
  }
  const resp = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Resend error: ${resp.status} ${text}`);
  }
}

serve(async (req: Request) => {
  const corsHeaders = buildCorsHeaders(req);
  try {
    if (req.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
    }
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }
    const body = (await req.json()) as ResetBody;
    if (!body?.email) {
      return new Response(JSON.stringify({ error: "Missing email" }), { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    const redirectTo = body.redirectTo || DEFAULT_REDIRECT;

    // Generate recovery link
    const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
      type: "recovery",
      email: body.email,
      options: { emailRedirectTo: redirectTo },
    });
    if (linkErr || !linkData?.properties?.action_link) {
      throw new Error(linkErr?.message || "Failed to generate recovery link");
    }
    const resetUrl = linkData.properties.action_link as string;

    // Send email via Resend. Design comes from notification_templates ('password_reset');
    // an explicit templateId in the request still selects a Resend-hosted template instead.
    const variables = { ctaUrl: resetUrl };
    const subject = body.subject || DEFAULT_SUBJECT;
    const useTemplate = body.useTemplate !== false; // default true
    await sendResendEmail({
      to: body.email,
      subject,
      variables,
      templateId: useTemplate ? body.templateId : undefined,
    });

    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } });
  } catch (err: unknown) {
    console.error("send-password-reset error:", err);
    const message = err instanceof Error ? err.message : "Unexpected error";
    return new Response(JSON.stringify({ error: message }), { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } });
  }
});
