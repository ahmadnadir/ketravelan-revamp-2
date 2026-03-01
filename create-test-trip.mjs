import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = "https://sspvqhleqlycsiniywkg.supabase.co";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

if (!SERVICE_ROLE_KEY) {
  console.error("SUPABASE_SERVICE_ROLE_KEY not set");
  Deno.exit(1);
}

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

// Create a test trip
const trip = {
  creator_id: "5f7c1b22-8e5a-4d3c-9f1a-2e4b8c7d6a9f", // Use a valid user ID - the trip creator
  type: "community",
  status: "published",
  title: "Test Adventure Trip",
  description: "A test trip for recommendations",
  destination: "Thailand",
  category: "adventure",
  travel_styles: ["backpacking", "adventure"],
  start_date: "2026-03-01",
  end_date: "2026-03-10",
  currency: "USD",
  price: 1500,
  max_participants: 10,
  current_participants: 1,
  visibility: "public"
};

const { data: newTrip, error: insertErr } = await admin
  .from("trips")
  .insert([trip])
  .select()
  .single();

if (insertErr) {
  console.error("Error creating trip:", insertErr);
  Deno.exit(1);
}

console.log("Trip created successfully!");
console.log("Trip ID:", newTrip.id);
console.log("Trip data:", JSON.stringify(newTrip, null, 2));
