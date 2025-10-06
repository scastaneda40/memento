// vite.config.ts
import { defineConfig, loadEnv, type ConfigEnv, type UserConfig } from "vite";
import react from "@vitejs/plugin-react";
import webSpatial from "@webspatial/vite-plugin";
import { createHtmlPlugin } from "vite-plugin-html";
import basicSsl from "@vitejs/plugin-basic-ssl";
import fs from "node:fs";
import path from "node:path";

export default defineConfig((configEnv: ConfigEnv): UserConfig => {
  const env = loadEnv(configEnv.mode, process.cwd(), "");
  const XR_ENV = env.VITE_XR_ENV || "web"; // "web" or "avp"

  return {
    plugins: [
      react(),
      webSpatial(),
      basicSsl(),
      createHtmlPlugin({
        inject: { data: { XR_ENV } },
      }),
    ],

    define: {
      __XR_ENV__: JSON.stringify(XR_ENV),
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
      https: {
        cert: fs.readFileSync(path.resolve("cert/localhost+2.pem")),
        key: fs.readFileSync(path.resolve("cert/localhost+2-key.pem")),
      },
    },

    // ✅ Fixed: use empty object instead of `true` for HTTPS
    preview: {
      https: {},
      port: 5173,
    },
  };
});
