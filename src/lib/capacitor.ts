import { Capacitor } from "@capacitor/core";

/**
 * Initialize Capacitor plugins for native mobile functionality.
 * This function should be called once when the app starts.
 */
export async function initializeCapacitor() {
  // Only run on native platforms
  if (!Capacitor.isNativePlatform()) {
    return;
  }

  try {
    // Initialize Status Bar
    const { StatusBar, Style } = await import("@capacitor/status-bar");
    await StatusBar.setStyle({ style: Style.Dark });
    
    // On Android, set the background color
    if (Capacitor.getPlatform() === "android") {
      await StatusBar.setBackgroundColor({ color: "#1a1a2e" });
    }

    // Initialize Splash Screen - will auto-hide after configured duration
    const { SplashScreen } = await import("@capacitor/splash-screen");
    await SplashScreen.hide();

    // Initialize Keyboard for better form handling on iOS
    const { Keyboard } = await import("@capacitor/keyboard");
    
    // Add keyboard event listeners for iOS scroll adjustments
    if (Capacitor.getPlatform() === "ios") {
      Keyboard.addListener("keyboardWillShow", () => {
        document.body.classList.add("keyboard-open");
      });

      Keyboard.addListener("keyboardWillHide", () => {
        document.body.classList.remove("keyboard-open");
      });
    }

    console.log("Capacitor initialized successfully");
  } catch (error) {
    console.warn("Failed to initialize Capacitor plugins:", error);
  }
}

/**
 * Check if running on a native platform (iOS or Android)
 */
export function isNativePlatform(): boolean {
  return Capacitor.isNativePlatform();
}

/**
 * Get the current platform
 */
export function getPlatform(): "ios" | "android" | "web" {
  return Capacitor.getPlatform() as "ios" | "android" | "web";
}
