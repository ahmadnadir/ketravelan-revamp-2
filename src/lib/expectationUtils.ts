const leadingEmojiRe = /^[\p{Extended_Pictographic}\u2600-\u27BF]\s*/u;

const expectationIcons: Record<string, string> = {
  // Budget & Spending
  "budget-focused trip": "💰",
  "budget": "💰",
  "shared expenses throughout": "🤝",
  "pay upfront for some bookings": "💳",
  "reimbursements via expense tracking": "📊",
  "eat local, not fancy": "🍜",
  "budget-friendly": "💰",
  // Trip Style & Pace
  "adventure": "🧗",
  "beach": "🏖️",
  "chill": "😌",
  "city & urban": "🏙️",
  "culture": "🏛️",
  "cross border": "🌍",
  "early": "🌅",
  "festivals": "🎉",
  "food": "🍜",
  "group": "👥",
  "hiking": "🥾",
  "moderate walking involved": "🚶",
  "nature & outdoor": "🌿",
  "outdoor": "🌿",
  "physically active days": "💪",
  "photography": "📸",
  "early starts on some days": "🌅",
  "road": "🛣️",
  "flexible itinerary": "🔀",
  "runcation": "🏃",
  "weather-dependent activities": "🌤️",
  "early mornings": "🌅",
  "some hiking involved": "🥾",
  "vegetarian": "🥗",
  "visa": "🛂",
  "water": "🏖️",
  "umrah diy": "🕌",
  // Logistics & Responsibility
  "passport required": "🛂",
  "passport / visa required": "🛂",
  "visa may be required": "📋",
  "travel insurance recommended": "🛡️",
  "self-responsible for documents": "📄",
  "flights booked individually": "✈️",
  // Stay & Comfort
  "shared accommodation": "🏠",
  "budget stays": "🛏️",
  "basic amenities": "🧼",
  "limited luggage space": "🎒",
  // Group Dynamics
  "small group travel": "👥",
  "open to meeting new people": "🧑‍🤝‍🧑",
  // Special Interest
  "meals": "🍜",
  "photography-focused": "📸",
  "vegetarian-friendly": "🥗",
  "able to swim": "🏊",
};

export function getExpectationIcon(text: string): string | null {
  const normalized = text.replace(leadingEmojiRe, "").trim().toLowerCase();
  if (expectationIcons[normalized]) return expectationIcons[normalized];
  const leading = text.match(leadingEmojiRe)?.[0]?.trim();
  return leading ?? "🏷️";
}

export function getExpectationLabel(text: string): string {
  return text.replace(leadingEmojiRe, "").trim();
}
