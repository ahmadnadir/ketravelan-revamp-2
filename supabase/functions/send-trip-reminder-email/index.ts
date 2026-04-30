// deno-lint-ignore-file no-explicit-any
declare const Deno: { env: { get(name: string): string | undefined } };
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const RESEND_FROM = Deno.env.get("RESEND_FROM") ?? "Ketravelan <no-reply@ketravelan.com>";
const SITE_URL = Deno.env.get("SITE_URL") ?? "https://ketravelan.com";

const SITE_ORIGIN = (() => {
  try {
    return new URL(SITE_URL).origin;
  } catch {
    const m = SITE_URL.match(/^(https?:\/\/[^/]+)/);
    return m ? m[1] : "https://ketravelan.com";
  }
})();

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

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
  const preheader = `Your trip is coming up!`;
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
    `<h1 style="font-size:22px;font-weight:700;margin:0 0 8px;color:#020617;text-align:center">${title}</h1>`,
    `<div style="font-size:15px;line-height:1.65;color:#475569;margin-bottom:24px;text-align:center">${opts.messageHtml}</div>`,
    '<table role="presentation" cellspacing="0" cellpadding="0" width="100%"><tr><td align="center">',
    `<a href="${ctaUrlEsc}" target="_blank" style="display:inline-block;padding:14px 26px;border-radius:10px;background:#000000;color:#ffffff;text-decoration:none;font-weight:600">View Trip Details</a>`,
    '</td></tr></table>',
    '</td></tr>',
    '<tr><td style="padding:24px 28px;font-size:12px;color:#64748b;line-height:1.6">',
    'Get ready for your adventure!<br><br>',
    'If the button doesn&#39;t work, copy this link:<br>',
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

interface TripReminderRequest {
  tripId: string;
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
    const body = await req.json() as TripReminderRequest;
    if (!body?.tripId) {
      return new Response(JSON.stringify({ error: "Missing tripId" }), { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    // Fetch trip details
    const { data: trip, error: tripErr } = await admin
      .from("trips")
      .select("id, title, destination, start_date, creator_id, slug")
      .eq("id", body.tripId)
      .maybeSingle();

    if (tripErr) throw tripErr;
    if (!trip) throw new Error("Trip not found");

    // Fetch creator profile
    const { data: creatorProfile, error: profErr } = await admin
      .from("profiles")
      .select("full_name, email_notifications, trip_reminders")
      .eq("id", trip.creator_id)
      .maybeSingle();

    if (profErr) throw profErr;

    // Check if user has trip reminders enabled
    if (creatorProfile?.trip_reminders === false) {
      return new Response(
        JSON.stringify({ ok: true, skipped: true, reason: "Trip reminders disabled by user" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Also check email notifications as fallback
    if (creatorProfile?.email_notifications === false) {
      return new Response(
        JSON.stringify({ ok: true, skipped: true, reason: "Email notifications disabled" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Fetch creator email
    const { data: creatorUser, error: userErr } = await admin.auth.admin.getUserById(trip.creator_id);
    if (userErr) throw userErr;

    const creatorEmail = creatorUser?.user?.email;
    if (!creatorEmail) {
      return new Response(JSON.stringify({ ok: false, error: "Creator email not found" }), { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    const creatorName = creatorProfile?.full_name?.split(" ")[0] || "Traveler";
    const tripIdentifier = trip.slug || trip.id;
    const tripUrl = `${SITE_ORIGIN}/trip/${tripIdentifier}`;
    
    // Format the start date nicely
    const startDate = trip.start_date ? new Date(trip.start_date) : null;
    const dateStr = startDate ? startDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : 'TBA';
    
    const subject = `Get ready! Your trip to ${trip.destination} starts ${dateStr} 🚀`;
    const greet = `Hi <strong>${escapeHtml(creatorName)}</strong>,<br><br>`;
    const messageHtml = `${greet}Your trip to <strong>${escapeHtml(trip.destination || "Adventure Land")}</strong> is coming up on <strong>${dateStr}</strong>.<br><br>Make sure everything is ready and review the trip details below!`;

    const html = buildHtmlEmail({
      brand: "Ketravelan",
      title: "Trip Reminder 📅",
      messageHtml,
      ctaUrl: tripUrl,
      logoUrl: "https://ketravelan.com/ketravelan_logo.png",
    });

    const text = [
      "Trip Reminder",
      "",
      `Hi ${creatorName},`,
      "",
      `Your trip to ${trip.destination} is coming up on ${dateStr}.`,
      "",
      "Make sure everything is ready and review the trip details.",
      "",
      `View trip: ${tripUrl}`,
      "",
      "The Ketravelan Crew",
    ].join("\n");

    // Dry-run mode
    if (body.dryRun) {
      return new Response(
        JSON.stringify({ ok: true, preview: { html, text, creatorEmail, tripUrl, dateStr } }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    await sendResendRawEmail({ to: creatorEmail, subject, html, text });

    // Fetch all trip members to send push notifications
    const { data: tripMembers, error: membersErr } = await admin
      .from("trip_members")
      .select("user_id")
      .eq("trip_id", trip.id);

    if (membersErr) throw membersErr;

    const memberUserIds = (tripMembers || []).map(m => m.user_id);

    if (memberUserIds.length > 0) {
      await sendSystemPush({
        userIds: memberUserIds,
        type: "trip_starting_soon",
        title: "Trip Starting Tomorrow",
        body: `Trip starts tomorrow 🌄 Get ready for ${trip.title}`,
        actionUrl: `/trip/${trip.slug || trip.id}`,
        priority: "high",
        metadata: {
          trip_id: trip.id,
          destination: trip.destination,
        },
      });
    }

    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unexpected error";
    return new Response(JSON.stringify({ error: message }), { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } });
  }
});
