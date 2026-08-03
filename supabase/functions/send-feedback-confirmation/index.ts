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
    const match = SITE_URL.match(/^(https?:\/\/[^/]+)/);
    return match ? match[1] : "https://ketravelan.com";
  }
})();

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

const AREA_LABELS: Record<string, string> = {
  explore_public_trips: "Explore and public trips",
  create_trip: "Creating a trip",
  join_requests_invites: "Join requests and invites",
  trip_chat: "Trip chat",
  expenses_splitting: "Expenses and splitting",
  settlement_payment: "Settlement and payment",
  notes: "Notes",
  community: "Community (stories and discussions)",
  profile_account: "Profile and account",
  notifications_email: "Notifications and emails",
  other: "Something else",
};

const TYPE_LABELS: Record<string, string> = {
  bug: "Bug report",
  feedback: "Feedback",
  feature_request: "Feature request",
};

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

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function trimSnippet(value: string | null | undefined, max = 180) {
  const normalized = (value || "").trim().replace(/\s+/g, " ");
  if (!normalized) return "";
  return normalized.length > max ? `${normalized.slice(0, max - 1)}…` : normalized;
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
}) {
  const title = escapeHtml(opts.title);
  const ctaUrlEsc = escapeHtml(opts.ctaUrl);
  const preheader = "Your feedback was received by Ketravelan.";

  return [
    "<!doctype html>",
    '<html lang="en">',
    "<head>",
    '<meta charset="utf-8" />',
    '<meta name="viewport" content="width=device-width" />',
    "<title>Ketravelan</title>",
    "</head>",
    '<body style="margin:0;background:#f4f6f8;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Arial">',
    `<div style="display:none;font-size:1px;color:#f4f6f8;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden">${preheader}</div>`,
    '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:32px 0;">',
    '<tr><td align="center">',
    '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:520px;background:#ffffff;border-radius:16px;border:1px solid #e5e7eb;box-shadow:0 10px 28px rgba(15,23,42,.08);">',
    '<tr><td align="center" style="padding:24px 20px">',
    `<img src="https://ketravelan.com/ketravelan_logo.png" alt="Ketravelan" style="display:block;border:0;outline:none;text-decoration:none;height:28px;width:auto" />`,
    '</td></tr>',
    '<tr><td style="height:1px;background:#e5e7eb;margin:0 28px" aria-hidden="true"></td></tr>',
    '<tr><td style="padding:28px">',
    `<h1 style="font-size:22px;font-weight:700;margin:0 0 8px;color:#020617;text-align:center">${title}</h1>`,
    `<div style="font-size:15px;line-height:1.65;color:#475569;margin-bottom:24px;text-align:center">${opts.messageHtml}</div>`,
    '<table role="presentation" cellspacing="0" cellpadding="0" width="100%"><tr><td align="center">',
    `<a href="${ctaUrlEsc}" target="_blank" style="display:inline-block;padding:14px 26px;border-radius:10px;background:#000000;color:#ffffff;text-decoration:none;font-weight:600">Open Ketravelan</a>`,
    '</td></tr></table>',
    '</td></tr>',
    '<tr><td style="padding:24px 28px;font-size:12px;color:#64748b;line-height:1.6">',
    'We received your submission and logged it for review.<br><br>',
    "If the button doesn&apos;t work, copy this link:<br>",
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

interface FeedbackConfirmationRequest {
  reportId: string;
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
    const authHeader = req.headers.get("authorization") || req.headers.get("Authorization");
    const token = authHeader?.replace(/^Bearer\s+/i, "").trim();
    if (!token) {
      return new Response(JSON.stringify({ error: "Missing authorization token" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const { data: authData, error: authErr } = await admin.auth.getUser(token);
    if (authErr) throw authErr;
    const user = authData.user;
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const body = await req.json() as FeedbackConfirmationRequest;
    if (!body?.reportId) {
      return new Response(JSON.stringify({ error: "Missing reportId" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const { data: report, error: reportErr } = await admin
      .from("user_reports")
      .select("id, user_id, reference_code, report_type, area, title, details, steps_to_reproduce, frequency, severity, sentiment, current_workaround, wants_reply, created_at")
      .eq("id", body.reportId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (reportErr) throw reportErr;
    if (!report) throw new Error("Report not found");

    const { data: profile, error: profileErr } = await admin
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .maybeSingle();

    if (profileErr) throw profileErr;

    const recipientEmail = user.email;
    if (!recipientEmail) {
      return new Response(JSON.stringify({ ok: true, skipped: true, reason: "No recipient email found" }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const firstName = profile?.full_name?.trim().split(" ")[0] || "Traveler";
    const areaLabel = AREA_LABELS[report.area] || report.area;
    const typeLabel = TYPE_LABELS[report.report_type] || report.report_type;
    const submittedDate = new Date(report.created_at).toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
    const highlights = [
      `<tr><td style="padding:0 0 10px"><strong style="color:#0f172a">Reference ID:</strong> <span style="font-family:ui-monospace,SFMono-Regular,Menlo,monospace">${escapeHtml(report.reference_code)}</span></td></tr>`,
      `<tr><td style="padding:0 0 10px"><strong style="color:#0f172a">Feedback about:</strong> ${escapeHtml(areaLabel)}</td></tr>`,
      `<tr><td style="padding:0 0 10px"><strong style="color:#0f172a">Category:</strong> ${escapeHtml(typeLabel)}</td></tr>`,
      `<tr><td style="padding:0 0 10px"><strong style="color:#0f172a">Summary:</strong> ${escapeHtml(report.title)}</td></tr>`,
      `<tr><td style="padding:0 0 10px"><strong style="color:#0f172a">Submitted:</strong> ${escapeHtml(submittedDate)}</td></tr>`,
      `<tr><td style="padding:0 0 10px"><strong style="color:#0f172a">Details:</strong> ${escapeHtml(trimSnippet(report.details, 240))}</td></tr>`,
      report.steps_to_reproduce
        ? `<tr><td style="padding:0 0 10px"><strong style="color:#0f172a">Steps:</strong> ${escapeHtml(trimSnippet(report.steps_to_reproduce, 180))}</td></tr>`
        : "",
      report.frequency
        ? `<tr><td style="padding:0 0 10px"><strong style="color:#0f172a">Frequency:</strong> ${escapeHtml(report.frequency)}</td></tr>`
        : "",
      report.severity
        ? `<tr><td style="padding:0 0 10px"><strong style="color:#0f172a">Impact:</strong> ${escapeHtml(report.severity)}</td></tr>`
        : "",
      report.sentiment
        ? `<tr><td style="padding:0 0 10px"><strong style="color:#0f172a">Sentiment:</strong> ${escapeHtml(report.sentiment)}</td></tr>`
        : "",
      report.current_workaround
        ? `<tr><td style="padding:0 0 10px"><strong style="color:#0f172a">Current workaround:</strong> ${escapeHtml(trimSnippet(report.current_workaround, 180))}</td></tr>`
        : "",
    ].filter(Boolean).join("");

    const messageHtml = [
      `Hi <strong>${escapeHtml(firstName)}</strong>,<br><br>`,
      "Thanks for sending feedback to Ketravelan. We have successfully received your submission and recorded the details below for our team to review.<br><br>",
      '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border:1px solid #e2e8f0;border-radius:14px;background:#f8fafc;padding:16px;text-align:left">',
      `<tr><td style="padding:16px 16px 6px;font-size:14px;line-height:1.65;color:#475569"><table role="presentation" width="100%" cellspacing="0" cellpadding="0">${highlights}</table></td></tr>`,
      '</table><br>',
      report.wants_reply
        ? "You asked us to reply, so we may follow up by email if we need more context."
        : "You chose not to request a reply, but your report is still logged and reviewed by the team.",
    ].join("");

    const appUrl = `${SITE_ORIGIN}/feedback`;
    const subject = `We received your feedback: ${report.reference_code}`;
    const html = buildHtmlEmail({
      title: "Feedback received",
      messageHtml,
      ctaUrl: appUrl,
    });
    const text = [
      `Hi ${firstName},`,
      "",
      "Thanks for sending feedback to Ketravelan. We have successfully received your submission.",
      "",
      `Reference ID: ${report.reference_code}`,
      `Feedback about: ${areaLabel}`,
      `Category: ${typeLabel}`,
      `Summary: ${report.title}`,
      `Submitted: ${submittedDate}`,
      `Details: ${trimSnippet(report.details, 240)}`,
      report.steps_to_reproduce ? `Steps: ${trimSnippet(report.steps_to_reproduce, 180)}` : undefined,
      report.frequency ? `Frequency: ${report.frequency}` : undefined,
      report.severity ? `Impact: ${report.severity}` : undefined,
      report.sentiment ? `Sentiment: ${report.sentiment}` : undefined,
      report.current_workaround ? `Current workaround: ${trimSnippet(report.current_workaround, 180)}` : undefined,
      "",
      report.wants_reply
        ? "You asked us to reply, so we may follow up by email if we need more context."
        : "You chose not to request a reply, but your report is still logged and reviewed by the team.",
      "",
      `Open Ketravelan: ${appUrl}`,
      "",
      "The Ketravelan Crew",
    ].filter(Boolean).join("\n");

    if (body.dryRun) {
      return new Response(JSON.stringify({ ok: true, preview: { html, text, recipientEmail } }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    await sendResendRawEmail({ to: recipientEmail, subject, html, text });
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