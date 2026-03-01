import { supabase, Database } from "@/lib/supabase";

export async function getUserProfileById(userId: string) {
  const { data, error } = await supabase
    .from<Database["public"]["Tables"]["profiles"]["Row"]>("profiles")
    .select("*")
    .eq("id", userId)
    .single();
  if (error) throw error;
  return data;
}
