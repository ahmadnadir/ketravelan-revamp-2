/* eslint-disable @typescript-eslint/no-explicit-any */
// deno-lint-ignore-file no-explicit-any
declare const Deno: { env: { get(name: string): string | undefined } };
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const RESEND_FROM = Deno.env.get("RESEND_FROM") ?? "Ketravelan <no-reply@ketravelan.xyz>";
const SITE_URL = Deno.env.get("SITE_URL") ?? "https://ketravelan.xyz";

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

function buildSettlementReminderEmail(opts: {
  recipientName: string;
  payerName: string;
  tripName: string;
  amount: string;
  currency: string;
  message: string;
  tripUrl: string;
  logoUrl: string;
}) {
  const brand = "Ketravelan";
  const recipientNameEsc = escapeHtml(opts.recipientName);
  const payerNameEsc = escapeHtml(opts.payerName);
  const tripNameEsc = escapeHtml(opts.tripName);
  const amountEsc = escapeHtml(opts.amount);
  const currencyEsc = escapeHtml(opts.currency);
  const messageEsc = escapeHtml(opts.message);
  const tripUrlEsc = escapeHtml(opts.tripUrl);
  const logoUrlEsc = escapeHtml(opts.logoUrl);

  return [
    "<!doctype html>",
    '<html lang="en">',
    "<head>",
    '<meta charset="utf-8" />',
    '<meta name="viewport" content="width=device-width" />',
    `<title>${brand}</title>`,
    "</head>",
    '<body style="margin:0;background:#f4f6f8;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Arial">',
    '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:32px 0;">',
    "<tr><td align=\"center\">",
    '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:520px;background:#ffffff;border-radius:16px;border:1px solid #e5e7eb;box-shadow:0 10px 28px rgba(15,23,42,.08);">',
    '<tr><td align="center" style="padding:24px 20px">',
    '<table role="presentation" width="auto" cellspacing="0" cellpadding="0" align="center">',
    "<tr>",
    `<td style="vertical-align:middle"><img src="${logoUrlEsc}" alt="${brand}" style="display:block;border:0;outline:none;text-decoration:none;height:28px;width:auto" /></td>`,
    "</tr>",
    "</table>",
    "</td></tr>",
    '<tr><td style="height:1px;background:#e5e7eb;margin:0 28px" aria-hidden="true"></td></tr>',
    '<tr><td style="padding:28px">',
    '<h1 style="font-size:22px;font-weight:700;margin:0 0 8px;color:#020617;text-align:center">Payment Reminder</h1>',
    '<div style="font-size:15px;line-height:1.65;color:#475569;margin-bottom:24px;text-align:center">',
    `Hi <strong>${recipientNameEsc}</strong>,<br><br>`,
    `<strong>${payerNameEsc}</strong> sent you a payment reminder for <strong>${tripNameEsc}</strong>.`,
    "</div>",
    '<div style="background:#f8fafc;border-radius:8px;padding:16px;margin:16px 0;border:1px solid #e2e8f0;text-align:center">',
    '<div style="font-size:14px;color:#64748b;margin-bottom:4px">Amount Due:</div>',
    `<div style="font-size:28px;font-weight:700;color:#0f172a">${currencyEsc} ${amountEsc}</div>`,
    "</div>",
    `<div style="background:#f8fafc;border-radius:8px;padding:16px;margin:16px 0;border:1px solid #e2e8f0;font-size:14px;line-height:1.6;color:#0f172a">${messageEsc}</div>`,
    '<table role="presentation" cellspacing="0" cellpadding="0" width="100%"><tr><td align="center">',
    `<a href="${tripUrlEsc}" target="_blank" style="display:inline-block;padding:14px 26px;border-radius:10px;background:#000000;color:#ffffff;text-decoration:none;font-weight:600;font-size:15px">View Trip</a>`,
    "</td></tr></table>",
    "</td></tr>",
    '<tr><td style="padding:24px 28px;font-size:12px;color:#64748b;line-height:1.6">',
    "Thank you for keeping your trip finances organized!<br><br>",
    "If the button doesn&#39;t work, copy this link:<br>",
    `<a href="${tripUrlEsc}" style="color:#2563eb;word-break:break-all">${tripUrlEsc}</a><br><br>`,
    "<strong>The Ketravelan Crew</strong>",
    "</td></tr>",
    "</table>",
    "</td></tr>",
    "</table>",
    "</body>",
    "</html>",
  ].join("");
}

interface SettlementReminderRequest {
  tripId: string;
  payerId: string;
  recipientId: string;
  amount: number;
  currency?: string;
  message: string;
  channels?: string[];
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
    const body = await req.json() as SettlementReminderRequest;
    const tripId = body?.tripId;
    const payerId = body?.payerId;
    const recipientId = body?.recipientId;
    const amount = Number(body?.amount ?? 0);
    const message = (body?.message || "").trim();
    const currency = body?.currency || "MYR";
    const channels = Array.isArray(body?.channels) && body.channels.length > 0
      ? body.channels
      : ["notification", "chat", "email"];

    if (!tripId || !payerId || !recipientId || !message || !Number.isFinite(amount)) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const { data: trip } = await admin
      .from("trips")
      .select("id, title")
      .eq("id", tripId)
      .maybeSingle();

    const { data: profiles } = await admin
      .from("profiles")
      .select("id, username, full_name")
      .in("id", [payerId, recipientId]);

    const payerProfile = profiles?.find((p: any) => p.id === payerId);
    const recipientProfile = profiles?.find((p: any) => p.id === recipientId);

    const payerName = payerProfile?.full_name || payerProfile?.username || "Trip member";
    const recipientName = recipientProfile?.full_name || recipientProfile?.username || "Trip member";

    let recipientEmail: string | null = null;
    try {
      const { data: userData } = await admin.auth.admin.getUserById(recipientId);
      recipientEmail = userData?.user?.email || null;
    } catch (err) {
      console.error("Failed to fetch recipient email:", err);
    }

    const tripName = trip?.title || "Your Trip";
    const tripUrl = `${SITE_URL}/trip/${tripId}?tab=expenses`;
    const logoUrl = "https://ketravelan.xyz/ketravelan_logo.png";

    const results: Record<string, any> = {};

    if (channels.includes("notification")) {
      const { data: notification, error: notificationError } = await admin
        .from("notifications")
        .insert({
          user_id: recipientId,
          type: "expense",
          title: "Payment reminder",
          message,
          action_url: tripUrl,
          metadata: {
            trip_id: tripId,
            payer_id: payerId,
            amount,
            currency,
          },
        })
        .select("id")
        .single();

      if (notificationError) {
        results.notification = { status: "failed", error: notificationError.message };
      } else {
        results.notification = { status: "sent", id: notification?.id };
      }
    }

    if (channels.includes("chat")) {
      const [user1_id, user2_id] = [payerId, recipientId].sort();

      const { data: existing } = await admin
        .from("conversations")
        .select("id")
        .eq("conversation_type", "direct")
        .eq("user1_id", user1_id)
        .eq("user2_id", user2_id)
        .maybeSingle();

      let conversationId = existing?.id;

      if (!conversationId) {
        const { data: created, error: createError } = await admin
          .from("conversations")
          .insert({
            conversation_type: "direct",
            user1_id,
            user2_id,
            created_by: payerId,
          })
          .select("id")
          .single();

        if (createError) {
          results.chat = { status: "failed", error: createError.message };
        } else {
          conversationId = created?.id;
          await admin.from("conversation_participants").upsert([
            { conversation_id: conversationId, user_id: user1_id },
            { conversation_id: conversationId, user_id: user2_id },
          ]);
        }
      } else {
        await admin.from("conversation_participants").upsert([
          { conversation_id: conversationId, user_id: user1_id },
          { conversation_id: conversationId, user_id: user2_id },
        ]);
      }

      if (conversationId) {
        const { error: msgError } = await admin
          .from("messages")
          .insert({
            conversation_id: conversationId,
            sender_id: payerId,
            content: message,
            attachments: [],
          });

        if (msgError) {
          results.chat = { status: "failed", error: msgError.message };
        } else {
          results.chat = { status: "sent", conversation_id: conversationId };
        }
      }
    }

    if (channels.includes("email")) {
      if (!recipientEmail) {
        results.email = { status: "failed", error: "Recipient email not found" };
      } else {
        const formattedAmount = amount.toFixed(2);
        const htmlEmail = buildSettlementReminderEmail({
          recipientName,
          payerName,
          tripName,
          amount: formattedAmount,
          currency,
          message,
          tripUrl,
          logoUrl,
        });

        try {
          await sendResendRawEmail({
            to: recipientEmail,
            subject: `Payment reminder - ${tripName}`,
            html: htmlEmail,
          });
          results.email = { status: "sent" };
        } catch (err) {
          results.email = { status: "failed", error: String(err) };
        }
      }
    }

    await admin
      .from("payment_reminders")
      .insert({
        trip_id: tripId,
        payer_id: payerId,
        recipient_id: recipientId,
        amount,
        currency,
        message,
        channels,
      });

    return new Response(JSON.stringify({ ok: true, results }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error) {
    console.error("Error in send-settlement-reminder:", error);
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
