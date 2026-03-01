export interface DayPlan {
  day: number;
  activities: string[];
}

export interface TripItinerary {
  tripId: string;
  viewMode: "dayByDay" | "simpleNotes";
  dayPlans: DayPlan[];
  simpleNotes: string;
  updatedAt: number;
}

const STORAGE_KEY = "ketravelan_itineraries";

function getStoredItineraries(): Record<string, TripItinerary> {
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored ? JSON.parse(stored) : {};
}

function saveStoredItineraries(itineraries: Record<string, TripItinerary>): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(itineraries));
}

export function getItineraryByTripId(tripId: string): TripItinerary | null {
  const itineraries = getStoredItineraries();
  return itineraries[tripId] || null;
}

export function saveItinerary(itinerary: TripItinerary): void {
  const itineraries = getStoredItineraries();
  itineraries[itinerary.tripId] = {
    ...itinerary,
    updatedAt: Date.now(),
  };
  saveStoredItineraries(itineraries);
}

export function createEmptyItinerary(tripId: string): TripItinerary {
  return {
    tripId,
    viewMode: "dayByDay",
    dayPlans: [{ day: 1, activities: [] }],
    simpleNotes: "",
    updatedAt: Date.now(),
  };
}

// Convert day plans to simple notes format
export function dayPlansToSimpleNotes(dayPlans: DayPlan[]): string {
  return dayPlans
    .map((day) => {
      const activities = day.activities.length > 0 
        ? day.activities.map(a => `- ${a}`).join("\n")
        : "";
      return `Day ${day.day}:\n${activities}`;
    })
    .join("\n\n");
}

// Parse simple notes to day plans (best effort)
export function simpleNotesToDayPlans(notes: string): DayPlan[] {
  const dayRegex = /Day\s*(\d+)\s*:/gi;
  const matches = [...notes.matchAll(dayRegex)];
  
  if (matches.length === 0) {
    return [{ day: 1, activities: notes.split("\n").filter(l => l.trim()) }];
  }
  
  const dayPlans: DayPlan[] = [];
  
  matches.forEach((match, index) => {
    const dayNum = parseInt(match[1]);
    const startIndex = match.index! + match[0].length;
    const endIndex = matches[index + 1]?.index ?? notes.length;
    const content = notes.slice(startIndex, endIndex).trim();
    
    const activities = content
      .split("\n")
      .map(line => line.replace(/^[-•]\s*/, "").trim())
      .filter(line => line.length > 0);
    
    dayPlans.push({ day: dayNum, activities });
  });
  
  return dayPlans.length > 0 ? dayPlans : [{ day: 1, activities: [] }];
}
