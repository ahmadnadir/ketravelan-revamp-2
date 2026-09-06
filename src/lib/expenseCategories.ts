import { supabase } from "@/lib/supabase";

export interface ExpenseCategory {
  id: string;
  code: string;
  name: string;
  emoji: string;
  description: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export async function fetchExpenseCategories(activeOnly = false): Promise<ExpenseCategory[]> {
  let query = supabase
    .from("expense_categories")
    .select("id, code, name, emoji, description, sort_order, is_active, created_at, updated_at")
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (activeOnly) query = query.eq("is_active", true);

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

// Converts legacy display-name values to the stable database code during migration.
export function getExpenseCategoryCode(value?: string | null): string | null {
  const normalized = value?.trim().toLowerCase();
  if (!normalized) return null;

  const legacyCodes: Record<string, string> = {
    transport: "transport",
    transportation: "transport",
    accommodation: "accommodation",
    food: "food_and_drinks",
    "food & drinks": "food_and_drinks",
    "food and drinks": "food_and_drinks",
    activities: "activities",
    activity: "activities",
    shopping: "shopping",
    flight: "flight",
    "equipment rentals": "equipment_rentals",
    equipment_rental: "equipment_rentals",
    equipment_rentals: "equipment_rentals",
    other: "other",
  };

  return legacyCodes[normalized] || normalized;
}
