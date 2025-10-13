// vite.config.js
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import path from "path";
import { fileURLToPath } from "url";

// Resolve __dirname in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Common paths
const CLIENT_DIR = path.resolve(__dirname, "client");
const OUT_DIR = path.resolve(__dirname, "dist/public");
// ⬇ change publicDir to client/public (matches where your file actually is)
const PUBLIC_DIR = path.resolve(CLIENT_DIR, "public");

export default defineConfig({
  root: CLIENT_DIR,
  publicDir: PUBLIC_DIR,
  envDir: __dirname,

  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      // ⬇ correct web path relative to client/public
      includeAssets: ["/assets/android/android-launchericon-512-512.png"],
      manifest: undefined,
      workbox: {
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        globPatterns: ["**/*.{js,css,html,svg,png,webp,woff2}"],
        runtimeCaching: [
          {
            urlPattern: ({ request }) => request.mode === "navigate",
            handler: "NetworkFirst",
            options: { cacheName: "html-cache" },
          },
          {
            urlPattern: /.*\.(?:js|css|woff2|png|jpg|jpeg|svg|webp)/,
            handler: "StaleWhileRevalidate",
            options: { cacheName: "asset-cache" },
          },
          {
            urlPattern: /https:\/\/.*\.(supabase\.co|supabase\.in)\/.*/i,
            handler: "NetworkFirst",
            options: { cacheName: "api-cache", networkTimeoutSeconds: 5 },
          },
          {
            urlPattern: /\/\.netlify\/functions\/.*/i,
            handler: "NetworkOnly",
          },
        ],
      },
    }),
  ],

  resolve: {
    alias: {
      "@": path.resolve(__dirname, "client", "src"),
      "@assets": path.resolve(__dirname, "attached_assets"),
    },
  },

  build: {
    outDir: OUT_DIR,
    emptyOutDir: true,
    sourcemap: false,
    target: "es2022",
  },

  define: {
    "process.env": process.env ?? {},
  },

  optimizeDeps: {
    include: [],
    exclude: [],
  },
});
