export type SocialLinksRecord = Record<string, string>;

const PROTOCOL_RE = /^https?:\/\//i;

const stripProtocolAndWww = (value: string) =>
  value
    .trim()
    .replace(/^https?:\/\//i, "")
    .replace(/^www\./i, "");

const stripQueryHash = (value: string) => value.split(/[?#]/)[0];

const trimSlashes = (value: string) => value.replace(/^\/+|\/+$/g, "");

const normalizePlatformKey = (platform: string) => {
  const key = platform.trim().toLowerCase();
  return key === "twitter" ? "x" : key;
};

const stripKnownDomain = (value: string, domains: string[]) => {
  const withoutProtocol = stripProtocolAndWww(value);
  for (const domain of domains) {
    if (withoutProtocol.toLowerCase().startsWith(`${domain.toLowerCase()}/`)) {
      return withoutProtocol.slice(domain.length + 1);
    }
    if (withoutProtocol.toLowerCase() === domain.toLowerCase()) {
      return "";
    }
  }
  return withoutProtocol;
};

const safeUrlString = (url: string) => {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
    return parsed.toString();
  } catch {
    return null;
  }
};

const toHandle = (value: string) => {
  const cleaned = trimSlashes(stripQueryHash(value)).replace(/^@+/, "");
  return cleaned.split("/")[0]?.trim() || "";
};

export const normalizeSocialLink = (platform: string, input: string): string | null => {
  const normalizedPlatform = normalizePlatformKey(platform);
  const raw = String(input || "").trim();
  if (!raw) return null;

  if (PROTOCOL_RE.test(raw)) {
    return safeUrlString(raw);
  }

  const lowerRaw = raw.toLowerCase();

  switch (normalizedPlatform) {
    case "instagram": {
      const rest = stripKnownDomain(raw, ["instagram.com"]);
      const handle = toHandle(rest || lowerRaw);
      return handle ? `https://instagram.com/${handle}` : null;
    }
    case "facebook": {
      const rest = stripKnownDomain(raw, ["facebook.com"]);
      const handle = toHandle(rest || lowerRaw);
      return handle ? `https://facebook.com/${handle}` : null;
    }
    case "x": {
      const rest = stripKnownDomain(raw, ["x.com", "twitter.com"]);
      const handle = toHandle(rest || lowerRaw);
      return handle ? `https://x.com/${handle}` : null;
    }
    case "threads": {
      const rest = stripKnownDomain(raw, ["threads.net", "www.threads.net"]);
      const handle = toHandle(rest || lowerRaw);
      return handle ? `https://www.threads.net/@${handle}` : null;
    }
    case "tiktok": {
      const rest = stripKnownDomain(raw, ["tiktok.com"]);
      const handle = toHandle(rest || lowerRaw);
      return handle ? `https://tiktok.com/@${handle}` : null;
    }
    case "youtube": {
      const rest = trimSlashes(stripQueryHash(stripKnownDomain(raw, ["youtube.com", "youtu.be"])));
      if (!rest) return null;
      if (rest.startsWith("@") || /^(channel|c|user|watch|shorts)\b/i.test(rest)) {
        return `https://youtube.com/${rest}`;
      }
      const handle = toHandle(rest);
      return handle ? `https://youtube.com/@${handle}` : null;
    }
    case "linkedin": {
      const rest = trimSlashes(stripQueryHash(stripKnownDomain(raw, ["linkedin.com", "www.linkedin.com"])));
      if (!rest) return null;
      if (/^(in|company|school)\//i.test(rest)) {
        return `https://linkedin.com/${rest}`;
      }
      const handle = toHandle(rest);
      return handle ? `https://linkedin.com/in/${handle}` : null;
    }
    case "snapchat": {
      const rest = trimSlashes(stripQueryHash(stripKnownDomain(raw, ["snapchat.com", "www.snapchat.com"])));
      if (!rest) return null;
      const normalized = /^add\//i.test(rest) ? rest : `add/${toHandle(rest)}`;
      return `https://www.snapchat.com/${normalized}`;
    }
    case "website":
    case "other": {
      const absolute = safeUrlString(`https://${raw.replace(/^\/+/, "")}`);
      return absolute;
    }
    default: {
      const absolute = safeUrlString(`https://${raw.replace(/^\/+/, "")}`);
      return absolute;
    }
  }
};

export const normalizeSocialLinksRecord = (links: SocialLinksRecord | null | undefined) => {
  if (!links) return null;

  const normalized: SocialLinksRecord = {};
  Object.entries(links).forEach(([platform, value]) => {
    const next = normalizeSocialLink(platform, String(value || ""));
    if (next) {
      normalized[platform] = next;
    }
  });

  return Object.keys(normalized).length > 0 ? normalized : null;
};

export { normalizePlatformKey };