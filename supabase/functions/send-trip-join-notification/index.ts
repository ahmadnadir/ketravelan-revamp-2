// deno-lint-ignore-file no-explicit-any
declare const Deno: { env: { get(name: string): string | undefined } };
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const RESEND_FROM = Deno.env.get("RESEND_FROM") ?? "Ketravelan <no-reply@ketravelan.xyz>";
const SITE_URL = Deno.env.get("SITE_URL") ?? "https://ketravelan.xyz";

const SITE_ORIGIN = (() => {
  try {
    return new URL(SITE_URL).origin;
  } catch {
    const m = SITE_URL.match(/^(https?:\/\/[^/]+)/);
    return m ? m[1] : "https://ketravelan.xyz";
  }
})();

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function sendSystemPush(payload: Record<string, unknown>) {
  try {
    await admin.functions.invoke("send-system-push", {
      body: payload,
      headers: { Authorization: `Bearer ${SERVICE_ROLE_KEY}` },
    });
  } catch (err) {
    console.warn("Failed to send system push", err);
  }
}

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
  const preheader = `New join request on ${brand}`;
  const ctaUrlEsc = escapeHtml(opts.ctaUrl);
  const logoUrlEsc = escapeHtml(opts.logoUrl);

  return [
    "<!doctype html>",
    "<html lang=\"en\">",
    "<head>",
    "<meta charset=\"utf-8\" />",
    "<meta name=\"viewport\" content=\"width=device-width\" />",
    `<title>${brand}</title>`,
    "</head>",
    '<body style="margin:0;background:#f4f6f8;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Arial">',
    `<div style="display:none;font-size:1px;color:#f4f6f8;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden">${preheader}</div>`,
    '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:32px 0;">',
    '<tr><td align="center">',
    '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:520px;background:#ffffff;border-radius:16px;border:1px solid #e5e7eb;box-shadow:0 10px 28px rgba(15,23,42,.08);">',
    '<tr><td align="center" style="padding:24px 20px">',
    '<table role="presentation" width="auto" cellspacing="0" cellpadding="0" align="center">',
    '<tr>',
    `<td style="vertical-align:middle"><img src="${logoUrlEsc}" alt="${brand}" style="display:block;border:0;outline:none;text-decoration:none;height:28px;width:auto" /></td>`,
    '</tr>',
    '</table>',
    '</td></tr>',
    '<tr><td style="height:1px;background:#e5e7eb;margin:0 28px" aria-hidden="true"></td></tr>',
    '<tr><td style="padding:28px">',
    `<h1 style="font-size:20px;font-weight:700;margin:0 0 8px;color:#020617;text-align:center">${title}</h1>`,
    `<div style="font-size:15px;line-height:1.65;color:#475569;margin-bottom:24px;text-align:center">${opts.messageHtml}</div>`,
    '<table role="presentation" cellspacing="0" cellpadding="0" width="100%"><tr><td align="center">',
    `<a href="${ctaUrlEsc}" target="_blank" style="display:inline-block;padding:14px 26px;border-radius:10px;background:#000000;color:#ffffff;text-decoration:none;font-weight:600">Review Requests</a>`,
    '</td></tr></table>',
    '</td></tr>',
    '<tr><td style="padding:24px 28px;font-size:12px;color:#64748b;line-height:1.6">',
    'You received this because you own this trip on Ketravelan.<br><br>',
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

interface JoinNotifyRequest {
  tripId: string;
  requesterId?: string;
  requesterName?: string;
  requesterMessage?: string;
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
    const body = await req.json() as JoinNotifyRequest;
    if (!body?.tripId) {
      return new Response(JSON.stringify({ error: "Missing tripId" }), { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    const { data: trip, error: tripErr } = await admin
      .from("trips")
      .select("id,title,destination,creator_id")
      .eq("id", body.tripId)
      .maybeSingle();
    if (tripErr) throw tripErr;
    if (!trip) throw new Error("Trip not found");

    const { data: ownerProfile, error: profErr } = await admin
      .from("profiles")
      .select("id, full_name, email_notifications")
      .eq("id", trip.creator_id)
      .maybeSingle();
    if (profErr) throw profErr;

    const { data: ownerUser, error: ownerErr } = await admin.auth.admin.getUserById(trip.creator_id);
    if (ownerErr) throw ownerErr;
    const ownerEmail = ownerUser?.user?.email;
    if (!ownerEmail) {
      return new Response(JSON.stringify({ ok: false, error: "Owner email not found" }), { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    if (ownerProfile && ownerProfile.email_notifications === false) {
      return new Response(JSON.stringify({ ok: true, skipped: true, reason: "Email notifications disabled" }), { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    const requesterName = (body.requesterName || "A traveler").trim();
    const msg = body.requesterMessage?.trim();

    const approvalsUrl = `${SITE_ORIGIN}/approvals`;
    const tripUrl = `${SITE_ORIGIN}/trip/${trip.id}`;

    const subject = `Join request for ${trip.title}`;
    const greet = requesterName ? `New request from <strong>${escapeHtml(requesterName)}</strong>.` : "New join request.";
    const extra = msg ? `<br/><br/><em>Message:</em><br/>${escapeHtml(msg)}` : "";
    const messageHtml = `${greet}<br/>Trip: <strong>${escapeHtml(trip.title)}</strong> (${escapeHtml(trip.destination || "")})<br/><br/>View trip: <a href="${escapeHtml(tripUrl)}">${escapeHtml(tripUrl)}</a>${extra}`;

    const html = buildHtmlEmail({
      brand: "Ketravelan",
      title: "Someone wants to join your trip",
      messageHtml,
      ctaUrl: approvalsUrl,
      logoUrl: "https://ketravelan.xyz/ketravelan_logo.png",
    });

    const textParts = [
      `Join request for ${trip.title}`,
      requesterName ? `New request from ${requesterName}.` : "New join request.",
      `Trip: ${trip.title} (${trip.destination || ""})`,
      `View trip: ${tripUrl}`,
      msg ? `Message: ${msg}` : undefined,
      `Review: ${approvalsUrl}`,
      "",
      "The Ketravelan Crew",
    ].filter(Boolean).join("\n");

    if (body.dryRun) {
      return new Response(JSON.stringify({ ok: true, preview: { html, text: textParts, approvalsUrl, tripUrl, ownerEmail } }), { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    await sendResendRawEmail({ to: ownerEmail, subject, html, text: textParts });

    await sendSystemPush({
      userIds: [trip.creator_id],
      type: "trip_join_request",
      title: "New join request",
      body: `${requesterName} wants to join ${trip.title}`,
      actionUrl: "/approvals",
      priority: "high",
      metadata: {
        trip_id: trip.id,
        requester_id: body.requesterId || null,
      },
    });
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unexpected error";
    return new Response(JSON.stringify({ error: message }), { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } });
  }
});
