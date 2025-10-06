// src/env.ts
// Provides a unified way to detect whether we're running in Vision Pro (AVP) or Web

// Load from Vite at runtime (e.g., VITE_XR_ENV=avp npm run dev)
export const XR_ENV = (import.meta.env.VITE_XR_ENV ?? "web") as "web" | "avp";
export const IS_AVP = XR_ENV === "avp";

// Support build-time replacement from vite.config.ts
declare const __XR_ENV__: string;
export const XR_ENV_BUILD = (
  typeof __XR_ENV__ === "string" ? __XR_ENV__ : XR_ENV
) as "web" | "avp";

// Helper for conditional logic
export const isVisionOS = XR_ENV_BUILD === "avp";
