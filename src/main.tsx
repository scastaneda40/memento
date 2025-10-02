// import "../src/spacial-flag";
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

// Importing ensures the WebSpatial runtime hooks in
import "@webspatial/react-sdk";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
