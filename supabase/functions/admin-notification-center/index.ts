import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

declare const Deno: { env: { get(name: string): string | undefined } };

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE_KEY = Deno.env.get("SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
const CHANNELS = new Set(["in_app", "push", "email"]);
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const ALLOWED_ORIGINS = new Set([
  "https://ketravelan.com",
  "https://www.ketravelan.com",
  "http://localhost:8080",
  "http://127.0.0.1:8080",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "capacitor://localhost",
]);

function corsHeaders(req: Request) {
  const origin = req.headers.get("origin") ?? "";
  const requestedHeaders = req.headers.get("access-control-request-headers");
  return {
    "Access-Control-Allow-Origin": ALLOWED_ORIGINS.has(origin) ? origin : "https://ketravelan.com",
    "Access-Control-Allow-Headers": requestedHeaders || "authorization, x-client-info, apikey, content-type, x-supabase-api-version, x-region",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin, Access-Control-Request-Headers",
    "Content-Type": "application/json",
  };
}

function json(req: Request, body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders(req) });
}

async function requireNotificationManager(req: Request) {
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY || !ANON_KEY) throw new Error("Notification service is not configured");
  const authorization = req.headers.get("authorization") ?? "";
  const token = authorization.replace(/^Bearer\s+/i, "").trim();
  if (!token) throw new Error("Authentication required");
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data.user) throw new Error("Authentication required");
  const scoped = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: allowed, error: permissionError } = await scoped.rpc("admin_has_permission", { p_permission: "notifications.manage" });
  if (permissionError) {
    console.error("admin_has_permission failed", permissionError);
    throw new Error(`Permission check failed: ${permissionError.message}`);
  }
  if (allowed !== true) throw new Error("notifications.manage permission required");
  return data.user;
}

async function resolveRecipientIds(body: Record<string, unknown>) {
  const requested = Array.isArray(body.userIds) ? [...new Set(body.userIds.map(String))] : [];
  if (requested.length) {
    if (requested.length > 5000 || requested.some((id) => !UUID_RE.test(id))) throw new Error("Recipient IDs must be valid UUIDs (maximum 5,000)");
    const { data, error } = await admin.from("profiles").select("id").in("id", requested);
    if (error) throw error;
    return (data ?? []).map((row) => row.id as string);
  }

  const audience = String(body.audience ?? "");
  if (!["all", "push_enabled", "email_enabled"].includes(audience)) return [];
  const ids: string[] = [];
  const pageSize = 1000;
  for (let from = 0; ; from += pageSize) {
    let query = admin.from("profiles").select("id,push_notifications,email_notifications").order("id").range(from, from + pageSize - 1);
    if (audience === "push_enabled") query = query.neq("push_notifications", false);
    if (audience === "email_enabled") query = query.neq("email_notifications", false);
    const { data, error } = await query;
    if (error) throw error;
    ids.push(...(data ?? []).map((row) => row.id as string));
    if (!data || data.length < pageSize) break;
  }
  return ids;
}

// Puts a readable "user" column (@username) where user_id was; user_id moves to the end.
async function withUserLabels(rows: Record<string, unknown>[]) {
  const ids = [...new Set(rows.map((row) => row.user_id).filter((id): id is string => typeof id === "string" && UUID_RE.test(id)))];
  if (!ids.length) return rows;
  const { data, error } = await admin.from("profiles").select("id,username,full_name").in("id", ids);
  if (error) throw error;
  const labels = new Map(((data ?? []) as Array<{ id: string; username: string | null; full_name: string | null }>).map((profile) => [
    String(profile.id),
    profile.username ? `@${profile.username}` : String(profile.full_name ?? "").trim() || "Unnamed user",
  ]));
  return rows.map((row) => {
    if (!("user_id" in row)) return row;
    const result: Record<string, unknown> = {};
    for (const [field, value] of Object.entries(row)) {
      if (field === "user_id") result.user = labels.get(String(value)) ?? "Deleted user";
      else result[field] = value;
    }
    result.user_id = row.user_id;
    return result;
  });
}

function redactSecrets(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redactSecrets);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.entries(value as Record<string, unknown>)
    .filter(([key]) => !["key", "token", "secret", "api_key", "apiKey"].includes(key))
    .map(([key, entry]) => [key, redactSecrets(entry)]));
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders(req) });
  if (req.method !== "POST") return json(req, { error: "Method not allowed" }, 405);

  try {
    const adminUser = await requireNotificationManager(req);
    const body = await req.json() as Record<string, unknown>;
    const action = String(body.action ?? "");

    if (action === "overview") {
      const [notifications, unread, deliveries, delivered, failed, pendingEmails, devices, deviceUsers, broadcasts, providerEvents] = await Promise.all([
        admin.from("notifications").select("id", { count: "exact", head: true }),
        admin.from("notifications").select("id", { count: "exact", head: true }).eq("read", false),
        admin.from("notification_deliveries").select("id", { count: "exact", head: true }),
        admin.from("notification_deliveries").select("id", { count: "exact", head: true }).in("status", ["sent", "delivered"]),
        admin.from("notification_deliveries").select("id", { count: "exact", head: true }).eq("status", "failed"),
        admin.from("email_queue").select("id", { count: "exact", head: true }).eq("status", "pending"),
        admin.from("user_push_tokens").select("id", { count: "exact", head: true }),
        admin.from("user_push_tokens").select("user_id"),
        admin.from("notification_broadcasts").select("id", { count: "exact", head: true }),
        admin.from("notification_provider_events").select("id", { count: "exact", head: true }),
      ]);
      for (const result of [notifications, unread, deliveries, delivered, failed, pendingEmails, devices, deviceUsers, broadcasts, providerEvents]) if (result.error) throw result.error;
      return json(req, {
        notifications: notifications.count ?? 0, unread: unread.count ?? 0,
        deliveries: deliveries.count ?? 0, delivered: delivered.count ?? 0,
        failed: failed.count ?? 0, pendingEmails: pendingEmails.count ?? 0,
        pushDevices: devices.count ?? 0,
        usersWithPush: new Set((deviceUsers.data ?? []).map((row) => row.user_id)).size,
        broadcasts: broadcasts.count ?? 0, providerEvents: providerEvents.count ?? 0,
      });
    }

    if (action === "templates.list") {
      const { data, error } = await admin.from("notification_templates").select("*").order("type").order("created_at");
      if (error) throw error;
      return json(req, { templates: data ?? [] });
    }

    if (action === "templates.save") {
      const template = (body.template ?? {}) as Record<string, unknown>;
      const type = String(template.type ?? "").trim();
      const title = String(template.title_template ?? "").trim();
      if (!type || !title) return json(req, { error: "Template type and title are required" }, 400);
      const values = {
        type, title_template: title,
        message_template: template.message_template ? String(template.message_template) : null,
        email_subject_template: template.email_subject_template ? String(template.email_subject_template) : null,
        email_html_template: template.email_html_template ? String(template.email_html_template) : null,
        email_text_template: template.email_text_template ? String(template.email_text_template) : null,
        push_title_template: template.push_title_template ? String(template.push_title_template) : null,
        push_body_template: template.push_body_template ? String(template.push_body_template) : null,
        channels: Array.isArray(template.channels) ? template.channels : ["in_app", "push", "email"],
        variables: Array.isArray(template.variables) ? template.variables : [],
        is_active: template.is_active !== false,
        resend_template_id: template.resend_template_id ? String(template.resend_template_id) : null,
      };
      if (template.id) {
        const { data, error } = await admin.from("notification_templates").update(values).eq("id", String(template.id)).select("*").single();
        if (error) throw error;
        return json(req, { template: data });
      }
      const { data: existing, error: lookupError } = await admin.from("notification_templates").select("id").eq("type", type).limit(1);
      if (lookupError) throw lookupError;
      if (existing?.length) return json(req, { error: "A template with this type already exists. Select it to edit without replacing existing production template data." }, 409);
      const { data, error } = await admin.from("notification_templates").insert(values).select("*").single();
      if (error) throw error;
      return json(req, { template: data });
    }

    if (action === "notifications.list" || action === "deliveries.list" || action === "email_queue.list" || action === "provider_events.list" || action === "push_devices.list") {
      const limit = Math.min(Math.max(Number(body.limit) || 100, 1), 500);
      const offset = Math.max(Number(body.offset) || 0, 0);
      const table = action === "notifications.list" ? "notifications"
        : action === "deliveries.list" ? "notification_deliveries"
        : action === "email_queue.list" ? "email_queue"
        : action === "provider_events.list" ? "notification_provider_events"
        : "user_push_tokens";
      const selection = action === "email_queue.list"
        ? "id,user_id,to_email,subject,template,status,attempts,sent_at,error,created_at"
        : action === "push_devices.list"
          ? "id,user_id,platform,device_id,created_at,updated_at"
          : "*";
      const order = action === "push_devices.list" ? "updated_at" : "created_at";
      const { data, error, count } = await admin.from(table).select(selection, { count: "exact" }).order(order, { ascending: false }).range(offset, offset + limit - 1);
      if (error) throw error;
      const key = action === "notifications.list" ? "notifications" : action === "deliveries.list" ? "deliveries" : action === "push_devices.list" ? "rows" : action === "email_queue.list" ? "rows" : "events";
      return json(req, { [key]: await withUserLabels((data ?? []) as Record<string, unknown>[]), total: count ?? 0 });
    }

    if (action === "send.preview" || action === "send") {
      const channels = [...new Set((Array.isArray(body.channels) ? body.channels.map(String) : ["in_app", "push"]))];
      const invalidChannels = channels.filter((channel) => !CHANNELS.has(channel));
      const title = String(body.title ?? "").trim();
      const message = String(body.message ?? "").trim();
      const type = String(body.type ?? "system_announcement").trim();
      const actionUrl = body.actionUrl ? String(body.actionUrl) : null;
      if (!title || !channels.length || invalidChannels.length) return json(req, { error: "Provide a title and valid channels" }, 400);
      const userIds = await resolveRecipientIds(body);
      if (!userIds.length) return json(req, { error: "No recipients matched the selected audience" }, 400);
      if (channels.includes("email") && userIds.length > 1) {
        return json(req, { error: "Bulk email must use Resend Broadcasts. Remove Email from channels or create a Resend broadcast." }, 400);
      }
      const specificRecipients = Array.isArray(body.userIds) && body.userIds.length > 0;
      const preview = {
        dryRun: true, recipientCount: userIds.length, channels, type, title, message,
        audience: specificRecipients ? "Selected users" : String(body.audience),
        provider: channels.includes("email") ? "In-app/Push + Resend transactional" : "In-app + FCM/APNs/Web Push",
        actionUrl,
      };
      if (action === "send.preview") return json(req, preview);
      if (body.confirmed !== true) return json(req, { error: "Explicit send confirmation is required" }, 400);
      const requestId = String(body.idempotencyKey ?? "");
      if (!UUID_RE.test(requestId)) return json(req, { error: "A valid idempotency key is required" }, 400);

      const { error: broadcastError } = await admin.from("notification_broadcasts").insert({
        created_by: adminUser.id,
        type,
        title,
        status: "processing",
        audience: { source: preview.audience, recipient_count: userIds.length },
        channels,
        idempotency_key: requestId,
      });
      if (broadcastError?.code === "23505") return json(req, { error: "This send request was already submitted; refresh the delivery log before retrying." }, 409);
      if (broadcastError) throw broadcastError;

      const notificationIds: string[] = [];
      try {
        for (let i = 0; i < userIds.length; i += 500) {
          const rows = userIds.slice(i, i + 500).map((userId) => ({
            user_id: userId, type, title, message, action_url: actionUrl,
            data: body.metadata ?? {}, read: false,
            metadata: { ...(typeof body.metadata === "object" && body.metadata ? body.metadata : {}), source: "admin_notification_center", sent_by: adminUser.id, request_id: requestId },
          }));
          const { data, error } = await admin.from("notifications").insert(rows).select("id");
          if (error) throw error;
          notificationIds.push(...(data ?? []).map((row) => row.id as string));
        }
        const dispatchOutcomes: unknown[] = [];
        for (let i = 0; i < notificationIds.length; i += 100) {
          const response = await fetch(`${SUPABASE_URL}/functions/v1/notification-dispatcher`, {
            method: "POST",
            headers: { Authorization: `Bearer ${SERVICE_ROLE_KEY}`, "Content-Type": "application/json" },
            body: JSON.stringify({ notificationIds: notificationIds.slice(i, i + 100), channels }),
          });
          const result = await response.json().catch(() => ({}));
          if (!response.ok) throw new Error(String(result.error ?? `Dispatcher failed (${response.status})`));
          if (Array.isArray(result.outcomes)) dispatchOutcomes.push(...result.outcomes);
        }
        const failedCount = dispatchOutcomes.filter((item) => typeof item === "object" && item !== null && (item as Record<string, unknown>).status === "failed").length;
        const status = failedCount === 0 ? "sent" : failedCount === dispatchOutcomes.length ? "failed" : "partial";
        const { error: auditError } = await admin.from("notification_broadcasts").update({ status, metadata: { notification_ids: notificationIds, dispatch_outcomes: dispatchOutcomes } }).eq("idempotency_key", requestId);
        if (auditError) throw auditError;
        return json(req, { ok: true, recipientCount: userIds.length, notificationCount: notificationIds.length, failedDeliveries: failedCount, channels });
      } catch (dispatchError) {
        await admin.from("notification_broadcasts").update({ status: "failed", metadata: { notification_ids: notificationIds, error: dispatchError instanceof Error ? dispatchError.message : "Dispatch failed" } }).eq("idempotency_key", requestId);
        throw dispatchError;
      }
    }

    if (action === "resend") {
      const operation = String(body.operation ?? "");
      const payload = (body.payload && typeof body.payload === "object" ? body.payload : {}) as Record<string, unknown>;
      const confirmationRequired = ["emails.send", "emails.batch", "broadcasts.send", "broadcasts.cancel"].includes(operation);
      if (confirmationRequired && payload.confirmed !== true) return json(req, { error: "Explicit confirmation is required for this Resend operation" }, 400);
      if (operation === "emails.send" && Array.isArray(payload.to) && payload.to.length > 1) {
        return json(req, { error: "Transactional email sends support one recipient. Use Resend Broadcasts for campaigns." }, 400);
      }
      if (operation === "emails.batch") {
        const batch = Array.isArray(payload.batch) ? payload.batch : [];
        if (!batch.length || batch.some((item) => !item || typeof item !== "object" || Array.isArray(item) || Array.isArray((item as Record<string, unknown>).to) && ((item as Record<string, unknown>).to as unknown[]).length > 1)) {
          return json(req, { error: "Resend batch requires messages with no more than one recipient each. Use Resend Broadcasts for campaigns." }, 400);
        }
      }
      const { confirmed: _confirmed, ...providerPayload } = payload;
      const response = await fetch(`${SUPABASE_URL}/functions/v1/resend-control`, {
        method: "POST",
        headers: { Authorization: `Bearer ${SERVICE_ROLE_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({ operation, payload: providerPayload }),
      });
      const result = await response.json().catch(() => ({}));
      return json(req, operation.startsWith("apiKeys.") ? redactSecrets(result) : result, response.status);
    }

    return json(req, { error: `Unknown action: ${action}` }, 400);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected notification center error";
    const status = message === "Authentication required" ? 401 : message.includes("permission required") ? 403 : 500;
    return json(req, { error: message }, status);
  }
});
