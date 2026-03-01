export interface TravelStyle {
  id: string;
  label: string;
  emoji: string;
}

export const travelStyles: TravelStyle[] = [
  { id: "adventure", label: "Adventure", emoji: "🏔️" },
  { id: "budget", label: "Budget-friendly", emoji: "💰" },
  { id: "nature", label: "Nature", emoji: "🌿" },
  { id: "food", label: "Food & Culinary", emoji: "🍜" },
  { id: "city", label: "City & Urban", emoji: "🏙️" },
  { id: "culture", label: "Culture", emoji: "🏛️" },
  { id: "photography", label: "Photography", emoji: "📸" },
  { id: "hiking", label: "Hiking", emoji: "🥾" },
  { id: "wildlife", label: "Wildlife", emoji: "🦁" },
  { id: "beach", label: "Beach", emoji: "🏖️" },
  { id: "luxury", label: "Luxury", emoji: "✨" },
  { id: "backpacking", label: "Backpacking", emoji: "🎒" },
  { id: "solo", label: "Solo Travel", emoji: "🧭" },
  { id: "family", label: "Family", emoji: "👨‍👩‍👧" },
  { id: "romantic", label: "Romantic", emoji: "💕" },
];

// Helper to get style by ID or label (for backwards compatibility)
export function getTravelStyleByIdOrLabel(idOrLabel: string): TravelStyle | undefined {
  return travelStyles.find(
    (s) => s.id === idOrLabel || s.label.toLowerCase() === idOrLabel.toLowerCase()
  );
}

// Get emoji for a travel style (by ID or label)
export function getTravelStyleEmoji(idOrLabel: string): string {
  const style = getTravelStyleByIdOrLabel(idOrLabel);
  return style?.emoji || "✈️";
}

// Get label for a travel style ID
export function getTravelStyleLabel(id: string): string {
  const style = travelStyles.find((s) => s.id === id);
  return style?.label || id;
}
