import type { CapacitorConfig } from "@capacitor/cli";

const useDevServer = String(process.env.CAP_USE_SERVER || "").toLowerCase() === "true";

const config: CapacitorConfig = {
  appId: "com.ketravelan.app",
  appName: "Ketravelan",
  webDir: "dist",
  // Dev server for Android emulator live reload (toggle via CAP_USE_SERVER=true)
  server: useDevServer
    ? {
        url: "http://10.0.2.2:5173",
        androidScheme: "http",
        cleartext: true,
      }
    : undefined,
  ios: {
    contentInset: "never",
    backgroundColor: "#ffffff",
    preferredContentMode: "mobile",
  },
  android: {
    backgroundColor: "#1a1a2e",
    allowMixedContent: false,
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"],
    },
    SplashScreen: {
      launchShowDuration: 0,
      launchAutoHide: false,
      backgroundColor: "#ffffff",
      showSpinner: false,
      androidScaleType: "CENTER_CROP",
      splashFullScreen: true,
      splashImmersive: true,
    },
    Keyboard: {
      resize: "none",
      resizeOnFullScreen: true,
    },
    StatusBar: {
      style: "dark",
      backgroundColor: "#ffffff",
    },
  },
};

export default config;