import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = "https://sspvqhleqlycsiniywkg.supabase.co";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

const { data: trip, error: tripErr } = await admin
  .from("trips")
  .select("id, title, destination, travel_styles, creator_id")
  .eq("id", "f2c37607-4445-41a6-869c-04463dee0246")
  .maybeSingle();

console.log("Trip Error:", tripErr);
console.log("Trip Data:", JSON.stringify(trip, null, 2));

if (trip && trip.travel_styles && Array.isArray(trip.travel_styles) && trip.travel_styles.length > 0) {
  const { data: users, error: usersErr } = await admin
    .from("profiles")
    .select("id, travel_styles")
    .eq("push_notifications", true)
    .neq("id", trip.creator_id)
    .overlaps("travel_styles", trip.travel_styles)
    .limit(5);
  
  console.log("Overlaps Query Error:", usersErr);
  console.log("Matching Users:", JSON.stringify(users, null, 2));
} else {
  console.log("Trip has no travel_styles or no matching criteria");
}
