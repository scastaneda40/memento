// vite.config.ts (or .js)
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import webSpatial from "@webspatial/vite-plugin";
import { createHtmlPlugin } from "vite-plugin-html";
import basicSsl from "@vitejs/plugin-basic-ssl";

export default defineConfig(({ mode }) => {
  // If you want XR_ENV available, load .env files and pass it through
  const env = loadEnv(mode, process.cwd(), "");

  const XR_ENV = env.XR_ENV || process.env.XR_ENV || "web";

  return {
    plugins: [
      react(),
      webSpatial(), // keep this
      basicSsl(), // <-- add this for HTTPS dev
      createHtmlPlugin({
        inject: {
          data: { XR_ENV },
        },
      }),
    ],
    server: {
      https: {}, // <-- critical (WebSpatial wants https)
      host: "localhost",
      port: 5173, // change if you need a different port
      hmr: {
        protocol: "wss", // HMR over secure websocket
        host: "localhost",
        port: 5173,
      },
    },
    preview: {
      https: {}, // if you use `vite preview`
      port: 5173,
    },
  };
});
