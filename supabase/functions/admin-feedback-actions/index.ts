import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

declare const Deno: { env: { get(name: string): string | undefined } };

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("SERVICE_ROLE_KEY") ?? "";
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const RESEND_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const RESEND_FROM = "Ketravelan <admin@ketravelan.com>";
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SITE_URL = Deno.env.get("SITE_URL") ?? Deno.env.get("WEB_URL") ?? "";
const ALLOWED_ORIGINS = new Set([
  "https://ketravelan.com",
  "https://www.ketravelan.com",
  "http://localhost:8080",
  "http://127.0.0.1:8080",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "capacitor://localhost",
]);
const service = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });

type JsonObject = Record<string, unknown>;

function getCorsOrigin(req: Request) {
  const origin = req.headers.get("origin") ?? "";
  if (ALLOWED_ORIGINS.has(origin)) return origin;
  if (SITE_URL) {
    try {
      if (new URL(SITE_URL).origin === origin) return origin;
    } catch {
      // Ignore invalid optional site URL configuration.
    }
  }
  try {
    const parsed = new URL(origin);
    if (parsed.origin !== origin) return "";
    if (parsed.protocol === "http:" && (parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1")) return origin;
    if (parsed.protocol === "https:" && (parsed.hostname === "ketravelan-stagingv2.pages.dev" || parsed.hostname.endsWith(".ketravelan-stagingv2.pages.dev"))) return origin;
  } catch {
    // Non-URL origins are handled by the explicit allowlist above.
  }
  return "";
}

function corsResponse(req: Request, body: JsonObject | null, status: number) {
  const origin = req.headers.get("origin");
  const referer = req.headers.get("referer");
  const allowedOrigin = getCorsOrigin(req);
  console.info("Feedback CORS response", { requestOrigin: origin, allowedOrigin });
  const headers: Record<string, string> = {
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-api-version, x-region",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin, Access-Control-Request-Headers",
  };
  if (allowedOrigin) headers["Access-Control-Allow-Origin"] = allowedOrigin;
  if (body === null) return new Response(null, { status, headers });
  return new Response(JSON.stringify(body), { status, headers: { ...headers, "Content-Type": "application/json" } });
}

function escapeHtml(value: string) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");
}

function plainText(value: string) {
  return value.trim();
}

function buildReplyEmail(subject: string, message: string, referenceCode: string) {
  const safeSubject = escapeHtml(subject);
  const safeMessage = escapeHtml(message).replaceAll("\n", "<br>");
  const safeReference = escapeHtml(referenceCode);
  const html = [
    "<!doctype html>",
    '<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>',
    '<body style="margin:0;background:#f4f6f8;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Arial,sans-serif">',
    '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:32px 12px"><tr><td align="center">',
    '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#fff;border-radius:16px;border:1px solid #e5e7eb">',
    '<tr><td align="center" style="padding:24px 20px"><img src="https://ketravelan.com/ketravelan_logo.png" alt="Ketravelan" style="display:block;border:0;height:36px;width:auto"></td></tr>',
    '<tr><td style="height:1px;background:#e5e7eb"></td></tr>',
    `<tr><td style="padding:30px 28px 24px"><h1 style="font-size:22px;line-height:1.35;font-weight:700;margin:0 0 20px;color:#020617;text-align:center">${safeSubject}</h1><div style="font-size:15px;line-height:1.7;color:#475569;white-space:normal">${safeMessage}</div></td></tr>`,
    `<tr><td style="padding:0 28px 24px;font-size:13px;color:#64748b;line-height:1.6">Regarding feedback <strong style="color:#334155">${safeReference}</strong></td></tr>`,
    '<tr><td style="padding:20px 28px 26px;font-size:13px;color:#64748b;line-height:1.6;border-top:1px solid #e5e7eb"><strong>The Ketravelan Crew</strong></td></tr>',
    '</table></td></tr></table></body></html>',
  ].join("");
  const text = `${message}\n\nRegarding feedback ${referenceCode}: ${subject}\n\nThe Ketravelan Crew`;
  return { html, text };
}

async function getScopedClient(req: Request, permission: "feedback.view" | "feedback.manage") {
  if (!SUPABASE_URL || !SERVICE_KEY || !ANON_KEY) {
    console.error("Feedback auth configuration missing", { hasSupabaseUrl: Boolean(SUPABASE_URL), hasServiceKey: Boolean(SERVICE_KEY), hasAnonKey: Boolean(ANON_KEY) });
    throw new Error("Feedback service is not configured");
  }
  const token = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "").trim();
  if (!token) {
    console.warn("Feedback auth rejected request", { reason: "missing_bearer_token", permission });
    throw new Error("Authentication required");
  }
  const { data, error } = await service.auth.getUser(token);
  if (error || !data.user) {
    console.error("Feedback auth getUser rejected token", {
      errorName: error?.name ?? null,
      errorMessage: error?.message ?? null,
      errorStatus: error?.status ?? null,
      returnedUser: Boolean(data.user),
      hasSupabaseUrl: Boolean(SUPABASE_URL),
      hasServiceKey: Boolean(SERVICE_KEY),
    });
    throw new Error("Authentication required");
  }
  const scoped = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: allowed, error: permissionError } = await scoped.rpc("admin_has_permission", { p_permission: permission });
  if (permissionError || allowed !== true) {
    console.warn("Feedback RBAC denied request", {
      permission,
      errorName: permissionError?.name ?? null,
      errorMessage: permissionError?.message ?? null,
      errorCode: permissionError?.code ?? null,
      allowed: allowed === true,
    });
    throw new Error(`${permission} permission required`);
  }
  return scoped;
}

async function getFeedback(scoped: ReturnType<typeof createClient>, feedbackId: string) {
  const { data, error } = await scoped.rpc("admin_feedback_get", { p_feedback_id: feedbackId });
  if (error) throw error;
  const record = Array.isArray(data) ? data[0] : data;
  if (!record) throw new Error("Feedback not found");
  return record as JsonObject;
}

Deno.serve(async (req: Request) => {
  console.info("Feedback CORS request", {
    origin: req.headers.get("origin"),
    referer: req.headers.get("referer"),
    method: req.method,
  });
  if (req.method === "OPTIONS") return corsResponse(req, null, 204);
  if (req.method !== "POST") return corsResponse(req, { error: "Method not allowed" }, 405);

  let scoped: ReturnType<typeof createClient> | null = null;
  try {
    const body = await req.json() as JsonObject;
    const action = String(body.action ?? "");

    if (action === "attachment.url") {
      scoped = await getScopedClient(req, "feedback.view");
      const feedbackId = String(body.feedbackId ?? "");
      const objectPath = String(body.objectPath ?? "");
      if (!UUID_RE.test(feedbackId) || objectPath.length > 512 || objectPath.startsWith("/") || objectPath.split("/").some((part) => part === ".." || part === "")) throw new Error("Invalid attachment request");
      const record = await getFeedback(scoped, feedbackId);
      const attachments = Array.isArray(record.attachments) ? record.attachments : [];
      if (!attachments.includes(objectPath) || objectPath.split("/")[0] !== record.user_id) throw new Error("Attachment not found for this feedback");
      const { data, error } = await service.storage.from("report-attachments").createSignedUrl(objectPath, 300, { download: false });
      if (error || !data?.signedUrl) {
        console.error("Feedback attachment signing failed", { feedbackId, storageMessage: error?.message ?? "No signed URL returned" });
        throw new Error("Attachment unavailable. The private object may be missing or storage signing was denied.");
      }
      return corsResponse(req, { signedUrl: data.signedUrl, expiresIn: 300 }, 200);
    }

    if (action === "reply.preview" || action === "reply") {
      scoped = await getScopedClient(req, "feedback.manage");
      const feedbackId = String(body.feedbackId ?? "");
      const subject = plainText(String(body.subject ?? ""));
      const message = plainText(String(body.message ?? ""));
      const idempotencyKey = String(body.idempotencyKey ?? "");
      if (!UUID_RE.test(feedbackId) || (action === "reply" && !UUID_RE.test(idempotencyKey))) throw new Error("Invalid reply request");
      if (!subject || subject.length > 180 || !message || message.length > 10000) throw new Error("Subject and message are required; messages are limited to 10,000 characters");
      const record = await getFeedback(scoped, feedbackId);
      if (record.wants_reply !== true) throw new Error("This user did not request a reply");
      const recipient = String(record.contact_email || record.account_email || "").trim();
      if (!recipient || recipient.length > 320 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient)) throw new Error("No valid reply email is available");

      const email = buildReplyEmail(subject, message, String(record.reference_code));
      if (action === "reply.preview") {
        return corsResponse(req, { to: recipient, from: RESEND_FROM, subject, ...email }, 200);
      }
      if (!RESEND_KEY) throw new Error("Email delivery is not configured");

      const sendResult = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${RESEND_KEY}`, "Content-Type": "application/json", "Idempotency-Key": `feedback-reply-${idempotencyKey}` },
        body: JSON.stringify({
          from: RESEND_FROM,
          to: [recipient],
          subject,
          text: email.text,
          html: email.html,
        }),
      });
      const resultBody = await sendResult.json().catch(() => ({})) as JsonObject;
      if (!sendResult.ok) {
        await scoped.rpc("admin_feedback_record_activity", { p_feedback_id: feedbackId, p_action_type: "feedback_reply_failed", p_action_data: { status: sendResult.status } });
        console.error("Feedback reply provider rejected request", { status: sendResult.status });
        return corsResponse(req, { error: "Message could not be sent. Check the address and retry." }, 502);
      }

      const activity = await scoped.rpc("admin_feedback_record_activity", {
        p_feedback_id: feedbackId,
        p_action_type: "feedback_reply_sent",
        p_action_data: { subject, provider_message_id: resultBody.id ?? null, delivery_status: "sent" },
      });
      return corsResponse(req, { deliveryStatus: "sent", activityRecorded: !activity.error, providerMessageId: resultBody.id ?? null }, 200);
    }

    return corsResponse(req, { error: "Unsupported feedback action" }, 400);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to process feedback action";
    const status = message === "Authentication required" ? 401 : message.endsWith("permission required") ? 403 : 400;
    return corsResponse(req, { error: message }, status);
  }
});
