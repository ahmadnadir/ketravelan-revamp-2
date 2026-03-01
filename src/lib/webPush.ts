import { getFirebaseConfig } from "@/lib/firebase";

const WEB_SW_PATH = "/firebase-messaging-sw.js";
const WEB_TOKEN_STORAGE_KEY = "ketravelan-push-token-web";
let messageListenerRegistered = false;
let serviceWorkerRegistration: ServiceWorkerRegistration | null = null;

function getVapidKey() {
  return import.meta.env.VITE_FIREBASE_VAPID_KEY || "";
}

async function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return null;
  if (serviceWorkerRegistration) return serviceWorkerRegistration;
  
  try {
    const registration = await navigator.serviceWorker.register(WEB_SW_PATH);
    const config = getFirebaseConfig();
    if (registration?.active && config?.projectId) {
      registration.active.postMessage({ type: "firebase-config", config });
    }
    serviceWorkerRegistration = registration;
    return registration;
  } catch (err) {
    console.error("Failed to register service worker:", err);
    return null;
  }
}

function setStoredToken(token: string) {
  localStorage.setItem(WEB_TOKEN_STORAGE_KEY, token);
}

export function getStoredWebToken() {
  return localStorage.getItem(WEB_TOKEN_STORAGE_KEY);
}

export async function clearStoredWebToken() {
  const token = localStorage.getItem(WEB_TOKEN_STORAGE_KEY);
  if (token) {
    localStorage.removeItem(WEB_TOKEN_STORAGE_KEY);
  }
}

export async function getWebPushToken(): Promise<string | null> {
  if (!("serviceWorker" in navigator)) return null;
  
  const vapidKey = getVapidKey();
  if (!vapidKey) return null;

  try {
    // Dynamic import of Firebase messaging - only at runtime
    const { getToken } = await import("firebase/messaging");
    const { getFirebaseMessaging } = await import("@/lib/firebase");
    
    const messaging = await getFirebaseMessaging();
    if (!messaging) return null;

    const registration = await registerServiceWorker();
    if (!registration) return null;

    const token = await getToken(messaging, {
      vapidKey,
      serviceWorkerRegistration: registration,
    });

    if (token) {
      setStoredToken(token);
    }

    return token || null;
  } catch (err) {
    console.warn("Failed to get web push token:", err);
    return null;
  }
}

export async function registerWebPushListeners(onPayload?: (payload: unknown) => void) {
  if (messageListenerRegistered) return;
  
  try {
    // Dynamic import of Firebase messaging - only at runtime
    const { onMessage } = await import("firebase/messaging");
    const { getFirebaseMessaging } = await import("@/lib/firebase");
    
    const messaging = await getFirebaseMessaging();
    if (!messaging) return;
    
    messageListenerRegistered = true;

    onMessage(messaging, (payload: unknown) => {
      if (onPayload) onPayload(payload);
    });
  } catch (err) {
    console.warn("Failed to register web push listeners:", err);
  }
}

export async function ensureWebServiceWorker() {
  return registerServiceWorker();
}

export async function getMessagingInstance(): Promise<unknown | null> {
  try {
    const { getFirebaseMessaging } = await import("@/lib/firebase");
    return getFirebaseMessaging();
  } catch (err) {
    console.warn("Failed to get messaging instance:", err);
    return null;
  }
}
