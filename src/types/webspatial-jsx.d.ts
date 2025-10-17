// src/types/webspatial-jsx.d.ts
import "react";

declare module "react" {
  // Allow WebSpatial attributes on any HTML element
  interface HTMLAttributes<T> {
    /** Enable spatialization on this element (WebSpatial) */
    "enable-xr"?: "" | boolean;
    /** Ask WebSpatial to monitor parent layout changes (optional) */
    "enable-xr-monitor"?: "" | boolean;
  }

  // Let the style prop accept the XR depth var
  interface CSSProperties {
    ["--xr-back"]?: number | string;
  }
}
