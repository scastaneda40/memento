import { useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabase";
import type { Profile } from "../types";
import "../modal.css";

export default function CreateProfileModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (p: Profile) => void;
}) {
  const [displayName, setDisplayName] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus first field on open, Esc closes
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

  // Avatar preview
  useEffect(() => {
    if (!avatarFile) {
      setAvatarPreview(null);
      return;
    }
    const url = URL.createObjectURL(avatarFile);
    setAvatarPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [avatarFile]);

  const uploadAvatar = async (file: File, profileId: string) => {
    const ext = (file.type.split("/")[1] || "jpg").toLowerCase();
    const path = `${profileId}/${crypto.randomUUID()}.${ext}`;
    const up = await supabase.storage.from("avatars").upload(path, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type || "image/jpeg",
    });
    if (up.error) throw up.error;
    return supabase.storage.from("avatars").getPublicUrl(path).data.publicUrl;
  };

  const create = async () => {
    if (!displayName.trim() || saving) return;
    setSaving(true);

    try {
      // 1) Insert profile (without avatar_url first so we get id)
      const { data: inserted, error: insErr } = await supabase
        .from("profiles")
        .insert({
          display_name: displayName.trim(),
          first_name: firstName.trim() || null,
          last_name: lastName.trim() || null,
          avatar_url: null,
        })
        .select("*")
        .single();

      if (insErr || !inserted) throw insErr || new Error("Insert failed");

      let avatar_url: string | null = null;

      // 2) If avatar selected, upload + patch
      if (avatarFile) {
        avatar_url = await uploadAvatar(avatarFile, inserted.id);
        const { data: patched, error: updErr } = await supabase
          .from("profiles")
          .update({ avatar_url })
          .eq("id", inserted.id)
          .select("*")
          .single();

        if (updErr || !patched) throw updErr || new Error("Update failed");
        onCreated(patched as Profile);
      } else {
        onCreated(inserted as Profile);
      }

      // reset form
      setDisplayName("");
      setFirstName("");
      setLastName("");
      setAvatarFile(null);
      setAvatarPreview(null);
      onClose();
    } catch (err) {
      console.error("Create profile failed:", err);
      // keep modal open so user can retry
    } finally {
      setSaving(false);
    }
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
          <h2 className="mdl-title">Create New Profile</h2>
          <button
            onClick={onClose}
            className="btn btn-ghost"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="mdl-body">
          {/* Display name */}
          <label className="mdl-label">
            Display Name <span style={{ color: "#6d28d9" }}>*</span>
          </label>
          <input
            ref={inputRef}
            className="mdl-input"
            placeholder="e.g., Mom, Grandpa Joe, Sarah A."
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
          />

          {/* First/Last name row */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 12,
              marginTop: 16,
            }}
          >
            <div>
              <label className="mdl-label">First Name</label>
              <input
                className="mdl-input"
                placeholder="e.g., Sarah"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
              />
            </div>
            <div>
              <label className="mdl-label">Last Name</label>
              <input
                className="mdl-input"
                placeholder="e.g., Alvarez"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
              />
            </div>
          </div>

          {/* Avatar upload */}
          <div style={{ marginTop: 16 }}>
            <label className="mdl-label">Avatar</label>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                marginTop: 8,
              }}
            >
              <div className="avatar-preview">
                {avatarPreview ? (
                  <img src={avatarPreview} alt="Avatar preview" />
                ) : (
                  <div className="avatar-fallback">👤</div>
                )}
              </div>
              <label className="btn btn-ghost" style={{ cursor: "pointer" }}>
                Choose Image
                <input
                  type="file"
                  accept="image/*"
                  style={{ display: "none" }}
                  onChange={(e) => {
                    const file = e.target.files?.[0] || null;
                    setAvatarFile(file);
                  }}
                />
              </label>
              {avatarFile && (
                <button
                  className="btn btn-ghost"
                  onClick={() => {
                    setAvatarFile(null);
                    setAvatarPreview(null);
                  }}
                >
                  Remove
                </button>
              )}
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
            disabled={saving || !displayName.trim()}
            className="btn btn-primary"
          >
            {saving ? "Creating…" : "Create Profile"}
          </button>
        </div>
      </div>
    </div>
  );
}
