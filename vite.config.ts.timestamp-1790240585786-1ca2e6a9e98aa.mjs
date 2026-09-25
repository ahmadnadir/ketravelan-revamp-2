// vite.config.ts
import { defineConfig } from "file:///Users/apple/Documents/GitHub/ketravelan-revamp-2/node_modules/vite/dist/node/index.js";
import react from "file:///Users/apple/Documents/GitHub/ketravelan-revamp-2/node_modules/@vitejs/plugin-react-swc/index.js";
import path from "path";
import { readFileSync } from "node:fs";
import { componentTagger } from "file:///Users/apple/Documents/GitHub/ketravelan-revamp-2/node_modules/lovable-tagger/dist/index.js";
var __vite_injected_original_dirname = "/Users/apple/Documents/GitHub/ketravelan-revamp-2";
var __vite_injected_original_import_meta_url = "file:///Users/apple/Documents/GitHub/ketravelan-revamp-2/vite.config.ts";
var packageJson = JSON.parse(
  readFileSync(new URL("./package.json", __vite_injected_original_import_meta_url), "utf-8")
);
var vite_config_default = defineConfig(({ mode }) => ({
  define: {
    __APP_VERSION__: JSON.stringify(packageJson.version)
  },
  server: {
    host: true,
    // listen on all addresses (0.0.0.0)
    port: 8080,
    strictPort: true,
    hmr: {
      overlay: false
    }
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__vite_injected_original_dirname, "./src")
    }
  }
}));
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvVXNlcnMvYXBwbGUvRG9jdW1lbnRzL0dpdEh1Yi9rZXRyYXZlbGFuLXJldmFtcC0yXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCIvVXNlcnMvYXBwbGUvRG9jdW1lbnRzL0dpdEh1Yi9rZXRyYXZlbGFuLXJldmFtcC0yL3ZpdGUuY29uZmlnLnRzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9Vc2Vycy9hcHBsZS9Eb2N1bWVudHMvR2l0SHViL2tldHJhdmVsYW4tcmV2YW1wLTIvdml0ZS5jb25maWcudHNcIjtpbXBvcnQgeyBkZWZpbmVDb25maWcgfSBmcm9tIFwidml0ZVwiO1xuaW1wb3J0IHJlYWN0IGZyb20gXCJAdml0ZWpzL3BsdWdpbi1yZWFjdC1zd2NcIjtcbmltcG9ydCBwYXRoIGZyb20gXCJwYXRoXCI7XG5pbXBvcnQgeyByZWFkRmlsZVN5bmMgfSBmcm9tIFwibm9kZTpmc1wiO1xuaW1wb3J0IHsgY29tcG9uZW50VGFnZ2VyIH0gZnJvbSBcImxvdmFibGUtdGFnZ2VyXCI7XG5cbmNvbnN0IHBhY2thZ2VKc29uID0gSlNPTi5wYXJzZShcbiAgcmVhZEZpbGVTeW5jKG5ldyBVUkwoXCIuL3BhY2thZ2UuanNvblwiLCBpbXBvcnQubWV0YS51cmwpLCBcInV0Zi04XCIpXG4pO1xuXG4vLyBodHRwczovL3ZpdGVqcy5kZXYvY29uZmlnL1xuZXhwb3J0IGRlZmF1bHQgZGVmaW5lQ29uZmlnKCh7IG1vZGUgfSkgPT4gKHtcbiAgZGVmaW5lOiB7XG4gICAgX19BUFBfVkVSU0lPTl9fOiBKU09OLnN0cmluZ2lmeShwYWNrYWdlSnNvbi52ZXJzaW9uKSxcbiAgfSxcbiAgc2VydmVyOiB7XG4gICAgaG9zdDogdHJ1ZSwgLy8gbGlzdGVuIG9uIGFsbCBhZGRyZXNzZXMgKDAuMC4wLjApXG4gICAgcG9ydDogODA4MCxcbiAgICBzdHJpY3RQb3J0OiB0cnVlLFxuICAgIGhtcjoge1xuICAgICAgb3ZlcmxheTogZmFsc2UsXG4gICAgfSxcbiAgfSxcbiAgcGx1Z2luczogW3JlYWN0KCksIG1vZGUgPT09IFwiZGV2ZWxvcG1lbnRcIiAmJiBjb21wb25lbnRUYWdnZXIoKV0uZmlsdGVyKEJvb2xlYW4pLFxuICByZXNvbHZlOiB7XG4gICAgYWxpYXM6IHtcbiAgICAgIFwiQFwiOiBwYXRoLnJlc29sdmUoX19kaXJuYW1lLCBcIi4vc3JjXCIpLFxuICAgIH0sXG4gIH0sXG59KSk7XG4iXSwKICAibWFwcGluZ3MiOiAiO0FBQXFVLFNBQVMsb0JBQW9CO0FBQ2xXLE9BQU8sV0FBVztBQUNsQixPQUFPLFVBQVU7QUFDakIsU0FBUyxvQkFBb0I7QUFDN0IsU0FBUyx1QkFBdUI7QUFKaEMsSUFBTSxtQ0FBbUM7QUFBaUssSUFBTSwyQ0FBMkM7QUFNM1AsSUFBTSxjQUFjLEtBQUs7QUFBQSxFQUN2QixhQUFhLElBQUksSUFBSSxrQkFBa0Isd0NBQWUsR0FBRyxPQUFPO0FBQ2xFO0FBR0EsSUFBTyxzQkFBUSxhQUFhLENBQUMsRUFBRSxLQUFLLE9BQU87QUFBQSxFQUN6QyxRQUFRO0FBQUEsSUFDTixpQkFBaUIsS0FBSyxVQUFVLFlBQVksT0FBTztBQUFBLEVBQ3JEO0FBQUEsRUFDQSxRQUFRO0FBQUEsSUFDTixNQUFNO0FBQUE7QUFBQSxJQUNOLE1BQU07QUFBQSxJQUNOLFlBQVk7QUFBQSxJQUNaLEtBQUs7QUFBQSxNQUNILFNBQVM7QUFBQSxJQUNYO0FBQUEsRUFDRjtBQUFBLEVBQ0EsU0FBUyxDQUFDLE1BQU0sR0FBRyxTQUFTLGlCQUFpQixnQkFBZ0IsQ0FBQyxFQUFFLE9BQU8sT0FBTztBQUFBLEVBQzlFLFNBQVM7QUFBQSxJQUNQLE9BQU87QUFBQSxNQUNMLEtBQUssS0FBSyxRQUFRLGtDQUFXLE9BQU87QUFBQSxJQUN0QztBQUFBLEVBQ0Y7QUFDRixFQUFFOyIsCiAgIm5hbWVzIjogW10KfQo=
