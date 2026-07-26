const APP_SCHEME = "ketravelan:";

const DEFAULT_ALLOWED_HOSTS = ["ketravelan.com", "www.ketravelan.com"];
const MAX_NESTED_LINK_DEPTH = 2;
const NESTED_LINK_QUERY_KEYS = [
  "deep_link",
  "deeplink",
  "link",
  "target",
  "redirect",
  "redirect_url",
  "url",
  "af_dp",
] as const;

const getConfiguredAllowedHosts = (): string[] => {
  const env = (import.meta as unknown as {
    env?: {
      VITE_DEEP_LINK_HOSTS?: string;
    };
  }).env;

  const configured = String(env?.VITE_DEEP_LINK_HOSTS || "")
    .split(",")
    .map((host) => host.trim().toLowerCase())
    .filter(Boolean);

  return configured.length > 0 ? configured : DEFAULT_ALLOWED_HOSTS;
};

const ALLOWED_WEB_HOSTS = new Set(getConfiguredAllowedHosts());

const AUTH_CALLBACK_HOSTS = new Set(["login-callback", "auth"]);
const NESTED_LINK_HOSTS = new Set(["open", "deeplink", "link"]);

const normalizePath = (path: string): string => {
  if (!path) {
    return "/";
  }

  const withLeadingSlash = path.startsWith("/") ? path : `/${path}`;
  return withLeadingSlash.replace(/\/{2,}/g, "/");
};

const applyPathAliases = (path: string): string => {
  const aliases: Array<[RegExp, (match: RegExpMatchArray) => string]> = [
    [/^\/post\/([^/?#]+)$/i, (m) => `/community/stories/${m[1]}`],
    [/^\/story\/([^/?#]+)$/i, (m) => `/community/stories/${m[1]}`],
    [/^\/discussion\/([^/?#]+)$/i, (m) => `/community/discussions/${m[1]}`],
  ];

  for (const [pattern, resolver] of aliases) {
    const match = path.match(pattern);
    if (match) {
      return resolver(match);
    }
  }

  return path;
};

const normalizeInAppPath = (path: string): string => {
  const [rawPath, hashPart = ""] = path.split("#", 2);
  const [pathnamePart, searchPart = ""] = rawPath.split("?", 2);
  const normalizedPathname = normalizePath(pathnamePart || "/");
  const search = searchPart ? `?${searchPart}` : "";
  const hash = hashPart ? `#${hashPart}` : "";
  return applyPathAliases(`${normalizedPathname}${search}${hash}`);
};

const getNestedLinkFromSearchParams = (searchParams: URLSearchParams): string | null => {
  for (const key of NESTED_LINK_QUERY_KEYS) {
    const value = searchParams.get(key);
    if (value && value.trim()) {
      return value.trim();
    }
  }

  return null;
};

const resolveDeepLinkPathInternal = (rawUrl: string, depth: number): string | null => {
  if (!rawUrl || typeof rawUrl !== "string") {
    return null;
  }

  const trimmed = rawUrl.trim();
  if (!trimmed) {
    return null;
  }

  if (depth > MAX_NESTED_LINK_DEPTH) {
    return null;
  }

  if (trimmed.startsWith("/")) {
    return normalizeInAppPath(trimmed);
  }

  try {
    const parsed = new URL(trimmed);
    const nestedParam = getNestedLinkFromSearchParams(parsed.searchParams);

    if (nestedParam && NESTED_LINK_HOSTS.has(parsed.hostname.toLowerCase())) {
      return resolveDeepLinkPathInternal(nestedParam, depth + 1);
    }

    if (["https:", "http:"].includes(parsed.protocol)) {
      const host = parsed.hostname.toLowerCase();
      if (!ALLOWED_WEB_HOSTS.has(host)) {
        return null;
      }

      if (nestedParam) {
        const resolvedNested = resolveDeepLinkPathInternal(nestedParam, depth + 1);
        if (resolvedNested) {
          return resolvedNested;
        }
      }

      return normalizeInAppPath(`${parsed.pathname}${parsed.search}${parsed.hash}`);
    }

    if (parsed.protocol === APP_SCHEME) {
      const host = parsed.hostname.toLowerCase();
      if (AUTH_CALLBACK_HOSTS.has(host)) {
        return null;
      }

      if (nestedParam && NESTED_LINK_HOSTS.has(host)) {
        const resolvedNested = resolveDeepLinkPathInternal(nestedParam, depth + 1);
        if (resolvedNested) {
          return resolvedNested;
        }
      }

      const hostAsSegment = host ? `/${host}` : "";
      return normalizeInAppPath(`${hostAsSegment}${parsed.pathname}${parsed.search}${parsed.hash}`);
    }

    return null;
  } catch {
    return null;
  }
};

export const resolveNativeDeepLinkPath = (rawUrl: string): string | null => {
  return resolveDeepLinkPathInternal(rawUrl, 0);
};
