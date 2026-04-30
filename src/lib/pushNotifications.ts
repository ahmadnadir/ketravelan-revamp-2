import { Capacitor } from "@capacitor/core";
import { PushNotifications } from "@capacitor/push-notifications";
import { App } from "@capacitor/app";
import { Device } from "@capacitor/device";
import { supabase } from "@/lib/supabase";
import { clearStoredWebToken, ensureWebServiceWorker, getStoredWebToken, getWebPushToken, registerWebPushListeners } from "@/lib/webPush";

const TOKEN_STORAGE_KEY = "ketravelan-push-token";
const WEB_TOKEN_STORAGE_KEY = "ketravelan-push-token-web";
let listenersRegistered = false;
let appStateListenerRegistered = false;
let activeUserId: string | null = null;
let registrationInFlight = false;

function isNative() {
  return Capacitor.isNativePlatform();
}

async function upsertToken(token: string) {
  if (!activeUserId) {
    console.warn("upsertToken called without activeUserId; skipping", { token });
    return;
  }

  // Ensure we actually have an authenticated Supabase user before calling the RPC.
  // If there is no session, auth.uid() will be null inside the database function
  // and the insert will fail on the NOT NULL user_id constraint.
  try {
    const { data: userResult, error: userError } = await supabase.auth.getUser();
    if (userError) {
      console.warn("upsertToken: failed to get Supabase user; skipping RPC", userError);
      return;
    }
    if (!userResult?.user?.id) {
      console.warn("upsertToken: no authenticated Supabase user; skipping RPC", { token });
      return;
    }
  } catch (err) {
    console.warn("upsertToken: exception when checking Supabase user; skipping RPC", err);
    return;
  }

  const platform = Capacitor.getPlatform();
  let deviceId: string | null = null;
  try {
    const deviceInfo = await Device.getId();
    deviceId = deviceInfo?.identifier ?? null;
  } catch {
    deviceId = null;
  }

  console.info("upsertToken: calling RPC upsert_push_token", {
    tokenPreview: token.slice(0, 12),
    platform,
    deviceId,
  });

  const { error } = await supabase.rpc("upsert_push_token", {
    p_token: token,
    p_platform: platform,
    p_device_id: deviceId,
  });

  if (error) {
    console.warn("upsertToken: failed to call upsert_push_token", error);
  } else {
    console.info("upsertToken: successfully upserted push token");
  }
}

async function deleteStoredToken(storageKey: string) {
  const token = localStorage.getItem(storageKey);
  if (!token) return;
  try {
    await supabase.rpc("delete_push_token", { p_token: token });
  } catch (err) {
    console.warn("Failed to delete push token", err);
  }
  localStorage.removeItem(storageKey);
}

function shouldSuppressForegroundNotification(data: Record<string, unknown>) {
  const actionUrl = String(data.action_url || data.actionUrl || "");
  const currentUrl = window.location.href;
  if (!actionUrl) return false;
  if (!currentUrl.includes("/chat") && !currentUrl.includes("tab=chat")) return false;
  if (actionUrl.includes("/chat") || actionUrl.includes("tab=chat")) return true;
  return false;
}

function normalizeActionUrl(rawUrl: string): string {
  const trimmed = rawUrl.trim();
  if (!trimmed) return "";

  if (trimmed.startsWith("ketravelan://")) {
    const suffix = trimmed.replace("ketravelan://", "");
    return suffix.startsWith("/") ? suffix : `/${suffix}`;
  }

  if (/^https?:\/\//i.test(trimmed)) {
    try {
      const url = new URL(trimmed);
      return `${url.pathname}${url.search}${url.hash}` || "/";
    } catch {
      return trimmed;
    }
  }

  return trimmed;
}

function navigateToActionUrl(rawUrl: string) {
  const target = normalizeActionUrl(rawUrl);
  if (!target) return;

  if (/^https?:\/\//i.test(target)) {
    window.location.href = target;
    return;
  }

  const nextUrl = target.startsWith("/") ? target : `/${target}`;
  const current = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  if (current === nextUrl) return;

  window.history.pushState({}, "", nextUrl);
  window.dispatchEvent(new PopStateEvent("popstate"));
}

export function registerListeners() {  if (listenersRegistered) return;
  listenersRegistered = true;

  PushNotifications.addListener("registration", async (token) => {
    if (!activeUserId) return;
    localStorage.setItem(TOKEN_STORAGE_KEY, token.value);
    try {
      await upsertToken(token.value);
    } catch (err) {
      console.warn("Failed to upsert push token", err);
    }
  });

  PushNotifications.addListener("registrationError", (error) => {
    console.warn("Push registration error", error);
  });

  PushNotifications.addListener("pushNotificationReceived", async (notification) => {
    const data = (notification as { data?: Record<string, unknown> })?.data ?? {};
    if (shouldSuppressForegroundNotification(data)) return;
    console.info("Push received", notification);
    // Sync badge count with the backend so the app icon reflects true unread total.
    try {
      const { syncBadgeWithUnreadCount } = await import("@/lib/notifications");
      await syncBadgeWithUnreadCount();
    } catch (err) {
      console.warn("[badge] Failed to sync badge on foreground push", err);
    }
  });

  PushNotifications.addListener("pushNotificationActionPerformed", (notification) => {
    const data = notification?.notification?.data || {};
    const actionUrl =
      data.action_url ||
      data.actionUrl ||
      data.url ||
      data.deep_link ||
      "";
    if (actionUrl) {
      navigateToActionUrl(String(actionUrl));
    }
  });
}

export async function syncPushNotifications(userId: string, enabled: boolean) {
  activeUserId = userId;

  // Register an App state-change listener once so the badge count is synced
  // with the Supabase backend every time the app returns to the foreground.
  if (isNative() && !appStateListenerRegistered) {
    appStateListenerRegistered = true;
    App.addListener("appStateChange", async ({ isActive }) => {
      if (isActive && activeUserId) {
        try {
          const { syncBadgeWithUnreadCount } = await import("@/lib/notifications");
          await syncBadgeWithUnreadCount();
        } catch (err) {
          console.warn("[badge] Failed to sync badge on app foreground", err);
        }
      }
    });
  }

  if (!isNative()) {
    if (!enabled) {
      await deleteStoredToken(WEB_TOKEN_STORAGE_KEY);
      await clearStoredWebToken();
      return;
    }

    await ensureWebServiceWorker();
    await registerWebPushListeners((payload) => {
      const data = (payload as { data?: Record<string, unknown> })?.data ?? {};
      if (shouldSuppressForegroundNotification(data)) return;
      console.info("Web push received", payload);
    });

    const token = await getWebPushToken();
    if (token) {
      await upsertToken(token);
    }
    return;
  }

  if (!enabled) {
    await deleteStoredToken(TOKEN_STORAGE_KEY);
    try {
      await PushNotifications.unregister();
    } catch (err) {
      console.warn("Failed to unregister push notifications", err);
    }
    return;
  }

  // Native (iOS / Android) flow

  // If we already have a stored native token for this device, make sure it is
  // associated with the current user in the database before attempting a
  // fresh registration. This helps recover from cases where the RPC failed
  // previously or the user changed accounts but the OS token stayed the same.
  try {
    const existingToken = localStorage.getItem(TOKEN_STORAGE_KEY);
    if (existingToken) {
      await upsertToken(existingToken);
    }
  } catch (err) {
    console.warn("Failed to upsert existing push token", err);
  }

  if (registrationInFlight) return;
  registrationInFlight = true;

  try {
    registerListeners();
    const permStatus = await PushNotifications.checkPermissions();
    if (permStatus.receive !== "granted") {
      const reqStatus = await PushNotifications.requestPermissions();
      if (reqStatus.receive !== "granted") {
        return;
      }
    }

    await PushNotifications.register();
  } finally {
    registrationInFlight = false;
  }
}

export async function debugNotificationPermissions() {
  if (!isNative()) {
    console.log("[Push] Web platform — checking service worker push support");
    const swReg = await navigator.serviceWorker?.getRegistration?.();
    const swPushManager = swReg?.pushManager;
    const permState = swPushManager
      ? await swPushManager.permissionState({ userVisibleOnly: true })
      : "unsupported";
    console.log("[Push] Web push permission:", permState);
    return { platform: "web", permissionState: permState };
  }

  const platform = Capacitor.getPlatform();
  const permStatus = await PushNotifications.checkPermissions();
  console.log(`[Push] ${platform} permission status:`, permStatus);

  const storedToken = localStorage.getItem(TOKEN_STORAGE_KEY);
  console.log("[Push] Stored token:", storedToken ? `${storedToken.slice(0, 12)}...` : "none");

  const displayStatus =
    permStatus.receive === "granted"
      ? "✅ Granted (check iOS Settings for banner/sound preferences)"
      : "❌ Denied (user rejected notifications)";

  return {
    platform,
    receive: permStatus.receive,
    display: displayStatus,
    hasToken: !!storedToken,
  };
}

export async function forceRefreshNotificationPermissions() {
  if (!isNative()) {
    console.log("[Push] Web platform, skipping native permission refresh");
    return { receive: "granted", display: "Web platform" };
  }

  try {
    console.log("[Push] Force-refreshing notification permissions...");
    const reqStatus = await PushNotifications.requestPermissions();

    const displayMsg =
      reqStatus.receive === "granted"
        ? "✅ Permissions granted! Check iOS Settings > Ketravelan to enable Banners & Sounds"
        : "❌ Permissions denied. Enable in Settings > Notifications > Ketravelan";

    console.log("[Push] Permission request result:", {
      receive: reqStatus.receive,
      display: displayMsg,
    });

    if (reqStatus.receive === "granted") {
      console.log("✅ [Push] Full notification permissions granted");
    } else {
      console.warn("⚠️ [Push] Permissions not fully granted. You may need to enable in Settings.");
    }

    return { receive: reqStatus.receive, display: displayMsg };
  } catch (err) {
    console.warn("[Push] Error requesting permissions:", err);
    return { receive: "denied", display: "Error requesting permissions" };
  }
}

export async function openNotificationSettings() {
  const platform = Capacitor.getPlatform();
  
  if (platform === "ios") {
    try {
      // On iOS, we can try to open the app's notification settings
      // Using App plugin's openUrl to navigate to settings
      const { App: CapApp } = await import("@capacitor/app");
      // Note: app-specific settings URL scheme may not work on all iOS versions
      // User may need to navigate manually to Settings > Notifications > Ketravelan
      console.log("[Push] Please manually open: Settings > Notifications > Ketravelan");
      console.log("[Push] Ensure: Allow Notifications, Banners, Sounds, and Badges are all ON");
    } catch (err) {
      console.warn("[Push] Could not open settings directly:", err);
    }
  } else if (platform === "android") {
    try {
      const { App: CapApp } = await import("@capacitor/app");
      // Android settings URL for app notifications
      console.log("[Push] Please manually open: Settings > Apps > Ketravelan > Notifications");
    } catch (err) {
      console.warn("[Push] Could not open settings directly:", err);
    }
  }
}

export async function getNotificationSettingsInstructions(): Promise<string> {
  const platform = Capacitor.getPlatform();
  
  if (platform === "ios") {
    return `
📱 iOS Notification Settings Fix:

1. Open iPhone Settings app
2. Scroll down and tap "Ketravelan"
3. Tap "Notifications"
4. Verify these are ALL enabled (toggle ON if OFF):
   ✓ Allow Notifications
   ✓ Banners (choose "Persistent" or "Temporary")
   ✓ Sounds
   ✓ Badges
5. Close Settings and return to app
6. You should now receive full notifications with sound and banner
    `.trim();
  } else if (platform === "android") {
    return `
📱 Android Notification Settings Fix:

1. Open Android Settings app
2. Go to "Apps" or "Application Manager"
3. Find and tap "Ketravelan"
4. Tap "Notifications"
5. Verify these are enabled:
   ✓ Allow notifications
   ✓ Sound
   ✓ Vibration
6. Tap channel name (e.g., "Alerts") and verify:
   ✓ Importance level is set to "High" or "Max"
   ✓ Sound is enabled
7. Close Settings and return to app
8. You should now receive full notifications with sound
    `.trim();
  }

  return "Unknown platform";
}

export async function clearPushToken() {
  if (!isNative()) return;
  await deleteStoredToken(TOKEN_STORAGE_KEY);
  try {
    await PushNotifications.unregister();
  } catch (err) {
    console.warn("Failed to unregister push notifications", err);
  }
  // Clear the app icon badge on logout so it does not show stale counts.
  try {
    const { clearBadgeCount } = await import("@/lib/badge");
    await clearBadgeCount();
  } catch (err) {
    console.warn("[badge] Failed to clear badge on logout", err);
  }
  activeUserId = null;
}
