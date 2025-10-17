// src/main.tsx
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { XR_RUNTIME, IS_SPATIAL, XR_ENV_BUILD } from "./env";
import { initSpatialIfAvailable } from "./spatial/boot"; // 👈 add this
import "./types/jsx-ambient";

document.documentElement.classList.toggle("is-spatial", IS_SPATIAL);

console.log(
  "[XR] runtime:",
  XR_RUNTIME,
  "| build:",
  XR_ENV_BUILD,
  "| isSpatial:",
  IS_SPATIAL
);

(async () => {
  if (IS_SPATIAL) {
    try {
      const s = await initSpatialIfAvailable(); // 👈 start WebSpatial
      console.log(
        "[XR] spatial session:",
        !!s ? "initialized" : "not available"
      );
    } catch (e) {
      console.warn("[XR] initSpatialIfAvailable failed; continuing in 2D", e);
    }
  }

  const container = document.getElementById("root");
  if (!container) throw new Error("#root not found");
  createRoot(container).render(<App />);
})();
