import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

declare const Deno: { env: { get(name: string): string | undefined } };

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE_KEY = Deno.env.get("SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const RESEND_FROM = Deno.env.get("RESEND_FROM") ?? "Ketravelan <no-reply@ketravelan.com>";
const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
const CHANNELS = new Set(["in_app", "push", "email"]);
const LEGACY_TRIGGER_PUSH_TYPES = new Set([
  "story_like",
  "story_comment",
  "discussion_like",
  "discussion_reply",
  "discussion_reply_to_you",
  "discussion_answer_accepted",
]);

type Channel = "in_app" | "push" | "email";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

function render(template: string | null | undefined, values: Record<string, unknown>, fallback: string, escape = false) {
  if (!template) return fallback;
  return template.replace(/\{\{\s*([A-Za-z0-9_.-]+)\s*\}\}/g, (_match, key: string) => {
    const value = key.split(".").reduce<unknown>((current, part) => current && typeof current === "object" ? (current as Record<string, unknown>)[part] : undefined, values);
    if (value == null) return "";
    return escape ? safeHtml(String(value)) : String(value);
  });
}

function safeHtml(text: string) {
  return text.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");
}

function absoluteUrl(actionUrl: string | null) {
  if (!actionUrl) return "https://ketravelan.com";
  return actionUrl.startsWith("https://") ? actionUrl : `https://ketravelan.com${actionUrl.startsWith("/") ? actionUrl : `/${actionUrl}`}`;
}

function emailHtml(title: string, message: string, actionUrl: string | null) {
  const safeTitle = safeHtml(title);
  const safeMessage = safeHtml(message);
  const url = absoluteUrl(actionUrl);
  return `<!doctype html><html><body style="margin:0;background:#f4f6f8;font-family:Arial,sans-serif"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:32px 0"><tr><td align="center"><table width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#fff;border-radius:16px;border:1px solid #e5e7eb"><tr><td style="padding:28px"><h1 style="font-size:22px;color:#020617">${safeTitle}</h1><p style="font-size:15px;line-height:1.7;color:#475569">${safeMessage}</p><a href="${safeHtml(url)}" style="display:inline-block;padding:12px 20px;border-radius:10px;background:#000;color:#fff;text-decoration:none">Open Ketravelan</a></td></tr></table></td></tr></table></body></html>`;
}

async function claimDelivery(notificationId: string, userId: string, channel: Channel, provider: string) {
  const key = { notification_id: notificationId, user_id: userId, channel };
  const { error: insertError } = await admin.from("notification_deliveries").upsert(
    { ...key, provider, status: "pending", attempts: 0 },
    { onConflict: "notification_id,channel,user_id", ignoreDuplicates: true },
  );
  if (insertError) throw insertError;
  const { data, error } = await admin.from("notification_deliveries")
    .update({ status: "processing", provider, attempts: 1, last_error: null })
    .match(key).eq("status", "pending").select("id").maybeSingle();
  if (error) throw error;
  return Boolean(data?.id);
}

async function finishDelivery(notificationId: string, userId: string, channel: Channel, values: Record<string, unknown>) {
  const { error } = await admin.from("notification_deliveries")
    .update(values).eq("notification_id", notificationId).eq("user_id", userId).eq("channel", channel);
  if (error) console.error("[notification-dispatcher] Could not update delivery", { notificationId, channel, message: error.message });
}

async function dispatchPush(notification: Record<string, unknown>, template: Record<string, unknown> | null, values: Record<string, unknown>) {
  const userId = String(notification.user_id);
  const { data: profile, error: profileError } = await admin.from("profiles").select("push_notifications").eq("id", userId).maybeSingle();
  if (profileError) throw profileError;
  const preference = await admin.from("notification_preferences").select("notification_type,push_enabled").eq("user_id", userId);
  if (preference.error) throw preference.error;
  const typePreference = preference.data?.find((item) => String(item.notification_type) === String(notification.type));
  if (profile?.push_notifications === false || typePreference?.push_enabled === false) {
    await finishDelivery(String(notification.id), userId, "push", { status: "skipped", attempts: 1, last_error: "Push notifications disabled" });
    return;
  }

  const result = await fetch(`${SUPABASE_URL}/functions/v1/send-system-push`, {
    method: "POST",
    headers: { Authorization: `Bearer ${SERVICE_ROLE_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      userIds: [userId], type: notification.type,
      title: render(String(template?.push_title_template ?? ""), values, String(notification.title)),
      body: render(String(template?.push_body_template ?? ""), values, String(notification.message ?? "")),
      actionUrl: notification.action_url ?? "/", metadata: values, skipInsert: true,
    }),
  });
  const resultData = await result.json().catch(() => ({}));
  const sent = result.ok && Number(resultData.sent ?? 0) > 0;
  await finishDelivery(String(notification.id), userId, "push", {
    status: sent ? "sent" : "failed", attempts: 1,
    last_error: sent ? null : String(resultData.error ?? resultData.reason ?? "Push delivery failed"),
    sent_at: sent ? new Date().toISOString() : null,
    provider: "fcm/apns/webpush",
  });
}

async function dispatchEmail(notification: Record<string, unknown>, template: Record<string, unknown> | null, values: Record<string, unknown>) {
  const userId = String(notification.user_id);
  const [authResult, prefResult, profileResult] = await Promise.all([
    admin.auth.admin.getUserById(userId),
    admin.from("notification_preferences").select("notification_type,email_enabled").eq("user_id", userId),
    admin.from("profiles").select("email_notifications").eq("id", userId).maybeSingle(),
  ]);
  if (prefResult.error) throw prefResult.error;
  if (profileResult.error) throw profileResult.error;
  const email = authResult.data.user?.email;
  const typePreference = prefResult.data?.find((item) => String(item.notification_type) === String(notification.type));
  const disabled = typePreference?.email_enabled === false || profileResult.data?.email_notifications === false;
  if (!email || disabled) {
    await finishDelivery(String(notification.id), userId, "email", { status: "skipped", attempts: 1, last_error: !email ? "No email address" : "Email notifications disabled" });
    return;
  }

  const subject = render(String(template?.email_subject_template ?? ""), values, String(notification.title));
  const text = render(String(template?.email_text_template ?? ""), values, String(notification.message ?? ""));
  const html = render(String(template?.email_html_template ?? ""), values, emailHtml(subject, text, notification.action_url ? String(notification.action_url) : null), true);
  const response = await fetch(`${SUPABASE_URL}/functions/v1/resend-control`, {
    method: "POST",
    headers: { Authorization: `Bearer ${SERVICE_ROLE_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ operation: "emails.send", payload: { from: RESEND_FROM, to: [email], subject, html, text, tags: [{ name: "notification_type", value: String(notification.type) }] } }),
  });
  const result = await response.json().catch(() => ({}));
  const providerMessageId = result?.data?.id ?? result?.id ?? null;
  const sent = response.ok && Boolean(providerMessageId);
  await finishDelivery(String(notification.id), userId, "email", {
    provider: "resend", provider_message_id: providerMessageId,
    status: sent ? "sent" : "failed", attempts: 1,
    last_error: sent ? null : String(result?.error?.message ?? result?.message ?? "Email delivery failed"),
    sent_at: sent ? new Date().toISOString() : null,
  });
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  const authorization = req.headers.get("authorization") ?? "";
  if (!SERVICE_ROLE_KEY || authorization !== `Bearer ${SERVICE_ROLE_KEY}`) return json({ error: "Unauthorized" }, 401);

  try {
    const body = await req.json() as { notificationIds?: unknown; channels?: unknown };
    const ids = Array.isArray(body.notificationIds) ? [...new Set(body.notificationIds.map(String))] : [];
    const channels = Array.isArray(body.channels) ? [...new Set(body.channels.map(String))] : ["in_app", "push"];
    if (!ids.length || ids.length > 500 || channels.some((channel) => !CHANNELS.has(channel))) return json({ error: "Invalid notification IDs or channels" }, 400);

    const { data: notifications, error } = await admin.from("notifications")
      .select("id,user_id,type,title,message,data,metadata,action_url")
      .in("id", ids);
    if (error) throw error;

    const outcomes: Array<{ notificationId: string; channel: string; status: string }> = [];
    for (const notification of notifications ?? []) {
      const userId = String(notification.user_id);
      const { data: template, error: templateError } = await admin.from("notification_templates")
        .select("type,email_subject_template,email_html_template,email_text_template,push_title_template,push_body_template,is_active")
        .eq("type", notification.type).eq("is_active", true).order("created_at", { ascending: true }).limit(1).maybeSingle();
      if (templateError) throw templateError;
      const values = { ...(notification.data ?? {}), ...(notification.metadata ?? {}), title: notification.title, message: notification.message ?? "", action_url: absoluteUrl(notification.action_url ? String(notification.action_url) : null) } as Record<string, unknown>;

      for (const channel of channels as Channel[]) {
        const provider = channel === "in_app" ? "database" : channel === "push" ? "fcm/apns/webpush" : "resend";
        const claimed = await claimDelivery(String(notification.id), userId, channel, provider);
        if (!claimed) { outcomes.push({ notificationId: String(notification.id), channel, status: "already_processed" }); continue; }
        if (channel === "in_app") {
          await finishDelivery(String(notification.id), userId, channel, { status: "delivered", sent_at: new Date().toISOString(), delivered_at: new Date().toISOString(), attempts: 1, last_error: null });
          outcomes.push({ notificationId: String(notification.id), channel, status: "delivered" });
          continue;
        }
        if (channel === "push" && LEGACY_TRIGGER_PUSH_TYPES.has(String(notification.type))) {
          await finishDelivery(String(notification.id), userId, channel, { status: "skipped", attempts: 1, last_error: "Push handled by the existing community notification trigger" });
          outcomes.push({ notificationId: String(notification.id), channel, status: "skipped_legacy_trigger" });
          continue;
        }
        try {
          if (channel === "push") await dispatchPush(notification as Record<string, unknown>, template as Record<string, unknown> | null, values);
          else await dispatchEmail(notification as Record<string, unknown>, template as Record<string, unknown> | null, values);
          outcomes.push({ notificationId: String(notification.id), channel, status: "processed" });
        } catch (deliveryError) {
          const message = deliveryError instanceof Error ? deliveryError.message : "Delivery failed";
          await finishDelivery(String(notification.id), userId, channel, { status: "failed", attempts: 1, last_error: message });
          outcomes.push({ notificationId: String(notification.id), channel, status: "failed" });
        }
      }
    }
    return json({ ok: true, count: notifications?.length ?? 0, outcomes });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Unexpected dispatcher error" }, 500);
  }
});
