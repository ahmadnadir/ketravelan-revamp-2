import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { readFileSync } from "node:fs";
import { componentTagger } from "lovable-tagger";
import { loadEnv } from "vite";

const packageJson = JSON.parse(
  readFileSync(new URL("./package.json", import.meta.url), "utf-8")
);

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const supabaseUrl = (env.VITE_SUPABASE_URL || "https://sspvqhleqlycsiniywkg.supabase.co").replace(/\/+$/, "");

  return {
    define: {
      __APP_VERSION__: JSON.stringify(packageJson.version),
    },
    server: {
      host: true, // listen on all addresses (0.0.0.0)
      port: 8080,
      strictPort: true,
      hmr: {
        overlay: false,
      },
      proxy: {
        "/api/admin-feedback-actions": {
          target: supabaseUrl,
          changeOrigin: true,
          rewrite: () => "/functions/v1/admin-feedback-actions",
          configure: (proxy) => {
            proxy.on("proxyReq", (proxyRequest) => {
              const anonKey = env.VITE_SUPABASE_ANON_KEY;
              if (anonKey) proxyRequest.setHeader("apikey", anonKey);
            });
          },
        },
      },
    },
    plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  };
});
