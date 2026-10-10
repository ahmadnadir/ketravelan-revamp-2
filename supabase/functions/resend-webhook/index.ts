import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "npm:resend@6.30.0";

declare const Deno: { env: { get(name: string): string | undefined } };

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE_KEY = Deno.env.get("SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const WEBHOOK_SECRET = Deno.env.get("RESEND_WEBHOOK_SECRET") ?? "";
const resend = new Resend(Deno.env.get("RESEND_API_KEY") ?? "");
const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

function deliveryStatus(eventType: string): "sent" | "delivered" | "failed" | null {
  if (eventType === "email.delivered") return "delivered";
  if (["email.bounced", "email.complained", "email.failed"].includes(eventType)) return "failed";
  if (["email.sent", "email.delivery_delayed"].includes(eventType)) return "sent";
  return null;
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY || !WEBHOOK_SECRET) return json({ error: "Webhook is not configured" }, 503);

  try {
    const rawBody = await req.text();
    const eventId = req.headers.get("svix-id");
    const timestamp = req.headers.get("svix-timestamp");
    const signature = req.headers.get("svix-signature");
    if (!eventId || !timestamp || !signature) return json({ error: "Missing Resend signature headers" }, 400);

    const verified = resend.webhooks.verify({
      payload: rawBody,
      headers: { id: eventId, timestamp, signature },
      webhookSecret: WEBHOOK_SECRET,
    }) as Record<string, unknown>;
    const data = (verified.data && typeof verified.data === "object" ? verified.data : {}) as Record<string, unknown>;
    const eventType = String(verified.type ?? "unknown");
    const providerMessageId = String(data.email_id ?? data.id ?? "") || null;

    const { error: eventError } = await admin.from("notification_provider_events").upsert({
      provider: "resend",
      provider_event_id: eventId,
      event_type: eventType,
      provider_message_id: providerMessageId,
      payload: verified,
    }, { onConflict: "provider,provider_event_id", ignoreDuplicates: true });
    if (eventError) throw eventError;

    const nextStatus = deliveryStatus(eventType);
    let matchedDeliveries = 0;
    if (providerMessageId && nextStatus) {
      const updates: Record<string, unknown> = { status: nextStatus };
      if (nextStatus === "delivered") updates.delivered_at = new Date().toISOString();
      if (nextStatus === "failed") updates.last_error = String(data.bounce?.message ?? data.reason ?? eventType);
      const { data: updated, error: deliveryError } = await admin.from("notification_deliveries")
        .update(updates)
        .eq("provider", "resend")
        .eq("provider_message_id", providerMessageId)
        .select("id");
      if (deliveryError) throw deliveryError;
      matchedDeliveries = updated?.length ?? 0;
    }

    const { error: processedError } = await admin.from("notification_provider_events")
      .update({ processed_at: new Date().toISOString() })
      .eq("provider", "resend")
      .eq("provider_event_id", eventId);
    if (processedError) throw processedError;

    return json({ ok: true, eventId, eventType, matchedDeliveries });
  } catch (error) {
    console.error("[resend-webhook] Verification or processing failed:", error);
    return json({ error: error instanceof Error ? error.message : "Invalid provider webhook" }, 400);
  }
});
