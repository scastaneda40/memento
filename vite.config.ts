// vite.config.ts
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import webSpatial from "@webspatial/vite-plugin";
import { createHtmlPlugin } from "vite-plugin-html";
import basicSsl from "@vitejs/plugin-basic-ssl";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const XR_ENV = env.XR_ENV || process.env.XR_ENV || "web";

  return {
    plugins: [
      react(),
      webSpatial(),
      basicSsl(), // enables HTTPS in dev
      createHtmlPlugin({ inject: { data: { XR_ENV } } }),
    ],
    server: {
      host: true,
      port: 5173,
      strictPort: true,
      // ✅ do NOT set `https` here; basicSsl() handles it
      // ✅ do NOT hard-code hmr.host; let Vite pick the correct origin
      headers: {
        "Cache-Control": "no-store, must-revalidate",
        Pragma: "no-cache",
        Expires: "0",
      },
    },
    preview: {
      // If you use `vite preview` and need HTTPS there too, either provide certs:
      // https: { key: fs.readFileSync('key.pem'), cert: fs.readFileSync('cert.pem') }
      // …or just omit; preview can be HTTP while dev is HTTPS.
    },
  };
});
