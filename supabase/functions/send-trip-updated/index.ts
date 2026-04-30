// deno-lint-ignore-file no-explicit-any
declare const Deno: { env: { get(name: string): string | undefined } };
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
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

interface TripUpdatedRequest {
  tripId: string;
  updatedFields: string[]; // e.g., ["title", "start_date", "itinerary"]
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
    const body = await req.json() as TripUpdatedRequest;
    if (!body?.tripId) {
      return new Response(JSON.stringify({ error: "Missing tripId" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Fetch trip details
    const { data: trip, error: tripErr } = await admin
      .from("trips")
      .select("id, title, destination, creator_id, slug")
      .eq("id", body.tripId)
      .maybeSingle();

    if (tripErr) throw tripErr;
    if (!trip) throw new Error("Trip not found");

    // Fetch all trip participants (excluding creator who initiated the change)
    const { data: participants, error: partErr } = await admin
      .from("trip_members")
      .select("user_id")
      .eq("trip_id", trip.id)
      .neq("user_id", trip.creator_id);

    if (partErr) throw partErr;

    const participantIds = (participants || []).map(p => p.user_id);

    if (participantIds.length === 0) {
      return new Response(
        JSON.stringify({ ok: true, skipped: true, reason: "No participants to notify" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const actionUrl = `/trip/${trip.slug || trip.id}`;

    if (body.dryRun) {
      return new Response(
        JSON.stringify({
          ok: true,
          preview: {
            recipientCount: participantIds.length,
            notificationType: "trip_updated",
            body: `Trip updated. There are new updates in ${trip.title}`,
            actionUrl,
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Send push to all participants
    await sendSystemPush({
      userIds: participantIds,
      type: "trip_updated",
      title: "Trip updated",
      body: `There are new updates in ${trip.title}`,
      actionUrl,
      priority: "normal",
      metadata: {
        trip_id: trip.id,
        updated_fields: body.updatedFields || [],
      },
    });

    return new Response(JSON.stringify({ ok: true, notifiedCount: participantIds.length }), {
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
