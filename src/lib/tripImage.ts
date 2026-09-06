export const DEFAULT_TRIP_IMAGE = "/default-trip-photo.jpeg";

export function getTripImageUrl(imageUrl?: string | null): string {
  const trimmed = typeof imageUrl === "string" ? imageUrl.trim() : "";
  return trimmed || DEFAULT_TRIP_IMAGE;
}
