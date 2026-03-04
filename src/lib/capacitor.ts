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
    const platform = Capacitor.getPlatform();

    // iOS: dark content over white background to match header
    if (platform === "ios") {
      // Ensure the status bar does NOT overlay the WebView so the
      // background color actually appears behind the system icons.
      await StatusBar.setOverlaysWebView({ overlay: false });
      await StatusBar.setStyle({ style: Style.Dark });
      await StatusBar.setBackgroundColor({ color: "#ffffff" });
    }

    // Android: keep dark background to blend with app shell
    if (platform === "android") {
      await StatusBar.setBackgroundColor({ color: "#1a1a2e" });
    }

    // Initialize Splash Screen - will auto-hide after configured duration
    const { SplashScreen } = await import("@capacitor/splash-screen");
    await SplashScreen.hide();

    // Initialize Keyboard for better form handling on iOS
    const { Keyboard } = await import("@capacitor/keyboard");
    
    const scrollFocusedFieldIntoView = () => {
      const activeElement = document.activeElement;
      if (!(activeElement instanceof HTMLElement)) {
        return;
      }

      const isTextInput = activeElement.matches(
        "input, textarea, [contenteditable=''], [contenteditable='true'], [role='textbox']"
      );

      if (!isTextInput) {
        return;
      }

      window.setTimeout(() => {
        activeElement.scrollIntoView({
          block: "center",
          inline: "nearest",
          behavior: "smooth",
        });
      }, 120);
    };

    // Add keyboard event listeners for iOS scroll adjustments
    if (Capacitor.getPlatform() === "ios") {
      document.body.classList.add("native-ios-no-safe-area");

      Keyboard.addListener("keyboardWillShow", () => {
        document.body.classList.add("keyboard-open");
        scrollFocusedFieldIntoView();
      });

      Keyboard.addListener("keyboardDidShow", () => {
        scrollFocusedFieldIntoView();
      });

      Keyboard.addListener("keyboardWillHide", () => {
        document.body.classList.remove("keyboard-open");
      });

      document.addEventListener("focusin", () => {
        if (document.body.classList.contains("keyboard-open")) {
          scrollFocusedFieldIntoView();
        }
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
