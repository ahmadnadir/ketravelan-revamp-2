import { isNativePlatform } from "@/lib/capacitor";

const NATIVE_AUTH_REDIRECT = "ketravelan://login-callback";

export function getAuthRedirectUrl(): string {
  return isNativePlatform() ? NATIVE_AUTH_REDIRECT : `${window.location.origin}/auth/callback`;
}
