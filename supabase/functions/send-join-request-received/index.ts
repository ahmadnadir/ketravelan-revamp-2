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
  ctaLabel?: string;
}) {
  const ctaUrlEsc = escapeHtml(opts.ctaUrl);
  return [
    "<!DOCTYPE html>",
    "<html>",
    "<head>",
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width">',
    "<style>",
    "  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif; }",
    "  .container { max-width: 600px; margin: 0 auto; padding: 20px; }",
    "  .button { background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block; }",
    "</style>",
    "</head>",
    "<body>",
    '<table style="margin:0;padding:0;width:100%;border-collapse:collapse"><tbody><tr><td style="margin:0;padding:0">',
    '<table style="margin:0;padding:0;width:100%;border-collapse:collapse"><tbody>',
    '<tr><td style="padding:32px 28px;font-size:14px;line-height:1.6">',
    '<h2 style="margin:0 0 16px 0;font-size:20px;font-weight:600">' + escapeHtml(opts.title) + "</h2>",
    "<p>" + opts.messageHtml + "</p>",
    opts.ctaLabel ? `<p><a href="${ctaUrlEsc}" style="background-color:#2563eb;color:white;padding:12px 24px;text-decoration:none;border-radius:4px;display:inline-block">${escapeHtml(opts.ctaLabel)}</a></p>` : "",
    "</td></tr>",
    '<tr><td style="padding:24px 28px;font-size:12px;color:#64748b;line-height:1.6">',
    "The Ketravelan Crew",
    "</td></tr>",
    "</tbody></table>",
    "</td></tr></tbody></table>",
    "</body>",
    "</html>",
  ].join("");
}

interface JoinRequestReceivedRequest {
  tripId: string;
  requesterId: string;
  requesterName?: string;
  dryRun?: boolean;
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
    const body = await req.json() as JoinRequestReceivedRequest;
    if (!body?.tripId || !body?.requesterId) {
      return new Response(JSON.stringify({ error: "Missing tripId or requesterId" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const { data: trip, error: tripErr } = await admin
      .from("trips")
      .select("id, title, destination, creator_id, slug")
      .eq("id", body.tripId)
      .maybeSingle();
    if (tripErr) throw tripErr;
    if (!trip) throw new Error("Trip not found");

    const { data: creatorProfile, error: creatorErr } = await admin
      .from("profiles")
      .select("id, email_notifications, full_name")
      .eq("id", trip.creator_id)
      .maybeSingle();
    if (creatorErr) throw creatorErr;

    const { data: requesterProfile, error: requesterErr } = await admin
      .from("profiles")
      .select("full_name, username")
      .eq("id", body.requesterId)
      .maybeSingle();
    if (requesterErr) throw requesterErr;

    const requesterName = body.requesterName || requesterProfile?.full_name || requesterProfile?.username || "A traveler";
    const approvalsUrl = `${SITE_ORIGIN}/approvals`;
    const tripUrl = `${SITE_ORIGIN}/trip/${trip.slug || trip.id}`;

    const subject = `New join request for ${trip.title}`;
    const messageHtml = `<strong>${escapeHtml(requesterName)}</strong> wants to join <strong>${escapeHtml(trip.title)}</strong> (${escapeHtml(trip.destination || "")}).`;

    const html = buildHtmlEmail({
      brand: "Ketravelan",
      title: "Someone wants to join your trip",
      messageHtml,
      ctaUrl: approvalsUrl,
      logoUrl: "https://ketravelan.com/ketravelan_logo.png",
      ctaLabel: "Review Request",
    });

    const text = [
      subject,
      `${requesterName} wants to join ${trip.title} (${trip.destination || ""})`,
      `Review: ${approvalsUrl}`,
      "",
      "The Ketravelan Crew",
    ].join("\n");

    if (body.dryRun) {
      return new Response(
        JSON.stringify({
          ok: true,
          preview: {
            html,
            text,
            approvalsUrl,
            tripUrl,
            to: creatorProfile?.full_name,
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Send email if creator has email notifications enabled
    if (creatorProfile?.email_notifications !== false) {
      const { data: creatorUser, error: creatorUserErr } = await admin.auth.admin.getUserById(trip.creator_id);
      if (!creatorUserErr && creatorUser?.user?.email) {
        try {
          await sendResendRawEmail({
            to: creatorUser.user.email,
            subject,
            html,
            text,
          });
        } catch (emailErr) {
          console.warn("Failed to send email", emailErr);
        }
      }
    }

    // Send push notification
    await sendSystemPush({
      userIds: [trip.creator_id],
      type: "join_request_received",
      title: "New join request",
      body: `${requesterName} wants to join ${trip.title}`,
      actionUrl: "/approvals",
      priority: "high",
      metadata: {
        trip_id: trip.id,
        requester_id: body.requesterId,
        requester_name: requesterName,
      },
    });

    return new Response(JSON.stringify({ ok: true }), {
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
