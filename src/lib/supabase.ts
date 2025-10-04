// src/lib/supabase.ts
import { createClient } from "@supabase/supabase-js";

console.log("[supabase] client created @", new Date().toISOString());

const url = import.meta.env.VITE_SUPABASE_URL!;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY!;

// dev/HMR guard so we don't create multiple clients
const g = globalThis as any;

export const supabase =
  g.__supabase__ ??
  (g.__supabase__ = createClient(url, anon, {
    auth: {
      flowType: "pkce",
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false, // <-- IMPORTANT: we will exchange manually
    },
  }));

console.log("[supabase] client created"); // should log once per hard reload
