import { createRoot } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import { Capacitor } from "@capacitor/core";
import App from "./App.tsx";
import "./index.css";

if (typeof window !== "undefined" && window.location.hostname === "localhost" && "serviceWorker" in navigator) {
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
