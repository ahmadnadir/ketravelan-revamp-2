/* eslint-disable @typescript-eslint/no-explicit-any */
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
  title: string;
  messageHtml: string;
  ctaUrl: string;
  ctaLabel: string;
  coverImage?: string | null;
  preheader: string;
}) {
  const brand = "Ketravelan";
  const title = escapeHtml(opts.title);
  const ctaUrlEsc = escapeHtml(opts.ctaUrl);
  const logoUrlEsc = "https://ketravelan.com/ketravelan_logo.png";
  const ctaLabel = escapeHtml(opts.ctaLabel);
  const preheader = escapeHtml(opts.preheader);
  const coverImage = opts.coverImage ? escapeHtml(opts.coverImage) : "";
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
    '<tr><td style="padding:24px 28px 10px;">',
    `<h1 style="font-size:20px;font-weight:700;margin:0 0 8px;color:#020617;text-align:center">${title}</h1>`,
    `<div style="font-size:15px;line-height:1.65;color:#475569;margin-bottom:10px;text-align:center">${opts.messageHtml}</div>`,
    '</td></tr>',
    coverBlock,
    '<tr><td style="padding:18px 28px 24px;">',
    '<table role="presentation" cellspacing="0" cellpadding="0" width="100%"><tr><td align="center">',
    `<a href="${ctaUrlEsc}" target="_blank" style="display:inline-block;padding:14px 26px;border-radius:10px;background:#000000;color:#ffffff;text-decoration:none;font-weight:600">${ctaLabel}</a>`,
    '</td></tr></table>',
    '</td></tr>',
    '<tr><td style="padding:24px 28px;font-size:12px;color:#64748b;line-height:1.6">',
    'You received this because you are part of a trip on Ketravelan.<br><br>',
    'If the button doesn’t work, copy this link:<br>',
    `<a href="${ctaUrlEsc}" style="color:#2563eb;word-break:break-all">${ctaUrlEsc}</a><br><br>`,
    '<strong>The Ketravelan Crew</strong>',
    '</td></tr>',
    '</table>',
    '</td></tr>',
    '</table>',
    '</body>',
    '</html>',
  ].join("");
}

interface ExpensePaymentMarkedRequest {
  // Batch mode: multiple expenses settled together (preferred)
  expenseIds?: string[];
  // Legacy single-expense mode (kept for backward compatibility)
  expenseId?: string;
  participantId: string;
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
    const body = await req.json() as ExpensePaymentMarkedRequest;

    // Normalise to array of IDs (support both batch and legacy single)
    const allExpenseIds: string[] = body.expenseIds?.length
      ? body.expenseIds
      : body.expenseId
      ? [body.expenseId]
      : [];

    if (!allExpenseIds.length || !body?.participantId) {
      return new Response(JSON.stringify({ error: "Missing expenseIds or participantId" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Fetch all expenses in the batch
    const { data: expenses, error: expenseErr } = await admin
      .from("trip_expenses")
      .select("id, description, amount, currency, trip_id, created_by")
      .in("id", allExpenseIds);
    if (expenseErr) throw expenseErr;
    if (!expenses?.length) throw new Error("Expenses not found");

    // Use the trip_id from the first expense (all should be same trip)
    const tripId = expenses[0].trip_id;

    const { data: trip } = await admin
      .from("trips")
      .select("id, title, slug, cover_image")
      .eq("id", tripId)
      .maybeSingle();

    // Fetch payer for the first expense (payer is the creditor in a settlement)
    const { data: payments } = await admin
      .from("expense_payments")
      .select("user_id, expense_id")
      .in("expense_id", allExpenseIds);

    // Most settlements share one payer; use first found
    const payerId = payments?.[0]?.user_id || expenses[0].created_by;

    // Fetch participant amounts for all expenses
    const { data: participantRows } = await admin
      .from("expense_participants")
      .select("expense_id, user_id, amount_owed")
      .in("expense_id", allExpenseIds)
      .eq("user_id", body.participantId);

    const participantAmountMap = new Map(
      (participantRows || []).map((r: any) => [r.expense_id, Number(r.amount_owed || 0)])
    );

    // Total settled amount across all expenses
    const totalAmount = Array.from(participantAmountMap.values()).reduce((s, v) => s + v, 0);
    // Use the most common currency across expenses
    const currency = expenses[0].currency;

    const userIds = Array.from(new Set([payerId, body.participantId]));
    const { data: profiles } = await admin
      .from("profiles")
      .select("id, full_name, username, email_notifications")
      .in("id", userIds);

    const profileMap = new Map((profiles || []).map((p: any) => [p.id, p]));
    const tripUrl = `${SITE_ORIGIN}/trip/${trip?.slug || trip?.id}?tab=expenses`;

    const payerProfile = profileMap.get(payerId);
    const payerName = payerProfile?.full_name || payerProfile?.username || "Trip member";
    const participantProfile = profileMap.get(body.participantId);
    const participantName = participantProfile?.full_name || participantProfile?.username || "Trip member";

    const totalAmountStr = totalAmount.toFixed(2);
    const expenseCount = expenses.length;

    // Build a compact list of expense names for the email body
    const expenseListHtml = expenses.map((e: any) => {
      const share = participantAmountMap.get(e.id) ?? 0;
      return `<li style="margin:4px 0">${escapeHtml(e.description)} — <strong>${escapeHtml(e.currency)} ${share.toFixed(2)}</strong></li>`;
    }).join("");

    const sendToUser = async (userId: string, subject: string, messageHtml: string, preheader: string) => {
      const profile = profileMap.get(userId);
      if (!profile || profile.email_notifications === false) return;
      const { data: userRes } = await admin.auth.admin.getUserById(userId);
      const email = userRes?.user?.email;
      if (!email) return;

      const html = buildHtmlEmail({
        title: subject,
        messageHtml,
        ctaUrl: tripUrl,
        ctaLabel: "View Settlement",
        coverImage: trip?.cover_image,
        preheader,
      });

      const expenseLines = expenses.map((e: any) => {
        const share = participantAmountMap.get(e.id) ?? 0;
        return `  • ${e.description} — ${e.currency} ${share.toFixed(2)}`;
      }).join("\n");
      const text = `${subject}\nTrip: ${trip?.title}\n\nExpenses settled:\n${expenseLines}\n\nTotal: ${currency} ${totalAmountStr}\n\nView: ${tripUrl}`;

      if (!body.dryRun) {
        await sendResendRawEmail({ to: email, subject, html, text });
      }
    };

    // --- Single email to PAYER ---
    const payerSubject = expenseCount === 1
      ? `Payment received — ${currency} ${totalAmountStr}`
      : `Settlement received — ${currency} ${totalAmountStr} across ${expenseCount} expenses`;

    const payerMessageHtml = expenseCount === 1
      ? `<strong>${escapeHtml(participantName)}</strong> marked their payment for <strong>${escapeHtml(expenses[0].description)}</strong> as paid.<br><br>Amount: <strong>${escapeHtml(currency)} ${escapeHtml(totalAmountStr)}</strong>`
      : `<strong>${escapeHtml(participantName)}</strong> settled <strong>${expenseCount} expenses</strong> totalling <strong>${escapeHtml(currency)} ${escapeHtml(totalAmountStr)}</strong>.<br><br><ul style="text-align:left;margin:8px 0;padding-left:20px">${expenseListHtml}</ul>`;

    await sendToUser(payerId, payerSubject, payerMessageHtml, "Payment received");

    // --- Single push to PAYER ---
    await sendSystemPush({
      userIds: [payerId],
      type: "expense_paid",
      title: "Payment received ✅",
      body: expenseCount === 1
        ? `${participantName} paid ${currency} ${totalAmountStr}`
        : `${participantName} settled ${expenseCount} expenses (${currency} ${totalAmountStr})`,
      actionUrl: `/trip/${trip?.slug || trip?.id}?tab=expenses`,
      priority: "high",
      metadata: {
        trip_id: trip?.id || null,
        expense_ids: allExpenseIds,
        total_amount: totalAmountStr,
        currency,
        participant_id: body.participantId,
      },
    });

    // --- Single email to PARTICIPANT ---
    const participantSubject = expenseCount === 1
      ? `Payment recorded — ${expenses[0].description}`
      : `Settlement recorded — ${expenseCount} expenses paid`;

    const participantMessageHtml = expenseCount === 1
      ? `You marked your payment for <strong>${escapeHtml(expenses[0].description)}</strong> as paid. <strong>${escapeHtml(payerName)}</strong> has been notified.<br><br>Amount: <strong>${escapeHtml(currency)} ${escapeHtml(totalAmountStr)}</strong>`
      : `You settled <strong>${expenseCount} expenses</strong> totalling <strong>${escapeHtml(currency)} ${escapeHtml(totalAmountStr)}</strong>. <strong>${escapeHtml(payerName)}</strong> has been notified.<br><br><ul style="text-align:left;margin:8px 0;padding-left:20px">${expenseListHtml}</ul>`;

    await sendToUser(body.participantId, participantSubject, participantMessageHtml, "Payment recorded");

    // --- Single push to PARTICIPANT ---
    await sendSystemPush({
      userIds: [body.participantId],
      type: "payment_confirmed",
      title: "Payment confirmed ✅",
      body: expenseCount === 1
        ? `Your payment of ${currency} ${totalAmountStr} is confirmed`
        : `Your settlement of ${expenseCount} expenses (${currency} ${totalAmountStr}) is confirmed`,
      actionUrl: `/trip/${trip?.slug || trip?.id}?tab=expenses`,
      priority: "high",
      metadata: {
        trip_id: trip?.id || null,
        expense_ids: allExpenseIds,
        total_amount: totalAmountStr,
        currency,
        payer_id: payerId,
      },
    });

    return new Response(JSON.stringify({ ok: true, expenseCount }), {
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
