import type { CapacitorConfig } from "@capacitor/cli";

const useDevServer = String(process.env.CAP_USE_SERVER || "").toLowerCase() === "true";

const config: CapacitorConfig = {
  appId: "dev.ketravelan.app",
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
    contentInset: "automatic",
    backgroundColor: "#1a1a2e",
    preferredContentMode: "mobile",
  },
  android: {
    backgroundColor: "#1a1a2e",
    allowMixedContent: false,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: "#1a1a2e",
      showSpinner: false,
      androidScaleType: "CENTER_CROP",
      splashFullScreen: true,
      splashImmersive: true,
    },
    Keyboard: {
      resize: "native",
      resizeOnFullScreen: true,
    },
    StatusBar: {
      style: "dark",
      backgroundColor: "#1a1a2e",
    },
  },
};

export default config;