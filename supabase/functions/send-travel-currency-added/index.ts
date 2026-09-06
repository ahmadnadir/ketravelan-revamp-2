// deno-lint-ignore-file no-explicit-any
declare const Deno: { env: { get(name: string): string | undefined } };
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

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

interface TravelCurrencyAddedRequest {
  tripId: string;
  currencyCode: string;
}

serve(async (req: Request) => {
  const corsHeaders = buildCorsHeaders(req);
  const json = (payload: unknown, status = 200) =>
    new Response(JSON.stringify(payload), {
      status,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  try {
    const accessToken = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
    if (!accessToken) {
      return json({ error: "Missing authorization" }, 401);
    }

    const { data: authData, error: authErr } = await admin.auth.getUser(accessToken);
    const actorId = authData?.user?.id;
    if (authErr || !actorId) {
      return json({ error: "Invalid authorization" }, 401);
    }

    const body = await req.json() as TravelCurrencyAddedRequest;
    if (!body?.tripId || !body?.currencyCode) {
      return json({ error: "Missing tripId or currencyCode" }, 400);
    }

    const { data: trip, error: tripErr } = await admin
      .from("trips")
      .select("id, title, slug")
      .eq("id", body.tripId)
      .maybeSingle();

    if (tripErr) throw tripErr;
    if (!trip) return json({ error: "Trip not found" }, 404);

    // Fetch all trip members
    const { data: members, error: membersErr } = await admin
      .from("trip_members")
      .select("user_id")
      .eq("trip_id", trip.id)
      .is("left_at", null);

    if (membersErr) throw membersErr;

    const allMemberIds = (members || []).map((m: any) => String(m.user_id));
    if (!allMemberIds.includes(actorId)) {
      return json({ error: "Not a member of this trip" }, 403);
    }

    const recipientIds = allMemberIds.filter((id: string) => id !== actorId);
    if (recipientIds.length === 0) {
      return json({ ok: true, skipped: true, reason: "No recipients" });
    }

    const { data: profile } = await admin
      .from("profiles")
      .select("full_name, username")
      .eq("id", actorId)
      .maybeSingle();

    const actorName = profile?.full_name || profile?.username || "Someone";
    const currencyCode = body.currencyCode.toUpperCase().trim();
    const actionUrl = `/trip/${trip.slug || trip.id}/hub?tab=expenses`;

    await sendSystemPush({
      userIds: recipientIds,
      type: "travel_currency_added",
      title: "Travel currency added",
      body: `${actorName} added ${currencyCode} to the trip.`,
      actionUrl,
      priority: "normal",
      metadata: {
        trip_id: trip.id,
        currency_code: currencyCode,
        added_by: actorId,
      },
    });

    return json({ ok: true, notifiedCount: recipientIds.length });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unexpected error";
    return json({ error: message }, 500);
  }
});
