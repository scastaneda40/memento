import "react";

declare module "react" {
  interface HTMLAttributes<T> {
    /** Allow custom XR attribute on divs and other HTML elements */
    "enable-xr"?: boolean | string;
  }

  interface ButtonHTMLAttributes<T> {
    /** Allow custom XR attribute on buttons */
    "enable-xr"?: boolean | string;
  }
}

export {};
