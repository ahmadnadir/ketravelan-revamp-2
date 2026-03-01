import { supabase } from "./supabase";

export async function isTripSaved(tripId: string, userId?: string): Promise<boolean> {
  try {
    if (!tripId || !userId) return false;
    const { data, error } = await supabase
      .from("saved_trips")
      .select("id")
      .eq("trip_id", tripId)
      .eq("user_id", userId)
      .maybeSingle();
    if (error) return false;
    return !!data;
  } catch {
    return false;
  }
}

export async function saveTrip(tripId: string, userId?: string): Promise<boolean> {
  if (!tripId || !userId) return false;
  const { error } = await supabase
    .from("saved_trips")
    .insert({ trip_id: tripId, user_id: userId });
  return !error;
}

export async function unsaveTrip(tripId: string, userId?: string): Promise<boolean> {
  if (!tripId || !userId) return false;
  const { error } = await supabase
    .from("saved_trips")
    .delete()
    .eq("trip_id", tripId)
    .eq("user_id", userId);
  return !error;
}
