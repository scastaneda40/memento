import "react";

declare module "react" {
  interface HTMLAttributes<T> {
    /** Custom XR hint attribute allowed on divs, etc. */
    "enable-xr"?: boolean | ""; // boolean presence or empty string
  }
}
