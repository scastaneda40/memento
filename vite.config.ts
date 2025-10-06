// vite.config.ts
import { defineConfig, loadEnv, type ConfigEnv } from "vite";
import react from "@vitejs/plugin-react";
import basicSsl from "@vitejs/plugin-basic-ssl";
import webSpatial from "@webspatial/vite-plugin";
import { createHtmlPlugin } from "vite-plugin-html";

export default defineConfig(({ mode }: ConfigEnv) => {
  // Load .env files (prefers .env.local for local dev)
  const env = loadEnv(mode ?? "", process.cwd(), "");

  // Accept both Vercel XR_ENV and local VITE_XR_ENV
  const raw = env.VITE_XR_ENV || process.env.XR_ENV || "web";
  // Map "avp" -> "webspatial" (what your CSS/logic expects)
  const XR_ENV = raw === "avp" ? "webspatial" : raw;

  console.log("🚀 ~ mode:", mode);
  console.log("🚀 ~ VITE_XR_ENV (normalized):", XR_ENV);

  return {
    plugins: [
      basicSsl(),
      react(),
      webSpatial(),
      createHtmlPlugin({
        inject: { data: { XR_ENV } }, // <- used by index.html
      }),
    ],
    define: {
      // handy for TS/JS runtime checks if you want
      __XR_ENV__: JSON.stringify(env.VITE_XR_ENV ?? "web"),
    },
    resolve: {
      alias: [{ find: /^~\//, replacement: "/" }],
    },
    server: {
      host: true,
      port: 5173,
      strictPort: true,
      headers: {
        "Cache-Control": "no-store, must-revalidate",
        Pragma: "no-cache",
        Expires: "0",
      },
    },
    build: { outDir: "dist" },
  };
});
