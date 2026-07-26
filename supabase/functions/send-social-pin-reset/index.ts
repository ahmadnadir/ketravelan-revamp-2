// deno-lint-ignore-file no-explicit-any
declare const Deno: { env: { get(name: string): string | undefined } };
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const RESEND_FROM = Deno.env.get("RESEND_FROM") ?? "Ketravelan <no-reply@ketravelan.com>";

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

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function generatePin() {
  const digits = Math.floor(Math.random() * 10000).toString().padStart(4, "0");
  return digits;
}

function hashSocialPin(pin: string) {
  let hash = 0;
  for (let i = 0; i < pin.length; i += 1) {
    hash = (hash << 5) - hash + pin.charCodeAt(i);
    hash |= 0;
  }
  return `social-pin:${Math.abs(hash)}`;
}

async function sendResendRawEmail(opts: { to: string; subject: string; html: string; text: string }) {
  const payload: Record<string, unknown> = {
    from: RESEND_FROM,
    to: opts.to,
    subject: opts.subject,
    html: opts.html,
    text: opts.text,
  };

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

function buildHtmlEmail(opts: { userName?: string; pin: string }) {
  const userName = opts.userName?.trim();
  const displayName = userName ? escapeHtml(userName) : "Traveler";
  const pin = escapeHtml(opts.pin);

  return [
    "<!doctype html>",
    '<html lang="en">',
    "<head>",
    '<meta charset="utf-8" />',
    '<meta name="viewport" content="width=device-width" />',
    "<title>Your new Social Features PIN</title>",
    "</head>",
    '<body style="margin:0;background:#f4f6f8;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Arial">',
    '<div style="display:none;font-size:1px;color:#f4f6f8;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden">Your new Social Features PIN is ready.</div>',
    '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:32px 0;">',
    '<tr><td align="center">',
    '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:540px;background:#ffffff;border-radius:16px;border:1px solid #e5e7eb;box-shadow:0 10px 28px rgba(15,23,42,.08);">',
    '<tr><td align="center" style="padding:24px 20px">',
    '<table role="presentation" width="auto" cellspacing="0" cellpadding="0" align="center">',
    '<tr>',
    '<td style="vertical-align:middle"><img src="https://ketravelan.com/ketravelan_logo.png" alt="Ketravelan" style="display:block;border:0;outline:none;text-decoration:none;height:28px;width:auto" /></td>',
    '</tr>',
    '</table>',
    '</td></tr>',
    '<tr><td style="height:1px;background:#e5e7eb" aria-hidden="true"></td></tr>',
    '<tr><td style="padding:28px">',
    '<h1 style="font-size:22px;font-weight:700;margin:0 0 10px;color:#020617;text-align:center">Your new Social Features PIN</h1>',
    `<p style="font-size:15px;line-height:1.7;color:#475569;margin:0 0 24px;text-align:center">Hi <strong>${displayName}</strong>, we created a fresh 4-digit PIN for your Social Features Level settings.</p>`,
    '<div style="margin:0 auto 24px;max-width:280px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:16px;padding:18px 16px;text-align:center">',
    '<div style="font-size:12px;letter-spacing:0.12em;text-transform:uppercase;color:#64748b;margin-bottom:10px">Your PIN</div>',
    `<div style="font-size:34px;font-weight:800;letter-spacing:0.28em;color:#020617;font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;padding-left:0.28em">${pin}</div>`,
    '</div>',
    '<p style="font-size:13px;line-height:1.65;color:#64748b;margin:0;text-align:center">Use this PIN to change your Social Features Level in the app. If you did not request this, you can ignore this email.</p>',
    '</td></tr>',
    '<tr><td style="padding:0 28px 24px;font-size:12px;color:#64748b;line-height:1.6">',
    '<strong>The Ketravelan Crew</strong>',
    '</td></tr>',
    '</table>',
    '</td></tr>',
    '</table>',
    '</body>',
    '</html>',
  ].join("");
}

interface SocialPinResetRequest {
  dryRun?: boolean;
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

    const authHeader = req.headers.get("authorization") || req.headers.get("Authorization");
    const token = authHeader?.replace(/^Bearer\s+/i, "");
    if (!token) {
      return new Response(JSON.stringify({ error: "Missing authorization token" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const { data: authData, error: authErr } = await admin.auth.getUser(token);
    if (authErr || !authData?.user) {
      throw new Error(authErr?.message || "Failed to authenticate user");
    }

    const user = authData.user;
    if (!user.email) {
      return new Response(JSON.stringify({ error: "No email address found for this account" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const body = (await req.json().catch(() => ({}))) as SocialPinResetRequest;
    const newPin = generatePin();
    const newHash = hashSocialPin(newPin);

    const { error: updateError } = await admin
      .from("profiles")
      .update({ social_features_pin_hash: newHash })
      .eq("id", user.id);

    if (updateError) {
      throw updateError;
    }

    if (!body.dryRun) {
      const displayName = user.user_metadata?.full_name || user.user_metadata?.name || user.email.split("@")[0];
      const subject = "Your new Social Features PIN";
      const html = buildHtmlEmail({ userName: displayName, pin: newPin });
      const text = [
        "Your new Social Features PIN",
        "",
        `Hi ${displayName},`,
        "",
        `Your new 4-digit PIN is: ${newPin}`,
        "",
        "Use this PIN to change your Social Features Level in the app.",
        "",
        "If you did not request this, you can ignore this email.",
        "",
        "The Ketravelan Crew",
      ].join("\n");

      await sendResendRawEmail({
        to: user.email,
        subject,
        html,
        text,
      });
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unexpected error";
    console.error("send-social-pin-reset error:", err);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
