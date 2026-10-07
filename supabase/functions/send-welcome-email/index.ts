// deno-lint-ignore-file no-explicit-any
declare const Deno: { env: { get(name: string): string | undefined } };
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { buildHtmlEmail, escapeHtml } from "../_shared/email_template.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const RESEND_FROM = Deno.env.get("RESEND_FROM") ?? "Ketravelan <no-reply@ketravelan.com>";
const SITE_URL = Deno.env.get("SITE_URL") ?? "https://ketravelan.com";
// Ensure we use only the origin (scheme + host) for building links
const SITE_ORIGIN = (() => {
  try {
    return new URL(SITE_URL).origin;
  } catch {
    // Fallback: strip any path after host
    const m = SITE_URL.match(/^(https?:\/\/[^/]+)/);
    return m ? m[1] : "https://ketravelan.com";
  }
})();

function buildCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("origin") || "*";
  const allowedOrigins = new Set([
    "http://localhost:8080",
    "http://127.0.0.1:8080",
    "https://ketravelan.com",
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

interface WelcomeEmailRequest {
  email: string;
  userName?: string;
  dryRun?: boolean;
}

serve(async (req: Request) => {
  const corsHeaders = buildCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: { "Content-Type": "application/json", ...corsHeaders } });
  }
  try {
    const body = await req.json() as WelcomeEmailRequest;
    if (!body?.email) {
      return new Response(JSON.stringify({ error: "Missing email" }), { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }
    const displayName = body.userName?.trim();
    const subject = "Thank you for onboarding with Ketravelan";
    const exploreUrl = `${SITE_ORIGIN}/explore`;
    const greet = displayName ? `Hi <strong>${escapeHtml(displayName)}</strong>,<br><br>` : "";
    const html = buildHtmlEmail({
      brand: "Ketravelan",
      title: "You're all set! 🎉",
      messageHtml: `${greet}Discover trips, connect with fellow travelers, and start planning your next adventure.`,
      ctaUrl: exploreUrl,
      ctaLabel: "Start Exploring",
      logoUrl: "https://ketravelan.com/ketravelan_logo.png",
      preheader: "You're all set on Ketravelan!",
      footerText: "You received this because you completed onboarding at Ketravelan.",
      signoff: "The Ketravelan Crew",
    });
    const text = [
      "Thank you for onboarding with Ketravelan",
      "",
      displayName ? `Hi ${displayName},` : undefined,
      "",
      "Discover trips, connect with fellow travelers, and start planning your next adventure.",
      "",
      `Explore: ${exploreUrl}`,
      "",
      "The Ketravelan Crew",
    ].filter(Boolean).join("\n");

    // Dry-run preview mode: return the rendered content without sending
    if (body.dryRun) {
      return new Response(
        JSON.stringify({ ok: true, preview: { html, text, exploreUrl } }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }
    await sendResendRawEmail({ to: body.email, subject, html, text });
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unexpected error";
    return new Response(JSON.stringify({ error: message }), { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } });
  }
});
