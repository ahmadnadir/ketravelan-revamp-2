// Unified category constants used across the app
// Matches: Explore filters, Trip creation, Trip cards

export const tripCategories = [
  { id: "nature-outdoor", label: "Nature & Outdoor", icon: "🌿" },
  { id: "beach", label: "Beach", icon: "🏖️" },
  { id: "city-urban", label: "City & Urban", icon: "🏙️" },
  { id: "adventure", label: "Adventure", icon: "🧗" },
  { id: "culture", label: "Culture", icon: "🏛️" },
  { id: "food", label: "Food", icon: "🍜" },
  { id: "cross-border", label: "Cross Border", icon: "🌍" },
] as const;

export type TripCategory = typeof tripCategories[number];
export type TripCategoryId = TripCategory["id"];
export type TripCategoryLabel = TripCategory["label"];
