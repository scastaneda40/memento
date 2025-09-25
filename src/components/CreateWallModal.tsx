import { useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabase";
import type { Wall } from "../types";
import "../modal.css";

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
  profileId = null, // ✅ default handled here
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (w: Wall) => void;
  profileId?: string | null; // ✅ optional prop type
}) {
  const [title, setTitle] = useState("");
  const [background, setBackground] =
    useState<Wall["background"]>("serene-sky");
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // focus title on open, Esc closes
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => inputRef.current?.focus(), 10);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      clearTimeout(t);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  const create = async () => {
    if (!title.trim() || saving) return;
    setSaving(true);
    const { data, error } = await supabase
      .from("walls")
      .insert({ title, background, profile_id: profileId ?? null }) // ✅ only one insert
      .select()
      .single();
    setSaving(false);
    if (error) {
      console.error(error);
      return;
    }
    const created = data as Wall;

    onCreated({
      ...created,
      memento_count: created.memento_count ?? 0,
      image_url: created.image_url ?? undefined,
    });
    setTitle("");
    setBackground("serene-sky");
    onClose();
  };

  if (!open) return null;

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
          <h2 className="mdl-title">Create New Wall</h2>
          <button
            onClick={onClose}
            className="btn btn-ghost"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="mdl-body">
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
                    <div className={`mdl-thumb ${bg.thumbClass}`}></div>
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
