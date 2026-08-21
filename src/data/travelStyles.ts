export interface TravelStyle {
  id: string;
  label: string;
  emoji: string;
}

const legacyAliases: Record<string, string> = {
  nature: "nature-outdoor",
  "nature & outdoor": "nature-outdoor",
  city: "city-urban",
  "city & urban": "city-urban",
  food: "food",
  "food & culinary": "food",
  "food & food": "food",
  budget: "budget",
  "budget-friendly": "budget",
  beach: "beach",
  adventure: "adventure",
  culture: "culture",
  photography: "photography",
  hiking: "hiking",
  wildlife: "wildlife",
  luxury: "luxury",
  backpacking: "backpacking",
  solo: "solo",
  family: "family",
  romantic: "romantic",
  "cross border": "cross-border",
  "cross-border": "cross-border",
  "concert & festival": "music-festivals",
  "concerts & festivals": "music-festivals",
  "music & festivals": "music-festivals",
  "music-festivals": "music-festivals",
  "dive": "diving-water",
  "diving": "diving-water",
  "diving & water": "diving-water",
  "diving-water": "diving-water",
  "umrah": "umrah-diy",
  "umrah diy": "umrah-diy",
  "runcation": "runcation",
};

export const travelStyles: TravelStyle[] = [
  { id: "nature-outdoor", label: "Nature & Outdoor", emoji: "🌿" },
  { id: "beach", label: "Beach", emoji: "🏖️" },
  { id: "city-urban", label: "City & Urban", emoji: "🏙️" },
  { id: "adventure", label: "Adventure", emoji: "🧗" },
  { id: "culture", label: "Culture", emoji: "🏛️" },
  { id: "food", label: "Food", emoji: "🍜" },
  { id: "cross-border", label: "Cross Border", emoji: "🌍" },
  { id: "music-festivals", label: "Concert & Festival", emoji: "🎶" },
  { id: "diving-water", label: "Diving", emoji: "🤿" },
  { id: "runcation", label: "Runcation", emoji: "🏃" },
  { id: "umrah-diy", label: "Umrah DIY", emoji: "🕌" },
  { id: "budget", label: "Budget-friendly", emoji: "💰" },
  { id: "photography", label: "Photography", emoji: "📸" },
  { id: "hiking", label: "Hiking", emoji: "🥾" },
  { id: "wildlife", label: "Wildlife", emoji: "🦁" },
  { id: "luxury", label: "Luxury", emoji: "✨" },
  { id: "backpacking", label: "Backpacking", emoji: "🎒" },
  { id: "solo", label: "Solo Travel", emoji: "🧭" },
  { id: "family", label: "Family", emoji: "👨‍👩‍👧" },
  { id: "romantic", label: "Romantic", emoji: "💕" },
];

const normalizeTravelStyleKey = (value: string) => value.trim().toLowerCase();

// Helper to get style by ID or label (for backwards compatibility)
export function getTravelStyleByIdOrLabel(idOrLabel: string): TravelStyle | undefined {
  const key = normalizeTravelStyleKey(idOrLabel);
  const alias = legacyAliases[key];
  const canonicalId = alias || key;

  return travelStyles.find((s) => {
    const idMatch = s.id === canonicalId || s.id === key;
    const labelMatch = normalizeTravelStyleKey(s.label) === key || normalizeTravelStyleKey(s.label) === canonicalId;
    return idMatch || labelMatch;
  });
}

// Get emoji for a travel style (by ID or label)
export function getTravelStyleEmoji(idOrLabel: string): string {
  const style = getTravelStyleByIdOrLabel(idOrLabel);
  return style?.emoji || "✈️";
}

// Get label for a travel style ID
export function getTravelStyleLabel(id: string): string {
  const style = getTravelStyleByIdOrLabel(id);
  return style?.label || id;
}
