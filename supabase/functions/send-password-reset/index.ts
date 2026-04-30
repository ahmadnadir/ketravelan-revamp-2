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
const RESEND_RESET_TEMPLATE_ID = Deno.env.get("RESEND_RESET_TEMPLATE_ID") ?? Deno.env.get("RESEND_TEMPLATE_ID_RESET");
const DEFAULT_REDIRECT = Deno.env.get("SITE_URL") ?? "https://ketravelan.app/auth/callback";

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

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
    // This path should normally not be used when templates are configured.
    const ctaUrl = (opts.variables?.ctaUrl as string) || "#";
    const html = [
      "<!doctype html>",
      "<html><body>",
      `<h2>Password reset for Ketravelan</h2>`,
      `<p>Click the link below to reset your password:</p>`,
      `<p><a href="${ctaUrl}">Reset Password</a></p>`,
      `<p>If the button doesn't work, copy this link:</p>`,
      `<p>${ctaUrl}</p>`,
      "</body></html>",
    ].join("");
    payload["html"] = html;
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

    // Send email via Resend, prefer template (like signup)
    const variables = { ctaUrl: resetUrl };
    const subject = body.subject || "Reset your Ketravelan password";
    const useTemplate = body.useTemplate !== false; // default true
    if (useTemplate) {
      const tid = body.templateId ?? RESEND_RESET_TEMPLATE_ID;
      if (tid) {
        await sendResendEmail({ to: body.email, subject, variables, templateId: tid });
      } else {
        // Graceful fallback to raw HTML when template is not configured
        await sendResendEmail({ to: body.email, subject, variables });
      }
    } else {
      await sendResendEmail({ to: body.email, subject, variables });
    }

    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } });
  } catch (err: unknown) {
    console.error("send-password-reset error:", err);
    const message = err instanceof Error ? err.message : "Unexpected error";
    return new Response(JSON.stringify({ error: message }), { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } });
  }
});
