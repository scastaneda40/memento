// src/components/CreateWallModal.tsx
import { useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabase";
import type { Wall } from "../types";
import type { AuthChangeEvent, Session } from "@supabase/supabase-js";
import "../modal.css";

// LOUD MODULE-LOAD LOG
console.log("[CreateWallModal] module loaded");

const backgrounds: Array<{
  id: Wall["background"];
  name: string;
  desc: string;
  thumbClass: string;
}> = [
  {
    id: "serene-sky",
    name: "Serene Sky",
    desc: "Peaceful clouds and soft blue tones",
    thumbClass: "serene-sky",
  },
  {
    id: "warm-canvas",
    name: "Warm Canvas",
    desc: "Cozy beige and cream textures",
    thumbClass: "warm-canvas",
  },
  {
    id: "dark-tribute",
    name: "Dark Tribute",
    desc: "Elegant dark tones for remembrance",
    thumbClass: "dark-tribute",
  },
];

export default function CreateWallModal({
  open,
  onClose,
  onCreated,
  profileId = null,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (w: Wall) => void;
  profileId?: string | null;
}) {
  console.log("[CreateWallModal] render start, props:", { open, profileId }); // every render

  const [title, setTitle] = useState("");
  const [background, setBackground] =
    useState<Wall["background"]>("serene-sky");
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Local auth snapshot for debugging
  const [authReady, setAuthReady] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  const dumpSession = async (where: string) => {
    const { data, error } = await supabase.auth.getSession();
    console.log(`[CreateWallModal] dumpSession @ ${where}`, {
      error: error?.message ?? null,
      hasSession: !!data.session,
      userId: data.session?.user?.id ?? null,
      expires_at: data.session?.expires_at ?? null,
    });
    return data.session;
  };

  // Track open/close
  useEffect(() => {
    console.log("[CreateWallModal] useEffect(open) fired:", open);
    if (!open) return;
    console.log(
      "[CreateWallModal] OPEN — focusing title input; profileId:",
      profileId
    );

    const t = setTimeout(() => inputRef.current?.focus(), 10);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        console.log("[CreateWallModal] ESC pressed — closing");
        onClose();
      }
    };
    document.addEventListener("keydown", onKey);
    void dumpSession("open");

    return () => {
      clearTimeout(t);
      document.removeEventListener("keydown", onKey);
      console.log("[CreateWallModal] CLOSE cleanup");
    };
  }, [open, onClose, profileId]);

  // Track auth changes locally
  useEffect(() => {
    console.log("[CreateWallModal] useEffect(mount) subscribe auth");
    let alive = true;

    (async () => {
      const s = await dumpSession("mount");
      if (!alive) return;
      setAuthReady(true);
      setUserId(s?.user?.id ?? null);
    })();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (_event: AuthChangeEvent, session: Session | null) => {
        console.log("[CreateWallModal] onAuthStateChange", {
          event: _event,
          hasSession: !!session,
          userId: session?.user?.id ?? null,
        });
        if (!alive) return;
        setAuthReady(true);
        setUserId(session?.user?.id ?? null);
      }
    );

    return () => {
      alive = false;
      subscription.unsubscribe();
      console.log("[CreateWallModal] unsubscribed auth");
    };
  }, []);

  // Log important state changes
  useEffect(() => {
    console.log("[CreateWallModal] state", {
      title,
      background,
      profileId,
      authReady,
      userId,
      saving,
    });
  }, [title, background, profileId, authReady, userId, saving]);

  const create = async () => {
    console.log("[CreateWallModal] create() clicked");
    if (!title.trim()) {
      console.log("[CreateWallModal] create() blocked — empty title");
      return;
    }
    if (saving) {
      console.log("[CreateWallModal] create() blocked — already saving");
      return;
    }

    setSaving(true);
    try {
      const session = await dumpSession("create:before");
      const uid = session?.user?.id ?? null;
      console.log("[CreateWallModal] pre-insert payload", {
        user_id: uid,
        profile_id: profileId ?? null,
        title,
        background,
        image_url: null,
      });

      if (!uid) {
        console.warn("[CreateWallModal] create() abort — no session/user");
        return;
      }

      const { data, error } = await supabase
        .from("walls")
        .insert({
          user_id: uid,
          profile_id: profileId ?? null,
          title,
          background,
          image_url: null,
        })
        .select("*")
        .single();

      if (error) {
        console.error("[CreateWallModal] insert error", {
          message: (error as any).message,
          details: (error as any).details,
          hint: (error as any).hint,
          code: (error as any).code,
        });
        return;
      }

      console.log("[CreateWallModal] insert OK", data);

      const created = data as Wall;
      onCreated({
        ...created,
        memento_count: created.memento_count ?? 0,
        image_url: created.image_url ?? undefined,
      });

      setTitle("");
      setBackground("serene-sky");
      onClose();
    } catch (e) {
      console.error("[CreateWallModal] unexpected error", e);
    } finally {
      setSaving(false);
      void dumpSession("create:finally");
    }
  };

  if (!open) {
    console.log("[CreateWallModal] not open → returns null");
    return null;
  }

  // 🔊 VISIBLE DEBUG BANNER
  const DebugBanner = () => (
    <div
      style={{
        fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
        fontSize: 12,
        background: "#fff7ed",
        color: "#7c2d12",
        border: "1px solid #fed7aa",
        borderRadius: 8,
        padding: 8,
        marginBottom: 12,
      }}
    >
      <div>
        <b>DEBUG</b> CreateWallModal
      </div>
      <div>
        authReady: {String(authReady)} | userId: {userId ?? "null"}
      </div>
      <div>
        profileId: {profileId ?? "null"} | saving: {String(saving)}
      </div>
      <div>
        title: “{title}” | background: {background}
      </div>
      <button
        type="button"
        className="btn btn-ghost"
        onClick={() => void dumpSession("manual-click")}
        style={{ marginTop: 6 }}
      >
        Log Session Now
      </button>
    </div>
  );

  return (
    <div
      className="mdl-overlay"
      role="dialog"
      aria-modal="true"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="mdl-panel" enable-xr="true" data-z="70">
        <div className="mdl-header">
          <h2 className="mdl-title">Create New Wallsssss</h2>
          <button
            onClick={onClose}
            className="btn btn-ghost"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="mdl-body">
          <DebugBanner />

          <label className="mdl-label">
            Wall Title <span style={{ color: "#6d28d9" }}>*</span>
          </label>
          <input
            ref={inputRef}
            className="mdl-input"
            placeholder="e.g., Mom’s 50th Birthday"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />

          <div style={{ marginTop: 16 }}>
            <p className="mdl-label" style={{ marginBottom: 8 }}>
              Choose Background
            </p>
            <div className="mdl-choices">
              {backgrounds.map((bg) => {
                const sel = bg.id === background;
                return (
                  <button
                    key={bg.id}
                    type="button"
                    onClick={() => setBackground(bg.id)}
                    className={`mdl-choice ${sel ? "mdl-choice--sel" : ""}`}
                  >
                    <div className={`mdl-thumb ${bg.thumbClass}`} />
                    <div style={{ flex: 1 }}>
                      <div className="mdl-name">{bg.name}</div>
                      <div className="mdl-desc">{bg.desc}</div>
                    </div>
                    <div
                      className={`mdl-radio ${sel ? "mdl-radio--sel" : ""}`}
                      aria-hidden
                    />
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div
          className="mdl-footer"
          style={{ justifyContent: "flex-end", gap: 12 }}
        >
          <button onClick={onClose} className="btn btn-ghost">
            Cancel
          </button>
          <button
            onClick={create}
            disabled={saving || !title.trim()}
            className="btn btn-primary"
          >
            {saving ? "Creating…" : "Create Wall"}
          </button>
        </div>
      </div>
    </div>
  );
}
