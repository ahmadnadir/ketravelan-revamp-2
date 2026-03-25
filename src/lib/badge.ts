/**
 * badge.ts
 *
 * TypeScript badge service for app icon badge count management.
 * Uses @capawesome/capacitor-badge which is already configured in the iOS
 * Swift package (CapApp-SPM).
 *
 * Behaviour by platform:
 *  - iOS native : calls the native plugin to update the OS badge count
 *  - Android    : no-op (Android badge count is controlled by the OS/launcher)
 *  - Web        : no-op (badges not applicable)
 *
 * localStorage is used as a lightweight cache so the TS layer always has a
 * value to read without requiring an async round-trip.
 *
 * Placement: src/lib/badge.ts
 */

import { Capacitor } from "@capacitor/core";
import { Badge } from "@capawesome/capacitor-badge";

const BADGE_COUNT_KEY = "ketravelan-badge-count";

/** True only when running on native iOS. */
function isNativeIOS(): boolean {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === "ios";
}

/** Persist the badge count to localStorage. */
function persistBadgeCount(count: number): void {
  localStorage.setItem(BADGE_COUNT_KEY, String(Math.max(0, count)));
}

/**
 * Get the locally cached badge count.
 * Used as a fallback / for optimistic UI.
 */
export function getCachedBadgeCount(): number {
  const raw = localStorage.getItem(BADGE_COUNT_KEY);
  return raw ? Math.max(0, parseInt(raw, 10) || 0) : 0;
}

/**
 * Set the iOS app icon badge count.
 *
 * - Value is clamped to >= 0 to prevent the OS from showing "-1".
 * - Safe to call on Android/web — returns immediately without side-effects.
 */
export async function setBadgeCount(count: number): Promise<void> {
  const clamped = Math.max(0, count);
  persistBadgeCount(clamped);

  if (!isNativeIOS()) return;

  try {
    await Badge.set({ count: clamped });
  } catch (err) {
    console.warn("[badge] Badge.set failed", err);
  }
}

/**
 * Reset the iOS app icon badge to zero.
 * Safe to call on Android/web.
 */
export async function clearBadgeCount(): Promise<void> {
  persistBadgeCount(0);

  if (!isNativeIOS()) return;

  try {
    await Badge.clear();
  } catch (err) {
    console.warn("[badge] Badge.clear failed", err);
  }
}

/**
 * Get the current badge count from the native layer.
 * Falls back to the locally cached value when the plugin is unavailable
 * or when running on Android/web.
 */
export async function getBadgeCount(): Promise<number> {
  if (!isNativeIOS()) return getCachedBadgeCount();

  try {
    const result = await Badge.get();
    const count = Math.max(0, result?.count ?? 0);
    persistBadgeCount(count);
    return count;
  } catch (err) {
    console.warn("[badge] Badge.get failed", err);
    return getCachedBadgeCount();
  }
}
