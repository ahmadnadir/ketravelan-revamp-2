import { Car, Bed, Utensils, Ticket, ShoppingBag, Package, LucideIcon } from "lucide-react";

export interface ExpenseCategory {
  id: string;
  label: string;
  icon: LucideIcon;
  emoji: string;
  color: string;
}

export const expenseCategories: ExpenseCategory[] = [
  { id: "Transport", label: "Transport", icon: Car, emoji: "🚗", color: "bg-stat-blue text-stat-blue" },
  { id: "Accommodation", label: "Accommodation", icon: Bed, emoji: "🏨", color: "bg-purple-500/20 text-purple-500" },
  { id: "Food & Drinks", label: "Food & Drinks", icon: Utensils, emoji: "🍴", color: "bg-stat-orange text-stat-orange" },
  { id: "Activities", label: "Activities", icon: Ticket, emoji: "🎫", color: "bg-stat-green text-stat-green" },
  { id: "Shopping", label: "Shopping", icon: ShoppingBag, emoji: "🛍️", color: "bg-pink-500/20 text-pink-500" },
  { id: "Other", label: "Other", icon: Package, emoji: "📦", color: "bg-secondary text-muted-foreground" },
];

export function getCategoryById(categoryId: string): ExpenseCategory {
  return expenseCategories.find(c => c.id === categoryId) || expenseCategories[expenseCategories.length - 1];
}

export function getCategoryEmoji(categoryId: string): string {
  const category = expenseCategories.find(c => c.id === categoryId);
  return category?.emoji || "📦";
}

// Category mapping for expense filtering based on title keywords
const categoryMap: Record<string, string> = {
  "Ferry": "Transport",
  "Rental": "Transport",
  "car": "Transport",
  "taxi": "Transport",
  "flight": "Transport",
  "bus": "Transport",
  "train": "Transport",
  "dinner": "Food & Drinks",
  "lunch": "Food & Drinks",
  "breakfast": "Food & Drinks",
  "restaurant": "Food & Drinks",
  "food": "Food & Drinks",
  "cafe": "Food & Drinks",
  "coffee": "Food & Drinks",
  "Accommodation": "Accommodation",
  "hotel": "Accommodation",
  "resort": "Accommodation",
  "hostel": "Accommodation",
  "airbnb": "Accommodation",
  "Bridge": "Activities",
  "ticket": "Activities",
  "tour": "Activities",
  "activity": "Activities",
  "museum": "Activities",
  "shopping": "Shopping",
  "souvenir": "Shopping",
  "gift": "Shopping",
};

export function getCategoryFromTitle(title: string): string {
  const lowerTitle = title.toLowerCase();
  for (const [keyword, category] of Object.entries(categoryMap)) {
    if (lowerTitle.includes(keyword.toLowerCase())) return category;
  }
  return "Other";
}
