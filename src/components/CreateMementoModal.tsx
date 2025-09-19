import { useEffect, useMemo, useRef, useState } from "react";
import type { Wall } from "../types";
import "../memento-modal.css";

export type MementoDraft = {
  wall_id: string;
  kind: "photo" | "video" | "text";
  title?: string;
  text?: string;
  // local files
  photo_file?: File | null;
  video_file?: File | null; // NEW
  poster_file?: File | null; // NEW (optional thumbnail for video)
  // optimistic previews
  photo_preview?: string;
  poster_preview?: string;
};

export default function CreateMementoModal({
  open,
  onClose,
  wall,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  wall: Wall;
  onSave?: (draft: MementoDraft) => Promise<void> | void;
}) {
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null); // NEW
  const [posterFile, setPosterFile] = useState<File | null>(null); // NEW
  const [saving, setSaving] = useState(false);
  const [kind, setKind] = useState<"text" | "photo" | "video">("text");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const titleRef = useRef<HTMLInputElement>(null);

  const photoPreview = useMemo(
    () => (photoFile ? URL.createObjectURL(photoFile) : undefined),
    [photoFile]
  );
  const posterPreview = useMemo(
    () => (posterFile ? URL.createObjectURL(posterFile) : undefined),
    [posterFile]
  );

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => titleRef.current?.focus(), 50);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      clearTimeout(t);
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  const pickPhoto = () => fileInputRef.current?.click();

  const valid =
    (kind === "text" && text.trim().length > 0) ||
    (kind === "photo" && !!photoFile) ||
    (kind === "video" && !!videoFile);

  const reset = () => {
    setTitle("");
    setText("");
    setPhotoFile(null);
    setVideoFile(null);
    setPosterFile(null);
    setSaving(false);
    setKind("text");
  };

  const handleSave = async () => {
    if (!open || !wall || !valid) return;
    setSaving(true);

    const draft: MementoDraft = {
      wall_id: wall.id,
      kind,
      title: title.trim() || undefined,
      text: text.trim() || undefined,
      photo_file: photoFile ?? null,
      photo_preview: photoPreview,
      video_file: videoFile ?? null,
      poster_file: posterFile ?? null,
      poster_preview: posterPreview,
    };

    try {
      await onSave?.(draft);
    } finally {
      setSaving(false);
      reset();
      onClose();
    }
  };

  if (!open) return null;

  return (
    <div
      className="mmt-overlay"
      role="dialog"
      aria-modal="true"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="mmt-panel" enable-xr="true" data-z="70">
        {/* Header */}
        <div className="mmt-header">
          <h2 className="mmt-title">Create New Memento</h2>
          <button aria-label="Close" className="mmt-x" onClick={onClose}>
            ×
          </button>
        </div>

        {/* Body */}
        <div className="mmt-body">
          {/* Type selector */}
          <label className="mmt-label">Choose Type</label>
          <div className="mmt-typeOptions">
            <label>
              <input
                type="radio"
                name="mementoKind"
                value="text"
                checked={kind === "text"}
                onChange={() => setKind("text")}
              />
              Text
            </label>
            <label>
              <input
                type="radio"
                name="mementoKind"
                value="photo"
                checked={kind === "photo"}
                onChange={() => setKind("photo")}
              />
              Photo
            </label>
            <label>
              <input
                type="radio"
                name="mementoKind"
                value="video"
                checked={kind === "video"}
                onChange={() => setKind("video")}
              />
              Video
            </label>
          </div>

          {/* Title */}
          <label className="mmt-label">
            Title <span className="mmt-optional">(optional)</span>
          </label>
          <input
            ref={titleRef}
            className="mmt-input"
            placeholder="e.g., The moment we surprised you!"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />

          {/* Fields per kind */}
          {kind === "text" && (
            <>
              <label className="mmt-label">
                Text <span className="mmt-optional">(optional)</span>
              </label>
              <textarea
                className="mmt-textarea"
                placeholder="Share a memory, quote, or message..."
                rows={4}
                value={text}
                onChange={(e) => setText(e.target.value)}
              />
            </>
          )}

          {kind === "photo" && (
            <>
              <label className="mmt-label">Photo</label>
              <div className="mmt-photoRow">
                <button
                  type="button"
                  className="mmt-photoPicker"
                  onClick={pickPhoto}
                >
                  <span className="mmt-photoIcon" aria-hidden>
                    📷
                  </span>
                  Choose Photo
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={(e) => setPhotoFile(e.target.files?.[0] ?? null)}
                />
              </div>
              {photoPreview && (
                <div className="mmt-photoPreview">
                  <img src={photoPreview} alt="Selected" />
                  <button
                    className="mmt-remove"
                    onClick={() => setPhotoFile(null)}
                  >
                    Remove
                  </button>
                </div>
              )}
            </>
          )}

          {kind === "video" && (
            <>
              <label className="mmt-label">Video File</label>
              <input
                type="file"
                accept="video/*"
                onChange={(e) => setVideoFile(e.target.files?.[0] ?? null)}
              />
              <div className="mmt-hintNote">
                Recommended: MP4 (H.264 video + AAC audio).
              </div>

              <label className="mmt-label" style={{ marginTop: 12 }}>
                Poster (optional)
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setPosterFile(e.target.files?.[0] ?? null)}
              />
              {posterPreview && (
                <div className="mmt-photoPreview">
                  <img src={posterPreview} alt="Poster" />
                  <button
                    className="mmt-remove"
                    onClick={() => setPosterFile(null)}
                  >
                    Remove
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="mmt-footer">
          <button className="mmt-btnGhost" onClick={onClose}>
            Cancel
          </button>
          <button
            className="mmt-btnPrimary"
            disabled={!valid || saving}
            onClick={handleSave}
          >
            {saving ? "Saving…" : "Save Memento"}
          </button>
        </div>
      </div>
    </div>
  );
}
