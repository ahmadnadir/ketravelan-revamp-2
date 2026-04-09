const DEFAULT_PUBLIC_BASE_URL = "https://ketravelan.xyz";

const getConfiguredBaseUrl = (): string | null => {
  const env = (import.meta as unknown as {
    env?: {
      VITE_PUBLIC_WEB_URL?: string;
      VITE_SITE_URL?: string;
    };
  }).env;

  const configured = (env?.VITE_PUBLIC_WEB_URL || env?.VITE_SITE_URL || "").trim();
  if (!configured) return null;

  return configured.replace(/\/+$/, "");
};

export const getPublicBaseUrl = (): string => {
  const configured = getConfiguredBaseUrl();
  if (configured) return configured;

  if (typeof window !== "undefined") {
    const protocol = window.location.protocol;
    if (protocol === "http:" || protocol === "https:") {
      return window.location.origin;
    }
  }

  return DEFAULT_PUBLIC_BASE_URL;
};

export const buildPublicUrl = (path: string): string => {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return new URL(normalizedPath, `${getPublicBaseUrl()}/`).toString();
};

interface TripShareMeta {
  tripId: string;
  slug?: string;
  title?: string;
  description?: string;
}

const slugify = (value: string): string => {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
};

export const buildTripShareUrl = ({
  tripId,
  slug,
  title,
  description,
}: TripShareMeta): string => {
  const cleanTripId = String(tripId || "").trim();
  const cleanSlug = String(slug || "").trim();
  const titleSlug = slugify(String(title || ""));
  const identifier = cleanSlug || titleSlug || cleanTripId;
  const shortDescription = String(description || "").trim();
  const params = new URLSearchParams();
  if (shortDescription) {
    params.set("d", shortDescription.slice(0, 180));
  }
  const query = params.toString();
  const path = query
    ? `/share/trip/${encodeURIComponent(identifier)}?${query}`
    : `/share/trip/${encodeURIComponent(identifier)}`;
  return buildPublicUrl(path);
};
