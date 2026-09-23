// deno-lint-ignore-file no-explicit-any
declare const Deno: {
  env: { get(name: string): string | undefined };
  serve(handler: (req: Request) => Response | Promise<Response>): void;
};
// @ts-expect-error Supabase Edge resolves npm specifiers at deploy/runtime.
import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SERVICE_ROLE_KEY = Deno.env.get("SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const SITE_URL = Deno.env.get("SITE_URL") ?? "https://ketravelan.com";

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  throw new Error("Missing required Supabase environment variables");
}

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
  const { error } = await admin.functions.invoke("send-system-push", {
    body: payload,
    headers: { Authorization: `Bearer ${SERVICE_ROLE_KEY}` },
  });
  if (error) throw error;
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

interface TripRecommendationRequest {
  tripId: string;
  limit?: number;
  dryRun?: boolean;
}

function isInternalRequest(req: Request): boolean {
  const authorization = req.headers.get("authorization") || "";
  return authorization.startsWith("Bearer ")
    && authorization.slice("Bearer ".length).trim() === SERVICE_ROLE_KEY;
}

Deno.serve(async (req: Request) => {
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

  if (!isInternalRequest(req)) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }

  try {
    let body: TripRecommendationRequest;
    try {
      body = await req.json() as TripRecommendationRequest;
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }
    const tripId = typeof body?.tripId === "string" ? body.tripId.trim() : "";
    const requestedLimit = Number.isFinite(body?.limit) ? Math.floor(body.limit as number) : 100;
    const limit = Math.min(Math.max(requestedLimit, 1), 100);

    if (!tripId) {
      return new Response(JSON.stringify({ error: "Missing tripId" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // The database publish trigger is the only supported caller. The public /
    // published predicate prevents private trip data from reaching recipients.
    const { data: trip, error: tripErr } = await admin
      .from("trips")
      .select("id, title, destination, slug, travel_styles, creator_id, status, visibility")
      .eq("id", tripId)
      .maybeSingle();

    if (tripErr) {
      console.error("Trip lookup failed", { tripId });
      throw tripErr;
    }
    if (!trip) {
      return new Response(JSON.stringify({ error: "Trip not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    if (trip.status !== "published" || trip.visibility !== "public") {
      return new Response(JSON.stringify({ error: "Trip not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const tripStyles = Array.isArray(trip.travel_styles)
      ? (trip.travel_styles as unknown[]).filter((style: unknown): style is string => typeof style === "string" && style.length > 0)
      : [];

    let usersQuery = admin
      .from("profiles")
      .select("id, travel_styles")
      .eq("push_notifications", true)
      .neq("id", trip.creator_id)
      .limit(limit);

    if (tripStyles.length > 0) {
      usersQuery = usersQuery.overlaps("travel_styles", tripStyles);
    }

    const { data: users, error: usersErr } = await usersQuery;

    if (usersErr) {
      console.error("Recipient lookup failed", { tripId });
      throw usersErr;
    }

    const candidateIds: string[] = (users ?? []).map((candidate: { id: string }) => candidate.id);
    const [membersResult, creatorBlockedResult, candidateBlockedResult] = await Promise.all([
      admin
        .from("trip_members")
        .select("user_id")
        .eq("trip_id", trip.id)
        .is("left_at", null)
        .in("user_id", candidateIds.length > 0 ? candidateIds : ["00000000-0000-0000-0000-000000000000"]),
      admin
        .from("blocked_users")
        .select("blocked_user_id")
        .eq("user_id", trip.creator_id)
        .in("blocked_user_id", candidateIds.length > 0 ? candidateIds : ["00000000-0000-0000-0000-000000000000"]),
      admin
        .from("blocked_users")
        .select("user_id")
        .eq("blocked_user_id", trip.creator_id)
        .in("user_id", candidateIds.length > 0 ? candidateIds : ["00000000-0000-0000-0000-000000000000"]),
    ]);

    if (membersResult.error || creatorBlockedResult.error || candidateBlockedResult.error) {
      console.error("Recipient exclusion lookup failed", { tripId });
      throw membersResult.error ?? creatorBlockedResult.error ?? candidateBlockedResult.error;
    }

    const joinedIds = new Set((membersResult.data ?? []).map((member: { user_id: string }) => member.user_id));
    const blockedIds = new Set([
      ...(creatorBlockedResult.data ?? []).map((block: { blocked_user_id: string }) => block.blocked_user_id),
      ...(candidateBlockedResult.data ?? []).map((block: { user_id: string }) => block.user_id),
    ]);
    const userIds = candidateIds.filter((id: string) => !joinedIds.has(id) && !blockedIds.has(id)).slice(0, limit);

    if (userIds.length === 0) {
      console.log("No recommendation recipients", { tripId });
      return new Response(
        JSON.stringify({ ok: true, skipped: true, reason: "No users found" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const tripIdentifier = trip.slug || trip.id;
    const actionUrl = `/explore?trip=${tripIdentifier}`;

    if (body.dryRun) {
      return new Response(
        JSON.stringify({
          ok: true,
          preview: {
            recipientCount: userIds.length,
            notificationType: "trip_recommendation",
            title: "New Trip Matching Interest",
            body: `New trip you might like 🌍 Check out ${trip.title} in ${trip.destination}`,
            actionUrl,
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Send push recommendations
    console.log("Sending trip recommendations", { tripId, recipientCount: userIds.length });
    try {
      await sendSystemPush({
        userIds,
        type: "trip_recommendation",
        title: "New Trip Matching Interest",
        body: `New trip you might like 🌍 Check out ${trip.title} in ${trip.destination}`,
        actionUrl,
        priority: "low",
        metadata: {
          trip_id: trip.id,
          trip_destination: trip.destination,
          trip_styles: trip.travel_styles,
        },
        batchKey: `trip_recommendations_${new Date().toISOString().split('T')[0]}`,
        batchWindowMinutes: 1440,
      });
      console.log("Trip recommendations sent", { tripId, recipientCount: userIds.length });
    } catch (pushErr) {
      console.error("Trip recommendation dispatch failed", { tripId });
      throw pushErr;
    }

    return new Response(JSON.stringify({ ok: true, notifiedCount: userIds.length }), {
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
