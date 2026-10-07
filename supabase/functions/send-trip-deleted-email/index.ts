import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { buildHtmlEmail, escapeHtml } from "../_shared/email_template.ts";

declare const Deno: { env: { get(name: string): string | undefined } };

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE_KEY = Deno.env.get("SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const RESEND_FROM = Deno.env.get("RESEND_FROM") ?? "Ketravelan <no-reply@ketravelan.com>";
const SITE_URL = Deno.env.get("SITE_URL") ?? "https://ketravelan.com";
const service = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const allowedOrigins = new Set([
  "https://ketravelan.com",
  "https://www.ketravelan.com",
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:8080",
  "capacitor://localhost",
]);

function corsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("origin") ?? "";
  return {
    "Access-Control-Allow-Origin": allowedOrigins.has(origin) ? origin : "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, prefer",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}

function json(req: Request, body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(req), "Content-Type": "application/json" },
  });
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders(req) });
  if (req.method !== "POST") return json(req, { error: "Method not allowed" }, 405);

  try {
    if (!SUPABASE_URL || !SERVICE_ROLE_KEY || !RESEND_API_KEY) {
      throw new Error("Trip deletion email is not configured");
    }

    const token = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "").trim();
    if (!token) return json(req, { error: "Authentication required" }, 401);

    const { data: authData, error: authError } = await service.auth.getUser(token);
    const user = authData.user;
    if (authError || !user?.id || !user.email) return json(req, { error: "Authentication required" }, 401);

    const body = await req.json() as { tripId?: string };
    if (!body.tripId || !/^[0-9a-f-]{36}$/i.test(body.tripId)) {
      return json(req, { error: "A valid tripId is required" }, 400);
    }

    const { data: trip, error: tripError } = await service
      .from("trips")
      .select("id, title, destination, creator_id, status")
      .eq("id", body.tripId)
      .maybeSingle();
    if (tripError) throw tripError;
    if (!trip || trip.creator_id !== user.id || trip.status !== "deleted") {
      return json(req, { error: "Deleted trip not found for this user" }, 404);
    }

    const tripTitle = escapeHtml(trip.title || "Your trip");
    const destination = escapeHtml(trip.destination || "");
    const tripsUrl = `${new URL(SITE_URL).origin}/my-trips`;
    const subject = `Trip deleted: ${trip.title || "Your trip"}`;
    const html = buildHtmlEmail({
      brand: "Ketravelan",
      title: "Trip successfully deleted",
      messageHtml: `<p>Your trip <strong>${tripTitle}</strong>${destination ? ` to ${destination}` : ""} has been successfully deleted and removed from listings.</p>`,
      ctaUrl: tripsUrl,
      ctaLabel: "View Your Trips",
      logoUrl: "https://ketravelan.com/ketravelan_logo.png",
      preheader: "Your trip has been deleted.",
      footerText: "You received this email because a trip you created was deleted.",
      signoff: "The Ketravelan Crew",
    });
    const text = `Trip successfully deleted\n\nYour trip ${trip.title || "Your trip"}${trip.destination ? ` to ${trip.destination}` : ""} has been successfully deleted and removed from listings.\n\nView your trips: ${tripsUrl}\n\nThe Ketravelan Crew`;

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: RESEND_FROM, to: [user.email], subject, html, text }),
    });
    if (!response.ok) {
      console.error("Trip deletion email provider rejected request", { status: response.status });
      return json(req, { error: "Email provider could not send the confirmation" }, 502);
    }

    return json(req, { sent: true });
  } catch (error) {
    console.error("Trip deletion email failed", error);
    return json(req, { error: error instanceof Error ? error.message : "Unable to send deletion confirmation" }, 500);
  }
});
