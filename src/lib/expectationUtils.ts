const leadingEmojiRe = /^[\p{Extended_Pictographic}\u2600-\u27BF]\s*/u;

const expectationIcons: Record<string, string> = {
  // Budget & Spending
  "budget-focused trip": "💰",
  "shared expenses throughout": "🤝",
  "pay upfront for some bookings": "💳",
  "reimbursements via expense tracking": "📊",
  "eat local, not fancy": "🍜",
  "budget-friendly": "💰",
  // Trip Style & Pace
  "moderate walking involved": "🚶",
  "physically active days": "💪",
  "early starts on some days": "🌅",
  "flexible itinerary": "🔀",
  "weather-dependent activities": "🌤️",
  "early mornings": "🌅",
  "some hiking involved": "🥾",
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
  "photography-focused": "📸",
  "vegetarian-friendly": "🥗",
  "able to swim": "🏊",
};

export function getExpectationIcon(text: string): string | null {
  const normalized = text.replace(leadingEmojiRe, "").trim().toLowerCase();
  if (expectationIcons[normalized]) return expectationIcons[normalized];
  const leading = text.match(leadingEmojiRe)?.[0]?.trim();
  return leading ?? null;
}

export function getExpectationLabel(text: string): string {
  return text.replace(leadingEmojiRe, "").trim();
}
