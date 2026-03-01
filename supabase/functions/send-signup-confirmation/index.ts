// deno-lint-ignore-file no-explicit-any
// Provide Deno type for TypeScript tooling when not running in Deno
declare const Deno: { env: { get(name: string): string | undefined } };
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Edge Function: Create user via Admin API and send signup confirmation using Resend
// Env required: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, RESEND_API_KEY, SITE_URL(optional)

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
// Use non-reserved env name; fallback to legacy if present
const SERVICE_ROLE_KEY = Deno.env.get("SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const RESEND_FROM = Deno.env.get("RESEND_FROM") ?? "Ketravelan <no-reply@ketravelan.xyz>";
const RESEND_TEMPLATE_ID = "2dc6db0a-f106-43c2-84a9-4d5107094ce6";
const DEFAULT_REDIRECT = Deno.env.get("SITE_URL") ?? "https://ketravelan.app/auth/callback";

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

function buildCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("origin") || "*";
  const allowedOrigins = new Set([
    "http://localhost:8080",
    "http://127.0.0.1:8080",
    "https://ketravelan.xyz",
    // Android emulator + Capacitor webview
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

function escapeHtml(v: string) {
  return v
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

interface SignupBody {
  email: string;
  password?: string; // optional for resend
  name?: string;
  redirectTo?: string;
  templateId?: string; // optional runtime override for Resend template ID
  dryRun?: boolean; // optional: when true, skip sending email and return confirmUrl for testing
  useTemplate?: boolean; // when false, send raw HTML from edge function
  subject?: string; // optional subject override
}

async function sendResendEmail(opts: { to: string; subject: string; variables?: Record<string, unknown>; templateId?: string }) {
  const payload: Record<string, unknown> = {
    from: RESEND_FROM,
    to: opts.to,
    subject: opts.subject,
  };
  // Require stored template ID as requested; no HTML fallback
  const tid = opts.templateId ?? RESEND_TEMPLATE_ID;
  if (!tid) {
    throw new Error("Missing template ID. Provide RESEND_TEMPLATE_ID secret or pass templateId in request body.");
  }
  payload["template"] = { id: tid, data: opts.variables ?? {} };

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

async function sendResendRawEmail(opts: { to: string; subject: string; html: string; text?: string }) {
  const payload: Record<string, unknown> = {
    from: RESEND_FROM,
    to: opts.to,
    subject: opts.subject,
    html: opts.html,
  };
  if (opts.text) payload["text"] = opts.text;
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

function buildHtmlEmail(opts: {
  brand: string;
  title: string;
  messageHtml: string;
  ctaUrl: string;
  logoUrl: string;
}) {
  const brand = escapeHtml(opts.brand);
  const title = escapeHtml(opts.title);
  const preheader = `Confirm your email to get started on ${brand}`;
  const ctaUrlEsc = escapeHtml(opts.ctaUrl);
  const logoUrlEsc = escapeHtml(opts.logoUrl);

  return [
    '<!doctype html>',
    '<html lang="en">',
    '<head>',
    '<meta charset="utf-8" />',
    '<meta name="viewport" content="width=device-width" />',
    `<title>${brand}</title>`,
    '</head>',
    '<body style="margin:0;background:#f4f6f8;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Arial">',
    // Preheader text (hidden)
    `<div style="display:none;font-size:1px;color:#f4f6f8;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden">${preheader}</div>`,
    '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:32px 0;">',
    '<tr><td align="center">',
    '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:520px;background:#ffffff;border-radius:16px;border:1px solid #e5e7eb;box-shadow:0 10px 28px rgba(15,23,42,.08);">',
    '<tr><td align="center" style="padding:24px 20px">',
    '<table role="presentation" width="auto" cellspacing="0" cellpadding="0" align="center">',
    '<tr>',
    `<td style="vertical-align:middle"><div style="font-size:20px;font-weight:700;color:#020617;margin:0">Welcome to</div></td>`,
    `<td style="vertical-align:middle;padding-left:4px"><img src="${logoUrlEsc}" alt="${brand}" style="display:block;border:0;outline:none;text-decoration:none;height:28px;width:auto" /></td>`,
    '</tr>',
    '</table>',
    '</td></tr>',
    '<tr><td style="height:1px;background:#e5e7eb;margin:0 28px" aria-hidden="true"></td></tr>',
    '<tr><td style="padding:28px">',
    `<h1 style="font-size:17px;font-weight:700;margin:0 0 8px;color:#020617;text-align:center">${title}</h1>`,
    `<div style="font-size:15px;line-height:1.65;color:#475569;margin-bottom:24px">${opts.messageHtml}</div>`,
    '<table role="presentation" cellspacing="0" cellpadding="0" width="100%"><tr><td align="center">',
    `<a href="${ctaUrlEsc}" target="_blank" style="display:inline-block;padding:14px 26px;border-radius:10px;background:#000000;color:#ffffff;text-decoration:none;font-weight:600">Confirm Email</a>`,
    '</td></tr></table>',
    '</td></tr>',
    '<tr><td style="padding:24px 28px;font-size:12px;color:#64748b;line-height:1.6">',
    'If you didn’t sign up, you can safely ignore this email.<br><br>',
    'If the button doesn’t work, copy this link:<br>',
    `<a href="${ctaUrlEsc}" style="color:#2563eb;word-break:break-all">${ctaUrlEsc}</a><br><br>`,
    '<strong>The Ketravelan Crew</strong>',
    '</td></tr>',
    '</table>',
    '</td></tr>',
    '</table>',
    '</body>',
    '</html>'
  ].join('');
}

serve(async (req: Request) => {
  try {
    const corsHeaders = buildCorsHeaders(req);
    if (req.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
    }
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }
    const body = (await req.json()) as SignupBody;
    if (!body?.email) {
      return new Response(JSON.stringify({ error: "Missing email" }), { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    const redirectTo = body.redirectTo || DEFAULT_REDIRECT;

    // 1) Create user via admin (auto-confirm disabled) only when password provided
    if (body.password) {
      const { data: created, error: createErr } = await admin.auth.admin.createUser({
        email: body.email,
        password: body.password,
        user_metadata: { role: "traveler", name: body.name ?? null },
        email_confirm: false,
      });
      if (createErr) {
        // If user already exists, return a clear 409 error
        const alreadyExists = createErr.message?.toLowerCase().includes("already") || createErr.status === 422;
        if (alreadyExists) {
          return new Response(
            JSON.stringify({ error: "A user with this email address has already been registered" }),
            { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
          );
        }
        // Other errors bubble up
        throw createErr;
      }
    }

    // 2) Generate invite/confirmation link managed by Supabase
    const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
      type: "invite",
      email: body.email,
      options: { emailRedirectTo: redirectTo },
    });
    if (linkErr || !linkData?.properties?.action_link) {
      throw new Error(linkErr?.message || "Failed to generate confirmation link");
    }
    const confirmUrl = linkData.properties.action_link as string;

    // 3) Prepare template variables
    const variables = {
      subject: "Confirm your email for Ketravelan",
      brandTitle: "Ketravelan",
      eyebrow: "Action Required",
      title: "Confirm your email to start the party 🚀",
      message: `You're one click away from joining ${body.name ? body.name + ' at ' : ''}Ketravelan. Verify your email to activate your account and jump into trip planning with your crew.`,
      ctaLabel: "Confirm Email",
      ctaUrl: confirmUrl,
      footerNote: "If you didn’t sign up, you can safely ignore this email.",
      // Compatibility with previous templates
      ConfirmationURL: confirmUrl,
      confirmUrl: confirmUrl,
    };
    // Optionally support dry-run to avoid sending email during verification
    if (body.dryRun) {
      return new Response(JSON.stringify({ ok: true, confirmUrl }), { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    const subject = body.subject || "Welcome onboard to Ketravelan";
    const useTemplate = body.useTemplate !== false; // default true
    if (useTemplate) {
      await sendResendEmail({ to: body.email, subject, variables, templateId: body.templateId });
    } else {
      const greet = body.name ? `Hi <strong>${escapeHtml(body.name)}</strong>,<br><br>` : "";
      const html = buildHtmlEmail({
        brand: "Ketravelan",
        title: "Confirm your email to get started",
        messageHtml: `${greet}You’re one click away from joining <strong>Ketravelan</strong>.`,
        ctaUrl: variables.ctaUrl as string,
        logoUrl: "https://ketravelan.xyz/ketravelan_logo.png",
      });
      const text = [
        "Welcome onboard to Ketravelan",
        "",
        "Confirm your email to get started",
        body.name ? `Hi ${body.name},` : undefined,
        "",
        "You’re one click away from joining Ketravelan.",
        "",
        `Confirm: ${variables.ctaUrl}`,
        "",
        "If you didn’t sign up, you can safely ignore this email.",
        "— The Ketravelan Crew",
      ].filter(Boolean).join("\n");
      await sendResendRawEmail({ to: body.email, subject, html, text });
    }

    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } });
  } catch (err: unknown) {
    console.error("send-signup-confirmation error:", err);
    const message = err instanceof Error ? err.message : "Unexpected error";
    const errorCors = buildCorsHeaders(req);
    return new Response(JSON.stringify({ error: message }), { status: 500, headers: { "Content-Type": "application/json", ...errorCors } });
  }
});
