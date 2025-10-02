declare global {
  interface Window {
    __webspatial__?: unknown;
  }
}

const html = document.documentElement;
const inWebSpatial = !!window.__webspatial__;

// Always sync the class
if (inWebSpatial) {
  html.classList.add("is-spatial");
} else {
  html.classList.remove("is-spatial");
}

// Create a badge so you can see it in the sim
const badge = document.createElement("div");
badge.textContent = `is-spatial: ${html.classList.contains("is-spatial")}`;
Object.assign(badge.style, {
  position: "fixed",
  top: "8px",
  right: "8px",
  zIndex: "999999",
  padding: "6px 10px",
  borderRadius: "6px",
  font: "12px system-ui, sans-serif",
  background: "rgba(0,0,0,0.6)",
  color: "white",
  pointerEvents: "none",
});
document.addEventListener("DOMContentLoaded", () => {
  document.body.appendChild(badge);
});

console.log("Spatial mode active?", html.classList.contains("is-spatial"));
