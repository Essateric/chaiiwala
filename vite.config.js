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
const PUBLIC_DIR = path.resolve(__dirname, "public");

export default defineConfig({
  // App code is in /client, but public/ and .env are at project root
  root: CLIENT_DIR,
  publicDir: PUBLIC_DIR,
  envDir: __dirname,

  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icons/chaiiwalalogobrown.png"],
      // If you already have /public/manifest.webmanifest, you can omit `manifest`.
      manifest: undefined,
      workbox: {
        // ✅ Increase the default 2 MiB precache limit to avoid build failure
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // 5 MiB
        globPatterns: ["**/*.{js,css,html,svg,png,webp,woff2}"],
        runtimeCaching: [
          // HTML navigation
          {
            urlPattern: ({ request }) => request.mode === "navigate",
            handler: "NetworkFirst",
            options: { cacheName: "html-cache" },
          },
          // Static assets
          {
            urlPattern: /.*\.(?:js|css|woff2|png|jpg|jpeg|svg|webp)/,
            handler: "StaleWhileRevalidate",
            options: { cacheName: "asset-cache" },
          },
          // Supabase APIs
          {
            urlPattern: /https:\/\/.*\.(supabase\.co|supabase\.in)\/.*/i,
            handler: "NetworkFirst",
            options: { cacheName: "api-cache", networkTimeoutSeconds: 5 },
          },
          // Netlify functions (usually writes; don't cache)
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

  // Optional dev proxy if your local functions run elsewhere:
  // server: {
  //   proxy: {
  //     "/.netlify/functions": {
  //       target: "http://localhost:8888",
  //       changeOrigin: true,
  //     },
  //   },
  // },

  build: {
    outDir: OUT_DIR,
    emptyOutDir: true,
    sourcemap: false,
    target: "es2022",
  },

  // Some libs expect process.env to exist
  define: {
    "process.env": process.env ?? {},
  },

  optimizeDeps: {
    include: [],
    exclude: [],
  },
});
