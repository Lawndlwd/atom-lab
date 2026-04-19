import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root: ".",
  publicDir: "public",
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
      strategies: "injectManifest",
      srcDir: "src/client",
      filename: "sw.ts",
      injectManifest: {
        globPatterns: ["**/*.{js,css,html,svg,png,ico,woff,woff2}"],
        maximumFileSizeToCacheInBytes: 12 * 1024 * 1024,
      },
      manifest: {
        name: "Identity",
        short_name: "Identity",
        description: "Daily identities. Real tracking.",
        start_url: "/today",
        scope: "/",
        display: "standalone",
        background_color: "#0d0b09",
        theme_color: "#0d0b09",
        orientation: "portrait",
        icons: [
          { src: "/icons/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any maskable" },
        ],
        shortcuts: [
          { name: "Today", url: "/today" },
          { name: "Journal", url: "/journal" },
        ],
      },
      devOptions: { enabled: false, type: "module" },
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src/client"),
      "@shared": path.resolve(__dirname, "src/shared"),
    },
  },
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      "/trpc": { target: "http://localhost:5174", changeOrigin: true },
      "/api": { target: "http://localhost:5174", changeOrigin: true },
    },
  },
  build: {
    outDir: "dist/client",
    emptyOutDir: true,
    sourcemap: true,
  },
});
