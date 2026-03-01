import { supabase } from "./supabase";

export interface HelpArticle {
  id: string;
  slug: string;
  category: string;
  title: string;
  content_html: string;
  excerpt: string | null;
  search_keywords: string | null;
  view_count: number;
  is_published: boolean;
  created_at: string;
  updated_at: string;
}

export interface HelpCategory {
  name: string;
  count: number;
}

/**
 * Fetch all published help articles
 */
export async function fetchHelpArticles(): Promise<HelpArticle[]> {
  const { data, error } = await supabase
    .from("help_articles")
    .select("*")
    .eq("is_published", true)
    .order("category", { ascending: true })
    .order("title", { ascending: true });

  if (error) {
    console.error("Error fetching help articles:", error);
    return [];
  }

  return data as HelpArticle[];
}

/**
 * Fetch a single help article by slug
 */
export async function fetchHelpArticle(slug: string): Promise<HelpArticle | null> {
  const { data, error } = await supabase
    .from("help_articles")
    .select("*")
    .eq("slug", slug)
    .eq("is_published", true)
    .maybeSingle();

  if (error) {
    console.error("Error fetching help article:", error);
    return null;
  }

  // Increment view count
  if (data) {
    await supabase
      .from("help_articles")
      .update({ view_count: data.view_count + 1 })
      .eq("id", data.id);
  }

  return data as HelpArticle | null;
}

/**
 * Search help articles by query
 */
export async function searchHelpArticles(query: string): Promise<HelpArticle[]> {
  if (!query.trim()) {
    return fetchHelpArticles();
  }

  const { data, error } = await supabase
    .from("help_articles")
    .select("*")
    .eq("is_published", true)
    .or(`title.ilike.%${query}%,excerpt.ilike.%${query}%,search_keywords.ilike.%${query}%`)
    .order("view_count", { ascending: false });

  if (error) {
    console.error("Error searching help articles:", error);
    return [];
  }

  return data as HelpArticle[];
}

/**
 * Get all categories with article counts
 */
export async function fetchHelpCategories(): Promise<HelpCategory[]> {
  const articles = await fetchHelpArticles();
  
  const categoryCounts = articles.reduce((acc, article) => {
    acc[article.category] = (acc[article.category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return Object.entries(categoryCounts).map(([name, count]) => ({
    name,
    count,
  }));
}

/**
 * Filter articles by category
 */
export async function fetchArticlesByCategory(category: string): Promise<HelpArticle[]> {
  const { data, error } = await supabase
    .from("help_articles")
    .select("*")
    .eq("is_published", true)
    .eq("category", category)
    .order("title", { ascending: true });

  if (error) {
    console.error("Error fetching articles by category:", error);
    return [];
  }

  return data as HelpArticle[];
}
