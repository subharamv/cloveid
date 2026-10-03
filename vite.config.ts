import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import { VitePWA } from "vite-plugin-pwa";
import path from "path";

// Mirrors the Netlify /sb-proxy rewrite (public/_redirects) for dev and preview.
const sbProxy = {
  "/sb-proxy": {
    target: "https://tmygylckkbocgunlubik.supabase.co",
    changeOrigin: true,
    rewrite: (p: string) => p.replace(/^\/sb-proxy/, ""),
  },
};

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    proxy: sbProxy,
  },
  preview: {
    proxy: sbProxy,
  },
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: false, // registered manually in src/lib/pwa.ts
      includeAssets: ["favicon.ico", "apple-touch-icon.png"],
      manifest: {
        name: "Clove ID Card Generator",
        short_name: "Clove ID",
        description: "Professional Employee ID Card Generator for Clove Technologies",
        start_url: "/",
        scope: "/",
        display: "standalone",
        orientation: "any",
        background_color: "#ffffff",
        theme_color: "#f97316",
        icons: [
          { src: "pwa-192x192.png", sizes: "192x192", type: "image/png" },
          { src: "pwa-512x512.png", sizes: "512x512", type: "image/png" },
          { src: "maskable-icon-512x512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        // Only the built app shell is precached. Supabase / Cloudinary / Drive
        // requests are never intercepted, so auth and data always hit the network.
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
        maximumFileSizeToCacheInBytes: 10 * 1024 * 1024,
        navigateFallback: "/index.html",
        navigateFallbackDenylist: [/^\/sb-proxy\//],
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
      },
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
