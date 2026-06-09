/**
 * Best-effort country detection from browser locale.
 * Keeps onboarding friction low without requesting location permission.
 */
export function detectCountryFromLocale(localeInput?: string): string | null {
  const locale = (localeInput || navigator.language || "").toLowerCase();
  if (!locale) return null;

  const map: Record<string, string> = {
    my: "Malaysia",
    ms: "Malaysia",
    id: "Indonesia",
    "en-us": "United States",
    sg: "Singapore",
    th: "Thailand",
    ph: "Philippines",
    vn: "Vietnam",
  };

  const exact = map[locale];
  if (exact) return exact;

  for (const [prefix, country] of Object.entries(map)) {
    if (locale.startsWith(prefix)) {
      return country;
    }
  }

  return null;
}
