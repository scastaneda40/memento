// src/env.ts
type XRKind = "web" | "webspatial";

// runtime (Vite env) — supports “avp” aliasing to “webspatial”
const raw = (import.meta.env.VITE_XR_ENV as string | undefined) ?? "web";
export const XR_RUNTIME: XRKind =
  raw === "avp" ? "webspatial" : (raw as XRKind);
export const IS_SPATIAL = XR_RUNTIME === "webspatial";

// build-time token injected via vite.config define
declare const __XR_ENV__: string;
const buildRaw = (
  typeof __XR_ENV__ === "string" ? __XR_ENV__ : XR_RUNTIME
) as string;
export const XR_ENV_BUILD: XRKind =
  buildRaw === "avp" ? "webspatial" : (buildRaw as XRKind);
