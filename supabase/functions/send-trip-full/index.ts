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

interface TripFullRequest {
  tripId: string;
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
    const body = await req.json() as TripFullRequest;
    if (!body?.tripId) {
      return new Response(JSON.stringify({ error: "Missing tripId" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Fetch trip details including participant count
    const { data: trip, error: tripErr } = await admin
      .from("trips")
      .select("id, title, destination, creator_id, slug, max_participants")
      .eq("id", body.tripId)
      .maybeSingle();

    if (tripErr) throw tripErr;
    if (!trip) throw new Error("Trip not found");

    // Count active participants (including creator)
    const { data: participants, error: partErr, count } = await admin
      .from("trip_members")
      .select("id", { count: "exact" })
      .eq("trip_id", trip.id);

    if (partErr) throw partErr;

    const currentCount = (count || 0) + 1; // +1 for creator
    const maxParticipants = trip.max_participants || 0;

    // Only notify if trip is now full
    if (maxParticipants <= 0 || currentCount < maxParticipants) {
      return new Response(
        JSON.stringify({ ok: true, skipped: true, reason: "Trip not full yet" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const actionUrl = `/trip/${trip.slug || trip.id}`;

    if (body.dryRun) {
      return new Response(
        JSON.stringify({
          ok: true,
          preview: {
            notificationType: "trip_full",
            title: "Trip Is Full",
            body: `Trip is full 🎉 ${trip.title} has reached maximum slots`,
            actionUrl,
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Fetch all trip members to send push notifications
    const { data: tripMembers, error: membersErr } = await admin
      .from("trip_members")
      .select("user_id")
      .eq("trip_id", trip.id);

    if (membersErr) throw membersErr;

    const memberUserIds = (tripMembers || []).map((p) => p.user_id);
    // Also add the trip creator
    const allUserIds = [...new Set([trip.creator_id, ...memberUserIds])];

    if (allUserIds.length > 0) {
      await sendSystemPush({
        userIds: allUserIds,
        type: "trip_full",
        title: "Trip Is Full",
        body: `Trip is full 🎉 ${trip.title} has reached maximum slots`,
        actionUrl,
        priority: "low",
        metadata: {
          trip_id: trip.id,
          current_count: currentCount,
          max_capacity: maxParticipants,
        },
      });
    }

    return new Response(JSON.stringify({ ok: true, notifiedCount: allUserIds.length }), {
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
