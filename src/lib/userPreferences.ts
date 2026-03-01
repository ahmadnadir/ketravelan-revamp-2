import { supabase } from "./supabase";

export interface UserPreferences {
  email_notifications: boolean;
  push_notifications: boolean;
  trip_reminders: boolean;
  is_public: boolean;
  show_trips_publicly: boolean;
}

/**
 * Fetch user preferences from their profile
 */
export async function fetchUserPreferences(userId: string): Promise<UserPreferences | null> {
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("email_notifications, push_notifications, trip_reminders, is_public, show_trips_publicly")
      .eq("id", userId)
      .single();

    if (error) throw error;
    return data as UserPreferences;
  } catch (error) {
    console.error("Error fetching user preferences:", error);
    return null;
  }
}

/**
 * Update user preferences
 */
export async function updateUserPreferences(userId: string, preferences: Partial<UserPreferences>): Promise<boolean> {
  try {
    const { error } = await supabase
      .from("profiles")
      .update(preferences)
      .eq("id", userId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error("Error updating user preferences:", error);
    return false;
  }
}

/**
 * Update a single preference
 */
export async function updateUserPreference(userId: string, key: keyof UserPreferences, value: boolean): Promise<boolean> {
  return updateUserPreferences(userId, { [key]: value });
}
