// deno-lint-ignore-file no-explicit-any
declare const Deno: { env: { get(name: string): string | undefined } };
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SITE_URL = Deno.env.get("SITE_URL") ?? "https://ketravelan.xyz";

const SITE_ORIGIN = (() => {
  try {
    return new URL(SITE_URL).origin;
  } catch {
    const m = SITE_URL.match(/^(https?:\/\/[^/]+)/);
    return m ? m[1] : "https://ketravelan.xyz";
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
    "https://ketravelan.xyz",
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

interface TravelInterest {
  id: string;
  category: string;
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
    const body = await req.json() as TripRecommendationRequest;
    if (!body?.tripId) {
      return new Response(JSON.stringify({ error: "Missing tripId" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    console.log("Starting trip recommendation for:", body.tripId);

    // Fetch trip details
    const { data: trip, error: tripErr } = await admin
      .from("trips")
      .select("id, title, destination, slug, travel_styles, creator_id")
      .eq("id", body.tripId)
      .maybeSingle();

    if (tripErr) {
      console.error("Trip fetch error:", tripErr);
      throw tripErr;
    }
    if (!trip) {
      console.log("Trip not found");
      throw new Error("Trip not found");
    }

    console.log("Trip found:", trip.id);

    // Get all users with push notifications enabled
    console.log("Fetching users with push notifications enabled");
    const { data: users, error: usersErr } = await admin
      .from("profiles")
      .select("id")
      .eq("push_notifications", true)
      .neq("id", trip.creator_id)
      .limit(body.limit || 100);

    if (usersErr) {
      console.error("User fetch error:", usersErr);
      throw usersErr;
    }

    console.log("Found users:", users?.length || 0);

    if (!users || users.length === 0) {
      console.log("No users found for notification");
      return new Response(
        JSON.stringify({ ok: true, skipped: true, reason: "No users found" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const userIds = users.map(u => u.id);
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
    console.log("Sending notifications to", userIds.length, "users");
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
      console.log("Notifications sent successfully");
    } catch (pushErr) {
      console.error("Push notification error:", pushErr);
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
