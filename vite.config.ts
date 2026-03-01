import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: true, // listen on all addresses (0.0.0.0)
    port: 8080,
    strictPort: true,
    hmr: {
      overlay: false,
    },
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["ketravelan_icon.jpeg", "robots.txt", "apple-touch-icon.png"],
      manifest: {
        name: "Ketravelan - Group Travel Planning",
        short_name: "Ketravelan",
        description: "Plan trips with friends, not spreadsheets",
        theme_color: "#1a1a2e",
        background_color: "#1a1a2e",
        display: "standalone",
        orientation: "portrait-primary",
        scope: "/",
        start_url: "/",
        screenshots: [
          {
            src: "/ketravelan_icon.jpeg",
            sizes: "540x720",
            type: "image/jpeg",
            form_factor: "narrow",
          },
        ],
        icons: [
          {
            src: "/ketravelan_icon.jpeg",
            sizes: "192x192",
            type: "image/jpeg",
          },
          {
            src: "/ketravelan_icon.jpeg",
            sizes: "512x512",
            type: "image/jpeg",
          },
          {
            src: "/ketravelan_icon.jpeg",
            sizes: "512x512",
            type: "image/jpeg",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/images\.unsplash\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "unsplash-images",
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 * 30,
              },
            },
          },
        ],
      },
    }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
