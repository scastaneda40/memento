// lib/profiles.ts
import { supabase } from "../lib/supabase";

export async function listProfiles() {
  return supabase
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: true });
}

export async function createProfile(input: {
  first_name?: string;
  last_name?: string;
  display_name?: string;
  avatar_url?: string | null;
}) {
  return supabase.from("profiles").insert(input).select("*").single();
}

export async function updateProfile(
  id: string,
  patch: Partial<{
    first_name: string | null;
    last_name: string | null;
    display_name: string | null;
    avatar_url: string | null;
  }>
) {
  return supabase
    .from("profiles")
    .update(patch)
    .eq("id", id)
    .select("*")
    .single();
}

export async function uploadAvatar(file: File, profileId: string) {
  const ext = (file.type.split("/")[1] || "jpg").toLowerCase();
  const path = `${profileId}/${crypto.randomUUID()}.${ext}`;
  const up = await supabase.storage.from("avatars").upload(path, file, {
    cacheControl: "3600",
    upsert: false,
    contentType: file.type || "image/jpeg",
  });
  if (up.error) throw up.error;
  return supabase.storage.from("avatars").getPublicUrl(path).data.publicUrl;
}
