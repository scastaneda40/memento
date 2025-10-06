// src/main.tsx
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// ✅ import the actual exports from env.ts
import { XR_RUNTIME, IS_SPATIAL, XR_ENV_BUILD } from "./env";

// Apply spatial class as early as possible (before render)
document.documentElement.classList.toggle("is-spatial", IS_SPATIAL);

// Sanity logs
console.log(
  "[XR] runtime:",
  XR_RUNTIME,
  "| build:",
  XR_ENV_BUILD,
  "| isSpatial:",
  IS_SPATIAL
);

const container = document.getElementById("root");
if (!container) {
  throw new Error("#root not found");
}
createRoot(container).render(<App />);
