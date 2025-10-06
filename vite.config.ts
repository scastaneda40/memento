// vite.config.ts
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import webSpatial from "@webspatial/vite-plugin";
import { createHtmlPlugin } from "vite-plugin-html";

// Ensure VITE_BASE ends with a trailing slash when set.
function normalizeBase(v?: string) {
  if (!v) return "/";
  return v.endsWith("/") ? v : v + "/";
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  // XR_ENV is for WebSpatial (“avp” when targeting Vision Pro)
  const XR_ENV = env.XR_ENV || "web";
  // VITE_BASE controls the public base path (must match the URL you’ll pass to the builder)
  const VITE_BASE = normalizeBase(
    env.VITE_BASE || (XR_ENV === "avp" ? "/webspatial/avp/" : "/")
  );

  console.log("🚀 ~ mode:", mode);
  console.log("🚀 ~ XR_ENV:", XR_ENV);
  console.log("🚀 ~ VITE_BASE:", VITE_BASE);

  return {
    base: VITE_BASE,
    plugins: [
      react({ jsxImportSource: "@webspatial/react-sdk" }),
      webSpatial({ outputDir: "" }),
      createHtmlPlugin({
        inject: {
          data: {
            XR_ENV, // for deciding is-spatial class
            HTML_BASE: VITE_BASE, // used by index.html to prefix /src/main.tsx
          },
        },
      }),
    ],
    define: {
      __XR_ENV__: JSON.stringify(XR_ENV),
      __XR_ENV_BASE__: JSON.stringify(VITE_BASE),
    },
    resolve: { alias: {} },
    build: { outDir: XR_ENV === "avp" ? "dist/webspatial/avp" : "dist" },
  };
});
