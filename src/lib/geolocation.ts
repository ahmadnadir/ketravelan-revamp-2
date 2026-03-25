import { Capacitor } from "@capacitor/core";

export interface GeoCoords {
  latitude: number;
  longitude: number;
}

/**
 * Get the device's current coordinates.
 * Uses @capacitor/geolocation on native (Android/iOS) for proper runtime permission
 * requests, and falls back to navigator.geolocation on web.
 */
export async function getCurrentCoords(): Promise<GeoCoords> {
  if (Capacitor.isNativePlatform()) {
    const { Geolocation } = await import("@capacitor/geolocation");
    await Geolocation.requestPermissions();
    const pos = await Geolocation.getCurrentPosition({ enableHighAccuracy: false, timeout: 10000 });
    return { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
  }

  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation not supported"));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
      reject,
      { enableHighAccuracy: false, timeout: 10000 }
    );
  });
}

/**
 * Reverse-geocode coordinates to a country name via Nominatim.
 */
export async function getCountryFromCoords(coords: GeoCoords): Promise<string | null> {
  const res = await fetch(
    `https://nominatim.openstreetmap.org/reverse?format=json&lat=${coords.latitude}&lon=${coords.longitude}`,
    { headers: { "Accept": "application/json", "User-Agent": "Ketravelan App (contact: support@ketravelan.com)" } }
  );
  if (!res.ok) return null;
  const data = await res.json();
  return data.address?.country || null;
}
