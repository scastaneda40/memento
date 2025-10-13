// src/lib/supabase.ts
import { createClient } from "@supabase/supabase-js";

console.log("[supabase] client created @", new Date().toISOString());

// 🔧 ADD HERE: explicit checks + helpful console logs
const url = import.meta.env.VITE_SUPABASE_URL;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY;

console.log("[supabase] URL:", url);
console.log("[supabase] anon key present:", !!anon, "len:", anon?.length);

if (!url || !anon) {
  throw new Error(
    `[supabase] Missing environment variables: ` +
      `URL=${String(url)} ANON=${anon ? "present" : "MISSING"}`
  );
}

// dev/HMR guard so we don't create multiple clients
const g = globalThis as any;

export const supabase =
  g.__supabase__ ??
  (g.__supabase__ = createClient(url, anon, {
    auth: {
      flowType: "pkce",
      persistSession: true,
      autoRefreshToken: true,
    },
  }));

console.log("[supabase] client created ✅"); // should log once per hard reload
