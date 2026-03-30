import { createRoot } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import { Capacitor } from "@capacitor/core";
import App from "./App.tsx";
import "./index.css";

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
