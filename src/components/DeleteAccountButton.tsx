import { useState } from "react";
import { supabase } from "../lib/supabase";

export default function DeleteAccountButton({
  className,
}: {
  className?: string;
}) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const go = async () => {
    if (!confirm("Permanently delete your account and all mementos?")) return;
    setBusy(true);
    setErr(null);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) throw new Error("Not signed in");
      const res = await fetch(
        "https://glpztusxruugdvujcitc.functions.supabase.co/delete-account",
        {
          method: "POST",
          headers: { Authorization: `Bearer ${session.access_token}` },
        }
      );
      if (!res.ok) throw new Error(await res.text());
      await supabase.auth.signOut();
      window.location.hash = "/auth";
    } catch (e: any) {
      setErr(e?.message ?? "Delete failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className={className}
      style={{ display: "flex", flexDirection: "column", gap: 6 }}
    >
      <button
        className="title-menu-item danger"
        role="menuitem"
        onClick={go}
        disabled={busy}
      >
        {busy ? "Deleting…" : "Delete Account"}
      </button>
      {err && <span style={{ color: "#dc2626", fontSize: 12 }}>{err}</span>}
    </div>
  );
}
