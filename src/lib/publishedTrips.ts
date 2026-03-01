// Storage helper for published trips (persists to localStorage)

const PUBLISHED_TRIPS_KEY = 'ketravelan-published-trips';

export interface PublishedTrip {
  id: string;
  title: string;
  description: string;
  visibility: 'public' | 'private';
  primaryDestination: string;
  additionalStops: string[];
  dateType: 'flexible' | 'exact';
  startDate: string;
  endDate: string;
  travelStyles: string[];
  groupSizeType: 'later' | 'set';
  groupSize: number;
  galleryImages: string[];
  budgetType: 'skip' | 'rough' | 'detailed';
  roughBudgetTotal: number;
  roughBudgetCategories: string[];
  detailedBudget: Record<string, number>;
  itineraryType: 'skip' | 'notes' | 'dayByDay';
  simpleNotes: string;
  dayByDayPlan: { day: number; activities: string[] }[];
  expectations: string[];
  createdAt: number;
}

export function savePublishedTrip(trip: PublishedTrip): void {
  try {
    const existing = getAllPublishedTrips();
    const updated = [trip, ...existing.filter(t => t.id !== trip.id)];
    localStorage.setItem(PUBLISHED_TRIPS_KEY, JSON.stringify(updated));
  } catch (e) {
    console.error('Failed to save published trip:', e);
  }
}

export function getPublishedTripById(id: string): PublishedTrip | null {
  try {
    const trips = getAllPublishedTrips();
    return trips.find(t => t.id === id) || null;
  } catch (e) {
    console.error('Failed to get published trip:', e);
    return null;
  }
}

export function getAllPublishedTrips(): PublishedTrip[] {
  try {
    const stored = localStorage.getItem(PUBLISHED_TRIPS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (e) {
    console.error('Failed to get published trips:', e);
    return [];
  }
}

export function deletePublishedTrip(id: string): void {
  try {
    const existing = getAllPublishedTrips();
    const updated = existing.filter(t => t.id !== id);
    localStorage.setItem(PUBLISHED_TRIPS_KEY, JSON.stringify(updated));
  } catch (e) {
    console.error('Failed to delete published trip:', e);
  }
}
