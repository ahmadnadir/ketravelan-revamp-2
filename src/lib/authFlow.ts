export type OAuthProvider = "google" | "apple";

export type PendingAuthIntent = {
  kind: "sign-in" | "link";
  provider: OAuthProvider;
  returnTo?: string;
  startedAt: number;
};

const AUTH_INTENT_KEY = "ketravelan-pending-auth-intent";
const AUTH_ERROR_KEY = "ketravelan-auth-error";
const IDENTITY_LINKING_DISABLED_KEY = "ketravelan-identity-linking-disabled";

const safeStorage = () => {
  if (typeof window === "undefined") return null;
  return window.localStorage;
};

export const persistPendingAuthIntent = (intent: PendingAuthIntent) => {
  const storage = safeStorage();
  if (!storage) return;
  storage.setItem(AUTH_INTENT_KEY, JSON.stringify(intent));
};

export const getPendingAuthIntent = (): PendingAuthIntent | null => {
  const storage = safeStorage();
  if (!storage) return null;

  const raw = storage.getItem(AUTH_INTENT_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as PendingAuthIntent;
  } catch {
    storage.removeItem(AUTH_INTENT_KEY);
    return null;
  }
};

export const clearPendingAuthIntent = () => {
  const storage = safeStorage();
  if (!storage) return;
  storage.removeItem(AUTH_INTENT_KEY);
};

export const persistAuthError = (message: string) => {
  const storage = safeStorage();
  if (!storage) return;
  storage.setItem(AUTH_ERROR_KEY, message);
};

export const consumeAuthError = (): string | null => {
  const storage = safeStorage();
  if (!storage) return null;
  const message = storage.getItem(AUTH_ERROR_KEY);
  if (!message) return null;
  storage.removeItem(AUTH_ERROR_KEY);
  return message;
};

export const clearAuthError = () => {
  const storage = safeStorage();
  if (!storage) return;
  storage.removeItem(AUTH_ERROR_KEY);
};

export const setIdentityLinkingDisabled = (disabled: boolean) => {
  const storage = safeStorage();
  if (!storage) return;

  if (disabled) {
    storage.setItem(IDENTITY_LINKING_DISABLED_KEY, "1");
    return;
  }

  storage.removeItem(IDENTITY_LINKING_DISABLED_KEY);
};

export const getIdentityLinkingDisabled = () => {
  const storage = safeStorage();
  if (!storage) return false;
  return storage.getItem(IDENTITY_LINKING_DISABLED_KEY) === "1";
};

export const isManualLinkingDisabledMessage = (message: string | null | undefined) => {
  return (message || "").trim().toLowerCase().includes("manual linking is disabled");
};

export const normalizeOAuthErrorMessage = (
  message: string | null | undefined,
  provider?: OAuthProvider,
) => {
  const raw = (message || "").trim();
  const normalized = raw.toLowerCase();
  const providerLabel = provider === "apple" ? "Apple" : provider === "google" ? "Google" : "this provider";

  if (!raw) {
    return `Failed to sign in with ${providerLabel}.`;
  }

  const isExistingAccountCollision = [
    "account exists",
    "already registered",
    "already linked",
    "identity is already linked",
    "identity_already_exists",
    "user already registered",
    "email already",
    "sign up not completed",
    "sign in not completed",
  ].some((token) => normalized.includes(token));

  if (isExistingAccountCollision) {
    return `This email is already attached to another sign-in method. Sign in with your existing method first, then connect ${providerLabel} from Settings > Connected Accounts.`;
  }

  if (normalized.includes("provider is not enabled")) {
    return `${providerLabel} sign-in is not fully configured yet.`;
  }

  if (normalized.includes("invalid_client")) {
    return `${providerLabel} sign-in is misconfigured. Check Supabase Apple provider Client ID (Services ID), Secret Key (JWT), and callback URL setup in Apple Developer.`;
  }

  if (isManualLinkingDisabledMessage(raw)) {
    return `Connected accounts are disabled for this project. Enable Manual Linking in Supabase Dashboard > Authentication > Providers before linking ${providerLabel}.`;
  }

  return raw;
};