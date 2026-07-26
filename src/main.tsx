import { createRoot } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import { Capacitor } from "@capacitor/core";
import { registerSW } from "virtual:pwa-register";
import App from "./App.tsx";
import "./index.css";

const isBrowser = typeof window !== "undefined";
const isDev = import.meta.env.DEV;

const CHUNK_RELOAD_GUARD_KEY = "ketravelan:chunk-reload-attempted";

function isDynamicImportChunkError(reason: unknown): boolean {
  const message =
    reason instanceof Error
      ? reason.message
      : typeof reason === "string"
        ? reason
        : "";

  const lowered = message.toLowerCase();
  return (
    lowered.includes("failed to fetch dynamically imported module") ||
    lowered.includes("importing a module script failed") ||
    lowered.includes("chunkloaderror")
  );
}

function forceSingleChunkRecoveryReload() {
  if (!isBrowser) {
    return;
  }

  if (sessionStorage.getItem(CHUNK_RELOAD_GUARD_KEY) === "1") {
    return;
  }

  sessionStorage.setItem(CHUNK_RELOAD_GUARD_KEY, "1");

  const url = new URL(window.location.href);
  url.searchParams.set("v", Date.now().toString());
  window.location.replace(url.toString());
}

if (isBrowser && isDev && "serviceWorker" in navigator) {
  // Keep localhost free from stale cached bundles during rapid UI iteration.
  void navigator.serviceWorker.getRegistrations().then((registrations) => {
    registrations.forEach((registration) => {
      void registration.unregister();
    });
  });

  if ("caches" in window) {
    void caches.keys().then((keys) => {
      keys.forEach((key) => {
        void caches.delete(key);
      });
    });
  }
}

if (isBrowser && import.meta.env.PROD) {
  // Register SW in non-local environments and auto-activate fresh builds.
  let refreshTriggered = false;
  const updateSW = registerSW({
    immediate: true,
    onNeedRefresh() {
      if (refreshTriggered) {
        return;
      }
      refreshTriggered = true;
      void updateSW(true);
    },
  });

  // Recover once from stale chunk references after deployments.
  window.addEventListener("error", (event) => {
    if (isDynamicImportChunkError(event.error ?? event.message)) {
      forceSingleChunkRecoveryReload();
    }
  });

  window.addEventListener("unhandledrejection", (event) => {
    if (isDynamicImportChunkError(event.reason)) {
      event.preventDefault();
      forceSingleChunkRecoveryReload();
    }
  });
}

// Aborted browser operations (for example canceled share dialogs) can surface
// as unhandled promise rejections in WebKit. Ignore only AbortError globally.
window.addEventListener("unhandledrejection", (event) => {
  const reason = event.reason;
  const name =
    typeof reason === "object" && reason !== null && "name" in reason
      ? String((reason as { name?: unknown }).name)
      : "";

  if (name === "AbortError") {
    event.preventDefault();
  }
});

if (Capacitor.isNativePlatform()) {
  const viewport = document.querySelector('meta[name="viewport"]');
  if (viewport) {
    viewport.setAttribute(
      "content",
      "width=device-width, initial-scale=1.0, viewport-fit=cover, maximum-scale=1, user-scalable=no",
    );
  }
}

createRoot(document.getElementById("root")!).render(
  <HelmetProvider>
    <App />
  </HelmetProvider>
);

// Initialize Capacitor plugins after React mounts (non-blocking)
import("./lib/capacitor").then(({ initializeCapacitor }) => {
  initializeCapacitor();
});
