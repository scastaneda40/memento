// import "../src/spacial-flag";
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

// Importing ensures the WebSpatial runtime hooks in
import "@webspatial/react-sdk";

import { XR_ENV, XR_ENV_BUILD } from "./env";
console.log("[XR] runtime:", XR_ENV, "| build:", XR_ENV_BUILD);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
