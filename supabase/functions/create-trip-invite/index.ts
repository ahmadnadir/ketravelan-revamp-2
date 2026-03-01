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

function escapeHtml(value: string) {
  return value
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

function buildInviteEmail(opts: {
  tripTitle: string;
  inviterName: string;
  approvalsUrl: string;
  tripUrl: string;
  coverImage?: string | null;
}) {
  const tripTitle = escapeHtml(opts.tripTitle);
  const inviterName = escapeHtml(opts.inviterName);
  const approvalsUrl = escapeHtml(opts.approvalsUrl);
  const tripUrl = escapeHtml(opts.tripUrl);
  const coverImage = opts.coverImage ? escapeHtml(opts.coverImage) : "";
  const preheader = `Your spot is waiting for ${tripTitle}`;
  const logoUrl = "https://ketravelan.xyz/ketravelan_logo.png";
  const coverBlock = coverImage
    ? [
        '<tr><td style="padding:0 28px;">',
        `<img src="${coverImage}" alt="Trip cover" style="width:100%;height:auto;display:block;border-radius:14px;border:1px solid #e2e8f0;" />`,
        '<div style="height:14px;"></div>',
        '</td></tr>'
      ].join("")
    : "";

  return [
    "<!doctype html>",
    '<html lang="en">',
    "<head>",
    '<meta charset="utf-8" />',
    '<meta name="viewport" content="width=device-width" />',
    `<title>Trip invite</title>`,
    "</head>",
    '<body style="margin:0;background:#f4f6f8;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Arial">',
    `<div style="display:none;font-size:1px;color:#f4f6f8;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden">${preheader}</div>`,
    '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:32px 0;">',
    '<tr><td align="center">',
    '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:520px;background:#ffffff;border-radius:16px;border:1px solid #e5e7eb;box-shadow:0 10px 28px rgba(15,23,42,.08);">',
    '<tr><td align="center" style="padding:24px 20px">',
    '<table role="presentation" width="auto" cellspacing="0" cellpadding="0" align="center">',
    '<tr>',
    `<td style="vertical-align:middle"><img src="${logoUrl}" alt="Ketravelan" style="display:block;border:0;outline:none;text-decoration:none;height:28px;width:auto" /></td>`,
    '</tr>',
    '</table>',
    '</td></tr>',
    '<tr><td style="height:1px;background:#e5e7eb;margin:0 28px" aria-hidden="true"></td></tr>',
    '<tr><td style="padding:24px 28px 10px;">',
    `<h1 style="font-size:22px;font-weight:800;margin:0 0 6px;color:#0f172a;text-align:center;">You are invited</h1>`,
    `<div style="font-size:14px;color:#475569;line-height:1.6;text-align:center;">${inviterName} wants you on this trip.</div>`,
    '</td></tr>',
    coverBlock,
    '<tr><td style="padding:16px 28px 10px;">',
    `<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:14px;padding:16px 18px;">`,
    `<div style="font-size:12px;color:#64748b;text-transform:uppercase;letter-spacing:.08em;font-weight:600;">Trip</div>`,
    `<div style="font-size:18px;font-weight:700;color:#0f172a;margin-top:6px;">${tripTitle}</div>`,
    `<div style="font-size:13px;color:#64748b;margin-top:6px;">Confirm to secure your spot and meet the crew.</div>`,
    '</div>',
    '<div style="margin:20px 0 8px;text-align:center;">',
    `<a href="${approvalsUrl}" target="_blank" style="display:inline-block;padding:14px 28px;border-radius:12px;background:#0f172a;color:#ffffff;text-decoration:none;font-weight:700">Accept Invite</a>`,
    '</div>',
    '<div style="text-align:center;font-size:13px;color:#64748b;">',
    'Prefer to check details first? ',
    `<a href="${tripUrl}" style="color:#2563eb;text-decoration:none;">View trip</a>`,
    '</div>',
    '<div style="margin-top:18px;padding:14px 16px;border-top:1px solid #e2e8f0;">',
    '<table role="presentation" width="100%" cellspacing="0" cellpadding="0">',
    '<tr>',
    '<td style="font-size:12px;color:#64748b;line-height:1.6;">',
    'What happens next:',
    '<ul style="margin:8px 0 0 16px;padding:0;">',
    '<li>Review the invite in approvals.</li>',
    '<li>Join the group chat if you accept.</li>',
    '<li>Coordinate details with the organizer.</li>',
    '</ul>',
    '</td>',
    '</tr>',
    '</table>',
    '</div>',
    '</td></tr>',
    '<tr><td style="padding:0 28px 26px;">',
    `<div style="font-size:11px;color:#94a3b8;text-align:center;">This invite was sent by ${inviterName}. If you did not expect this, you can ignore this email.</div>`,
    '</td></tr>',
    '</table>',
    '</td></tr>',
    '</table>',
    '</body>',
    '</html>'
  ].join("");
}

async function sendInviteEmail(opts: {
  inviteeEmail: string;
  inviteeUserId: string;
  inviterId: string;
  tripId: string;
  tripTitle: string;
  coverImage?: string | null;
}) {
  const { data: inviterProfile } = await admin
    .from("profiles")
    .select("full_name, username")
    .eq("id", opts.inviterId)
    .maybeSingle();

  const { data: inviteeProfile } = await admin
    .from("profiles")
    .select("email_notifications")
    .eq("id", opts.inviteeUserId)
    .maybeSingle();

  if (inviteeProfile && inviteeProfile.email_notifications === false) {
    return { skipped: true, reason: "Email notifications disabled" };
  }

  const inviterName = (inviterProfile?.full_name || inviterProfile?.username || "A traveler").trim();
  const approvalsUrl = `${SITE_ORIGIN}/approvals`;
  const tripUrl = `${SITE_ORIGIN}/trip/${opts.tripId}`;
  const subject = `You are invited: ${opts.tripTitle}`;
  const html = buildInviteEmail({ tripTitle: opts.tripTitle, inviterName, approvalsUrl, tripUrl, coverImage: opts.coverImage });
  const text = `${inviterName} invited you to join ${opts.tripTitle}. Accept invite: ${approvalsUrl} View trip: ${tripUrl}`;
  await sendResendRawEmail({ to: opts.inviteeEmail, subject, html, text });
  return { skipped: false };
}

async function createInviteNotification(opts: {
  inviteeUserId: string;
  inviterId: string;
  tripId: string;
  tripTitle: string;
  inviteId: string;
}) {
  try {
    const { data: existing } = await admin
      .from("notifications")
      .select("id")
      .eq("user_id", opts.inviteeUserId)
      .eq("type", "trip_invite")
      .contains("metadata", { invite_id: opts.inviteId })
      .maybeSingle();

    if (existing) return;

    const { data: inviterProfile } = await admin
      .from("profiles")
      .select("full_name, username")
      .eq("id", opts.inviterId)
      .maybeSingle();

    const inviterName = (inviterProfile?.full_name || inviterProfile?.username || "Someone").trim();
    const message = `${inviterName} invited you to join ${opts.tripTitle}.`;

    await admin
      .from("notifications")
      .insert({
        user_id: opts.inviteeUserId,
        type: "trip_invite",
        title: "Trip invite",
        message,
        action_url: "/approvals",
        metadata: {
          trip_id: opts.tripId,
          invite_id: opts.inviteId,
          inviter_id: opts.inviterId,
        },
      });
  } catch (err) {
    console.warn("Failed to create invite notification", err);
  }
}

interface CreateInviteRequest {
  tripId: string;
  inviteeEmail: string;
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
    const body = await req.json() as CreateInviteRequest;
    if (!body?.tripId || !body?.inviteeEmail) {
      return new Response(JSON.stringify({ error: "Missing tripId or inviteeEmail" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const authHeader = req.headers.get("authorization") || req.headers.get("Authorization");
    const token = authHeader?.replace("Bearer ", "");
    if (!token) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const { data: authData, error: authErr } = await admin.auth.getUser(token);
    if (authErr || !authData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const inviterId = authData.user.id;

    const { data: trip, error: tripErr } = await admin
      .from("trips")
      .select("id, creator_id, title, cover_image")
      .eq("id", body.tripId)
      .maybeSingle();

    if (tripErr) throw tripErr;
    if (!trip) throw new Error("Trip not found");
    if (trip.creator_id !== inviterId) {
      return new Response(JSON.stringify({ error: "Only the trip creator can invite" }), {
        status: 403,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const inviteeEmail = body.inviteeEmail.trim().toLowerCase();
    let inviteeUserId: string | null = null;
    let page = 1;
    const perPage = 200;
    while (!inviteeUserId && page <= 5) {
      const { data: usersPage, error: usersErr } = await admin.auth.admin.listUsers({ page, perPage });
      if (usersErr) throw usersErr;
      const match = (usersPage?.users || []).find((u: { email?: string; id: string }) =>
        (u.email || "").toLowerCase() === inviteeEmail
      );
      if (match?.id) inviteeUserId = match.id;
      if ((usersPage?.users || []).length < perPage) break;
      page += 1;
    }

    if (!inviteeUserId) {
      return new Response(JSON.stringify({ error: "User not found for this email" }), {
        status: 404,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const { data: existing } = await admin
      .from("trip_invites")
      .select("id, status")
      .eq("trip_id", body.tripId)
      .eq("invitee_user_id", inviteeUserId)
      .in("status", ["pending"]) 
      .maybeSingle();

    if (existing) {
      const resendResult = await sendInviteEmail({
        inviteeEmail,
        inviteeUserId,
        inviterId,
        tripId: trip.id,
        tripTitle: trip.title,
        coverImage: trip.cover_image,
      });
      await createInviteNotification({
        inviteeUserId,
        inviterId,
        tripId: trip.id,
        tripTitle: trip.title,
        inviteId: existing.id,
      });
      return new Response(JSON.stringify({
        ok: true,
        inviteId: existing.id,
        resent: !resendResult.skipped,
        skipped: resendResult.skipped,
        reason: resendResult.skipped ? resendResult.reason : "Invite re-sent",
      }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    if (body.dryRun) {
      return new Response(JSON.stringify({ ok: true, preview: { inviterId, inviteeUserId, tripId: trip.id } }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const { data: inviteRow, error: inviteErr } = await admin
      .from("trip_invites")
      .insert({
        trip_id: body.tripId,
        inviter_id: inviterId,
        invitee_email: inviteeEmail,
        invitee_user_id: inviteeUserId,
        status: "pending",
      })
      .select("id")
      .single();

    if (inviteErr) throw inviteErr;

    await sendInviteEmail({
      inviteeEmail,
      inviteeUserId,
      inviterId,
      tripId: trip.id,
      tripTitle: trip.title,
      coverImage: trip.cover_image,
    });

    if (inviteRow?.id) {
      await createInviteNotification({
        inviteeUserId,
        inviterId,
        tripId: trip.id,
        tripTitle: trip.title,
        inviteId: inviteRow.id,
      });
    }

    return new Response(JSON.stringify({ ok: true, inviteId: inviteRow?.id }), {
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
