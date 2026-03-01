import { Capacitor } from "@capacitor/core";
import { PushNotifications } from "@capacitor/push-notifications";
import { Device } from "@capacitor/device";
import { supabase } from "@/lib/supabase";
import { clearStoredWebToken, ensureWebServiceWorker, getStoredWebToken, getWebPushToken, registerWebPushListeners } from "@/lib/webPush";

const TOKEN_STORAGE_KEY = "ketravelan-push-token";
const WEB_TOKEN_STORAGE_KEY = "ketravelan-push-token-web";
let listenersRegistered = false;
let activeUserId: string | null = null;
let registrationInFlight = false;

function isNative() {
  return Capacitor.isNativePlatform();
}

async function upsertToken(token: string) {
  if (!activeUserId) return;
  const platform = Capacitor.getPlatform();
  let deviceId: string | null = null;
  try {
    const deviceInfo = await Device.getId();
    deviceId = deviceInfo?.identifier ?? null;
  } catch {
    deviceId = null;
  }

  await supabase.rpc("upsert_push_token", {
    p_token: token,
    p_platform: platform,
    p_device_id: deviceId,
  });
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

function registerListeners() {
  if (listenersRegistered) return;
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

  PushNotifications.addListener("pushNotificationReceived", (notification) => {
    const data = (notification as { data?: Record<string, unknown> })?.data ?? {};
    if (shouldSuppressForegroundNotification(data)) return;
    console.info("Push received", notification);
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

export async function clearPushToken() {
  if (!isNative()) return;
  await deleteStoredToken(TOKEN_STORAGE_KEY);
  try {
    await PushNotifications.unregister();
  } catch (err) {
    console.warn("Failed to unregister push notifications", err);
  }
}
