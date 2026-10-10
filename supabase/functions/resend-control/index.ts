import { Resend } from "npm:resend@6.30.0";

declare const Deno: { env: { get(name: string): string | undefined } };

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const resend = new Resend(RESEND_API_KEY);

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

async function run(operation: string, payload: Record<string, unknown>) {
  switch (operation) {
    case "emails.send": return resend.emails.send(payload as never);
    case "emails.list": return resend.emails.list(payload as never);
    case "emails.get": return resend.emails.get(String(payload.id));
    case "emails.cancel": return resend.emails.cancel(String(payload.id));
    case "emails.batch": return resend.batch.send((payload.batch ?? payload) as never);
    case "templates.list": return resend.templates.list(payload as never);
    case "templates.get": return resend.templates.get(String(payload.id));
    case "templates.create": return resend.templates.create(payload as never);
    case "templates.update": return resend.templates.update(String(payload.id), (payload.data ?? {}) as never);
    case "templates.delete": return resend.templates.remove(String(payload.id));
    case "contacts.list": return resend.contacts.list(payload as never);
    case "contacts.get": return resend.contacts.get(String(payload.idOrEmail));
    case "contacts.create": return resend.contacts.create(payload as never);
    case "contacts.update": return resend.contacts.update(String(payload.idOrEmail), (payload.data ?? {}) as never);
    case "contacts.remove": return resend.contacts.remove(String(payload.idOrEmail));
    case "contacts.list_segment": return resend.contacts.list({ segmentId: String(payload.segmentId), limit: Number(payload.limit) || 100 });
    case "broadcasts.list": return resend.broadcasts.list(payload as never);
    case "broadcasts.get": return resend.broadcasts.get(String(payload.id));
    case "broadcasts.create": return resend.broadcasts.create(payload as never);
    case "broadcasts.update": return resend.broadcasts.update(String(payload.id), (payload.data ?? {}) as never);
    case "broadcasts.send": return resend.broadcasts.send(String(payload.id), (payload.data ?? {}) as never);
    case "broadcasts.cancel": return resend.broadcasts.cancel(String(payload.id));
    case "domains.list": return resend.domains.list(payload as never);
    case "domains.get": return resend.domains.get(String(payload.id));
    case "domains.create": return resend.domains.create(payload as never);
    case "domains.verify": return resend.domains.verify(String(payload.id));
    case "domains.update": return resend.domains.update(payload as never);
    case "domains.remove": return resend.domains.remove(String(payload.id));
    case "webhooks.list": return resend.webhooks.list(payload as never);
    case "webhooks.get": return resend.webhooks.get(String(payload.id));
    case "webhooks.create": return resend.webhooks.create(payload as never);
    case "webhooks.update": return resend.webhooks.update(String(payload.id), (payload.data ?? {}) as never);
    case "webhooks.remove": return resend.webhooks.remove(String(payload.id));
    case "webhooks.events.list": return resend.webhooks.events.list({ webhookId: String(payload.webhookId), after: typeof payload.after === "string" ? payload.after : undefined });
    case "webhooks.events.get": return resend.webhooks.events.get({ webhookId: String(payload.webhookId), eventId: String(payload.eventId) });
    case "webhooks.events.attempts.list": return resend.webhooks.events.attempts.list({ webhookId: String(payload.webhookId), eventId: String(payload.eventId) });
    case "webhooks.events.replay": return resend.webhooks.events.replay({ webhookId: String(payload.webhookId), eventId: String(payload.eventId) });
    case "segments.list": return resend.segments.list(payload as never);
    case "segments.get": return resend.segments.get(String(payload.id));
    case "segments.create": return resend.segments.create(payload as never);
    case "segments.update": return resend.segments.update(String(payload.id), (payload.data ?? {}) as never);
    case "segments.remove": return resend.segments.remove(String(payload.id));
    case "topics.list": return resend.topics.list(payload as never);
    case "topics.get": return resend.topics.get(String(payload.id));
    case "topics.create": return resend.topics.create(payload as never);
    case "topics.update": return resend.topics.update(String(payload.id), (payload.data ?? {}) as never);
    case "topics.remove": return resend.topics.remove(String(payload.id));
    case "contactProperties.list": return resend.contactProperties.list(payload as never);
    case "contactProperties.get": return resend.contactProperties.get(String(payload.id));
    case "contactProperties.create": return resend.contactProperties.create(payload as never);
    case "contactProperties.update": return resend.contactProperties.update(String(payload.id), (payload.data ?? {}) as never);
    case "contactProperties.remove": return resend.contactProperties.remove(String(payload.id));
    case "apiKeys.list": return resend.apiKeys.list(payload as never);
    case "apiKeys.create": return resend.apiKeys.create(payload as never);
    case "apiKeys.update": return resend.apiKeys.update(String(payload.id), (payload.data ?? {}) as never);
    case "apiKeys.remove": return resend.apiKeys.remove(String(payload.id));
    case "receivedEmails.list": return resend.receiving.emails.list(payload as never);
    case "receivedEmails.get": return resend.receiving.emails.get(String(payload.id));
    default: throw new Error("Unsupported Resend operation");
  }
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  const expected = Deno.env.get("SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (!expected || req.headers.get("authorization") !== `Bearer ${expected}`) return json({ error: "Unauthorized" }, 401);
  if (!RESEND_API_KEY) return json({ error: "RESEND_API_KEY is not configured" }, 503);

  try {
    const body: unknown = await req.json();
    if (!isRecord(body) || !isRecord(body.payload ?? {})) return json({ error: "Invalid request" }, 400);
    const result = await run(String(body.operation ?? ""), (body.payload ?? {}) as Record<string, unknown>);
    return json(result);
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Resend request failed" }, 400);
  }
});
