// import "../src/spacial-flag";
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

// Importing ensures the WebSpatial runtime hooks in
import "@webspatial/react-sdk";

(window as any).__BUILD_PROBE__ = "MAIN:" + String(Date.now());
console.log("[BOOT]", (window as any).__BUILD_PROBE__);

console.log("[BOOT] main mounted");

// src/main.tsx (very top)
if (import.meta.env.DEV && "serviceWorker" in navigator) {
  navigator.serviceWorker
    .getRegistrations()
    .then((regs) => regs.forEach((r) => r.unregister()));
  if ("caches" in window)
    caches.keys().then((keys) => keys.forEach((k) => caches.delete(k)));
}
console.log("[BOOT] main", Date.now());

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
