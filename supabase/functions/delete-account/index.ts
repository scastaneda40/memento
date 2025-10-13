// supabase/functions/delete-account/index.ts
// @ts-nocheck
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

Deno.serve(async (req) => {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceKey = Deno.env.get("SERVICE_ROLE_KEY")!; // <-- renamed

  const authHeader = req.headers.get("authorization") || "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!token) return new Response("Unauthorized", { status: 401 });

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const admin = createClient(supabaseUrl, serviceKey);

  const {
    data: { user },
  } = await userClient.auth.getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const userId = user.id;
  try {
    try {
      const { data: files } = await admin.storage
        .from("mementos")
        .list(userId, { limit: 1000, recursive: true });
      if (files?.length) {
        await admin.storage
          .from("mementos")
          .remove(files.map((f) => `${userId}/${f.name}`));
      }
    } catch {}

    await admin.from("mementos").delete().eq("user_id", userId);
    await admin.from("walls").delete().eq("user_id", userId);
    await admin.from("profiles").delete().eq("user_id", userId);

    const { error: delErr } = await admin.auth.admin.deleteUser(userId);
    if (delErr) throw delErr;

    return new Response(JSON.stringify({ ok: true }), {
      headers: { "content-type": "application/json" },
      status: 200,
    });
  } catch (e) {
    console.error("delete-account error", e);
    return new Response("Failed to delete account", { status: 500 });
  }
});
