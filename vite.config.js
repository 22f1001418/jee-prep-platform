import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

// Serves /api/explain while developing (on Vercel it is a serverless function; `vite` alone does not run /api).
// Reads ANTHROPIC_API_KEY, APP_ACCESS_CODE, EXPLAIN_* from .env.local.
function devApi(mode){
  return {
    name: "dev-api",
    configureServer(server){
      const env = loadEnv(mode, process.cwd(), "");
      Object.entries(env).forEach(([k, v]) => { if(/^(ANTHROPIC_|APP_ACCESS_CODE|EXPLAIN_)/.test(k) && process.env[k] === undefined) process.env[k] = v; });
      server.middlewares.use("/api/explain", async (req, res) => {
        try{
          const mod = await server.ssrLoadModule("/api/explain.js");
          await mod.default(req, res);
        }catch(e){
          console.error(e);
          if(!res.headersSent){ res.statusCode = 500; res.setHeader("Content-Type", "application/json"); }
          res.end(JSON.stringify({error:"server", message:"The explain function crashed. See the dev server log."}));
        }
      });
    },
  };
}

export default defineConfig(({ mode }) => ({
  plugins: [
    devApi(mode),
    react(),
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: "auto",
      includeAssets: ["icons/*.png", "icons/icon.svg"],
      manifest: {
        name: "JEE CBT Test Platform",
        short_name: "JEE CBT",
        description: "NTA-style JEE Main mock tests with analysis, notes and revision. Works offline.",
        theme_color: "#0f2a4a",
        background_color: "#f3f4f6",
        display: "standalone",
        start_url: "/",
        icons: [
          { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
          { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        // App shell, question bank and self-hosted MathJax are precached; the ~1000 figures are cached as they are viewed.
        globPatterns: ["**/*.{js,css,html,json,woff,woff2,svg,png}"],
        globIgnores: ["figs/**"],
        maximumFileSizeToCacheInBytes: 8 * 1024 * 1024,
        navigateFallback: "/index.html",
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.startsWith("/figs/"),
            handler: "CacheFirst",
            options: { cacheName: "figures", expiration: { maxEntries: 1500 }, cacheableResponse: { statuses: [0, 200] } },
          },
        ],
      },
    }),
  ],
  build: { chunkSizeWarningLimit: 1600 },
}));
