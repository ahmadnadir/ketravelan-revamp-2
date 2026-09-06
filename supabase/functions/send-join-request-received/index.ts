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
  tripTitle: string;
  requesterName: string;
  destination?: string | null;
  coverImage?: string | null;
  messageHtml: string;
  approvalsUrl: string;
}) {
  const tripTitle = escapeHtml(opts.tripTitle);
  const requesterName = escapeHtml(opts.requesterName);
  const destination = opts.destination ? escapeHtml(opts.destination) : "";
  const approvalsUrl = escapeHtml(opts.approvalsUrl);
  const coverImage = opts.coverImage ? escapeHtml(opts.coverImage) : "";
  const coverBlock = coverImage
    ? `<tr><td style="padding:0 28px 20px;"><img src="${coverImage}" alt="Trip cover" style="width:100%;height:auto;display:block;border-radius:14px;border:1px solid #e2e8f0;" /></td></tr>`
    : "";

  return [
    "<!DOCTYPE html>",
    '<html lang="en"><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width" /><title>Join request</title></head>',
    '<body style="margin:0;background:#f4f6f8;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Arial">',
    '<div style="display:none;font-size:1px;color:#f4f6f8;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden">A new traveler wants to join your trip.</div>',
    '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:32px 0;"><tr><td align="center">',
    '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:520px;background:#ffffff;border-radius:16px;border:1px solid #e5e7eb;box-shadow:0 10px 28px rgba(15,23,42,.08);">',
    '<tr><td align="center" style="padding:24px 20px"><img src="https://ketravelan.com/ketravelan_logo.png" alt="Ketravelan" style="display:block;border:0;height:28px;width:auto" /></td></tr>',
    '<tr><td style="height:1px;background:#e5e7eb" aria-hidden="true"></td></tr>',
      `<tr><td style="padding:24px 28px 10px;text-align:center"><h1 style="font-size:22px;font-weight:800;margin:0 0 6px;color:#0f172a">Someone wants to join your trip</h1><div style="font-size:14px;color:#475569;line-height:1.6">${requesterName} sent a request to join.</div></td></tr>`,
    coverBlock,
      `<tr><td style="padding:16px 28px 10px"><div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:14px;padding:16px 18px"><div style="font-size:12px;color:#64748b;text-transform:uppercase;letter-spacing:.08em;font-weight:600">Trip</div><div style="font-size:18px;font-weight:700;color:#0f172a;margin-top:6px">${tripTitle}</div>${destination ? `<div style="font-size:13px;color:#64748b;margin-top:6px">${destination}</div>` : ""}</div></td></tr>`,
      `<tr><td style="padding:10px 28px 26px;text-align:center"><a href="${approvalsUrl}" target="_blank" style="display:inline-block;padding:14px 28px;border-radius:12px;background:#0f172a;color:#ffffff;text-decoration:none;font-weight:700">Review Request</a><div style="margin-top:18px;font-size:11px;color:#94a3b8">You are receiving this because you are a host or co-host of this trip.</div></td></tr>`,
    "</table></td></tr></table>",
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
      .select("id, title, destination, cover_image, creator_id, slug")
      .eq("id", body.tripId)
      .maybeSingle();
    if (tripErr) throw tripErr;
    if (!trip) throw new Error("Trip not found");

    const { data: memberships, error: membershipsErr } = await admin
      .from("trip_members")
      .select("user_id, is_admin, role")
      .eq("trip_id", trip.id)
      .is("left_at", null);
    if (membershipsErr) throw membershipsErr;

    const managerIds = Array.from(new Set([
      trip.creator_id,
      ...(memberships || [])
        .filter((member) => member.is_admin === true || ["organizer", "co-host", "cohost", "admin", "host"].includes((member.role || "").toLowerCase()))
        .map((member) => member.user_id),
    ].filter(Boolean)));

    const { data: managerProfiles, error: managerProfilesErr } = await admin
      .from("profiles")
      .select("id, email_notifications, full_name")
      .in("id", managerIds);
    if (managerProfilesErr) throw managerProfilesErr;

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
      tripTitle: trip.title,
      requesterName,
      destination: trip.destination,
      coverImage: trip.cover_image,
      messageHtml,
      approvalsUrl,
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
            to: managerProfiles?.map((profile) => profile.full_name),
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

          const emailFailures: string[] = [];
    const emailFailureReasons: string[] = [];

    for (const manager of managerProfiles || []) {
      if (manager.email_notifications !== false) {
        const { data: managerUser, error: managerUserErr } = await admin.auth.admin.getUserById(manager.id);
        if (managerUserErr || !managerUser?.user?.email) {
          emailFailures.push(manager.id);
          emailFailureReasons.push("Manager email could not be resolved");
          console.warn("Unable to resolve manager email", { managerId: manager.id, managerUserErr });
          continue;
        }
        try {
          await sendResendRawEmail({
            to: managerUser.user.email,
            subject,
            html,
            text,
          });
        } catch (emailErr) {
          emailFailures.push(manager.id);
          emailFailureReasons.push(emailErr instanceof Error ? emailErr.message : "Resend rejected the template email");
          console.warn("Failed to send join request email", { managerId: manager.id, emailErr });
        }
      }
    }

    if (managerIds.length > 0) {
      await sendSystemPush({
        userIds: managerIds,
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
    }

    if (emailFailures.length > 0) {
      return new Response(JSON.stringify({
        error: "Join request was created, but notification email delivery failed.",
        failedManagerCount: emailFailures.length,
        deliveryError: emailFailureReasons[0] || "Unknown delivery error",
      }), {
        status: 502,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

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
