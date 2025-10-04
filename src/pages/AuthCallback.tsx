// src/pages/AuthCallback.tsx
import { useEffect, useRef } from "react";
import { supabase } from "../lib/supabase";

export default function AuthCallback() {
  const once = useRef(false);

  useEffect(() => {
    if (once.current) return;
    once.current = true;

    (async () => {
      const { error } = await supabase.auth.exchangeCodeForSession(
        window.location.href
      );
      if (error) {
        console.error("OAuth exchange failed:", error.message);
        return;
      }
      // strip ?code, then go to dashboard
      const url = new URL(window.location.href);
      url.search = "";
      window.history.replaceState({}, "", url.toString());
      window.location.hash = "/dashboard";
    })();
  }, []);

  return null;
}
