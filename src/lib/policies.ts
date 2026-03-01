import { supabase } from "@/lib/supabase";

export interface Policy {
  idx: number;
  id: string;
  slug: string;
  title: string;
  content_html: string;
  last_updated: string;
  created_at: string;
  updated_at: string;
}

export async function fetchPolicy(slug: string): Promise<Policy | null> {
  try {
    const { data, error } = await supabase
      .from("policies")
      .select("*")
      .eq("slug", slug)
      .single();

    if (error) {
      console.error(`Error fetching policy with slug "${slug}":`, error);
      return null;
    }

    return data as Policy;
  } catch (err) {
    console.error("Error fetching policy:", err);
    return null;
  }
}
